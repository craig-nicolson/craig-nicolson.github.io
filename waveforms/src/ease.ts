export type EaseFn = (t: number) => number;

/** CSS-style cubic-bezier, tabulated once so per-frame calls are cheap. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EaseFn {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const solve = (x: number) => {
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 40; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  const N = 512;
  const table = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) table[i] = sy(solve(i / N));
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const f = x * N;
    const i = Math.floor(f);
    const r = f - i;
    return table[i] + (table[i + 1] - table[i]) * r;
  };
}

// DataLoch motion curves (style guide section 7)
export const ease = cubicBezier(0.64, 0, 0, 1);
export const easeExit = cubicBezier(0.55, 0, 1, 0.45);

interface Tween {
  start: number;
  duration: number;
  fn: EaseFn;
  onUpdate: (v: number) => void;
  onDone?: () => void;
  owner?: object;
}

/** Minimal tween runner driven by the app ticker, so pausing freezes tweens. */
export class Tweens {
  private list: Tween[] = [];
  private time = 0;

  add(
    duration: number,
    fn: EaseFn,
    onUpdate: (v: number) => void,
    opts: { delay?: number; onDone?: () => void; owner?: object } = {},
  ): void {
    this.list.push({ start: this.time + (opts.delay ?? 0), duration, fn, onUpdate, onDone: opts.onDone, owner: opts.owner });
  }

  update(dt: number): void {
    this.time += dt;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      const s = (this.time - tw.start) / tw.duration;
      if (s < 0) continue;
      const c = s >= 1 ? 1 : s;
      tw.onUpdate(tw.fn(c));
      if (c >= 1) {
        this.list.splice(i, 1);
        tw.onDone?.();
      }
    }
  }

  /** Jump every tween for this owner to its end state */
  finish(owner: object): void {
    const mine = this.list.filter((t) => t.owner === owner);
    this.list = this.list.filter((t) => t.owner !== owner);
    for (const tw of mine) {
      tw.onUpdate(tw.fn(1));
      tw.onDone?.();
    }
  }

  cancel(owner: object): void {
    this.list = this.list.filter((t) => t.owner !== owner);
  }
}
