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


export interface DataType {
  /** Short label for small spaces, and the key used in flow.json */
  short: string;
  /** Full name */
  name: string;
  /** Share of recording, from flow.json */
  share: number;
  color: number;
  alpha: number;
  css: string;
  iconColor: number;
}

// The five waveform types. On navy the guide prefers teal and gold, so the two largest get them.
const TYPES: Omit<DataType, 'share'>[] = [
  { short: 'ECG', name: 'Electrocardiogram (ECG)', color: TEAL, alpha: 1, css: 'var(--dl-teal)', iconColor: NAVY },
  { short: 'ABP', name: 'Arterial blood pressure (ABP)', color: GOLD, alpha: 1, css: 'var(--dl-gold)', iconColor: NAVY },
  { short: 'Pleth', name: 'Plethysmogram', color: BLUE, alpha: 1, css: 'var(--dl-blue)', iconColor: OFF_WHITE },
  { short: 'Resp', name: 'Respiratory rate', color: RED, alpha: 1, css: 'var(--dl-red)', iconColor: OFF_WHITE },
  { short: 'CVP', name: 'Central venous pressure (CVP)', color: OFF_WHITE, alpha: OTHER_ALPHA, css: 'var(--dl-other)', iconColor: OFF_WHITE },
];

/**
 * The model behind the live figures, from flow.json: an average daily rate,
 * shaped by time of day and by weekday or weekend (UK time), with a smooth
 * hour-to-hour wander, anchored to the dataset total at a set moment. Every
 * figure on the page comes from this. npm run check:flow checks the file.
 */
export const FLOW = {
  asOfMs: Date.parse(flow.asOf),
  totalHours: flow.totalHours,
  hoursPerDay: flow.hoursPerDay,
  /** Daily swing either side of the average (0.12 = ±12%) and the UK hour it peaks */
  swing: flow.daily.swing,
  peakHour: flow.daily.peakHour,
  /** Weekend rate compared with the weekly average (0.9 = 10% quieter); weekdays make up the rest */
  weekendFactor: flow.weekendFactor,
  /** Standard deviation of hourly totals around the pattern, as a share of it (0.08 = about ±8%) */
  hourlyVariation: flow.hourlyVariation,
};

/** Average hours of recording arriving each second */
export const MEAN_HOURS_PER_SECOND = FLOW.hoursPerDay / 86_400;

/**
 * Time-value pairs stored per second of recording: each sample rate (Hz) in
 * flow.json's sampleRates, weighted by the share of recording stored at it.
 * { 256: 0.7, 128: 0.3 } gives 0.7 × 256 + 0.3 × 128 = 217.6.
 */
const rates: Record<string, number> = flow.sampleRates;
export const PAIRS_PER_SECOND =
  Object.entries(rates).reduce((sum, [hz, share]) => sum + Number(hz) * share, 0) /
  Object.values(rates).reduce((sum, share) => sum + share, 0);

// Shares are given rounded, so they are scaled to add up to exactly 1
const shares: Record<string, number> = flow.shares;
const shareTotal = TYPES.reduce((sum, t) => sum + shares[t.short], 0);
export const DATA_TYPES: readonly DataType[] = TYPES.map((t) => ({ ...t, share: shares[t.short] / shareTotal }));
export const MAX_SHARE = Math.max(...DATA_TYPES.map((t) => t.share));


/** Clock speeds, only offered with #debug or ?debug in the address */
export const DEBUG_SPEEDS: readonly { factor: number; label: string }[] = [
  { factor: 1, label: 'Real time' },
  { factor: 10, label: '10×' },
  { factor: 100, label: '100×' },
  { factor: 1000, label: '1,000×' },
];
