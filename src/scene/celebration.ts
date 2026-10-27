import { Container, Graphics, Particle, ParticleContainer, RenderTexture, Sprite, type Renderer, type Texture } from 'pixi.js';
import { DATA_TYPES, OFF_WHITE, type CelebrationId } from '../config';
import { ease } from '../ease';
import * as fmt from '../format';
import { TEX_RADIUS } from './shapes';

/** Where things are: the year disc, and the slot the finished year lands in */
export interface FxStage {
  cx: number;
  cy: number;
  R: number;
  w: number;
  h: number;
  /** The canvas spans the window, wider than the picture: its left and right edges */
  x0: number;
  x1: number;
  dotR: number;
  /** The ring around the year, and the ringed slot in the dataset it is tied to */
  ring: number;
  slotR: number;
  tx: number;
  ty: number;
  tr: number;
  /** Finished years in the dataset, now including this one */
  years: number;
}

export interface FxDot {
  x: number;
  y: number;
  tint: number;
  alpha: number;
  type: number;
}

/** Seconds. The portal ends when its pulse has passed, so its figure is only a limit. */
const DURATION: Record<CelebrationId, number> = { orbit: 4.6, portal: 8, spin: 5.3, collider: 7.2, number: 5.4 };
/** When the finished year appears in the dataset */
const LANDS: Record<CelebrationId, number> = { orbit: 1, portal: 1, spin: 1, collider: 1, number: 0.97 };
/** Collider: when the bunches are kicked off the ring, when they meet, and when the debris is swept away (seconds) */
const KICK_AT = 2.6;
const COLLIDE_AT = 2.85;
const SWEEP_AT = 5.7;
/** How hard the magnetic field turns the heaviest type, in radians a second; lighter types turn faster */
const FIELD = 3.2;
/** Each type's charge and mass in the collision: the sign sets which way it curls, the mass how tightly */
const CHARGE = [1, -1, 1, -1, 1];
const MASS = [1, 0.75, 0.6, 0.45, 0.35];
/** Energy lost to the field each second, so tracks spiral inwards */
const TRACK_DRAG = 0.7;
/** How fast the long-exposure trails fade; higher means shorter trails */
const TRAIL_FADE = 7;
/** Spin out: top spin in radians a second, and the moment the heap starts pouring away */
const SPIN_MAX = 10;
const POUR_AT = 3.6;
/** Portal: the ring opens over this long, then the hours drain over about this long, front first */
const OPEN_S = 0.9;
const DRAIN_S = 1.5;
const PULSE_S = 1.4;

const seg = (u: number, a: number, b: number) => (u <= a ? 0 : u >= b ? 1 : (u - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * A short show when a year of recording completes. Every hour of the year
 * takes part, as one batch of particles, and the year ends up in its place
 * in the dataset. Uses the DataLoch motion set (orbit, gather with its 6%
 * overshoot, pull-back) plus some simple physics: spin, gravity, drag and bounce.
 */
export class Celebration {
  readonly root = new Container();
  private pc: ParticleContainer;
  private parts: Particle[] = [];
  private g = new Graphics();
  private n: number;
  private x0: Float32Array;
  private y0: Float32Array;
  private a0: Float32Array;
  private type: Uint8Array;
  private p: Float32Array[] = [];
  private time = 0;
  private dur: number;
  private landed = false;
  private base: number;
  private minX = 0;
  private spanX = 1;
  private numScale = 1;
  // Spin out: shared spin angle, each dot's state, and the height of the heap per column
  private spinAngle = 0;
  private state = new Uint8Array(0);
  private bounces = new Uint8Array(0);
  private heap = new Float32Array(0);
  private col = 2;
  // Portal: the funnel along the line from the disc to the slot
  private axis = { dx: 0, dy: 1, nx: 1, ny: 0, L: 1, at: 0, wt: 1, ws: 1, a1: 0, a2: 0, phi: 0 };
  private absorbed = 0;
  private gone = new Uint8Array(0);
  private pulseAt = 0;
  // Collider: long-exposure trails. Two textures take turns: each frame copies the last one
  // a little fainter, then draws the particles on top, so trails fade to clear
  private trails: [RenderTexture, RenderTexture] | null = null;
  private trailHolder = new Container();
  private copy = new Sprite();
  private copyHolder = new Container();
  private trailView = new Sprite();
  /** Things this show draws itself, so the scene hides its own versions */
  readonly hidesGuides: boolean;
  onLand: () => void = () => {};

  constructor(
    private id: CelebrationId,
    private s: FxStage,
    dots: FxDot[],
    tex: Texture,
    private renderer: Renderer,
  ) {
    const n = (this.n = dots.length);
    this.dur = DURATION[id];
    this.base = s.dotR / TEX_RADIUS;
    this.pc = new ParticleContainer({
      dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false },
      texture: tex,
    });
    this.x0 = new Float32Array(n);
    this.y0 = new Float32Array(n);
    this.a0 = new Float32Array(n);
    this.type = new Uint8Array(n);
    dots.forEach((d, i) => {
      this.x0[i] = d.x;
      this.y0[i] = d.y;
      this.a0[i] = d.alpha;
      this.type[i] = d.type;
      const p = new Particle({ texture: tex, x: d.x, y: d.y, anchorX: 0.5, anchorY: 0.5, scaleX: this.base, scaleY: this.base, tint: d.tint, alpha: d.alpha });
      this.parts.push(p);
      this.pc.addParticle(p);
    });
    if (id === 'collider') {
      // Particles draw into a texture as wide as the canvas, which keeps their trails
      const w = Math.ceil(s.x1 - s.x0);
      const h = Math.ceil(s.h);
      const make = () => RenderTexture.create({ width: w, height: h, resolution: renderer.resolution });
      this.trails = [make(), make()];
      this.trailHolder.x = -s.x0;
      this.trailHolder.addChild(this.pc);
      this.copyHolder.addChild(this.copy);
      this.trailView.x = s.x0;
      this.root.addChild(this.trailView, this.g);
    } else {
      this.root.addChild(this.pc, this.g);
    }
    this.hidesGuides = id === 'portal';
    this.setup();
  }

  private params(k: number): Float32Array[] {
    return Array.from({ length: k }, () => new Float32Array(this.n));
  }

  private setup(): void {
    const { s, n } = this;
    if (this.id === 'spin') {
      // Outer hours let go first, as the spin overcomes them
      const [r0, th, rel, , , px, py] = (this.p = this.params(10));
      for (let i = 0; i < n; i++) {
        r0[i] = Math.hypot(this.x0[i] - s.cx, this.y0[i] - s.cy);
        th[i] = Math.atan2(this.y0[i] - s.cy, this.x0[i] - s.cx);
        rel[i] = 0.8 + 0.8 * (1 - r0[i] / s.R) + rnd(0, 0.15);
        px[i] = this.x0[i];
        py[i] = this.y0[i];
      }
      this.state = new Uint8Array(n);
      this.bounces = new Uint8Array(n);
      this.col = Math.max(2, s.dotR * 2);
      this.heap = new Float32Array(Math.ceil((s.x1 - s.x0) / this.col) + 1);
    } else if (this.id === 'portal') {
      // Work along the line from the disc's centre to the slot: a (along) and b (across)
      const dx = s.tx - s.cx;
      const dy = s.ty - s.cy;
      const L = Math.hypot(dx, dy) || 1;
      const ux = dx / L;
      const uy = dy / L;
      const half = Math.acos(Math.max(-1, Math.min(1, (s.ring - s.slotR) / L)));
      const phi = Math.atan2(dy, dx);
      this.axis = {
        dx: ux,
        dy: uy,
        nx: -uy,
        ny: ux,
        L,
        at: s.ring * Math.cos(half),
        wt: s.ring * Math.sin(half),
        ws: s.slotR * Math.sin(half),
        a1: phi - half,
        a2: phi + half,
        phi,
      };
      const [a, b, delay] = (this.p = this.params(3));
      for (let i = 0; i < n; i++) {
        const ox = this.x0[i] - s.cx;
        const oy = this.y0[i] - s.cy;
        a[i] = ox * ux + oy * uy;
        b[i] = ox * -uy + oy * ux;
        // The side nearest the slot goes first
        delay[i] = OPEN_S + (DRAIN_S * (s.ring - a[i])) / (2 * s.ring) + rnd(0, 0.05);
      }
      this.gone = new Uint8Array(n);
    } else if (this.id === 'collider') {
      // Two bunches, alternate hours in each, spread a little along and across the ring
      const [ang, rad, delay, , , px, py] = (this.p = this.params(9));
      for (let i = 0; i < n; i++) {
        ang[i] = (Math.random() + Math.random() + Math.random() - 1.5) * 0.16;
        rad[i] = rnd(-4, 4);
        delay[i] = rnd(0, 0.3);
        px[i] = this.x0[i];
        py[i] = this.y0[i];
      }
      this.state = new Uint8Array(n);
    } else if (this.id === 'orbit') {
      // Each type's hours spread evenly round its own ring
      const [phi0] = (this.p = this.params(1));
      const total = new Int32Array(DATA_TYPES.length);
      for (let i = 0; i < n; i++) total[this.type[i]]++;
      const seen = new Int32Array(DATA_TYPES.length);
      for (let i = 0; i < n; i++) {
        const t = this.type[i];
        phi0[i] = (Math.PI * 2 * seen[t]++) / Math.max(1, total[t]) + t * 0.4;
      }
    } else {
      const [nx, ny, delay, ph] = (this.p = this.params(4));
      const pts = this.numberPoints();
      for (let i = pts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pts[i], pts[j]] = [pts[j], pts[i]];
      }
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < n; i++) {
        const q = pts[i % pts.length];
        nx[i] = q.x + rnd(-0.6, 0.6);
        ny[i] = q.y + rnd(-0.6, 0.6);
        delay[i] = rnd(0, 0.12);
        ph[i] = rnd(0, Math.PI * 2);
        lo = Math.min(lo, nx[i]);
        hi = Math.max(hi, nx[i]);
      }
      this.minX = lo;
      this.spanX = Math.max(1, hi - lo);
    }
  }

  /** Points inside the digits of the new year count, drawn once on a small canvas */
  private numberPoints(): { x: number; y: number }[] {
    const { s } = this;
    const text = fmt.int(s.years);
    const cv = document.createElement('canvas');
    const g = cv.getContext('2d', { willReadFrequently: true });
    if (!g) return [{ x: s.cx, y: s.cy }];
    const family = getComputedStyle(document.body).fontFamily;
    g.font = `700 100px ${family}`;
    const w100 = g.measureText(text).width || 1;
    const size = Math.min((100 * s.w * 0.86) / w100, (s.R * 1.2) / 0.75);
    const W = Math.ceil((w100 * size) / 100) + 8;
    const H = Math.ceil(size * 0.9) + 8;
    cv.width = W;
    cv.height = H;
    g.font = `700 ${size}px ${family}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, W / 2, H / 2 + size * 0.04);
    const data = g.getImageData(0, 0, W, H).data;
    // Roughly one point per hour of the year
    const step = Math.max(2, Math.round(Math.sqrt((W * H * 0.35) / this.n)));
    this.numScale = Math.max(1, (step * 0.42) / s.dotR);
    const pts: { x: number; y: number }[] = [];
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) if (data[(y * W + x) * 4 + 3] > 128) pts.push({ x: s.cx - W / 2 + x, y: s.cy - H / 2 + y });
    }
    return pts.length ? pts : [{ x: s.cx, y: s.cy }];
  }

  /** Returns false once the show is over */
  update(dt: number): boolean {
    this.time += dt;
    const u = Math.min(1, this.time / this.dur);
    this.g.clear();
    if (this.id === 'spin') this.spin(Math.min(dt, 1 / 30));
    else if (this.id === 'portal') this.portal();
    else if (this.id === 'collider') this.collider(Math.min(dt, 1 / 30));
    else if (this.id === 'orbit') this.orbit(u);
    else this.number(u);
    const lands = this.id === 'portal' ? this.pulseAt > 0 && this.time >= this.pulseAt + 0.35 : u >= LANDS[this.id];
    if (!this.landed && lands) {
      this.landed = true;
      this.onLand();
    }
    if (this.id === 'portal' && this.pulseAt > 0) return this.time < this.pulseAt + PULSE_S;
    return u < 1;
  }

  private set(i: number, x: number, y: number, scale: number, alpha: number): void {
    const p = this.parts[i];
    p.x = x;
    p.y = y;
    p.scaleX = p.scaleY = this.base * scale;
    p.alpha = this.a0[i] * alpha;
  }

  /** The year gathers into one bright disc (6% overshoot), then flies into its place */
  private core(u: number, a: number, b: number, c: number): void {
    if (u < a) return;
    const { s } = this;
    const r0 = s.R * 0.2;
    const grow = seg(u, a, b);
    let r = grow < 1 ? r0 * 1.06 * ease(grow) : r0 * (1.06 - 0.06 * ease(seg(u, b, b + 0.04)));
    const f = ease(seg(u, c, 1));
    r = lerp(r, s.tr, f);
    this.g.circle(lerp(s.cx, s.tx, f), lerp(s.cy, s.ty, f), r).fill({ color: OFF_WHITE, alpha: 0.95 });
  }

  /**
   * The year spins up until its hours fly off the rim. They fall, bounce off
   * the edges and the floor, and settle into a heap, which then pours into
   * the dataset, nearest first. Stepped frame by frame, with simple physics.
   */
  private spin(dt: number): void {
    const { s, time: t } = this;
    const [r0, th, rel, vx, vy, px, py, ax, ay, pour] = this.p;
    const omega = SPIN_MAX * ease(seg(t, 0, 1.4));
    this.spinAngle += omega * dt;
    const gravity = s.h * 2.4;
    const drag = Math.exp(-1.4 * dt);
    const bounce = 0.45;
    const r = s.dotR;
    const left = s.x0 + r + 2;
    const right = s.x1 - r - 2;
    const floor = s.h - 4;
    const cols = this.heap.length;
    for (let i = 0; i < this.n; i++) {
      let st = this.state[i];
      if (st === 0) {
        const a = th[i] + this.spinAngle;
        px[i] = s.cx + r0[i] * Math.cos(a);
        py[i] = s.cy + r0[i] * Math.sin(a);
        if (t < rel[i]) {
          this.set(i, px[i], py[i], 1, 1);
          continue;
        }
        // Let go along the rim, with a little outward push
        const v = omega * r0[i];
        vx[i] = -Math.sin(a) * v + Math.cos(a) * v * 0.15 + rnd(-30, 30);
        vy[i] = Math.cos(a) * v + Math.sin(a) * v * 0.15 + rnd(-30, 30);
        st = this.state[i] = 1;
      }
      if (t >= POUR_AT && st !== 3) {
        // Pour into the dataset, nearest first
        ax[i] = px[i];
        ay[i] = py[i];
        pour[i] = t + 1.1 * Math.min(1, Math.hypot(px[i] - s.tx, py[i] - s.ty) / s.h) + rnd(0, 0.1);
        st = this.state[i] = 3;
      }
      if (st === 1) {
        vy[i] = (vy[i] + gravity * dt) * drag;
        vx[i] *= drag;
        px[i] += vx[i] * dt;
        py[i] += vy[i] * dt;
        if (px[i] < left) {
          px[i] = left;
          vx[i] = -vx[i] * bounce;
        } else if (px[i] > right) {
          px[i] = right;
          vx[i] = -vx[i] * bounce;
        }
        if (py[i] < r) {
          py[i] = r;
          vy[i] = -vy[i] * bounce;
        }
        let c = Math.max(0, Math.min(cols - 1, Math.floor((px[i] - s.x0) / this.col)));
        const ground = floor - this.heap[c] - r;
        if (py[i] >= ground && vy[i] > 0) {
          if (vy[i] > 240 && this.bounces[i] < 3) {
            py[i] = ground;
            vy[i] = -vy[i] * bounce;
            vx[i] *= 0.8;
            this.bounces[i]++;
          } else {
            // Come to rest on the heap, sliding off any steep side
            for (let k = 0; k < 10; k++) {
              const l = c > 0 ? this.heap[c - 1] : Infinity;
              const rr = c < cols - 1 ? this.heap[c + 1] : Infinity;
              if (this.heap[c] - Math.min(l, rr) <= this.col * 1.2) break;
              c = l <= rr ? c - 1 : c + 1;
            }
            px[i] = s.x0 + (c + 0.5) * this.col;
            py[i] = floor - this.heap[c] - r;
            this.heap[c] += this.col * 0.8;
            this.state[i] = 2;
          }
        }
        this.set(i, px[i], py[i], 1, 1);
      } else if (st === 3) {
        const d = ease(seg(t, pour[i], pour[i] + 0.55));
        this.set(i, lerp(ax[i], s.tx, d), lerp(ay[i], s.ty, d), lerp(1, 0.4, d), 1 - seg(d, 0.85, 1));
      }
    }
    // A ripple as the first hours let go
    const rip = seg(t, 0.8, 1.5);
    if (rip > 0 && rip < 1) this.g.circle(s.cx, s.cy, s.R * (1 + 0.6 * ease(rip))).stroke({ width: 3, color: OFF_WHITE, alpha: 0.5 * (1 - rip) });
  }

  /**
   * The ring becomes a particle accelerator. The year splits into two bunches
   * that race round it in opposite directions, faster and faster, then are
   * kicked inwards to collide at the centre. The debris sprays out through a
   * magnetic field: each waveform has its own charge and mass, so it curls its
   * own way and spirals down as it loses energy, like tracks in a bubble
   * chamber. Long-exposure trails record every path.
   */
  private collider(dt: number): void {
    const { s, time: t } = this;
    const [ang, rad, delay, kx, ky, px, py, vx, vy] = this.p;
    const omega = 1.5 + 16 * seg(t, 0.3, KICK_AT) ** 2;
    this.spinAngle += omega * dt;
    const stretch = 1 + 0.8 * seg(t, 0.5, KICK_AT);
    const drag = Math.exp(-TRACK_DRAG * dt);
    for (let i = 0; i < this.n; i++) {
      const type = this.type[i] % CHARGE.length;
      if (this.state[i] === 0) {
        // Join a bunch and go round the ring
        const a = (i & 1 ? Math.PI - this.spinAngle : this.spinAngle) + ang[i] * stretch;
        const e = ease(seg(t, delay[i], delay[i] + 0.8));
        px[i] = lerp(this.x0[i], s.cx + Math.cos(a) * (s.ring + rad[i]), e);
        py[i] = lerp(this.y0[i], s.cy + Math.sin(a) * (s.ring + rad[i]), e);
        if (t < KICK_AT) {
          this.set(i, px[i], py[i], 1, 1);
          continue;
        }
        kx[i] = px[i];
        ky[i] = py[i];
        this.state[i] = 1;
      }
      if (this.state[i] === 1) {
        // Kicked off the ring, accelerating into the centre
        if (t < COLLIDE_AT) {
          const f = seg(t, KICK_AT, COLLIDE_AT) ** 2;
          this.set(i, lerp(kx[i], s.cx, f), lerp(ky[i], s.cy, f), 1, 1);
          continue;
        }
        // Collision: fly off in any direction, at a speed that keeps each spiral inside the picture
        const w = (CHARGE[type] * FIELD) / MASS[type];
        const speed = Math.abs(w) * s.R * 0.8 * Math.random() ** 0.6;
        const phi = rnd(0, Math.PI * 2);
        vx[i] = Math.cos(phi) * speed;
        vy[i] = Math.sin(phi) * speed;
        px[i] = s.cx;
        py[i] = s.cy;
        this.state[i] = 2;
      }
      if (this.state[i] === 2) {
        if (t < SWEEP_AT + delay[i]) {
          // The field turns each track by a fixed angle a second; drag tightens it into a spiral
          const turn = ((CHARGE[type] * FIELD) / MASS[type]) * dt;
          const c = Math.cos(turn);
          const sn = Math.sin(turn);
          const nx = (vx[i] * c - vy[i] * sn) * drag;
          vy[i] = (vx[i] * sn + vy[i] * c) * drag;
          vx[i] = nx;
          px[i] += vx[i] * dt;
          py[i] += vy[i] * dt;
          this.set(i, px[i], py[i], 1.1, 1);
          continue;
        }
        kx[i] = px[i];
        ky[i] = py[i];
        this.state[i] = 3;
      }
      // The field switches off and the debris is swept into the dataset
      const e = ease(seg(t, SWEEP_AT + delay[i], SWEEP_AT + delay[i] + 0.9));
      this.set(i, lerp(kx[i], s.tx, e), lerp(ky[i], s.ty, e), lerp(1.1, 0.4, e), 1 - seg(e, 0.85, 1));
    }

    // The collision: a flash and two shockwaves
    const hit = t - COLLIDE_AT;
    if (hit >= 0 && hit < 1) {
      const flash = 1 - seg(hit, 0.05, 0.5);
      if (flash > 0) this.g.circle(s.cx, s.cy, s.R * 0.32 * (1 - (1 - seg(hit, 0, 0.12)) ** 2)).fill({ color: OFF_WHITE, alpha: 0.9 * flash });
      [OFF_WHITE, DATA_TYPES[0].color].forEach((color, k) => {
        const e = seg(hit, k * 0.08, k * 0.08 + 0.8);
        if (e > 0 && e < 1) this.g.circle(s.cx, s.cy, s.R * 1.6 * (1 - (1 - e) ** 3)).stroke({ width: lerp(6, 1.5, e), color, alpha: 0.8 * (1 - e) });
      });
    }

    // Long exposure: copy last frame's trails a little fainter, draw this frame on top, then swap
    if (this.trails) {
      const [front, back] = this.trails;
      this.copy.texture = front;
      this.copy.alpha = Math.exp(-TRAIL_FADE * lerp(1, 3, seg(t, 6.2, 7.1)) * dt);
      this.renderer.render({ container: this.copyHolder, target: back, clear: true });
      this.renderer.render({ container: this.trailHolder, target: back, clear: false });
      this.trails = [back, front];
      this.trailView.texture = back;
    }
  }

  /**
   * The ring opens where the magnifier lines meet it, from the top down. The
   * hours fall along the funnel under gravity, keeping their spacing like sand
   * in an hourglass, and squeeze through the triangle into the year's slot.
   * The slot swells as it takes them in, then lets out one big pulse.
   */
  private portal(): void {
    const { s, time: t, axis: ax } = this;
    const [a0, b0, delay] = this.p;
    const gravity = s.h * 1.2;
    const sc = (a: number) => 1 - (1 - s.slotR / s.R) * ease(Math.max(0, Math.min(1, a / ax.L)));
    for (let i = 0; i < this.n; i++) {
      if (this.gone[i]) continue;
      const tau = t - delay[i];
      if (tau <= 0) {
        if (t < 0.05) this.set(i, this.x0[i], this.y0[i], 1, 1);
        continue;
      }
      const a = a0[i] + 0.5 * gravity * tau * tau;
      if (a >= ax.L - s.slotR * 0.3) {
        this.gone[i] = 1;
        this.absorbed++;
        this.set(i, s.tx, s.ty, 0, 0);
        continue;
      }
      let b = (b0[i] * sc(a)) / sc(a0[i]);
      if (a > ax.at) {
        // Inside the triangle: squeeze anything outside it onto its walls
        const hw = lerp(ax.wt, ax.ws, (a - ax.at) / (ax.L - ax.at)) * 0.92;
        b = Math.max(-hw, Math.min(hw, b));
      }
      this.set(i, s.cx + ax.dx * a + ax.nx * b, s.cy + ax.dy * a + ax.ny * b, lerp(1, 0.6, seg(a, ax.L * 0.7, ax.L)), 1);
    }

    // The ring, opening from the top end of the gap to the bottom end
    const g = this.g;
    const p1y = s.cy + Math.sin(ax.a1) * s.ring;
    const p2y = s.cy + Math.sin(ax.a2) * s.ring;
    const [start, dir] = p1y <= p2y ? [ax.a1, 1] : [ax.a2, -1];
    const span = ax.a2 - ax.a1;
    const open = ease(seg(t, 0.1, OPEN_S));
    const from = start + dir * span * open;
    g.moveTo(s.cx + Math.cos(from) * s.ring, s.cy + Math.sin(from) * s.ring)
      .arc(s.cx, s.cy, s.ring, from, start + dir * Math.PI * 2, dir < 0)
      .stroke({ width: 4, color: OFF_WHITE, alpha: 0.9 * (1 - seg(t, this.pulseAt || 99, (this.pulseAt || 99) + 0.4)), cap: 'round' });

    // The funnel walls, brighter while the hours run down them
    const wall = 0.15 + 0.35 * seg(t, 0.2, OPEN_S) * (1 - seg(t, this.pulseAt || 99, (this.pulseAt || 99) + 0.6));
    for (const ang of [ax.a1, ax.a2]) {
      g.moveTo(s.cx + Math.cos(ang) * s.ring, s.cy + Math.sin(ang) * s.ring)
        .lineTo(s.tx + Math.cos(ang) * s.slotR, s.ty + Math.sin(ang) * s.slotR)
        .stroke({ width: 2, color: OFF_WHITE, alpha: wall, cap: 'round' });
    }

    // The portal: swells as it absorbs, with arcs spinning round it
    const filled = this.absorbed / Math.max(1, this.n);
    if (!this.pulseAt && (filled > 0.995 || t > 6)) this.pulseAt = t;
    const pt = this.pulseAt ? t - this.pulseAt : -1;
    let rp = s.slotR * (1 + 2.2 * Math.sqrt(filled));
    if (pt >= 0) rp = lerp(s.slotR * 3.6, s.tr, ease(seg(pt, 0.05, 0.6)));
    g.circle(s.tx, s.ty, rp).fill({ color: OFF_WHITE, alpha: 0.95 });
    if (pt < 0 && t > OPEN_S * 0.6) {
      for (let k = 0; k < 3; k++) {
        const a = t * 5 + (k * Math.PI * 2) / 3;
        g.moveTo(s.tx + Math.cos(a) * (rp + 6), s.ty + Math.sin(a) * (rp + 6))
          .arc(s.tx, s.ty, rp + 6, a, a + 1.1)
          .stroke({ width: 2.5, color: OFF_WHITE, alpha: 0.8, cap: 'round' });
      }
    }

    // The pulse: rings in each waveform's colour sweep out to the edges of the window
    if (pt >= 0) {
      const reach = Math.hypot(Math.max(s.tx - s.x0, s.x1 - s.tx), Math.max(s.ty, s.h - s.ty)) + 40;
      const colours = [OFF_WHITE, ...DATA_TYPES.slice(0, 4).map((d) => d.color)];
      colours.forEach((color, k) => {
        const e = seg(pt, k * 0.1, k * 0.1 + 1.1);
        if (e <= 0 || e >= 1) return;
        const out = 1 - (1 - e) ** 3;
        g.circle(s.tx, s.ty, lerp(rp, reach, out)).stroke({ width: lerp(7, 1.5, e), color, alpha: 0.85 * (1 - e) });
      });
    }
  }

  /** Five spinning rings, one per waveform, like the DataLoch ring device, then one disc */
  private orbit(u: number): void {
    const { s } = this;
    const [phi0] = this.p;
    for (let i = 0; i < this.n; i++) {
      const t = this.type[i];
      const m = ease(seg(u, 0.05 * t, 0.05 * t + 0.28));
      const spin = (t % 2 ? -1 : 1) * (2.4 + 0.6 * t) * Math.PI * seg(u, 0.12, 0.86) ** 2;
      const r = s.R * (0.95 - 0.15 * t) * (1 - ease(seg(u, 0.66 + 0.035 * t, 0.8 + 0.035 * t)));
      const a = phi0[i] + spin;
      this.set(i, lerp(this.x0[i], s.cx + r * Math.cos(a), m), lerp(this.y0[i], s.cy + r * Math.sin(a), m), 1, 1 - seg(u, 0.84, 0.92));
    }
    const guide = seg(u, 0.2, 0.3) * (1 - seg(u, 0.62, 0.72));
    if (guide > 0) {
      for (let t = 0; t < DATA_TYPES.length; t++) {
        this.g.circle(s.cx, s.cy, s.R * (0.95 - 0.15 * t)).stroke({ width: 1.5, color: OFF_WHITE, alpha: 0.12 * guide });
      }
    }
    this.core(u, 0.8, 0.92, 0.94);
  }

  /** Every hour flies into the digits of the new year count, holds, then sweeps into the dataset */
  private number(u: number): void {
    const { s } = this;
    const [nx, ny, delay, ph] = this.p;
    const shimmerOn = u > 0.4 && u < 0.74;
    for (let i = 0; i < this.n; i++) {
      const f = ease(seg(u, delay[i], delay[i] + 0.3));
      const dx = nx[i] - this.x0[i];
      const dy = ny[i] - this.y0[i];
      const bulge = Math.sin(Math.PI * f) * 0.12;
      const xn = (nx[i] - this.minX) / this.spanX;
      const o = ease(seg(u, 0.7 + 0.12 * xn, 0.88 + 0.1 * xn));
      const x = lerp(this.x0[i] + dx * f - dy * bulge, s.tx, o);
      const y = lerp(this.y0[i] + dy * f + dx * bulge, s.ty, o);
      const shimmer = shimmerOn ? 0.82 + 0.18 * Math.sin(this.time * Math.PI + ph[i]) : 1;
      this.set(i, x, y, lerp(lerp(1, this.numScale, f), 0.35, o), shimmer * (1 - seg(o, 0.85, 1)));
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
    this.trailHolder.destroy({ children: true });
    this.copyHolder.destroy({ children: true });
    this.trails?.forEach((t) => t.destroy(true));
  }
}
