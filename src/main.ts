import './styles/main.css';
import { Application, Graphics } from 'pixi.js';
import { LiveClock } from './clock';
import {
  CELEBRATION,
  CELEBRATIONS,
  DATA_TYPES,
  DEBUG_SPEEDS,
  FLOW,
  MEAN_HOURS_PER_SECOND,
  YEAR_FILL,
  YEAR_HOURS,
  type CelebrationId,
  type YearFill,
} from './config';
import { Tweens } from './ease';
import * as fmt from './format';
import { Quality } from './scene/quality';
import { TEX_RADIUS } from './scene/shapes';
import type { StageLabel } from './scene/types';
import { YearScene } from './scene/year';

// Tells the safeguard in index.html that the page's code has started
(window as unknown as { __waveformStarted?: boolean }).__waveformStarted = true;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const debugMode = new URLSearchParams(location.search).has('debug') || location.hash === '#debug';

/** Labels are HTML over the canvas, so they stay sharp and wrap */
function renderLabels(el: HTMLElement, items: StageLabel[]): void {
  el.replaceChildren(
    ...items.map((l) => {
      const d = document.createElement('div');
      d.className = `stage-label stage-label--${l.align}${l.tier ? ' stage-label--tier' : ''}${l.row ? ' stage-label--row' : ''}`;
      const tx = l.align === 'center' ? '-50%' : l.align === 'right' ? '-100%' : '0';
      const ty = l.valign === 'middle' ? '-50%' : l.valign === 'bottom' ? '-100%' : '0';
      d.style.transform = `translate(${l.x}px, ${l.y}px) translate(${tx}, ${ty})`;
      if (l.maxWidth) {
        d.style.maxWidth = `${Math.max(48, l.maxWidth)}px`;
        d.style.whiteSpace = 'normal';
      }
      const name = document.createElement('strong');
      name.textContent = l.name;
      const share = document.createElement('span');
      share.textContent = l.share;
      d.append(name, share);
      return d;
    }),
  );
}

/** A row of toggle buttons; returns a function that marks the chosen one */
function pills(container: HTMLElement, items: readonly { id: string; label: string }[], onPick: (id: string) => void): (id: string) => void {
  const buttons = items.map((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pill';
    b.textContent = item.label;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => onPick(item.id));
    container.append(b);
    return b;
  });
  return (id) => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(items[i].id === id)));
}

/** Averages are shown rounded, so they read as averages: nearest 500 from 10,000, nearest 100 from 1,000 */
const sig2 = (n: number) => {
  const step = n >= 10_000 ? 500 : n >= 1_000 ? 100 : 10;
  return Math.round(n / step) * step;
};

/** Every figure in the page's text comes from the data file, so a refresh updates it all */
function fillText(clock: LiveClock): void {
  const perDay = FLOW.hoursPerDay;
  const yearEvery = Math.round((YEAR_HOURS / perDay) * 24);
  const total = clock.total();
  const asOf = new Date(FLOW.asOfMs).toLocaleDateString('en-GB', { timeZone: 'Europe/London' });
  const fills: Record<string, string> = {
    perDay: `${fmt.int(sig2(perDay))} hours`,
    yearEvery: `${yearEvery} ${yearEvery === 1 ? 'hour' : 'hours'}`,
    dataset: total >= 1e6 ? `${(Math.floor(total / 1e5) / 10).toLocaleString('en-GB')} million hours` : `${fmt.int(sig2(total))} hours`,
    dropsPerSecond: fmt.int(Math.round(MEAN_HOURS_PER_SECOND * 60)),
    anchor: `${fmt.int(FLOW.totalHours)} hours on ${asOf}`,
  };
  document.querySelectorAll<HTMLElement>('[data-fill]').forEach((el) => {
    const v = fills[el.dataset.fill ?? ''];
    if (v) el.textContent = v;
  });
  const parts = DATA_TYPES.map((t) => `${fmt.int(sig2(perDay * t.share))} hours of ${t.short}`);
  $('#numbers-text').textContent =
    `On average a day brings ${fmt.int(sig2(perDay))} hours of recording: ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}. ` +
    `That is a new year of recording about every ${yearEvery} hours, ` +
    `or ${(MEAN_HOURS_PER_SECOND * 60).toFixed(1)} minutes of recording every second.`;
}

/** The live numbers under the picture. Works even if the picture can't be drawn. */
function bindReadout(clock: LiveClock): () => void {
  const body = $('#legend-body');
  const cells = DATA_TYPES.map((t) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <th scope="row"><span class="swatch" style="background:${t.css}"></span><span class="name-full">${t.name}</span><span class="name-short">${t.short}</span></th>
      <td class="num">${Math.round(t.share * 100)}%</td>
      <td class="num">${fmt.int(sig2(FLOW.hoursPerDay * t.share))}</td>
      <td class="num">0</td>`;
    body.append(tr);
    return tr.lastElementChild as HTMLElement;
  });
  const total = $('#total-hours');
  const now = $('#arriving-now');
  const since = $('#since-hours');
  const sinceTime = $('#since-time');
  const year = $('#year-progress');
  const years = $('#as-recording');
  return () => {
    const T = clock.total();
    total.textContent = fmt.int(Math.floor(T));
    now.textContent = `${(clock.rate() * 60).toFixed(1)} minutes of recording a second`;
    since.textContent = `${fmt.hours(T - clock.openTotal)} hours of recording`;
    sinceTime.textContent = `in ${fmt.duration(clock.secondsHere)}`;
    year.textContent = `${fmt.int(Math.floor(T % YEAR_HOURS))} of ${fmt.int(YEAR_HOURS)} hours`;
    years.textContent = `${fmt.int(Math.floor(T / YEAR_HOURS))} years of recording`;
    DATA_TYPES.forEach((t, i) => (cells[i].textContent = fmt.int(Math.floor(T * t.share))));
  };
}

/** Speed, fill style and year-complete animation, with #debug or ?debug */
function buildDebug(root: HTMLElement, clock: LiveClock, scene: YearScene, refill: () => void): void {
  root.hidden = false;
  const group = (title: string) => {
    const g = document.createElement('div');
    g.className = 'debug__group';
    const label = document.createElement('span');
    label.className = 'control-label';
    label.textContent = title;
    const row = document.createElement('div');
    row.className = 'pills';
    g.append(label, row);
    root.append(g);
    return row;
  };
  const markSpeed = pills(
    group('Speed'),
    DEBUG_SPEEDS.map((s) => ({ id: String(s.factor), label: s.label })),
    (id) => {
      clock.setFactor(Number(id));
      markSpeed(id);
    },
  );
  markSpeed('1');
  const markFill = pills(
    group('Fill'),
    [
      { id: 'sweep', label: 'Clockwise' },
      { id: 'centre', label: 'From centre' },
    ],
    (id) => {
      scene.fill = id as YearFill;
      refill();
      markFill(id);
    },
  );
  markFill(scene.fill);
  const fxRow = group('When a year completes');
  const markFx = pills(fxRow, CELEBRATIONS, (id) => {
    scene.celebration = id as CelebrationId;
    markFx(id);
  });
  markFx(scene.celebration);
  const finale = document.createElement('button');
  finale.type = 'button';
  finale.className = 'btn';
  finale.textContent = 'Play year finale';
  // Fills the rest of this year, plays the finale, then returns to now. The live clock is untouched.
  finale.addEventListener('click', () => scene.previewFinale());
  fxRow.append(finale);
}

async function boot(): Promise<void> {
  const logo = document.querySelector<HTMLImageElement>('.logo');
  if (logo) {
    if (logo.complete && logo.naturalWidth === 0) logo.remove();
    else logo.addEventListener('error', () => logo.remove(), { once: true });
  }
  const clock = new LiveClock();
  fillText(clock);
  const live = $('#live');
  const refreshReadout = bindReadout(clock);
  refreshReadout();
  window.setInterval(() => document.hidden || refreshReadout(), 250);

  const stage = $('#stage');
  const canvas = $<HTMLCanvasElement>('#stage canvas');
  const labelsEl = $('.stage-labels');
  let w = Math.max(1, Math.round(stage.clientWidth));
  let h = Math.max(1, Math.round(stage.clientHeight));
  // The canvas spans the window width, so animations can use all of it; the picture sits centred
  let cw = document.documentElement.clientWidth;
  let off = 0;
  const place = () => {
    cw = Math.max(w, document.documentElement.clientWidth);
    off = Math.round(stage.getBoundingClientRect().left);
    canvas.style.left = `${-off}px`;
  };
  place();

  const app = new Application();
  try {
    await app.init({
      canvas,
      width: cw,
      height: h,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: 'webgl',
      autoStart: false,
      // No pointer events, accessibility tree or filters are needed on the canvas
      skipExtensionImports: true,
    });
  } catch (err) {
    console.error(err);
    $('.stage-fallback').hidden = false;
    canvas.hidden = true;
    return;
  }

  // One white disc texture; every drop and dot is this tinted to a palette colour
  const disc = new Graphics().circle(TEX_RADIUS, TEX_RADIUS, TEX_RADIUS).fill({ color: 0xffffff });
  const tex = app.renderer.generateTexture({ target: disc, resolution: 2, antialias: true });
  const tweens = new Tweens();
  const quality = new Quality();
  const scene = new YearScene({ clock, tweens, tex, renderer: app.renderer, quality: () => quality.factor }, YEAR_FILL, CELEBRATION);
  app.stage.addChild(scene.root);
  app.stage.x = off;
  scene.setBounds(-off, cw - off);
  scene.layout(w, h);
  scene.onYearComplete = (years) => {
    live.textContent = `Another year of recording is complete. The dataset now holds ${fmt.int(years)} years of recording.`;
  };

  // Labels only re-render when their text or place changes
  let labelKey = '';
  const refreshLabels = (force = false) => {
    const items = scene.labels();
    const key = JSON.stringify(items);
    if (force || key !== labelKey) {
      labelKey = key;
      renderLabels(labelsEl, items);
    }
  };
  refreshLabels(true);

  let labelTimer = 0;
  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);
    quality.sample(ticker.deltaMS);
    tweens.update(dt);
    scene.update(dt);
    if ((labelTimer += dt) > 1) {
      labelTimer = 0;
      refreshLabels();
    }
  });

  // ---- Always playing. Drawing is skipped only while the picture can't be seen
  // (scrolled away or a hidden tab); the live clock keeps time, so nothing is lost.
  let onScreen = true;
  const sync = () => {
    const run = onScreen && !document.hidden;
    if (run && !app.ticker.started) app.start();
    else if (!run && app.ticker.started) app.stop();
  };
  const relayout = () => {
    place();
    app.renderer.resize(cw, h);
    app.stage.x = off;
    scene.setBounds(-off, cw - off);
    tweens.finish(scene);
    scene.layout(w, h);
    scene.update(0);
    refreshLabels(true);
    if (!app.ticker.started) app.render();
  };
  let queued = false;
  const onResize = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const nw = Math.max(1, Math.round(stage.clientWidth));
      const nh = Math.max(1, Math.round(stage.clientHeight));
      if (nw === w && nh === h && document.documentElement.clientWidth === cw) return;
      w = nw;
      h = nh;
      relayout();
    });
  };
  new ResizeObserver(onResize).observe(stage);
  window.addEventListener('resize', onResize);
  new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting;
    sync();
  }).observe(stage);
  document.addEventListener('visibilitychange', sync);
  document.fonts?.ready.then(() => refreshLabels(true));

  if (debugMode) {
    buildDebug($('#debug'), clock, scene, () => {
      relayout();
      scene.enter(app.ticker.started);
    });
  }

  // ---- First frame: the opening fill, then it plays
  scene.enter(true);
  window.setTimeout(() => labelsEl.classList.remove('is-hidden'), 350);
  app.render();
  sync();
}

boot();
