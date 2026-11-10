# Waveform data, a year at a time

An animated page showing waveform recordings flowing into the dataset as they arrive, live. Every shape stands for a length of recording (how long it would take to play back), top to bottom:

- **Minutes:** five streams, one per waveform. Each drop is one minute of recording, about ten a second in all. Each stream fills a ring that holds 1 hour of recording. A full ring fills in to a solid circle, which shrinks and flies to its place in the year.
- **A year:** each finished hour flies into a big circle that holds 1 year of recording (8,760 hours). Faint dots are the hours still to come. It fills clockwise from 12 o'clock, a new dot every few seconds, and the white arc shows how much is done. A year of recording completes about every 14 hours.
- **The year's pattern:** the year's hours are shared out to the waveforms in a repeating block of 50 (`PATTERN` in `src/scene/year.ts`), which draws spiral arms on the sunflower layout, then the fewest hours needed are handed on, evenly spread, so each waveform gets exactly its real share of the year.
- **The dataset:** each small circle is 1 finished year of recording, laid out as one chain in a snake (rows alternate direction), newest first. The ringed slot at its head is the year filling now, tied to the big circle like a magnifier. When a year is finished it lands on the head, and the whole chain shifts along one place in a wave from newest to oldest, each year swelling as it steps, with years at the end of a row stepping down to the next. As the year's ring fades from white to the empty outline, the empty hours of the new year fade in with it.

Row labels ("1 hour", "1 year", each "of recording") point at their rows. On narrow screens the hour rings shift right to make room, and the year label sits above the circle. On page load the picture builds in top to bottom as the data flows: sources, streams, hour rings, the year (its hours sweeping in), then the dataset. Each label and its line fade in with the part they label. The timings are in `ENTER` at the top of `src/scene/year.ts`, and the labels take theirs from the scene, so they stay in step.

When a year completes, a short animation plays as the year lands in the dataset. Its last hours are always put in first, even if the year ended while the picture was scrolled away, so the animation always has the whole year.

The page runs on the real clock, counted on from the dataset's size at a set time, so every visitor sees the same live state.

Built to the DataLoch design style guide and the performance brief: Vite 8, TypeScript, one runtime dependency (PixiJS 8, rendering with WebGL2), and plain HTML for everything you read or click.

## Run it

Needs Node 20.19+ or 22.12+. Everything for this page lives in this `waveforms/` folder, so run these from here (paths in this README are relative to it).

```
cd waveforms
npm install
npm run dev            # local preview with live reload
npm run build          # static site in dist/
npm run build:single   # one self-contained file in dist-single/index.html
```

## Debug mode

Add `#debug` (or `?debug`) to the address for:

- **Speed:** real time, 10×, 100× or 1,000×. At 1,000× a year of recording fills in under a minute.
- **When a year completes:** Orbit, Portal, Pour, Spin out, Collider or Year count, plus a **Play year finale** button. It fills the rest of the current year quickly, plays the chosen finale into the dataset's head, shows the dataset shift along with a stand-in year, then returns to now: the circle sweeps back to its real fill and the dataset is quietly put back as it really is. The live clock, counts and dataset are never changed, and it works whether or not the picture is in view.

## The data, and updating it

The live figures come from `src/flow.json`:

```json
{
  "asOf": "2026-10-21T00:00:00+01:00",
  "totalHours": 6012501,
  "hoursPerDay": 15013,
  "patients": {
    "atAsOf": 11595,
    "perDay": 15,
    "waveformsAtOnce": 4.786
  },
  "shares": {
    "ECG": 0.3972,
    "ABP": 0.3086,
    "Pleth": 0.1914,
    "Resp": 0.0611,
    "CVP": 0.0417
  },
  "daily": {
    "swing": 0.083,
    "peakHour": 15.5
  },
  "weekendFactor": 0.947,
  "hourlyVariation": 0.061,
  "sampleRates": {
    "256": 0.7,
    "128": 0.3
  }
}
```

- `asOf`, `totalHours`: the dataset's size at a set moment. The page counts on from there.
- `hoursPerDay`: the average daily rate, ideally from the last 4–8 weeks. Refreshing it every month or two also tracks the seasons.
- `patients`: the number of patients in the dataset at `asOf` (`atAsOf`) and how many more join each day (`perDay`). For sensitivity the page only ever shows it rounded down to the hundred, as "over 11,800", always strictly below the true count.
  `waveformsAtOnce` is how many waveforms are recorded at once, on average, while a patient is monitored. It turns hours of recording into patient hours (10 hours on 7 waveforms is 70 hours of recording but 10 patient hours) for the "By patients" table: patients (with new patients a day), hours monitored, and recording and monitoring per patient. The monitoring and recording totals are shown in full, as the number of waveforms at once is not known precisely. The averages per patient are shown to two significant figures ("~530 hours"), worked out from the continuous count: they don't step when the rounded count moves up a hundred, and they're too coarse to work the count back out of. Note that everything in `flow.json` is built into the page's script, where anyone can read it: if the exact patient count is sensitive, give `atAsOf` a rounded value so it never ships.
- `shares`: each type's share, matched by its short name. They are scaled to add up to 1, so rounded figures are fine. A missing type counts as 0.
- `daily.swing`, `daily.peakHour`: how far the rate rises and falls through the day (0.12 means ±12%), and when it peaks, in UK time. At most ±50%.
- `weekendFactor`: weekend rate compared with the weekly average (0.9 means 10% quieter), between 0.5 and 1.5. Weekdays make up the difference, so the weekly average stays `hoursPerDay`.
- `sampleRates`: the sample rates the recordings are stored at (in Hz) and the share of recording time at each. It sets the count of time-value pairs near the bottom of the page: each second of recording holds 0.7 × 256 + 0.3 × 128 = 217.6 pairs with the values shown, so the count climbs by over a hundred thousand a second. It is drawn every frame, with one text write, only while it is on screen.
- `hourlyVariation`: how much hourly totals wander from that pattern as patients connect and disconnect. It's the standard deviation of hourly totals divided by the expected value, so 0.08 means a typical hour lands within about ±8%. Measure it from 12 months of hourly totals, each divided by what the daily and weekly pattern predicts. At most 0.3, and 0 turns it off. The wander is smooth, the same for every visitor (it's worked out from the date and hour), and balanced so each UK day still adds up to its expected total. Drops still arrive at a steady pace within it.

To update:

1. Edit `src/flow.json`.
2. Run `npm run check:flow`. It checks that every value is present and in range, saying plainly what is wrong if not. It then tests over four weeks, on your file and at the most extreme values allowed, that the live total never jumps or runs backwards, that it averages out to `hoursPerDay`, and that hourly totals vary by about `hourlyVariation`. The page itself reads the file as it is, so this check is what keeps a bad value from going live.
3. Run `npm run build` (or `npm run build:single`) and deploy.

Every figure in the page's text comes from this file and is shown as it is, unrounded, so it reads like measured data: 15,013 hours a day, shares to one decimal place.

Two simplifications to know about:

- The "In the dataset" column splits the total by the current shares, so it moves a little when the shares are updated.
- The year-complete animations assume five types.

## Change the design

`src/config.ts` holds the types' names and colours and the size of a year of recording. The default year-complete finale is `CELEBRATION` in `src/scene/celebration.ts`. Put `DataLoch_Logo_Light.png` in `public/brand/` and the header shows it.

## Page design

The page around the picture is laid out like a data team's figure page rather than a product landing page, and these choices are deliberate. Keep to them when editing, because generic AI-styled pages drift back to the same few patterns.

- The headline is one plain sentence, with no bolded keywords. The live total sits inside the opening sentence rather than as a giant standalone number.
- One line above the picture says what the shapes are; the picture's own labels do the rest. Each idea is explained once, in the notes.
- Live figures are plain tables ("Right now", "By waveform") rather than stat cards. "Right now" has fixed columns, so changing values never move anything, and "Since you opened this page" is two lines (the hours, then how long). On narrow screens each value sits under its label.
- The dataset figures (the total, the whole dataset's length and the per-waveform totals) count what the picture shows: each waveform's hours less any still filling in or flying in (`pending()` in `src/scene/year.ts`), updated every frame, so they tick up in the same frame an hour lands. With the picture scrolled away they keep counting from the clock. They refresh like a counter: each digit that changes fades in place with a tiny rise (`roll()` in `src/main.ts`), to show they are live. Faster-changing values stay plain, so the page doesn't fidget.
- "About these figures" is a notes list with a heading at the side, not a row of equal columns.
- Sentence case throughout, with no all-caps labels, badges, emoji or gradients. The masthead holds only the logo and the live date and time, as ordinary text rather than a "Live" badge.
- Pointing at the picture gives two light responses. Pointing at a waveform's source or hour ring keeps that waveform bright everywhere while the other four recede, and names it just outside the year's ring at 2 o'clock (higher up the ring on narrow screens), as the year is then showing that waveform's hours, in off-white with a bar in its colour (blue and red text would be too faint on navy). Over the year, a small tooltip above and to the right of the pointer says when the year will next be complete, so people can come back for the finale. The prediction steps through the same model as the live total, drift included, so it is exact; `npm run check:flow` confirms it to the second. On touch screens a tap does the same for a few seconds. `FOCUS_RECEDE` at the top of `src/scene/year.ts` sets how far the other waveforms recede.
- DataLoch colours, Source Sans 3, navy and off-white surfaces, and the dark-mode behaviour are unchanged.

## Year-complete finales are optional

The finales are an extra, kept apart from the core. The scene only knows the `Finale` shape in `src/scene/types.ts` and is handed a maker for one by the page, so:

- To switch them off, delete the block marked "Year-complete finales" in `src/main.ts`, and the finale import above it. A finished year then goes straight into the dataset with its ripple, the dataset shifts along, and the next year's hours fade in.
- To drop them entirely, also delete `src/scene/celebration.ts` (and `scripts/simulate-finale.mjs`, which only tests them). Nothing else needs to change.

## How it works

- `src/main.ts`: the page. Controls, live numbers, labels, debug panel, pausing.
- `src/scene/year.ts`: the picture. Streams, hour rings, the year disc and the dataset.
- `src/scene/celebration.ts`: the six year-complete animations. Portal and Pour share the ring, arms and portal drawing. Pour is real physics: the ring opens as in Portal, a pulse switches gravity on, and every hour becomes a bouncy ball that collides with the others (on a grid, two passes a frame), the ring and the arms. Every finale describes the year's ring through `ring()` (how white it is, and any opening) and the scene draws it the same way for all of them: white while the year is whole, fading to the empty outline as it lands. The magnifier stays on the landing slot, then glides to the next one. Collider draws long-exposure trails with two textures that take turns, under the hours themselves, which are always drawn directly.
- `scripts/simulate-finale.mjs` (`npm run sim:finale -- pour`): runs an animation's real code at a steady 60 frames a second and reports its timeline and cost per frame. Useful where software rendering runs far below real speed.
- `src/clock.ts`: the live clock and dataset total, adding up the modelled rate (with its daily and weekly shape, in UK time) since `asOf`.
- `src/flow.json`: the data. `scripts/check-flow.mjs` checks it.
- `src/config.ts`: design settings, and the data from `flow.json` (shares are scaled to add up to exactly 1).
- `src/scene/pool.ts`, `path.ts`, `shapes.ts`, `quality.ts`, `src/ease.ts`, `src/format.ts`: small helpers.

The year disc puts its 8,760 hours on a sunflower spiral, which spreads them evenly. Each spot is given a waveform in turn, keeping the five shares, which draws the spiral pattern. A new hour takes the next free spot of its own waveform, so all five keep pace and the filled part stays a clean wedge.

## Performance

- One canvas, as wide as the window so the year-complete animations can use the full width; the picture sits centred in it. Drops and dots are drawn in batches with PixiJS `ParticleContainer`.
- The year's dots, its empty slots and the dataset sit in static batches that are only re-sent to the GPU when something lands.
- Drops are pre-allocated and reused, so nothing is created while the page animates.
- Motion uses elapsed time, so it runs at the same speed at 30, 60 or 120 frames a second.
- If frames stay slow, the page shows fewer drops.
- Animation stops when the picture scrolls offscreen or the tab is hidden.
- Runtime JavaScript is about 150 KB gzipped, most of it PixiJS. That is above the 100 KB budget in the performance brief.

## Accessibility

- Controls are native buttons with visible focus rings.
- The canvas has a text description, and a finished year is announced to screen readers.
- The page always plays, whatever the device's motion settings. There is no pause or play control.

## Deploy

### GitHub Pages

The repo's `.github/workflows/deploy.yml` (at the repo root, where GitHub needs it) checks the data, builds this page and publishes it on every push to `main`. The published site is the plain `index.html` at the repo root, which links to this page, with the page itself at `/waveforms/`.

1. Push the repo to GitHub, with `waveforms/package-lock.json` included.
2. In the repo, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. Push to `main`, or run the workflow from the **Actions** tab.

**Publish the build, never the source.** This folder's own `index.html` loads `src/main.ts`, which only works through Vite. If the live page shows a blank picture and the browser console mentions `src/main.ts` or a "video/mp2t" MIME type, GitHub is publishing the source: check that **Source** is **GitHub Actions** and that the latest run in the **Actions** tab succeeded.

It works at `https://<user>.github.io/<repo>/waveforms/`, at `/waveforms/` on a user site, or on a custom domain, because the build uses relative paths. For a custom domain, set it under **Settings → Pages**; no `CNAME` file is needed when deploying with Actions.

For the monthly data refresh, edit `waveforms/src/flow.json` (the GitHub web editor is fine) and commit to `main`. The workflow runs `npm run check:flow` first and stops if the file has a problem, so a bad edit never goes live. Pages caches pages for about 10 minutes, so a new version can take that long to appear.

### Elsewhere

`dist/` is a folder of static files for any static host, at any path. `npm run build:single` makes one self-contained file instead.
