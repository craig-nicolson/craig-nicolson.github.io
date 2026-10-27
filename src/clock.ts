import { FLOW, MEAN_HOURS_PER_SECOND } from './config';

const HOUR_MS = 3_600_000;
/**
 * The live total is added up in 15-minute steps, each at one fixed rate taken
 * from the middle of the step. That is plenty for a daily curve, and it means
 * the total only ever goes up, even across sudden changes like midnight into
 * a weekend.
 */
const STEP_MS = 15 * 60_000;

const ukParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});
const offsets = new Map<number, number>();

/** UK clock offset from UTC at this moment (summer time aware), cached by the hour */
function ukOffset(ms: number): number {
  const key = Math.floor(ms / HOUR_MS);
  let off = offsets.get(key);
  if (off === undefined) {
    const p = ukParts.formatToParts(new Date(key * HOUR_MS));
    const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
    off = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - key * HOUR_MS;
    if (offsets.size > 20_000) offsets.clear();
    offsets.set(key, off);
  }
  return off;
}

/** The daily and weekly pattern at this UK local time: 1 is average */
function shapeAt(local: number): number {
  const hour = (((local / HOUR_MS) % 24) + 24) % 24;
  const weekday = (((Math.floor(local / 86_400_000) + 4) % 7) + 7) % 7; // 0 is Sunday
  const w = FLOW.weekendFactor;
  const day = weekday === 0 || weekday === 6 ? w : (7 - 2 * w) / 5;
  return day * (1 + FLOW.swing * Math.cos((2 * Math.PI * (hour - FLOW.peakHour)) / 24));
}

// ---- Hour-to-hour wander, as patients connect and disconnect

/** A repeatable random number from 0 to 1 for a whole number */
function hash01(n: number): number {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4_294_967_296;
}

/** A repeatable bell-curve number for a whole number, kept within ±2.5 */
function hashNormal(n: number): number {
  const u1 = Math.max(1e-9, hash01(n * 2 + 1));
  const u2 = hash01(n * 2 + 2);
  return Math.max(-2.5, Math.min(2.5, Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)));
}

const dayMeans = new Map<number, number>();

/** The wander for one local hour, balanced so each UK day's hours average out */
function hourNode(hourIndex: number): number {
  const day = Math.floor(hourIndex / 24);
  let mean = dayMeans.get(day);
  if (mean === undefined) {
    mean = 0;
    for (let k = 0; k < 24; k++) mean += hashNormal(day * 24 + k);
    mean /= 24;
    if (dayMeans.size > 5_000) dayMeans.clear();
    dayMeans.set(day, mean);
  }
  return hashNormal(hourIndex) - mean;
}

/**
 * Blending smoothly between hours narrows the spread of hourly totals to about
 * 0.83 of the hourly values' spread; this restores it, so hourlyVariation means
 * what it says.
 */
const SMOOTHING = 1.21;

/** Smooth, repeatable wander around the pattern: the same for every visitor */
function wanderAt(local: number): number {
  const v = FLOW.hourlyVariation;
  if (v <= 0) return 1;
  const u = local / HOUR_MS - 0.5;
  const i = Math.floor(u);
  const s = (1 - Math.cos(Math.PI * (u - i))) / 2;
  const n = hourNode(i) * (1 - s) + hourNode(i + 1) * s;
  return Math.max(0.2, 1 + v * SMOOTHING * n);
}

/** The daily and weekly pattern only, without the hourly wander */
export function shapeFactor(ms: number): number {
  return shapeAt(ms + ukOffset(ms));
}

/** How busy this moment is compared with the average (1 is average), including the hourly wander */
export function rateFactor(ms: number): number {
  const local = ms + ukOffset(ms);
  return shapeAt(local) * wanderAt(local);
}

/**
 * Real time, so every visitor sees the same live state. The total starts from
 * the dataset size at FLOW.asOf and adds the modelled rate since then. In debug
 * mode the clock can run faster or jump forward; it never runs backwards.
 */
export class LiveClock {
  private baseWall = Date.now();
  private basePerf = performance.now();
  private factor = 1;
  readonly openMs = this.baseWall;
  readonly openTotal: number;
  // Running sum from FLOW.asOf, kept at a 15-minute boundary
  private sumAt = FLOW.asOfMs;
  private sum = 0;

  constructor() {
    this.openTotal = this.totalAt(this.openMs);
  }

  now(): number {
    return this.baseWall + (performance.now() - this.basePerf) * this.factor;
  }

  get speed(): number {
    return this.factor;
  }

  setFactor(f: number): void {
    this.baseWall = this.now();
    this.basePerf = performance.now();
    this.factor = f;
  }

  /** The fixed rate for the 15-minute step this moment falls in, so the shown rate matches the total */
  private stepFactor(ms: number): number {
    if (ms <= FLOW.asOfMs) return 1;
    const start = FLOW.asOfMs + Math.floor((ms - FLOW.asOfMs) / STEP_MS) * STEP_MS;
    return rateFactor(start + STEP_MS / 2);
  }

  /** Hours of recording arriving each second, right now */
  rate(): number {
    return MEAN_HOURS_PER_SECOND * this.stepFactor(this.now());
  }

  totalAt(ms: number): number {
    // Before the anchor, assume the average rate
    if (ms <= FLOW.asOfMs) return FLOW.totalHours - (MEAN_HOURS_PER_SECOND * (FLOW.asOfMs - ms)) / 1000;
    if (ms < this.sumAt) {
      this.sumAt = FLOW.asOfMs;
      this.sum = 0;
    }
    while (this.sumAt + STEP_MS <= ms) {
      this.sum += (MEAN_HOURS_PER_SECOND * rateFactor(this.sumAt + STEP_MS / 2) * STEP_MS) / 1000;
      this.sumAt += STEP_MS;
    }
    const part = ms - this.sumAt;
    return FLOW.totalHours + this.sum + (MEAN_HOURS_PER_SECOND * rateFactor(this.sumAt + STEP_MS / 2) * part) / 1000;
  }

  /** Hours of recording in the dataset now */
  total(): number {
    return this.totalAt(this.now());
  }


  /** Seconds since the page opened, on this clock */
  get secondsHere(): number {
    return (this.now() - this.openMs) / 1000;
  }
}
