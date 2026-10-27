const nf0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const int = (n: number): string => nf0.format(n);

/** Hours with sensible precision: 7.4, 82.1, 1,234 */
export const hours = (h: number): string => (h < 100 ? nf1.format(h) : nf0.format(Math.floor(h)));

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/** Time on the page: 13 seconds, 2 minutes 13 seconds, 1 hour 4 minutes */
export function duration(sec: number): string {
  const s = Math.floor(sec);
  if (s < 60) return `${s} ${plural(s, 'second', 'seconds')}`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} ${plural(m, 'minute', 'minutes')} ${s % 60} ${plural(s % 60, 'second', 'seconds')}`;
  const h = Math.floor(m / 60);
  return `${int(h)} ${plural(h, 'hour', 'hours')} ${m % 60} ${plural(m % 60, 'minute', 'minutes')}`;
}
