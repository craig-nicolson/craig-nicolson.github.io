/**
 * Design settings live here. The data (rates, shares and the dataset total)
 * lives in flow.json, which is meant to be refreshed every month or two.
 */
import flow from './flow.json';

// DataLoch palette (style guide section 2). Numbers are for PixiJS tints.
export const NAVY = 0x334c61;
export const OFF_WHITE = 0xfaf7f7;
export const TEAL = 0x63bda3;
export const BLUE = 0x0087b5;
export const GOLD = 0xf59e17;
export const RED = 0xe52147;

/** Track tint: off-white at 10% on navy. Used for guides, tracks and empty rings. */
export const TRACK_ALPHA = 0.1;

/** A palette tint pre-mixed onto navy, for lines that must join without doubling up where they overlap */
const mix = (a: number, b: number, t: number) =>
  [16, 8, 0].reduce((out, sh) => out | (Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t) << sh), 0);
export const TRACK_SOLID = mix(NAVY, OFF_WHITE, 0.14);
/** The fifth type uses the muted "Other" treatment: off-white at low opacity. */
export const OTHER_ALPHA = 0.3;

/** One year of recording */
export const YEAR_HOURS = 8_760;

/** How the year disc fills: clockwise from the top like a clock, or from the centre out */
export type YearFill = 'sweep' | 'centre';
export const YEAR_FILL: YearFill = 'sweep';

export interface DataType {
  /** Short label for small spaces, and the key used in flow.json */
  short: string;
  /** Full name */
  name: string;
  /** Set from flow.json */
  share: number;
  color: number;
  alpha: number;
  css: string;
  iconColor: number;
}

// Typical ICU waveforms, used as stand-ins until the real five types are confirmed.
// On navy the guide prefers teal and gold, so the two largest types get them.
// Shares here are placeholders: the real ones come from flow.json, matched by `short`.
const TYPES: DataType[] = [
  { short: 'ECG', name: 'Electrocardiogram (ECG)', share: 0.4, color: TEAL, alpha: 1, css: 'var(--dl-teal)', iconColor: NAVY },
  { short: 'ABP', name: 'Arterial blood pressure (ABP)', share: 0.3, color: GOLD, alpha: 1, css: 'var(--dl-gold)', iconColor: NAVY },
  { short: 'Pleth', name: 'Plethysmogram (pleth)', share: 0.2, color: BLUE, alpha: 1, css: 'var(--dl-blue)', iconColor: OFF_WHITE },
  { short: 'Resp', name: 'Respiration', share: 0.06, color: RED, alpha: 1, css: 'var(--dl-red)', iconColor: OFF_WHITE },
  { short: 'CVP', name: 'Central venous pressure (CVP)', share: 0.04, color: OFF_WHITE, alpha: OTHER_ALPHA, css: 'var(--dl-other)', iconColor: OFF_WHITE },
];

// ------------------------------------------------------------------ the data, checked

const warn = (msg: string) => console.warn(`flow.json: ${msg}`);
const num = (v: unknown, fallback: number, name: string, ok: (n: number) => boolean): number => {
  if (typeof v === 'number' && Number.isFinite(v) && ok(v)) return v;
  if (v !== undefined) warn(`${name} is not usable, so ${fallback} is used`);
  return fallback;
};
/** Keep a value in a sensible range, saying so if it had to be changed */
const within = (v: number, lo: number, hi: number, name: string): number => {
  const c = Math.min(hi, Math.max(lo, v));
  if (c !== v) warn(`${name} of ${v} is outside ${lo}–${hi}, so ${c} is used`);
  return c;
};

const asOfMs = Date.parse(String(flow.asOf));
if (Number.isNaN(asOfMs)) warn('asOf is not a date, so now is used');

/**
 * The model behind the live figures: an average daily rate, shaped by time of
 * day and by weekday or weekend (UK time), and anchored to the dataset total
 * at a set moment. Every figure on the page comes from this.
 */
export const FLOW = {
  asOfMs: Number.isNaN(asOfMs) ? Date.now() : asOfMs,
  totalHours: num(flow.totalHours, 0, 'totalHours', (n) => n >= 0),
  hoursPerDay: num(flow.hoursPerDay, 15_000, 'hoursPerDay', (n) => n > 0),
  /** Daily swing either side of the average (0.12 = ±12%), at most ±50% */
  swing: within(num(flow.daily?.swing, 0, 'daily.swing', (n) => n >= 0), 0, 0.5, 'daily.swing'),
  peakHour: ((num(flow.daily?.peakHour, 14, 'daily.peakHour', () => true) % 24) + 24) % 24,
  /** Weekend rate compared with the weekly average (0.9 = 10% quieter); weekdays make up the rest */
  weekendFactor: within(num(flow.weekendFactor, 1, 'weekendFactor', (n) => n > 0), 0.5, 1.5, 'weekendFactor'),
  /**
   * How much hourly totals wander from the daily and weekly pattern, as patients
   * connect and disconnect: the standard deviation of hourly totals divided by the
   * expected value (0.08 = a typical hour within about ±8%). At most 0.3.
   */
  hourlyVariation: within(num(flow.hourlyVariation, 0, 'hourlyVariation', (n) => n >= 0), 0, 0.3, 'hourlyVariation'),
};

/** Average hours of recording arriving each second */
export const MEAN_HOURS_PER_SECOND = FLOW.hoursPerDay / 86_400;

// Shares: matched by name, negatives dropped, then scaled to add up to exactly 1
{
  const given = (flow.shares ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(given)) if (!TYPES.some((t) => t.short === key)) warn(`share for unknown type ${key} is ignored`);
  const raw = TYPES.map((t) => {
    const v = given[t.short];
    if (v === undefined) warn(`no share for ${t.short}, so 0 is used`);
    return typeof v === 'number' && v > 0 ? v : 0;
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum <= 0) warn('shares add up to 0, so the types are shared equally');
  else if (Math.abs(sum - 1) > 0.02) warn(`shares add up to ${sum.toFixed(3)}; they are scaled to add up to 1`);
  TYPES.forEach((t, i) => (t.share = sum > 0 ? raw[i] / sum : 1 / TYPES.length));
}

export const DATA_TYPES: readonly DataType[] = TYPES;
export const MAX_SHARE = Math.max(...DATA_TYPES.map((t) => t.share));

/** The animation when a year of recording completes */
export type CelebrationId = 'orbit' | 'portal' | 'spin' | 'fireworks' | 'number';
export const CELEBRATION: CelebrationId = 'orbit';
export const CELEBRATIONS: readonly { id: CelebrationId; label: string }[] = [
  { id: 'orbit', label: 'Orbit' },
  { id: 'portal', label: 'Portal' },
  { id: 'spin', label: 'Spin out' },
  { id: 'fireworks', label: 'Fireworks' },
  { id: 'number', label: 'Year count' },
];

/** Clock speeds, only offered with #debug or ?debug in the address */
export const DEBUG_SPEEDS: readonly { factor: number; label: string }[] = [
  { factor: 1, label: 'Real time' },
  { factor: 10, label: '10×' },
  { factor: 100, label: '100×' },
  { factor: 1000, label: '1,000×' },
];
