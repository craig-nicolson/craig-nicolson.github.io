// Builds one self-contained HTML file (dist-single/index.html) for hosting as
// a single page. PixiJS loads from jsDelivr at the version pinned in package.json;
// everything else is inlined.
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const pixiVersion = pkg.dependencies['pixi.js'];
const pages = [{ html: 'index.html', entry: 'src/main.ts', out: 'dist-single/index.html' }];

// Point `import ... from 'pixi.js'` at the global that the CDN script defines
const pixiGlobal = {
  name: 'pixi-global',
  setup(b) {
    b.onResolve({ filter: /^pixi\.js$/ }, () => ({ path: 'pixi', namespace: 'pixi-global' }));
    b.onLoad({ filter: /.*/, namespace: 'pixi-global' }, () => ({ contents: 'module.exports = globalThis.PIXI;', loader: 'js' }));
  },
};

await mkdir('dist-single', { recursive: true });
for (const page of pages) {
  const result = await build({
    entryPoints: [page.entry],
    bundle: true,
    format: 'iife',
    minify: true,
    target: ['es2022'],
    write: false,
    outdir: 'out',
    legalComments: 'none',
    plugins: [pixiGlobal],
  });
  const js = result.outputFiles.find((f) => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
  const css = result.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? '';
  let html = await readFile(page.html, 'utf8');
  html = html.replace('</head>', () => `    <style>${css}</style>\n  </head>`);
  html = html.replace(/<script type="module" src="\/src\/[^"]+"><\/script>/, () =>
    [
      `<script src="https://cdn.jsdelivr.net/npm/pixi.js@${pixiVersion}/dist/pixi.min.js"></script>`,
      `    <script>${js}</script>`,
    ].join('\n'),
  );
  await writeFile(page.out, html);
  console.log(`${page.out}: ${(html.length / 1024).toFixed(1)} KB (PixiJS ${pixiVersion} from jsDelivr)`);
}
