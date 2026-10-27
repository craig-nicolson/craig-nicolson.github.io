// Runs a year-complete animation's real code outside the browser at a steady 60 frames a
// second, with a full year of 8,760 hours, and reports its timeline and cost per frame.
// Useful because software rendering (as in some test sandboxes) runs far below real speed.
// Usage: npm run sim:finale -- pour
//        Collider (GPU trails) and Year count (canvas digits) need a browser, so they can't run here.
import { build } from 'esbuild';

const id = process.argv[2] || 'pour';
const r = await build({
  stdin: {
    contents: `import { Texture } from 'pixi.js'; import { Celebration } from './src/scene/celebration'; export { Texture, Celebration };`,
    resolveDir: '.',
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});
const { Texture, Celebration } = await import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`);

// A full year on its sunflower spiral, in a 640 by 800 picture, landing top left of the dataset
const R = 206;
const cx = 320;
const cy = 404;
const N = 8760;
const c = (R - 2) / Math.sqrt(N);
const golden = Math.PI * (3 - Math.sqrt(5));
const dots = Array.from({ length: N }, (_, k) => ({
  x: cx + c * Math.sqrt(k + 0.5) * Math.cos(k * golden),
  y: cy + c * Math.sqrt(k + 0.5) * Math.sin(k * golden),
  tint: 0x63bda3,
  alpha: 1,
  type: k % 5,
}));
const stage = { cx, cy, R, w: 640, h: 800, x0: -320, x1: 960, dotR: c * 0.62, ring: R + 10, slotR: 4.2, tx: 33, ty: 676, tr: 3.8, years: 700 };
if (id === 'collider' || id === 'number') {
  console.log(`${id} needs a browser (it draws with the GPU or a canvas), so it can't be simulated here.`);
  process.exit(0);
}
const fx = new Celebration(id, stage, dots, Texture.WHITE, null);
let landed = null;
fx.onLand = () => (landed = fx.time);

let frames = 0;
let total = 0;
let slowest = 0;
let next = 1;
for (;;) {
  const a = performance.now();
  const going = fx.update(1 / 60);
  const ms = performance.now() - a;
  total += ms;
  slowest = Math.max(slowest, ms);
  frames++;
  if (fx.time >= next) {
    console.log(`${next}s${fx.absorbed ? `  ${((100 * fx.absorbed) / N).toFixed(1)}% in the slot` : ''}`);
    next++;
  }
  if (!going || frames > 60 * 20) break;
}
console.log(`${id}: lands at ${landed?.toFixed(2)}s, ends at ${fx.time.toFixed(2)}s`);
console.log(`${(total / frames).toFixed(2)} ms a frame on average, slowest ${slowest.toFixed(1)} ms (Node, one core)`);
