import { Container, Graphics, Particle, ParticleContainer, Rectangle, type Renderer, type Texture } from 'pixi.js';
import type { LiveClock } from '../clock';
import { DATA_TYPES, MAX_SHARE, NAVY, OFF_WHITE, TRACK_ALPHA, TRACK_SOLID, YEAR_HOURS } from '../config';
import { ease, easeExit, type Tweens } from '../ease';
import * as fmt from '../format';
import { PathLUT, type PathPoint } from './path';
import { DropPool } from './pool';
import { clamp, rand, sourceDisc, TEX_RADIUS } from './shapes';
import type { Finale, FinaleDot, MakeFinale, StageLabel } from './types';

const N = DATA_TYPES.length;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
/** Minute drops, drawn under the hour rings */
const POOL = 1200;
/** Finished hours flying to the year, drawn over the rings so they leave them seamlessly */
const FLIGHTS = 96;
/** Seconds for a full hour ring to fill in from the outside to a solid circle */
const FILL_S = 0.35;
/** More completed hours than this in one frame are placed without flying */
const MAX_FLIGHTS_PER_FRAME = 12;
/** Seconds for the opening fill */
const INTRO_S = 1.6;
/** Particles whose buffers are only re-sent when something changes */
const STATIC = { position: false, vertex: false, color: false, rotation: false, uvs: false };
/** Room kept for a row label ("1 hour" over "of recording"), and the gap and line beside it */
const ROW_LABEL_W = 96;
const ROW_LINE = 24;
/**
 * The entrance on page load, top to bottom as the data flows: when each part
 * starts (seconds), and the stagger between neighbours. Each label and its
 * line fade in with the part they label, over LABEL_FADE_S.
 */
const ENTER = { streams: 0.2, rings: 0.6, year: 0.8, hours: 0.9, dataset: 1.0, stagger: 0.06 };
export const LABEL_FADE_S = 0.3;
/** Shapes ease in slowly at first, so labels start a moment after them and arrive together */
const LABEL_LAG = 0.15;
/** The year's hours are shared out to the waveforms in a repeating block of this many, so the sunflower spiral draws arms */
const PATTERN = 50;
/** Seconds for the debug preview to fill the rest of the year before its finale */
const PREVIEW_FILL_S = 1.4;
/** When a year is added, the dataset shifts along one place as a wave from newest to oldest: how long the wave takes to run, and each year's step */
const SHIFT_WAVE_S = 0.8;
const SHIFT_STEP_S = 0.35;
/** Each year swells by this much while it steps, so the wave shows as a gentle ripple running down the dataset */
const SHIFT_SWELL = 0.2;
/** A preview holds the added year this long, then the dataset is quietly put back as it really is */
const PREVIEW_HOLD_S = 0.8;
/** Pointing at a waveform: how far the other four recede (0 to 1) */
const FOCUS_RECEDE = 0.7;
/**
 * Share `total` places out between types in proportion to `weights`, as whole
 * numbers (largest remainders win). With `inTurn`, returns the type of each
 * place in order, each type taking its turn as it falls due, so the places of
 * every type are spread evenly.
 */
function shareOut(weights: number[], total: number, inTurn = false): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (inTurn) {
    const given = weights.map(() => 0);
    return Array.from({ length: total }, (_, k) => {
      let best = 0;
      weights.forEach((w, t) => {
        if ((w / sum) * (k + 1) - given[t] > (weights[best] / sum) * (k + 1) - given[best]) best = t;
      });
      given[best]++;
      return best;
    });
  }
  const exact = weights.map((w) => (w / sum) * total);
  const out = exact.map(Math.floor);
  const left = total - out.reduce((a, b) => a + b, 0);
  exact
    .map((e, t) => [e - out[t], t])
    .sort((a, b) => b[0] - a[0])
    .slice(0, left)
    .forEach(([, t]) => out[t]++);
  return out;
}

export interface SceneContext {
  clock: LiveClock;
  tweens: Tweens;
  tex: Texture;
  renderer: Renderer;
  /** 1 at full quality; lower when frames are slow */
  quality: () => number;
}

interface Ripple {
  x: number;
  y: number;
  age: number;
}

/**
 * Three tiers, each an amount of recording time: drops (1 minute) fill rings
 * (1 hour), hours fill a disc (1 year), and finished years sit below it as the
 * whole dataset. Laid out top to bottom.
 */
export class YearScene {
  readonly root = new Container();
  private streamsG = new Graphics();
  /** The lines from the "1 hour" and "1 year" labels to their rows */
  private hourLineG = new Graphics();
  private yearLineG = new Graphics();
  /** How far each hour ring has grown in during the entrance (0 to 1) */
  private ringIn = new Float32Array(N).fill(1);
  private fieldG = new Graphics();
  private field: ParticleContainer;
  private guideG = new Graphics();
  private slots: ParticleContainer;
  private disc: ParticleContainer;
  private ripplesG = new Graphics();
  private pool: DropPool;
  private hoppersG = new Graphics();
  private hours: DropPool;
  private sourcesLayer = new Container();
  private fxLayer = new Container();

  /**
   * Makes the year-complete finale, if there is one. The page sets this; when
   * it is null, a finished year goes straight into the dataset and the next
   * year fades in, so finales are an optional extra (see src/scene/celebration.ts).
   */
  finale: MakeFinale | null = null;
  onYearComplete: (years: number) => void = () => {};

  // ---- Minute drops, indexed like their pool
  private dType = new Uint8Array(POOL);
  private dDist = new Float32Array(POOL);
  private dOff = new Float32Array(POOL);
  private dSpd = new Float32Array(POOL);
  // ---- Flying hours, indexed like theirs
  private fType = new Uint8Array(FLIGHTS);
  private fSlot = new Int32Array(FLIGHTS);
  private fAge = new Float32Array(FLIGHTS);
  private fLife = new Float32Array(FLIGHTS);
  /** A completed ring filling in before it flies: when it started (-1 if none) and its slot */
  private fillAt = new Float64Array(N).fill(-1);
  private fillSlot = new Int32Array(N);
  private time = 0;
  private acc = new Float64Array(N);
  private kNow = new Float64Array(N);
  private pt: PathPoint = { x: 0, y: 0, nx: 0, ny: 0 };

  // ---- The year in progress
  private yearIndex = -1;
  private lastK = new Float64Array(N);
  /** Hours of each type placed (or flying) in the disc this year */
  private taken = new Int32Array(N);
  /** For each particle in the disc: when it fills, and its type */
  private partKey: number[] = [];
  private partType: number[] = [];
  private dirty = false;
  private ripples: Ripple[] = [];
  private fx: Finale | null = null;
  /** Whether the running finale is a debug preview, which returns to now when it ends */
  private fxPreview = false;
  /** Seconds since the finale started */
  private fxAge = 0;

  // ---- Pointer
  /** The waveform under the pointer (its source or hour ring) or -1, and whether the pointer is over the year */
  private pointedType = -1;
  private pointedYear = false;
  /** The waveform in focus, and how far the others have receded so far (0 to 1) */
  private focusType = -1;
  private focus = 0;
  /** Each waveform's brightness while one is focused */
  private bright = new Float32Array(N).fill(1);
  /** Debug preview: the rest of this year, filling in quickly before the finale */
  private preview: { t: number; queue: { slot: number; type: number }[]; added: number; temp: ParticleContainer } | null = null;

  // ---- Opening
  private reveal = 1;
  private emitDelay = 0;
  private introT = 1;
  private introDelay = 0;
  private introOrder: number[] = [];
  private revealed = 0;

  // ---- Layout
  private w = 1;
  private h = 1;
  private scale = 1;
  private srcX: number[] = [];
  private srcY = 0;
  private srcR = 16;
  private hopX: number[] = [];
  private hopY = 0;
  private hopR = 14;
  private ringW = 3;
  /** Where the row labels sit: beside their row, or above the circle on narrow screens */
  private rowLabels: StageLabel[] = [];
  private paths: PathLUT[] = [];
  private trackW: number[] = [];
  private dropR = 3;
  private cx = 0;
  private cy = 0;
  private R = 100;
  private c = 1;
  private dotR = 1;
  /** Spiral positions, one per hour of the year, and when each fills */
  private kx = new Float32Array(0);
  private ky = new Float32Array(0);
  private kKey = new Float32Array(0);
  /** Each type's spiral slots, in the order they fill */
  private typeSlots: Int32Array[] = [];
  private fx0 = 0;
  private fy0 = 0;
  private fx1 = 1;
  private fy1 = 1;
  private fieldPitch = 10;
  private fieldCols = 1;
  /** The dataset's circle, drawn at exactly its size on screen so its edge stays crisp (the shared one is far larger) */
  private fieldTex: Texture | null = null;
  /** Top-left of the dataset grid, fixed for the session so adding years never nudges it */
  private fieldX0 = 0;
  private fieldY0 = 0;
  /**
   * The dataset shifting along one place when a year is added. Each year is
   * drawn at its place plus an offset that moves from `from` to `to`, starting
   * with the newest.
   */
  private shift = { from: 0, to: 0, t: 0, running: false };
  /** A preview's stand-in for the year it adds, until it fades back to the real dataset */
  private standIn: Particle | null = null;
  private fieldCount = 0;
  private fieldParts: Particle[] = [];
  /** The canvas is wider than the picture; these are its edges in picture coordinates */
  private boundL = 0;
  private boundR = 1;

  constructor(
    private ctx: SceneContext,
  ) {
    this.pool = new DropPool(ctx.tex, POOL);
    this.hours = new DropPool(ctx.tex, FLIGHTS);
    this.field = new ParticleContainer({ dynamicProperties: STATIC, texture: ctx.tex });
    this.slots = new ParticleContainer({ dynamicProperties: STATIC, texture: ctx.tex });
    this.disc = new ParticleContainer({ dynamicProperties: STATIC, texture: ctx.tex });
    this.root.addChild(
      this.streamsG,
      this.hourLineG,
      this.yearLineG,
      this.fieldG,
      this.field,
      this.guideG,
      this.slots,
      this.disc,
      this.ripplesG,
      this.pool.container,
      this.hoppersG,
      this.hours.container,
      this.sourcesLayer,
      this.fxLayer,
    );
  }

  // ------------------------------------------------------------------ layout

  /** Where the canvas edges are, so animations can use the full width */
  setBounds(left: number, right: number): void {
    this.boundL = left;
    this.boundR = right;
  }

  layout(w: number, h: number): void {
    this.w = w;
    this.h = h;
    const u = Math.min(w, h);
    this.scale = u / 600;
    const pad = clamp(u * 0.04, 12, 28);
    this.srcR = clamp(u * 0.035, 10, 18);
    this.hopR = clamp(u * 0.03, 9, 16);
    this.dropR = clamp(u * 0.006, 1.8, 3.6);

    // Sources across the top, an hour ring under each, then the year, then the dataset
    this.srcY = this.srcR + 44;
    this.srcX = DATA_TYPES.map((_, i) => (w * (i + 0.5)) / N);
    this.hopY = this.srcY + this.srcR + Math.max(64, h * 0.08);
    this.hopX = this.srcX.map((x) => x + (w / 2 - x) * 0.3);
    this.ringW = Math.max(2.5, this.hopR * 0.28);
    // Make room on the left for the "1 hour" row label, shifting the rings right if needed
    const ringEdge = this.hopR + this.ringW / 2;
    const need = this.boundL + 12 + ROW_LABEL_W + ROW_LINE + 14;
    const spare = w - 6 - (this.hopX[N - 1] + ringEdge);
    const shift = Math.max(0, Math.min(spare, need - (this.hopX[0] - ringEdge)));
    this.hopX = this.hopX.map((x) => x + shift);
    const discTop = this.hopY + this.hopR + 58;
    this.fy1 = h - pad;
    this.fy0 = this.fy1 - clamp(h * 0.13, 70, 130);
    this.fx0 = pad;
    this.fx1 = w - pad;
    // Extra room under the circle keeps "The whole dataset" clearly with the circles below it
    this.R = Math.max(40, Math.min(w / 2 - 18, (this.fy0 - 88 - discTop) / 2));
    this.cx = w / 2;
    this.cy = discTop + this.R;
    this.c = (this.R - 2) / Math.sqrt(YEAR_HOURS);
    this.dotR = this.c * 0.62;

    // Tracks run from the centre of each source to the centre of its ring, so both ends tuck under
    const maxW = Math.min(this.hopR, this.srcR) * 1.3;
    this.trackW = DATA_TYPES.map((t) => Math.min(maxW, (2 + 12 * (t.share / MAX_SHARE)) * clamp(this.scale, 0.6, 1.3)));
    this.paths = DATA_TYPES.map((_, i) => {
      const sx = this.srcX[i];
      const hx = this.hopX[i];
      const sy = this.srcY;
      const hy = this.hopY;
      return new PathLUT(sx, sy, sx, sy + (hy - sy) * 0.55, hx, sy + (hy - sy) * 0.45, hx, hy);
    });

    this.placeRowLabels(pad);
    this.endPreview();
    this.endFx();
    this.placeSlots();
    this.buildSlots();
    this.buildSources();
    this.drawStreams();
    this.pool.releaseAll();
    this.hours.releaseAll();
    this.fillAt.fill(-1);
    this.ripples = [];
    this.introT = 1;
    this.layoutField();
    this.buildYear(this.ctx.clock.total());
  }

  /** "1 hour" and "1 year" row labels, each with a line pointing at its row */
  private placeRowLabels(pad: number): void {
    const line = { width: 2, color: OFF_WHITE, alpha: 0.45, cap: 'round' as const };
    const label = (name: string, x: number, y: number, align: 'left' | 'right', valign: 'top' | 'middle', appear: number): StageLabel => ({
      name,
      share: 'of recording',
      x,
      y,
      align,
      valign,
      row: true,
      appear,
    });

    // Hour rings: label to the left of the first ring
    const ringLeft = this.hopX[0] - this.hopR - this.ringW / 2;
    const hourRight = ringLeft - 5 - ROW_LINE - 8;
    this.hourLineG.clear().moveTo(hourRight + 8, this.hopY).lineTo(ringLeft - 5, this.hopY).stroke(line);
    this.rowLabels = [label('1 hour', hourRight, this.hopY, 'right', 'middle', ENTER.rings + LABEL_LAG)];

    // Year circle: to its left if there is room, otherwise above it on the left
    const rr = this.R + 10;
    const discLeft = this.cx - rr;
    const yearRight = discLeft - 5 - ROW_LINE - 8;
    const g = this.yearLineG.clear();
    if (yearRight - ROW_LABEL_W >= this.boundL + 12) {
      g.moveTo(yearRight + 8, this.cy).lineTo(discLeft - 5, this.cy).stroke(line);
      this.rowLabels.push(label('1 year', yearRight, this.cy, 'right', 'middle', ENTER.year + LABEL_LAG));
    } else {
      const top = this.hopY + this.hopR + this.ringW + 10;
      const x = pad;
      const fromX = x + 22;
      const fromY = top + 44;
      // Point at the ring straight below-right of the label
      const px = Math.max(this.cx - rr + 4, fromX + 18);
      const ang = -Math.acos((px - this.cx) / rr);
      const tx = this.cx + Math.cos(ang) * (rr + 6);
      const ty = this.cy + Math.sin(ang) * (rr + 6);
      g.moveTo(fromX, fromY).lineTo(tx, ty).stroke(line);
      this.rowLabels.push(label('1 year', x, top, 'left', 'top', ENTER.year + LABEL_LAG));
    }
  }

  /**
   * Hours sit on a sunflower spiral, which spreads them evenly over the disc.
   * Each spiral slot is given a type in turn, keeping the five shares; that
   * makes the spiral pattern. An arriving hour takes the next free slot of its
   * own type, clockwise from 12 o'clock (sweep) or from the middle out (centre).
   * Every type's slots are spread evenly, so all five keep pace.
   */
  private placeSlots(): void {
    const n = YEAR_HOURS;
    this.kx = new Float32Array(n);
    this.ky = new Float32Array(n);
    this.kKey = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const r = this.c * Math.sqrt(k + 0.5);
      this.kx[k] = this.cx + r * Math.cos(k * GOLDEN);
      this.ky[k] = this.cy + r * Math.sin(k * GOLDEN);
      let ang = Math.atan2(this.ky[k] - this.cy, this.kx[k] - this.cx) + Math.PI / 2;
      if (ang < 0) ang += Math.PI * 2;
      this.kKey[k] = ang;
    }

    // Share the hours out in a repeating block, so the spiral draws arms...
    const block = shareOut(DATA_TYPES.map((t) => t.share), PATTERN);
    const order = shareOut(block, PATTERN, true);
    const slotType = Uint8Array.from({ length: n }, (_, k) => order[k % PATTERN]);
    // ...then hand the fewest hours on, evenly spread, so each waveform gets exactly its share of the year
    const want = shareOut(DATA_TYPES.map((t) => t.share), n);
    const have = want.map((_, t) => slotType.filter((x) => x === t).length);
    const spare: number[] = [];
    have.forEach((h, t) => {
      const mine = [...slotType.keys()].filter((k) => slotType[k] === t);
      for (let j = 0; j < h - want[t]; j++) spare.push(mine[Math.floor(((j + 0.5) * mine.length) / (h - want[t]))]);
    });
    const gets = shareOut(have.map((h, t) => Math.max(0, want[t] - h)), spare.length, true);
    spare.sort((a, b) => a - b).forEach((k, i) => (slotType[k] = gets[i]));
    this.typeSlots = DATA_TYPES.map((_, t) => {
      const mine: number[] = [];
      for (let k = 0; k < n; k++) if (slotType[k] === t) mine.push(k);
      return Int32Array.from(mine.sort((a, b) => this.kKey[a] - this.kKey[b]));
    });
  }

  private nextSlot(t: number): number {
    const list = this.typeSlots[t];
    return list[Math.min(this.taken[t]++, list.length - 1)];
  }

  /** Every hour of the year, shown faintly, so the disc reads as a container being filled */
  private buildSlots(): void {
    this.slots.removeParticles();
    const s = (this.dotR * 0.8) / TEX_RADIUS;
    for (let k = 0; k < YEAR_HOURS; k++) {
      this.slots.addParticle(
        new Particle({ texture: this.ctx.tex, x: this.kx[k], y: this.ky[k], anchorX: 0.5, anchorY: 0.5, scaleX: s, scaleY: s, tint: OFF_WHITE, alpha: 0.16 }),
      );
    }
    this.slots.update();
  }

  private buildSources(): void {
    this.sourcesLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    DATA_TYPES.forEach((type, i) => {
      const s = sourceDisc(type, this.srcR);
      s.position.set(this.srcX[i], this.srcY);
      this.sourcesLayer.addChild(s);
    });
  }

  private drawStreams(): void {
    const g = this.streamsG.clear();
    this.paths.forEach((p, i) => {
      p.trace(g, this.reveal);
      g.stroke({ width: this.trackW[i], color: OFF_WHITE, alpha: TRACK_ALPHA * this.bright[i], cap: 'round', join: 'round' });
    });
  }

  // ------------------------------------------------------------------ the dataset: finished years

  private layoutField(): void {
    const n = this.fieldCount + 1;
    const fw = this.fx1 - this.fx0;
    const fh = this.fy1 - this.fy0;
    let best = 0;
    for (let cols = 1; cols <= n; cols++) {
      const p = Math.min(fw / cols, fh / Math.ceil(n / cols));
      if (p > best) {
        best = p;
        this.fieldCols = cols;
      }
    }
    this.fieldPitch = Math.min(best, 22);
    const gw = this.fieldCols * this.fieldPitch;
    const gh = Math.ceil(n / this.fieldCols) * this.fieldPitch;
    this.fieldX0 = this.fx0 + (this.fx1 - this.fx0 - gw) / 2;
    this.fieldY0 = this.fy0 + (this.fy1 - this.fy0 - gh) / 2;
    // The circle sits centred in a box with room round it, so its soft edge isn't trimmed
    const r = this.fieldPitch * 0.38;
    const box = Math.ceil(2 * r) + 2;
    const circle = new Graphics().circle(box / 2, box / 2, r).fill({ color: 0xffffff });
    this.fieldTex?.destroy(true);
    this.fieldTex = this.ctx.renderer.generateTexture({
      target: circle,
      frame: new Rectangle(0, 0, box, box),
      resolution: this.ctx.renderer.resolution,
      antialias: true,
    });
    this.field.texture = this.fieldTex;
    circle.destroy();
  }

  /**
   * Place k along the dataset, which runs as one chain in a snake: the first
   * row left to right, the next right to left, and so on. Place 0, the head, is
   * the year filling now, nearest the big disc; the newest finished year is 1.
   * Fractional places sit on the straight line between two, so a year at the
   * end of a row steps straight down to the next.
   */
  private slotPos(k: number): { x: number; y: number } {
    const at = (j: number) => {
      const cols = this.fieldCols;
      const row = Math.floor(j / cols);
      const c = row % 2 ? cols - 1 - (j % cols) : j % cols;
      return { x: this.fieldX0 + (c + 0.5) * this.fieldPitch, y: this.fieldY0 + (row + 0.5) * this.fieldPitch };
    };
    const j = Math.floor(k);
    const f = k - j;
    if (f < 1e-6) return at(j);
    const a = at(j);
    const b = at(j + 1);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  /** Draw the dataset part-way through a shift: each year at its place plus its share of the offset */
  private placeField(): void {
    const { from, to, t } = this.shift;
    const base = 1;
    const put = (p: Particle, k: number) => {
      // How far through its step this place is: the wave starts at the newest year and runs to the oldest
      const f = clamp((t - (SHIFT_WAVE_S * Math.max(0, k - 1)) / this.fieldCount) / SHIFT_STEP_S, 0, 1);
      const { x, y } = this.slotPos(k + from + (to - from) * ease(f));
      p.x = x;
      p.y = y;
      p.scaleX = p.scaleY = base * (1 + SHIFT_SWELL * Math.sin(Math.PI * f));
    };
    this.fieldParts.forEach((p, i) => put(p, this.fieldCount - i));
    if (this.standIn) put(this.standIn, 0);
    this.field.update();
  }

  /** Start the dataset shifting from one offset to another */
  private startShift(from: number, to: number): void {
    this.shift = { from, to, t: 0, running: true };
    this.placeField();
  }

  /** Back to the real dataset: drop a preview's stand-in and any offset */
  private settleShift(): void {
    if (this.standIn) this.field.removeParticle(this.standIn);
    this.standIn = null;
    this.shift = { from: 0, to: 0, t: 0, running: false };
  }

  private drawField(): void {
    this.settleShift();
    this.field.removeParticles();
    this.fieldParts = [];
    for (let i = 0; i < this.fieldCount; i++) {
      const { x, y } = this.slotPos(this.fieldCount - i);
      const p = new Particle({ texture: this.fieldTex!, x, y, anchorX: 0.5, anchorY: 0.5, tint: OFF_WHITE, alpha: 0.9 });
      this.fieldParts.push(p);
      this.field.addParticle(p);
    }
    this.field.update();

    this.drawLens();
  }

  /** The year filling now, tied to the big disc by two lines like a magnifier */
  private drawLens(): void {
    const g = this.fieldG.clear();
    const { x, y } = this.slotPos(0);
    const r = Math.max(3, this.fieldPitch * 0.42);
    const rr = this.R + 10;
    const d = Math.hypot(x - this.cx, y - this.cy);
    if (d > rr + r) {
      const phi = Math.atan2(y - this.cy, x - this.cx);
      const a = Math.acos((rr - r) / d);
      for (const side of [1, -1]) {
        const ang = phi + side * a;
        g.moveTo(this.cx + Math.cos(ang) * rr, this.cy + Math.sin(ang) * rr)
          .lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r)
          .stroke({ width: 3, color: TRACK_SOLID, cap: 'round' });
      }
    }
    g.circle(x, y, r).stroke({ width: 2, color: OFF_WHITE, alpha: 0.85 });
  }

  // ------------------------------------------------------------------ the year disc

  private addDiscDot(slot: number, type: number): void {
    const t = DATA_TYPES[type];
    const s = this.dotR / TEX_RADIUS;
    this.partKey.push(this.kKey[slot]);
    this.partType.push(type);
    this.disc.addParticle(
      new Particle({ texture: this.ctx.tex, x: this.kx[slot], y: this.ky[slot], anchorX: 0.5, anchorY: 0.5, scaleX: s, scaleY: s, tint: t.color, alpha: t.alpha * this.bright[type] }),
    );
    this.dirty = true;
  }

  /** Every hour of each type completed so far this year */
  private buildYear(T: number): void {
    this.yearIndex = Math.floor(T / YEAR_HOURS);
    const y0 = this.yearIndex * YEAR_HOURS;
    this.disc.removeParticles();
    this.partKey = [];
    this.partType = [];
    this.taken.fill(0);
    DATA_TYPES.forEach((type, t) => {
      const done = Math.max(0, Math.floor(type.share * T) - Math.ceil(type.share * y0 - 1e-9) + 1);
      for (let j = 0; j < done; j++) this.addDiscDot(this.nextSlot(t), t);
      this.lastK[t] = Math.floor(type.share * T);
    });
    if (this.fieldCount !== this.yearIndex) {
      this.fieldCount = this.yearIndex;
      this.layoutField();
    }
    this.drawField();
  }

  /**
   * Before a year's finale, put in its last hours: any still flying or filling
   * in, and any that ended while the picture wasn't being drawn (scrolled away
   * or a hidden tab). The finale then always has the whole year.
   */
  private closeYear(): void {
    for (let i = 0; i < FLIGHTS; i++) {
      if (!this.hours.active[i]) continue;
      this.addDiscDot(this.fSlot[i], this.fType[i]);
      this.hours.release(i);
    }
    const end = (this.yearIndex + 1) * YEAR_HOURS;
    DATA_TYPES.forEach((type, t) => {
      if (this.fillAt[t] >= 0) {
        this.addDiscDot(this.fillSlot[t], t);
        this.fillAt[t] = -1;
      }
      // Hours of this type that completed before the year ended
      const last = Math.ceil(type.share * end - 1e-9) - 1;
      for (; this.lastK[t] < last; this.lastK[t]++) this.addDiscDot(this.nextSlot(t), t);
    });
  }

  /** Every hour in the disc, plus any flying or filling in, as dots for a finale */
  private yearDots(): FinaleDot[] {
    const dots: FinaleDot[] = (this.disc.particleChildren as Particle[]).map((p, i) => ({ x: p.x, y: p.y, tint: p.tint, alpha: p.alpha, type: this.partType[i] }));
    const add = (slot: number, type: number) =>
      dots.push({ x: this.kx[slot], y: this.ky[slot], tint: DATA_TYPES[type].color, alpha: DATA_TYPES[type].alpha, type });
    for (let i = 0; i < FLIGHTS; i++) if (this.hours.active[i]) add(this.fSlot[i], this.fType[i]);
    DATA_TYPES.forEach((_, t) => this.fillAt[t] >= 0 && add(this.fillSlot[t], t));
    return dots;
  }

  /**
   * A year of recording is complete: it goes into the dataset and the next one
   * starts. With a finale, the year lands once the finale brings it there;
   * without one, it lands straight away and the next year's hours fade in.
   */
  private completeYear(T: number, next: boolean): void {
    this.endPreview();
    const dots = next && this.finale ? this.yearDots() : [];
    this.hours.releaseAll();
    this.fillAt.fill(-1);
    this.endFx();
    this.buildYear(T);
    this.onYearComplete(this.fieldCount);
    if (!next) return;

    // Until it lands, the dataset stays as it was, with the head waiting for the finished year
    const newest = this.fieldParts[this.fieldCount - 1];
    newest.alpha = 0;
    this.shift.from = this.shift.to = -1;
    this.placeField();
    const target = this.slotPos(0);
    // It lands on the head, then every year shifts along one place to make room for the next
    const land = () => {
      newest.alpha = 0.9;
      this.ripples.push({ x: target.x, y: target.y, age: 0 });
      this.startShift(-1, 0);
    };
    if (dots.length) {
      this.startFx(dots, target, this.fieldCount, false, land);
      return;
    }
    land();
    for (const layer of [this.slots, this.disc]) {
      layer.alpha = 0;
      this.ctx.tweens.add(0.6, ease, (a) => (layer.alpha = a), { owner: this });
    }
  }

  private startFx(dots: FinaleDot[], target: { x: number; y: number }, years: number, preview: boolean, onLand: () => void): void {
    this.disc.alpha = 0;
    this.fxAge = 0;
    const fx = this.finale!(
      {
        cx: this.cx,
        cy: this.cy,
        R: this.R,
        w: this.w,
        h: this.h,
        x0: Math.min(0, this.boundL),
        x1: Math.max(this.w, this.boundR),
        dotR: this.dotR,
        ring: this.R + 10,
        slotR: Math.max(3, this.fieldPitch * 0.42),
        tx: target.x,
        ty: target.y,
        tr: this.fieldPitch * 0.38,
        years,
      },
      dots,
    );
    fx.onLand = onLand;
    this.fxLayer.addChild(fx.root);
    this.fx = fx;
    this.fxPreview = preview;
  }

  /**
   * Debug: fill the rest of this year quickly, play the finale into the
   * current year's slot, then sweep back to where the year really is. The
   * live clock, counts and dataset are never touched.
   */
  previewFinale(): void {
    if (!this.finale || this.fx || this.preview) return;
    const queue: { slot: number; type: number; key: number }[] = [];
    DATA_TYPES.forEach((_, t) => {
      const list = this.typeSlots[t];
      for (let j = this.taken[t]; j < list.length; j++) queue.push({ slot: list[j], type: t, key: this.kKey[list[j]] });
    });
    queue.sort((a, b) => a.key - b.key);
    const temp = new ParticleContainer({ dynamicProperties: STATIC, texture: this.ctx.tex });
    this.root.addChildAt(temp, this.root.getChildIndex(this.disc) + 1);
    this.preview = { t: 0, queue, added: 0, temp };
  }

  /** The pointer is over the picture, at this point in its coordinates */
  pointAt(x: number, y: number): void {
    this.pointedType = -1;
    this.pointedYear = false;
    if (this.fx || this.preview) return;
    for (let t = 0; t < N; t++) {
      const nearSource = Math.hypot(x - this.srcX[t], y - this.srcY) < this.srcR * 1.5;
      const nearRing = Math.hypot(x - this.hopX[t], y - this.hopY) < this.hopR * 1.6;
      if (nearSource || nearRing) this.pointedType = t;
    }
    this.pointedYear = this.pointedType < 0 && Math.hypot(x - this.cx, y - this.cy) < this.R + 14;
  }

  pointAway(): void {
    this.pointedType = -1;
    this.pointedYear = false;
  }

  /** Whether the pointer is over the year's circle (outside a finale) */
  get overYear(): boolean {
    return this.pointedYear;
  }

  /** The waveform under the pointer (its source or hour ring), or -1 */
  get pointedSignal(): number {
    return this.pointedType;
  }

  /**
   * Where a waveform's name goes while it is in focus (its bottom left corner):
   * just outside the year's ring at 2 o'clock, so it reads as labelling the
   * year's hours. Where it would run past the right edge (a narrow screen), it
   * steps back up the ring towards 12 o'clock until it fits. Below and to the
   * left of that corner the ring curves away, so the name never touches it.
   */
  placeSignal(width: number, right: number): { x: number; y: number } {
    const r = this.R + 22;
    let a = -Math.PI / 6;
    while (a > -Math.PI / 2 && this.cx + r * Math.cos(a) + width > right) a -= Math.PI / 36;
    return { x: Math.min(this.cx + r * Math.cos(a), right - width), y: this.cy + r * Math.sin(a) };
  }

  /**
   * Hours of a waveform that are complete but not yet in the year: filling in
   * on its ring or flying in. The page counts the dataset without them, so its
   * figures tick up as each hour lands, in step with the picture.
   */
  pending(t: number): number {
    let n = this.fillAt[t] >= 0 ? 1 : 0;
    for (let i = 0; i < FLIGHTS; i++) if (this.hours.active[i] && this.fType[i] === t) n++;
    return n;
  }

  /** The dataset total at which the current year of recording completes */
  get nextYearTotal(): number {
    return (this.yearIndex + 1) * YEAR_HOURS;
  }

  /** A light response to the pointer: the waveform pointed at stays bright while the other four recede */
  private respond(dt: number): void {
    const type = this.pointedType;
    const towards = (v: number, to: number, seconds: number) => (to > v ? Math.min(to, v + dt / seconds) : Math.max(to, v - dt / seconds));

    // A waveform in focus: the other four recede
    if (type >= 0) this.focusType = type;
    const focus = towards(this.focus, type >= 0 ? 1 : 0, 0.2);
    if (focus !== this.focus || (type >= 0 && this.bright[type] < 1)) {
      this.focus = focus;
      const dim = 1 - FOCUS_RECEDE * ease(focus);
      for (let t = 0; t < N; t++) this.bright[t] = t === this.focusType ? 1 : dim;
      this.sourcesLayer.children.forEach((s, t) => (s.alpha = this.bright[t]));
      this.drawStreams();
      (this.disc.particleChildren as Particle[]).forEach((d, i) => (d.alpha = DATA_TYPES[this.partType[i]].alpha * this.bright[this.partType[i]]));
      this.dirty = true;
    }

  }

  private stepPreview(dt: number): void {
    const pv = this.preview;
    if (!pv) return;
    pv.t += dt;
    const shown = Math.floor(pv.queue.length * ease(Math.min(1, pv.t / PREVIEW_FILL_S)));
    const s = this.dotR / TEX_RADIUS;
    for (; pv.added < shown; pv.added++) {
      const q = pv.queue[pv.added];
      const t = DATA_TYPES[q.type];
      pv.temp.addParticle(
        new Particle({ texture: this.ctx.tex, x: this.kx[q.slot], y: this.ky[q.slot], anchorX: 0.5, anchorY: 0.5, scaleX: s, scaleY: s, tint: t.color, alpha: t.alpha }),
      );
    }
    if (pv.t < PREVIEW_FILL_S + 0.25) return;
    // Full: the finale gets every hour of the year, landing in the slot this year will take
    const dots = this.yearDots();
    for (const q of pv.queue) dots.push({ x: this.kx[q.slot], y: this.ky[q.slot], tint: DATA_TYPES[q.type].color, alpha: DATA_TYPES[q.type].alpha, type: q.type });
    this.endPreview();
    const target = this.slotPos(0);
    this.startFx(dots, target, this.fieldCount + 1, true, () => {
      this.ripples.push({ x: target.x, y: target.y, age: 0 });
      this.standIn = new Particle({ texture: this.fieldTex!, x: target.x, y: target.y, anchorX: 0.5, anchorY: 0.5, tint: OFF_WHITE, alpha: 0.9 });
      this.field.addParticle(this.standIn);
      this.startShift(0, 1);
      // Once the added year has been seen, put the real dataset back. The years are identical
      // circles, so stepping them all back one place shows only at the head and the tail.
      this.ctx.tweens.add(0.01, (v) => v, () => {}, {
        delay: SHIFT_WAVE_S + SHIFT_STEP_S + PREVIEW_HOLD_S,
        owner: this,
        onDone: () => {
          this.settleShift();
          this.placeField();
        },
      });
    });
  }

  private endPreview(): void {
    if (!this.preview) return;
    this.preview.temp.destroy();
    this.preview = null;
  }

  /** Hide the hours already in the disc, then fill them in, in the order the year fills */
  private fillIntro(delay: number): void {
    const kids = this.disc.particleChildren;
    kids.forEach((p) => (p.scaleX = p.scaleY = 0));
    this.introOrder = kids.map((_, i) => i).sort((a, b) => this.partKey[a] - this.partKey[b]);
    this.revealed = 0;
    this.introT = 0;
    this.introDelay = delay;
    this.dirty = true;
  }

  private endFx(): void {
    if (!this.fx) return;
    this.fx.destroy();
    this.fx = null;
    this.fxPreview = false;
    this.slots.alpha = 1;
    this.disc.alpha = 1;
  }

  // ------------------------------------------------------------------ entrance

  /** The entrance, top to bottom as the data flows (see ENTER); labels follow the same timings */
  enter(): void {
    const tw = this.ctx.tweens;
    const grow = (delay: number, set: (v: number) => void) => {
      set(0);
      tw.add(0.73, ease, set, { delay, owner: this });
    };
    const fade = (layer: Container, delay: number, seconds = 0.73, curve = ease) => {
      layer.alpha = 0;
      tw.add(seconds, curve, (v) => (layer.alpha = v), { delay, owner: this });
    };
    this.sourcesLayer.children.forEach((s, i) => grow(i * ENTER.stagger, (v) => s.scale.set(v)));
    this.reveal = 0;
    this.drawStreams();
    tw.add(0.7, ease, (v) => {
      this.reveal = v;
      this.drawStreams();
    }, { delay: ENTER.streams, owner: this });
    for (let t = 0; t < N; t++) grow(ENTER.rings + t * ENTER.stagger, (v) => (this.ringIn[t] = v));
    fade(this.hourLineG, ENTER.rings + LABEL_LAG, LABEL_FADE_S, (v) => v);
    fade(this.guideG, ENTER.year);
    fade(this.slots, ENTER.year);
    fade(this.yearLineG, ENTER.year + LABEL_LAG, LABEL_FADE_S, (v) => v);
    fade(this.field, ENTER.dataset);
    fade(this.fieldG, ENTER.dataset);
    this.fillIntro(ENTER.hours);
    this.emitDelay = ENTER.streams + 0.3;
  }

  // ------------------------------------------------------------------ frame

  private spawnDrop(type: number): void {
    const i = this.pool.alloc();
    if (i < 0) return;
    this.dType[i] = type;
    this.dDist[i] = this.srcR * 0.6 + rand(0, 3);
    this.dOff[i] = (Math.random() - 0.5) * this.trackW[type] * 0.6;
    this.dSpd[i] = rand(0.85, 1.15);
    const p = this.pool.particles[i];
    p.tint = DATA_TYPES[type].color;
    p.alpha = DATA_TYPES[type].alpha;
    p.scaleX = p.scaleY = this.dropR / TEX_RADIUS;
  }

  /** A finished hour leaves its ring as a solid circle, shrinks and flies to its place */
  private launchHour(type: number, slot: number): void {
    const i = this.hours.alloc();
    if (i < 0) {
      this.addDiscDot(slot, type);
      return;
    }
    this.fType[i] = type;
    this.fSlot[i] = slot;
    this.fAge[i] = 0;
    this.fLife[i] = clamp(Math.hypot(this.kx[slot] - this.hopX[type], this.ky[slot] - this.hopY) / (320 * this.scale), 0.6, 1.3);
    const p = this.hours.particles[i];
    p.tint = DATA_TYPES[type].color;
    p.alpha = DATA_TYPES[type].alpha;
    p.x = this.hopX[type];
    p.y = this.hopY;
    p.scaleX = p.scaleY = (this.hopR + this.ringW / 2) / TEX_RADIUS;
  }

  /** Bring the disc up to date with the clock */
  private sync(): void {
    const T = this.ctx.clock.total();
    const yi = Math.floor(T / YEAR_HOURS);
    if (yi !== this.yearIndex) {
      const next = yi === this.yearIndex + 1;
      if (next) this.closeYear();
      this.completeYear(T, next);
      return;
    }
    let fresh = 0;
    for (let t = 0; t < N; t++) {
      this.kNow[t] = Math.floor(DATA_TYPES[t].share * T);
      fresh += this.kNow[t] - this.lastK[t];
    }
    const fly = fresh <= MAX_FLIGHTS_PER_FRAME;
    for (let t = 0; t < N; t++) {
      for (; this.lastK[t] < this.kNow[t]; this.lastK[t]++) {
        const slot = this.nextSlot(t);
        if (!fly) this.addDiscDot(slot, t);
        else if (this.fillAt[t] < 0) {
          this.fillAt[t] = this.time;
          this.fillSlot[t] = slot;
        } else this.launchHour(t, slot);
      }
    }
  }

  update(dt: number): void {
    this.time += dt;
    const T = this.ctx.clock.total();
    this.sync();
    this.stepPreview(dt);
    this.respond(dt);
    if (this.shift.running) {
      this.shift.t += dt;
      this.placeField();
      this.shift.running = this.shift.t < SHIFT_WAVE_S + SHIFT_STEP_S;
    }

    // Hour rings: how much of the current hour of each type has arrived, on a solid base
    const g = this.hoppersG.clear();
    const ringW = this.ringW;
    DATA_TYPES.forEach((type, t) => {
      const x = this.hopX[t];
      const y = this.hopY;
      const f = type.share * T - Math.floor(type.share * T);
      // Grown in from the centre during the entrance
      const k = this.ringIn[t];
      if (k <= 0) return;
      const r = this.hopR * k;
      const w = ringW * k;
      g.circle(x, y, r + w / 2).fill({ color: NAVY });
      const b = this.bright[t];
      g.circle(x, y, r).stroke({ width: w, color: OFF_WHITE, alpha: TRACK_ALPHA * 1.6 * b });
      if (f > 0.005) {
        g.moveTo(x, y - r)
          .arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f)
          .stroke({ width: w, color: type.color, alpha: type.alpha * b, cap: 'round' });
      }
      // A completed ring fills in from the outside to a solid circle, which then flies
      if (this.fillAt[t] >= 0) {
        const fill = ease(Math.min(1, (this.time - this.fillAt[t]) / FILL_S));
        const outer = r + w / 2;
        const width = w + (outer - w) * fill;
        g.circle(x, y, outer - width / 2).stroke({ width, color: type.color, alpha: type.alpha * b });
        if (fill >= 1) {
          this.fillAt[t] = -1;
          this.launchHour(t, this.fillSlot[t]);
        }
      }
    });

    // Opening fill: reveal the hours already in the disc, in fill order
    let shown = 1;
    if (this.introT < 1) {
      if (this.introDelay > 0) this.introDelay -= dt;
      else this.introT = Math.min(1, this.introT + dt / INTRO_S);
      shown = ease(this.introT);
      const order = this.introOrder;
      const kids = this.disc.particleChildren;
      const s = this.dotR / TEX_RADIUS;
      const target = this.introT >= 1 ? order.length : Math.floor(order.length * shown);
      for (let i = this.revealed; i < target; i++) kids[order[i]].scaleX = kids[order[i]].scaleY = s;
      if (target !== this.revealed) this.dirty = true;
      this.revealed = target;
    }

    // A ring round the disc, with a white arc for how much of this year of recording is done
    const gg = this.guideG.clear();
    const rr = this.R + 10;
    const look = this.fx?.ring();
    if (look) {
      // During a finale: white while the year is whole, fading to the empty outline as it lands,
      // with any opening between the magnifier arms resealing as it fades
      // Drawn exactly as the arc is outside a finale (from 12 o'clock), so nothing shifts at the handover
      const path = () => {
        const { a0, a1, ccw } = look.gap ?? { a0: -Math.PI / 2, a1: Math.PI * 1.5, ccw: false };
        return gg.moveTo(this.cx + Math.cos(a0) * rr, this.cy + Math.sin(a0) * rr).arc(this.cx, this.cy, rr, a0, a1, ccw);
      };
      path().stroke({ width: 3, color: TRACK_SOLID, cap: 'round' });
      if (look.white > 0.002) path().stroke({ width: 3, color: OFF_WHITE, alpha: 0.9 * look.white, cap: 'round' });
      // The empty hours fade out as the finale starts (they show through the see-through hours, so
      // switching them off would flicker), and back in, with a new year's first hours, as the ring fades.
      // A preview's disc stays hidden: it sweeps back in once the finale ends.
      this.fxAge += dt;
      this.slots.alpha = Math.max(1 - this.fxAge / 0.35, 1 - look.white);
      if (!this.fxPreview) this.disc.alpha = 1 - look.white;
    } else {
      gg.circle(this.cx, this.cy, rr).stroke({ width: 3, color: TRACK_SOLID });
    }
    let arc = clamp((T - this.yearIndex * YEAR_HOURS) / YEAR_HOURS, 0, 1) * shown;
    if (this.preview) arc += (1 - arc) * ease(Math.min(1, this.preview.t / PREVIEW_FILL_S));
    if (!look && arc > 0.002) {
      gg.moveTo(this.cx, this.cy - rr)
        .arc(this.cx, this.cy, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * arc)
        .stroke({ width: 3, color: OFF_WHITE, alpha: 0.9, cap: 'round' });
    }

    // New minute drops: about ten a second, whatever the clock speed
    if (this.emitDelay > 0) {
      this.emitDelay -= dt;
    } else if (dt > 0) {
      // One drop per minute of recording in real time; faster clocks make each drop carry more
      const rate = this.ctx.clock.rate() * 60 * this.ctx.quality();
      for (let t = 0; t < N; t++) {
        this.acc[t] = Math.min(this.acc[t] + rate * DATA_TYPES[t].share * dt, 4);
        for (; this.acc[t] >= 1; this.acc[t]--) this.spawnDrop(t);
      }
    }

    // Minute drops down their tracks
    const v = 130 * this.scale;
    const { pool, pt } = this;
    for (let i = 0; i < POOL; i++) {
      if (!pool.active[i]) continue;
      const path = this.paths[this.dType[i]];
      this.dDist[i] += v * this.dSpd[i] * dt;
      if (this.dDist[i] >= path.length - this.hopR * 0.4) {
        pool.release(i);
        continue;
      }
      path.sample(this.dDist[i], pt);
      const drop = pool.particles[i];
      drop.x = pt.x + pt.nx * this.dOff[i];
      drop.y = pt.y + pt.ny * this.dOff[i];
      drop.alpha = DATA_TYPES[this.dType[i]].alpha * this.bright[this.dType[i]];
    }

    // Finished hours: shrink quickly to a dot while flying to their place
    const start = this.hopR + this.ringW / 2;
    for (let i = 0; i < FLIGHTS; i++) {
      if (!this.hours.active[i]) continue;
      this.fAge[i] += dt;
      const s = this.fAge[i] / this.fLife[i];
      const slot = this.fSlot[i];
      const tx = this.kx[slot];
      const ty = this.ky[slot];
      if (s >= 1) {
        this.hours.release(i);
        this.addDiscDot(slot, this.fType[i]);
        if (this.ripples.length < 24) this.ripples.push({ x: tx, y: ty, age: 0 });
        continue;
      }
      const e = ease(s);
      const lift = Math.sin(Math.PI * e) * 0.18;
      const x0 = this.hopX[this.fType[i]];
      const dx = tx - x0;
      const dy = ty - this.hopY;
      const p = this.hours.particles[i];
      p.alpha = DATA_TYPES[this.fType[i]].alpha * this.bright[this.fType[i]];
      p.x = x0 + dx * e - dy * lift;
      p.y = this.hopY + dy * e + dx * lift;
      p.scaleX = p.scaleY = (start + (this.dotR - start) * ease(Math.min(1, s / 0.6))) / TEX_RADIUS;
    }

    // Landing ripples
    const rg = this.ripplesG.clear();
    for (let j = this.ripples.length - 1; j >= 0; j--) {
      const rp = this.ripples[j];
      rp.age += dt;
      const s = rp.age / 0.9;
      if (s >= 1) {
        this.ripples.splice(j, 1);
        continue;
      }
      rg.circle(rp.x, rp.y, this.dotR + 2 + 10 * this.scale * ease(s)).stroke({ width: 1.5, color: OFF_WHITE, alpha: 0.8 * easeExit(1 - s) });
    }

    // The year-complete show. After a preview, the disc sweeps back to its real fill.
    if (this.fx && !this.fx.update(dt)) {
      const wasPreview = this.fxPreview;
      this.endFx();
      if (wasPreview) this.fillIntro(0.15);
    }

    if (this.dirty) {
      this.disc.update();
      this.dirty = false;
    }
  }

  // ------------------------------------------------------------------ text

  labels(): StageLabel[] {
    const spacing = this.srcX[1] - this.srcX[0];
    const out: StageLabel[] = DATA_TYPES.map((t, i) => ({
      name: t.short,
      share: `${(t.share * 100).toFixed(1)}%`,
      x: this.srcX[i],
      y: this.srcY - this.srcR - 6,
      align: 'center',
      valign: 'bottom',
      maxWidth: spacing - 6,
      appear: i * ENTER.stagger + LABEL_LAG,
    }));
    out.push(...this.rowLabels);
    out.push({
      name: 'The whole dataset',
      share: `${fmt.int(this.fieldCount)} years of recording, one circle per year`,
      x: this.w / 2,
      y: this.fy0 - 4,
      align: 'center',
      valign: 'bottom',
      tier: true,
      appear: ENTER.dataset + LABEL_LAG,
    });
    return out;
  }
}
