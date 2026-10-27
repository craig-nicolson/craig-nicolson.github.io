import { Container, Graphics, Particle, ParticleContainer, type Texture } from 'pixi.js';
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
const DURATION: Record<CelebrationId, number> = { orbit: 4.6, portal: 8, spin: 5.3, fireworks: 6.2, number: 5.4 };
/** When the finished year appears in the dataset */
const LANDS: Record<CelebrationId, number> = { orbit: 1, portal: 1, spin: 1, fireworks: 0.9, number: 0.97 };
/** Fireworks: the year loads into shells, which rise and burst across the window */
const FW = {
  /** Seconds for a shell's hours to gather at its launch point */
  gather: 0.55,
  /** Seconds from launch to burst */
  rise: 0.8,
  /** Share of each shell's hours that become the rocket's exhaust rather than the burst */
  exhaust: 0.18,
  /** Launches spread over this many seconds; the last three go up together */
  spread: 2.1,
};
type ShellStyle = 'peony' | 'willow' | 'crackle';
/** Burst style by waveform: full spheres, drooping willow, slow twinkle */
const STYLE: ShellStyle[] = ['peony', 'willow', 'peony', 'crackle', 'crackle'];
interface Shell {
  type: number;
  launch: number;
  lx: number;
  ly: number;
  bx: number;
  by: number;
  drift: number;
  reach: number;
  drag: number;
  gravity: number;
  style: ShellStyle;
}
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
  private shells: Shell[] = [];
  private shellOf = new Uint16Array(0);
  private isExhaust = new Uint8Array(0);
  /** Things this show draws itself, so the scene hides its own versions */
  readonly hidesGuides: boolean;
  onLand: () => void = () => {};

  constructor(
    private id: CelebrationId,
    private s: FxStage,
    dots: FxDot[],
    tex: Texture,
  ) {
    const n = (this.n = dots.length);
    this.dur = DURATION[id];
    this.base = s.dotR / TEX_RADIUS;
    this.pc = new ParticleContainer({
      // Fireworks stretch sparks along their path, so only they need rotation
      dynamicProperties: { position: true, vertex: true, color: true, rotation: id === 'fireworks', uvs: false },
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
    this.root.addChild(this.pc, this.g);
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
    } else if (this.id === 'fireworks') {
      // Each waveform gets shells in proportion to its share, so every shell holds about the same hours
      const order: number[] = [];
      DATA_TYPES.forEach((t, ty) => {
        for (let k = 0; k < Math.max(1, Math.round(t.share * 10)); k++) order.push(ty);
      });
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const m = order.length;
      const span = s.x1 - s.x0;
      const slots = order.map((_, k) => s.x0 + span * (0.12 + (0.76 * (k + 0.5)) / m));
      for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
      }
      this.shells = order.map((ty, k) => {
        const style = STYLE[ty % STYLE.length];
        const bx = slots[k] + rnd(-0.03, 0.03) * span;
        const by = s.h * rnd(0.12, 0.38);
        // The finale: the last three launch almost together
        const launch = FW.gather + (k < m - 3 ? (FW.spread * k) / Math.max(1, m - 3) + rnd(-0.08, 0.08) : FW.spread + rnd(0, 0.2));
        const reach = Math.max(40, Math.min(s.R * rnd(0.55, 0.8), bx - s.x0 - 16, s.x1 - bx - 16, by - 16));
        return {
          type: ty,
          launch,
          lx: bx + rnd(-0.04, 0.04) * span,
          ly: s.h - 18,
          bx,
          by,
          drift: rnd(-1, 1) * 18,
          reach,
          style,
          drag: style === 'willow' ? 1.3 : 2.6,
          gravity: s.R * (style === 'willow' ? 1.5 : 0.9),
        };
      });
      // Deal each type's hours round its shells
      const mine = DATA_TYPES.map((_, ty) => this.shells.map((sh, k) => (sh.type === ty ? k : -1)).filter((k) => k >= 0));
      const dealt = new Int32Array(DATA_TYPES.length);
      this.shellOf = new Uint16Array(n);
      this.isExhaust = new Uint8Array(n);
      const [phi, sp, life, lag, size, jit, ph] = (this.p = this.params(7));
      for (let i = 0; i < n; i++) {
        const ty = this.type[i];
        const list = mine[ty];
        const k = list[dealt[ty]++ % list.length];
        const sh = this.shells[k];
        this.shellOf[i] = k;
        this.isExhaust[i] = Math.random() < FW.exhaust ? 1 : 0;
        phi[i] = rnd(0, Math.PI * 2);
        sp[i] = Math.sqrt(Math.random());
        life[i] = sh.style === 'willow' ? rnd(2.2, 3) : sh.style === 'crackle' ? rnd(1, 1.8) : rnd(1.3, 2);
        lag[i] = rnd(0, 0.35);
        size[i] = rnd(1.6, 2.6);
        jit[i] = rnd(-1, 1);
        ph[i] = rnd(0, Math.PI * 2);
      }
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
    else if (this.id === 'fireworks') this.fireworks();
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
   * The year loads into shells at the foot of the window. Each rises as a
   * bright head with a sparkling exhaust and bursts in its waveform's colour:
   * sparks start white-hot, streak along their path, slow, droop and fade.
   */
  private fireworks(): void {
    const t = this.time;
    const [phi, sp, life, lag, size, jit, ph] = this.p;
    const base = this.base;
    for (let i = 0; i < this.n; i++) {
      const sh = this.shells[this.shellOf[i]];
      const p = this.parts[i];
      const colour = DATA_TYPES[this.type[i]].color;
      const rt = t - sh.launch;

      // Loading: the hours stream down to their shell's launch point
      if (rt < 0) {
        const e = ease(seg(t, sh.launch - FW.gather, sh.launch));
        p.x = lerp(this.x0[i], sh.lx + jit[i] * 3, e);
        p.y = lerp(this.y0[i], sh.ly, e);
        p.rotation = 0;
        p.scaleX = p.scaleY = base * lerp(1, 1.3, e);
        p.alpha = this.a0[i];
        p.tint = colour;
        continue;
      }

      const path = (u: number) => {
        const f = 1 - (1 - u) ** 2;
        return { x: lerp(sh.lx, sh.bx, f) + Math.sin(Math.PI * u) * sh.drift, y: lerp(sh.ly, sh.by, f) };
      };

      if (this.isExhaust[i]) {
        // Exhaust: strung out behind the head, spreading and sagging as it ages, then dying away
        const u = Math.max(0, Math.min(1, (rt - lag[i]) / FW.rise));
        const at = path(u);
        const age = lag[i] / 0.35;
        p.x = at.x + jit[i] * (2 + 9 * age);
        p.y = at.y + 0.5 * sh.gravity * lag[i] * lag[i] * 2;
        p.rotation = Math.PI / 2;
        p.scaleX = base * size[i] * (1.6 - age);
        p.scaleY = base * size[i] * 0.55;
        p.tint = age < 0.25 ? OFF_WHITE : colour;
        p.alpha = this.a0[i] * (1 - age * 0.6) * (1 - seg(rt, FW.rise, FW.rise + 0.7)) * (rt - lag[i] < 0 ? 0 : 1);
        continue;
      }

      // Payload: rides up packed into the rocket's head
      if (rt < FW.rise) {
        const at = path(rt / FW.rise);
        p.x = at.x + jit[i] * 2;
        p.y = at.y + Math.cos(phi[i]) * 2;
        p.rotation = 0;
        p.scaleX = p.scaleY = base * 1.4;
        p.tint = OFF_WHITE;
        p.alpha = this.a0[i];
        continue;
      }

      // Burst: drag and gravity, worked out exactly for any moment
      const tau = rt - FW.rise;
      const k = sh.drag;
      const v = sh.reach * k * sp[i];
      const vx = Math.cos(phi[i]) * v;
      const vy = Math.sin(phi[i]) * v - sh.reach * 0.35;
      const decay = Math.exp(-k * tau);
      const e = (1 - decay) / k;
      p.x = sh.bx + vx * e;
      p.y = sh.by + vy * e + (sh.gravity / k) * (tau - e);
      const nowX = vx * decay;
      const nowY = vy * decay + (sh.gravity / k) * (1 - decay);
      const speed = Math.hypot(nowX, nowY);
      p.rotation = Math.atan2(nowY, nowX);
      const fade = 1 - seg(tau, life[i] * 0.45, life[i]);
      const twinkle = sh.style === 'crackle' ? 0.65 + 0.35 * Math.sin(tau * Math.PI * 5 + ph[i]) : 1;
      const grow = sh.style === 'willow' ? 1.25 : 1;
      p.scaleY = base * size[i] * lerp(1, 0.55, seg(tau, 0, life[i])) * grow;
      p.scaleX = p.scaleY * (1 + Math.min(sh.style === 'willow' ? 7 : 5, speed * 0.02));
      p.tint = tau < 0.12 ? OFF_WHITE : colour;
      p.alpha = this.a0[i] * fade * twinkle;
    }

    // Each rocket's head glows as it climbs
    for (const sh of this.shells) {
      const rt = t - sh.launch;
      if (rt < 0 || rt >= FW.rise) continue;
      const u = rt / FW.rise;
      const f = 1 - (1 - u) ** 2;
      const x = lerp(sh.lx, sh.bx, f) + Math.sin(Math.PI * u) * sh.drift;
      const y = lerp(sh.ly, sh.by, f);
      this.g.circle(x, y, 4 + 2 * u).fill({ color: OFF_WHITE, alpha: 0.95 });
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
  }
}
