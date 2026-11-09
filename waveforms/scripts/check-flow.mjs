// Checks src/flow.json before a release: every value is present and in range, and the model
// behaves, on the real file and at the most extreme values allowed. Over four weeks the live
// total must never jump or run backwards, must average out to hoursPerDay, and hourly totals
// must vary by about hourlyVariation, and the page's "next year complete" prediction must match
// the moment the live total gets there. Run with: npm run check:flow
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

/** The page's model (config and clock) built with the given data in place of flow.json */
async function load(data) {
  const result = await build({
    stdin: {
      contents: `export { FLOW, DATA_TYPES } from './src/config'; export { LiveClock, rateFactor, shapeFactor } from './src/clock';`,
      resolveDir: '.',
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: false,
    plugins: [
      {
        name: 'flow',
        setup(b) {
          b.onResolve({ filter: /flow\.json$/ }, () => ({ path: 'flow', namespace: 'flow' }));
          b.onLoad({ filter: /.*/, namespace: 'flow' }, () => ({ contents: JSON.stringify(data), loader: 'json' }));
        },
      },
    ],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

function problemsIn(f, types) {
  const out = [];
  const range = (name, v, lo, hi) => {
    if (typeof v !== 'number' || !(v >= lo && v <= hi)) out.push(`${name} should be a number from ${lo} to ${hi} (it is ${JSON.stringify(v)})`);
  };
  if (Number.isNaN(Date.parse(f.asOf))) out.push('asOf should be a date and time, like 2026-10-21T00:00:00+01:00');
  range('totalHours', f.totalHours, 0, Infinity);
  range('hoursPerDay', f.hoursPerDay, 1, Infinity);
  range('daily.swing', f.daily?.swing, 0, 0.5);
  range('daily.peakHour', f.daily?.peakHour, 0, 24);
  range('weekendFactor', f.weekendFactor, 0.5, 1.5);
  range('hourlyVariation', f.hourlyVariation, 0, 0.3);
  for (const t of types) range(`shares.${t}`, f.shares?.[t], 0, 1);
  for (const k of Object.keys(f.shares ?? {})) if (!types.includes(k)) out.push(`shares.${k} is not a type (the types are ${types.join(', ')})`);
  const sum = types.reduce((a, t) => a + (f.shares?.[t] ?? 0), 0);
  if (Math.abs(sum - 1) > 0.02) out.push(`shares add up to ${sum.toFixed(3)}; they should add up to about 1`);
  const rates = Object.entries(f.sampleRates ?? {});
  if (!rates.length) out.push('sampleRates should give at least one sample rate, like { "256": 0.7, "128": 0.3 }');
  for (const [hz, share] of rates) {
    if (!(Number(hz) > 0)) out.push(`sampleRates key ${JSON.stringify(hz)} should be a sample rate in Hz, like "256"`);
    range(`sampleRates.${hz}`, share, 0, 1);
  }
  const rateSum = rates.reduce((a, [, s]) => a + (typeof s === 'number' ? s : 0), 0);
  if (rates.length && Math.abs(rateSum - 1) > 0.02) out.push(`sampleRates shares add up to ${rateSum.toFixed(3)}; they should add up to about 1`);
  return out;
}

function modelProblems({ FLOW, LiveClock, rateFactor, shapeFactor }) {
  const out = [];
  const clock = new LiveClock();
  const start = Date.now() + 86_400_000;
  const first = clock.totalAt(start);
  let prev = first;
  for (let m = 1; m <= 28 * 1440; m++) {
    const t = clock.totalAt(start + m * 60_000);
    if (!(t >= prev)) {
      out.push(`the total ran backwards at minute ${m}`);
      break;
    }
    prev = t;
  }
  const perDay = (prev - first) / 28;
  if (Math.abs(perDay / FLOW.hoursPerDay - 1) > 0.005) out.push(`four weeks average ${perDay.toFixed(0)} hours a day, not ${FLOW.hoursPerDay}`);
  const ratios = [];
  for (let h = 0; h < 8 * 7 * 24; h++) {
    let wander = 0;
    let pattern = 0;
    for (let m = 0; m < 60; m++) {
      const t = start + h * 3_600_000 + (m + 0.5) * 60_000;
      wander += rateFactor(t);
      pattern += shapeFactor(t);
    }
    ratios.push(wander / pattern);
  }
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const sd = Math.sqrt(ratios.reduce((a, b) => a + (b - mean) ** 2, 0) / ratios.length);
  if (Math.abs(sd - FLOW.hourlyVariation) > 0.015 + FLOW.hourlyVariation * 0.15) out.push(`hourly totals vary by ${sd.toFixed(3)}, not ${FLOW.hourlyVariation}`);

  // The prediction: when will the dataset hold about another 5,000 hours (a typical year's remainder)?
  const ahead = new LiveClock();
  const target = ahead.total() + 5_000.5;
  const when = ahead.timeOfTotal(target);
  const before = ahead.totalAt(when - 1_000);
  const after = ahead.totalAt(when + 1_000);
  const predictionOk = before < target && after >= target;
  if (!predictionOk) out.push(`the prediction is off: a second either side gives ${before.toFixed(3)} and ${after.toFixed(3)} for ${target.toFixed(3)}`);
  return { out, perDay, sd, predictionOk };
}

const real = JSON.parse(await readFile('src/flow.json', 'utf8'));
const extreme = { ...real, daily: { swing: 0.5, peakHour: 14 }, weekendFactor: 0.5, hourlyVariation: 0.3 };
const types = (await load(extreme)).DATA_TYPES.map((t) => t.short);

const fileProblems = problemsIn(real, types);
if (fileProblems.length) {
  console.log('FAIL  src/flow.json');
  for (const p of fileProblems) console.log(`      ${p}`);
  process.exit(1);
}

let failed = false;
for (const [name, data] of [
  ['src/flow.json', real],
  ['the most extreme values allowed', extreme],
]) {
  const { out, perDay, sd, predictionOk } = modelProblems(await load(data));
  failed ||= out.length > 0;
  console.log(`${out.length ? 'FAIL' : 'ok  '}  ${name}: four weeks average ${perDay.toFixed(0)} hours a day; hourly totals vary by ${sd.toFixed(3)}; next-year prediction ${predictionOk ? 'exact to the second' : 'off'}`);
  for (const p of out) console.log(`      ${p}`);
}
process.exit(failed ? 1 : 0);
