// Checks src/flow.json before a release, then stress-tests the model with awkward inputs.
// Run with: npm run check:flow
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const real = JSON.parse(await readFile('src/flow.json', 'utf8'));
const variants = [
  ['src/flow.json as it is', real],
  ['shares add up to 0.97 and one is missing', { ...real, shares: { ECG: 0.41, ABP: 0.3, Pleth: 0.2, Resp: 0.06 } }],
  ['a type at zero, strong daily swing, quiet weekends', { ...real, shares: { ...real.shares, CVP: 0 }, daily: { swing: 0.3, peakHour: 15 }, weekendFactor: 0.8 }],
  ['hourly wander of 0.08 on top of the daily and weekly pattern', { ...real, daily: { swing: 0.2, peakHour: 14 }, weekendFactor: 0.9, hourlyVariation: 0.08 }],
  ['values out of range and a bad date', { ...real, asOf: 'not a date', hoursPerDay: -5, daily: { swing: 1.5, peakHour: 30 }, weekendFactor: 9, hourlyVariation: 0.6 }],
];

let failed = false;
for (const [name, data] of variants) {
  const warnings = [];
  const result = await build({
    stdin: {
      contents: `
        import { FLOW, DATA_TYPES } from './src/config';
        import { LiveClock, rateFactor, shapeFactor } from './src/clock';
        export { FLOW, DATA_TYPES, LiveClock, rateFactor, shapeFactor };`,
      resolveDir: '.',
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: false,
    plugins: [
      {
        name: 'flow-variant',
        setup(b) {
          b.onResolve({ filter: /flow\.json$/ }, () => ({ path: 'flow', namespace: 'variant' }));
          b.onLoad({ filter: /.*/, namespace: 'variant' }, () => ({ contents: JSON.stringify(data), loader: 'json' }));
          b.onResolve({ filter: /^pixi\.js$/ }, () => ({ path: 'pixi', namespace: 'stub' }));
          b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export {}', loader: 'js' }));
        },
      },
    ],
  });
  const warn = console.warn;
  console.warn = (m) => warnings.push(m);
  const mod = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  console.warn = warn;
  const { FLOW, DATA_TYPES, LiveClock, rateFactor, shapeFactor } = mod;

  const problems = [];
  const shareSum = DATA_TYPES.reduce((a, t) => a + t.share, 0);
  if (Math.abs(shareSum - 1) > 1e-9 || DATA_TYPES.some((t) => !(t.share >= 0))) problems.push(`shares add up to ${shareSum}`);

  // Four weeks in one-minute steps: never backwards, no jumps, averages to the daily rate.
  // Whole weeks include every weekend boundary and daily peak; four of them dilute a clock change.
  const clock = new LiveClock();
  const start = FLOW.asOfMs + 3 * 86_400_000 + 7 * 60_000;
  let prev = clock.totalAt(start);
  let biggest = 0;
  for (let m = 1; m <= 28 * 1440; m++) {
    const t = clock.totalAt(start + m * 60_000);
    if (!Number.isFinite(t) || t < prev) {
      problems.push(`total went wrong at minute ${m}`);
      break;
    }
    biggest = Math.max(biggest, t - prev);
    prev = t;
  }
  const perDay = (prev - clock.totalAt(start)) / 28;
  if (Math.abs(perDay / FLOW.hoursPerDay - 1) > 0.005) problems.push(`four weeks average ${perDay.toFixed(0)} hours a day, not ${FLOW.hoursPerDay}`);
  const factors = Array.from({ length: 7 * 24 }, (_, h) => rateFactor(start + h * 3_600_000));
  const low = Math.min(...factors);
  const high = Math.max(...factors);
  if (!(low > 0)) problems.push('the rate stops or goes negative');

  // Hourly wander: hourly totals over 8 weeks compared with the pattern alone
  const ratios = [];
  for (let h = 0; h < 8 * 7 * 24; h++) {
    let withWander = 0;
    let pattern = 0;
    for (let m = 0; m < 60; m++) {
      const t = start + h * 3_600_000 + (m + 0.5) * 60_000;
      withWander += rateFactor(t);
      pattern += shapeFactor(t);
    }
    ratios.push(withWander / pattern);
  }
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const sd = Math.sqrt(ratios.reduce((a, b) => a + (b - mean) ** 2, 0) / ratios.length);
  if (Math.abs(sd - FLOW.hourlyVariation) > 0.015 + FLOW.hourlyVariation * 0.15) {
    problems.push(`hourly totals vary by ${sd.toFixed(3)}, not ${FLOW.hourlyVariation}`);
  }

  failed ||= problems.length > 0;
  console.log(`\n${problems.length ? 'FAIL' : 'ok  '}  ${name}`);
  console.log(`      ${FLOW.hoursPerDay} hours a day on average, from ${low.toFixed(2)}x to ${high.toFixed(2)}x; busiest minute adds ${biggest.toFixed(1)} hours`);
  console.log(`      hourly totals vary by ${sd.toFixed(3)} around the pattern (asked for ${FLOW.hourlyVariation}); four weeks average ${perDay.toFixed(0)} hours a day`);
  console.log(`      shares: ${DATA_TYPES.map((t) => `${t.short} ${(t.share * 100).toFixed(1)}%`).join(', ')}`);
  for (const w of warnings) console.log(`      note: ${w}`);
  for (const p of problems) console.log(`      problem: ${p}`);
}
process.exit(failed ? 1 : 0);
