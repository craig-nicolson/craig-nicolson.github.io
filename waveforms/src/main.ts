import './styles/main.css';
import { Application, Graphics } from 'pixi.js';
import { LiveClock } from './clock';
import { DATA_TYPES, DEBUG_SPEEDS, FLOW, MEAN_HOURS_PER_SECOND, PAIRS_PER_SECOND, YEAR_HOURS } from './config';
import { Tweens } from './ease';
import * as fmt from './format';
import { Quality } from './scene/quality';
import { TEX_RADIUS } from './scene/shapes';
import type { StageLabel } from './scene/types';
import { LABEL_FADE_S, YearScene } from './scene/year';
// Year-complete finales: an optional extra (see the finale block in boot)
import { CELEBRATION, CELEBRATIONS, Celebration, type CelebrationId } from './scene/celebration';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const debugMode = new URLSearchParams(location.search).has('debug') || location.hash === '#debug';

/** Labels are HTML over the canvas, so they stay sharp and wrap */
/** Draw the picture's labels. Each fades in at its own time in the entrance; `elapsed` is how far the entrance has got. */
function renderLabels(el: HTMLElement, items: StageLabel[], elapsed: number): void {
  el.replaceChildren(
    ...items.map((l) => {
      const d = document.createElement('div');
      d.className = `stage-label stage-label--${l.align}${l.tier ? ' stage-label--tier' : ''}${l.row ? ' stage-label--row' : ''}`;
      const tx = l.align === 'center' ? '-50%' : l.align === 'right' ? '-100%' : '0';
      const ty = l.valign === 'middle' ? '-50%' : l.valign === 'bottom' ? '-100%' : '0';
      d.style.transform = `translate(${l.x}px, ${l.y}px) translate(${tx}, ${ty})`;
      // A negative delay picks the fade up part-way, so labels drawn again mid-entrance carry on rather than restart
      d.style.animation = `stage-label-in ${LABEL_FADE_S}s linear ${l.appear - elapsed}s both`;
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

/**
 * Show a live value like a counter: each digit that changed refreshes in
 * place, and the rest stay still. Only digits are wrapped; everything else
 * stays plain text, so spaces and line breaks behave normally. A change of
 * length redraws it whole.
 */
function roll(el: HTMLElement, text: string): void {
  const old = el.dataset.shown ?? '';
  if (text === old) return;
  el.dataset.shown = text;
  const node = (ch: string, rolling: boolean) => {
    if (!/\d/.test(ch)) return document.createTextNode(ch);
    const s = document.createElement('span');
    s.className = rolling ? 'digit is-rolling' : 'digit';
    s.textContent = ch;
    return s;
  };
  if (text.length !== old.length) {
    el.replaceChildren(...[...text].map((ch) => node(ch, false)));
    return;
  }
  [...text].forEach((ch, i) => ch !== old[i] && el.childNodes[i].replaceWith(node(ch, true)));
}

/**
 * The count of time-value pairs in the dataset: every second of recording
 * holds PAIRS_PER_SECOND of them, so it climbs by over a hundred thousand a
 * second. It is redrawn every frame, with one text write, only while on screen.
 */
function bindPairs(clock: LiveClock): void {
  const el = $('#pairs');
  let frame = 0;
  const draw = () => {
    el.textContent = fmt.int(Math.floor(clock.total() * 3600 * PAIRS_PER_SECOND));
    frame = requestAnimationFrame(draw);
  };
  new IntersectionObserver(([entry]) => {
    cancelAnimationFrame(frame);
    if (entry.isIntersecting) draw();
  }).observe(el);
}

/** Hours a day for one waveform, from the average daily rate and its share */
const perDayOf = (share: number) => Math.round(FLOW.hoursPerDay * share);
/** Shares to one decimal place, as measured */
const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

/** Every figure in the page's text comes from the data file, so a refresh updates it all */
function fillText(): void {
  const perDay = FLOW.hoursPerDay;
  const yearEvery = Math.round((YEAR_HOURS / perDay) * 24);
  const fills: Record<string, string> = {
    perDay: `${fmt.int(perDay)} hours`,
    yearEvery: `${yearEvery} ${yearEvery === 1 ? 'hour' : 'hours'}`,
  };
  document.querySelectorAll<HTMLElement>('[data-fill]').forEach((el) => {
    const v = fills[el.dataset.fill ?? ''];
    if (v) el.textContent = v;
  });
  const parts = DATA_TYPES.map((t) => `${fmt.int(perDayOf(t.share))} of ${t.short}`);
  $('#numbers-text').textContent =
    `${fmt.int(perDay)} hours of recording on average: ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}. ` +
    `That works out at ${(MEAN_HOURS_PER_SECOND * 60).toFixed(1)} minutes of recording every second.`;
}

/** The live numbers under the picture. Works even if the picture can't be drawn. */
/**
 * The live figures. Dataset totals count what the picture shows: each
 * waveform's hours, less any still filling in or flying in (`inFlight`), so
 * they tick up as each hour lands. The rest follow the clock.
 */
function bindReadout(clock: LiveClock, inFlight: (type: number) => number): () => void {
  const body = $('#legend-body');
  const cells = DATA_TYPES.map((t) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <th scope="row"><span class="swatch" style="background:${t.css}"></span><span class="name-full">${t.name}</span><span class="name-short">${t.short}</span></th>
      <td class="num">${percent(t.share)}</td>
      <td class="num">${fmt.int(perDayOf(t.share))}</td>
      <td class="num">0</td>`;
    body.append(tr);
    return tr.lastElementChild as HTMLElement;
  });
  const total = $('#total-hours');
  const now = $('#arriving-now');
  const since = $('#since-hours');
  const sinceTime = $('#since-time');
  const years = $('#as-recording');
  const time = $<HTMLTimeElement>('#now-time');
  const timeText = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  // Only touch the page when a value changes: this runs every frame
  const put = (el: HTMLElement, text: string) => el.textContent !== text && (el.textContent = text);
  return () => {
    const T = clock.total();
    const at = new Date(clock.now());
    time.dateTime = at.toISOString();
    put(time, timeText.format(at));
    const byType = DATA_TYPES.map((t, i) => Math.floor(T * t.share) - inFlight(i));
    const shown = byType.reduce((a, b) => a + b, 0);
    roll(total, fmt.int(shown));
    byType.forEach((h, i) => roll(cells[i], fmt.int(h)));
    roll(years, fmt.yearsDaysHours(shown));
    put(now, `${(clock.rate() * 60).toFixed(1)} minutes of recording a second`);
    put(since, `${fmt.hours(T - clock.openTotal)} hours of recording`);
    put(sinceTime, `in ${fmt.duration(clock.secondsHere)}`);
  };
}

/**
 * The pointer over the picture: the scene responds, and over the year a tooltip
 * says when it will next be complete, so people can come back for the finale.
 */
function bindPointer(stage: HTMLElement, scene: YearScene, clock: LiveClock): () => void {
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.hidden = true;
  tip.setAttribute('aria-hidden', 'true');
  const signal = document.createElement('div');
  signal.className = 'signal-name';
  signal.setAttribute('aria-hidden', 'true');
  stage.append(tip, signal);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', dateStyle: 'short' });
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long' });
  let at = { x: 0, y: 0 };

  // The waveform in focus is named beside the year, which is showing its hours (see placeSignal)
  const showName = () => {
    const type = scene.pointedSignal;
    signal.classList.toggle('is-shown', type >= 0);
    if (type < 0) return;
    const t = DATA_TYPES[type];
    signal.textContent = t.name.replace(/\s*\(.*\)$/, '');
    signal.style.setProperty('--signal', t.alpha < 1 ? 'var(--dl-off-white)' : t.css);
    const { x, y } = scene.placeSignal(signal.offsetWidth, window.innerWidth - stage.getBoundingClientRect().left - 8);
    signal.style.transform = `translate(${Math.round(x)}px, ${Math.round(y - signal.offsetHeight)}px)`;
  };

  const refresh = () => {
    showName();
    tip.hidden = !scene.overYear;
    if (tip.hidden) return;
    const now = clock.now();
    const when = clock.timeOfTotal(scene.nextYearTotal);
    const tomorrow = now + 86_400_000;
    const dayName =
      day.format(when) === day.format(now) ? 'Today' : day.format(when) === day.format(tomorrow) ? 'Tomorrow' : weekday.format(when);
    const minutes = Math.max(0, Math.round((when - now) / 60_000));
    const left = minutes < 1 ? 'under a minute' : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
    tip.innerHTML = `<strong>Next year complete</strong><span>${dayName} at ${time.format(when)}, in ${left}</span>`;
    // Always above and to the right of the pointer; near the window's edge it slides in rather than flipping sides
    const room = window.innerWidth - stage.getBoundingClientRect().left;
    const x = Math.min(at.x + 12, room - tip.offsetWidth - 8);
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(at.y - tip.offsetHeight - 10)}px)`;
  };

  let release = 0;
  const point = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    at = { x: e.clientX - r.left, y: e.clientY - r.top };
    scene.pointAt(at.x, at.y);
    refresh();
  };
  stage.addEventListener('pointermove', point);
  stage.addEventListener('pointerleave', () => {
    scene.pointAway();
    refresh();
  });
  // On touch there is no hover: a tap shows the same thing for a few seconds
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    point(e);
    clearTimeout(release);
    release = window.setTimeout(() => {
      scene.pointAway();
      refresh();
    }, 3500);
  });
  return refresh;
}

/** Add a group of controls to the debug panel (shown with #debug or ?debug) */
function debugGroup(title: string): HTMLElement {
  const root = $('#debug');
  root.hidden = false;
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
}

/** Clock speeds, in the debug panel */
function buildDebug(clock: LiveClock): void {
  const markSpeed = pills(
    debugGroup('Speed'),
    DEBUG_SPEEDS.map((s) => ({ id: String(s.factor), label: s.label })),
    (id) => {
      clock.setFactor(Number(id));
      markSpeed(id);
    },
  );
  markSpeed('1');
}

async function boot(): Promise<void> {
  const logo = document.querySelector<HTMLImageElement>('.logo');
  if (logo) {
    if (logo.complete && logo.naturalWidth === 0) logo.remove();
    else logo.addEventListener('error', () => logo.remove(), { once: true });
  }
  const clock = new LiveClock();
  fillText();
  const live = $('#live');
  // Until the picture exists (or without WebGL), nothing is in flight
  let inFlight = (_type: number) => 0;
  const refreshReadout = bindReadout(clock, (t) => inFlight(t));
  bindPairs(clock);
  refreshReadout();
  window.setInterval(() => document.hidden || refreshReadout(), 250);

  const stage = $('#stage');
  const canvas = $<HTMLCanvasElement>('#stage canvas');
  const labelsEl = $('.stage-labels');
  let w = Math.max(1, Math.round(stage.clientWidth));
  let h = Math.max(1, Math.round(stage.clientHeight));
  // The canvas spans the window width, so animations can use all of it; the picture sits centred
  let cw = 0;
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
  const scene = new YearScene({ clock, tweens, tex, renderer: app.renderer, quality: () => quality.factor });
  if (debugMode) buildDebug(clock);

  // ---- Year-complete finales: an optional extra, all in this block and src/scene/celebration.ts.
  // Delete the block (and the finale import) and a finished year simply goes into the dataset;
  // celebration.ts can then be deleted too.
  let finaleId: CelebrationId = CELEBRATION;
  scene.finale = (stage, dots) => new Celebration(finaleId, stage, dots, tex, app.renderer);
  if (debugMode) {
    const row = debugGroup('When a year completes');
    const mark = pills(row, CELEBRATIONS, (id) => {
      finaleId = id as CelebrationId;
      mark(id);
    });
    mark(finaleId);
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'btn';
    play.textContent = 'Play year finale';
    // Fills the rest of this year, plays the finale, then returns to now. The live clock is untouched.
    play.addEventListener('click', () => scene.previewFinale());
    row.append(play);
  }

  app.stage.addChild(scene.root);
  app.stage.x = off;
  inFlight = (t) => scene.pending(t);
  const refreshTip = bindPointer(stage, scene, clock);
  window.setInterval(() => document.hidden || refreshTip(), 250);
  scene.setBounds(-off, cw - off);
  scene.layout(w, h);
  scene.onYearComplete = (years) => {
    live.textContent = `Another year of recording is complete. The dataset now holds ${fmt.int(years)} years of recording.`;
  };

  // Labels only re-render when their text or place changes
  let labelKey = '';
  let enteredAt = performance.now();
  const refreshLabels = (force = false) => {
    const items = scene.labels();
    const key = JSON.stringify(items);
    if (force || key !== labelKey) {
      labelKey = key;
      renderLabels(labelsEl, items, (performance.now() - enteredAt) / 1000);
    }
  };
  // The entrance: the picture builds in top to bottom, and its labels with it
  const enter = () => {
    enteredAt = performance.now();
    scene.enter();
    refreshLabels(true);
  };
  refreshLabels(true);

  let labelTimer = 0;
  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);
    quality.sample(ticker.deltaMS);
    tweens.update(dt);
    scene.update(dt);
    // The figures change in the same frame as the hour that lands
    refreshReadout();
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
  document.fonts.ready.then(() => refreshLabels(true));

  // ---- First frame: the opening fill, then it plays
  enter();
  app.render();
  sync();
}

boot();
