import type { Graphics } from 'pixi.js';

export interface PathPoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

/** A cubic Bézier sampled by arc length, so drops move at an even pace. */
export class PathLUT {
  readonly xs: Float32Array;
  readonly ys: Float32Array;
  readonly cum: Float32Array;
  readonly length: number;

  constructor(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, samples = 96) {
    const n = samples + 1;
    this.xs = new Float32Array(n);
    this.ys = new Float32Array(n);
    this.cum = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / samples;
      const mt = 1 - t;
      const a = mt * mt * mt;
      const b = 3 * mt * mt * t;
      const c = 3 * mt * t * t;
      const d = t * t * t;
      this.xs[i] = a * x0 + b * x1 + c * x2 + d * x3;
      this.ys[i] = a * y0 + b * y1 + c * y2 + d * y3;
      if (i > 0) this.cum[i] = this.cum[i - 1] + Math.hypot(this.xs[i] - this.xs[i - 1], this.ys[i] - this.ys[i - 1]);
    }
    this.length = this.cum[n - 1];
  }

  sample(dist: number, out: PathPoint): PathPoint {
    const { xs, ys, cum } = this;
    const last = cum.length - 1;
    const d = dist <= 0 ? 0 : dist >= this.length ? this.length : dist;
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= d) lo = mid;
      else hi = mid;
    }
    const segLen = cum[hi] - cum[lo] || 1;
    const f = (d - cum[lo]) / segLen;
    const dx = xs[hi] - xs[lo];
    const dy = ys[hi] - ys[lo];
    const len = Math.hypot(dx, dy) || 1;
    out.x = xs[lo] + dx * f;
    out.y = ys[lo] + dy * f;
    out.nx = -dy / len;
    out.ny = dx / len;
    return out;
  }

  /** Add the first part of the path (0 to 1) as a polyline */
  trace(g: Graphics, frac: number): void {
    const end = this.length * Math.min(1, Math.max(0, frac));
    g.moveTo(this.xs[0], this.ys[0]);
    for (let i = 1; i < this.cum.length; i++) {
      if (this.cum[i] <= end) {
        g.lineTo(this.xs[i], this.ys[i]);
      } else {
        const segLen = this.cum[i] - this.cum[i - 1] || 1;
        const f = (end - this.cum[i - 1]) / segLen;
        g.lineTo(this.xs[i - 1] + (this.xs[i] - this.xs[i - 1]) * f, this.ys[i - 1] + (this.ys[i] - this.ys[i - 1]) * f);
        break;
      }
    }
  }
}
