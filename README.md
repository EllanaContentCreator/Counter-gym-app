# Counter — Accountability Training

**Counter** is a mobile-first gym app built on the training sheets of Carolyn Counter. It is a standalone
progressive web app (PWA): install it to your phone's home screen, and it works offline with every workout,
weight and rep stored on the device.

> Count it. Own it. Stay accountable.

## What it does

- **Weekly sheets** — Carolyn hands out two sheets a week. Tap **Add this week's sheet**, snap the paper sheet
  (or add the screenshot she sends), and it becomes a new numbered program with the photo attached. Sheets are
  filed by week with a 2-of-2 tracker on Today; the photo opens full-screen with pinch-zoom so you can type the
  rows in while reading from it. Photos live in IndexedDB on the phone and are included in backups.
- **Exercise diagrams** — every exercise has a front/back muscle map (main muscle bright, helpers softer) and a
  step-by-step form diagram built from its cues, alongside the illustration.
- **Programs** — Carolyn's sheets (#01–#04) are pre-loaded in her exact format: stations `1`, `1+` (superset),
  `2`, `3`, `4`, plus `ALL` rows and yellow `TABATA` finishers, with Weight / Sets / Reps / Rest columns.
  Edit any row, add exercises, reorder, duplicate a sheet, or create your own.
- **Exercise library** — 175+ exercises across 27 types of equipment (dumbbell, kettlebell, hex bar, cable,
  TRX, Bosu, machines, bands, bodyweight…), each with coaching cues, muscle groups and an illustration.
  Add custom exercises. Search and filter by equipment or type.
- **Start & log** — tap to log weight and reps per set and per round. Weight pre-fills from your last session.
  A rest timer starts itself after each set. Tabata rows launch a full-screen 20/10 × 8 timer with beeps.
- **45-minute guided workout** — warm up (5 min) → 3 rounds of stations → tabata(s) → cool down, with a phase
  timer, overall progress bar and suggested warm-up / stretch moves.
- **Progress** — weekly goal and streak, workouts-per-week chart, full history, personal bests, and a
  per-exercise weight chart.
- **Timer** — tabata (configurable), rest countdown, stopwatch.
- **Backup** — export/import a JSON backup to move between phones. No account, no server.

## Where it lives

**https://ellanacontentcreator.github.io/Counter-gym-app/** — published automatically from `main` by the
GitHub Pages workflow in `.github/workflows/pages.yml`. Open it on your phone and add it to the home screen.

## Reading Carolyn's sheets automatically

Counter can read a photo of a sheet and fill the rows in for you. The app never holds an API key — it
posts the photo to a small serverless function (`netlify/functions/scan-sheet.mts`) that calls Claude
and returns the rows as JSON. You check every row before it saves.

Set it up once, for the whole group:

1. **Get an Anthropic API key** — [console.anthropic.com](https://console.anthropic.com) → API keys →
   create a key, and add a few dollars of credit. A sheet costs a few cents to read.
2. **Deploy this repo to Netlify** (free): [app.netlify.com](https://app.netlify.com) → Add new site →
   Import an existing project → GitHub → `counter-gym-app`. `netlify.toml` already holds the build and
   function settings, so accept the defaults.
3. **Add the environment variables** — Site configuration → Environment variables:
   - `ANTHROPIC_API_KEY` — the key from step 1.
   - `SCAN_PASSCODE` — any word the group will share. Optional, but without it anyone who finds the
     function address can spend your credit.
   Then Deploys → Trigger deploy, so the function picks them up.
4. **In the app**, open **Me → Sheet reader**. On the Netlify address everything is same-origin, so leave
   the reader address blank; just type the passcode and tap **Check the reader**. On any other address
   (e.g. the GitHub Pages copy) paste `https://<your-site>.netlify.app/.netlify/functions/scan-sheet`.

Then: **Add this week's sheet → take the photo → Read the sheet for me**. Rows that match the library
link to the existing exercise (keeping Carolyn's wording as the row label); anything new is added to the
library with guessed equipment and muscles, ready to edit.

## Deploy in one click

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/EllanaContentCreator/counter-gym-app)

`netlify.toml` already holds the build settings, so Netlify needs nothing else. Once it is live, share the
link; each person opens it on her phone and adds it to the home screen.

## Run it

```bash
cd counter
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the build locally
node scripts/journey.mjs   # end-to-end check against `vite preview --port 4174`
```

### Replacing or adding exercise illustrations

Drop 1:1 PNGs named after the exercise's `image` key into `public/exercises/` and run `node scripts/webp.mjs`
to produce the 640×640 `.webp` files the app uses. Exercises without an illustration show their muscle map.

Deploy the `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages).
Then on the phone: Safari → Share → **Add to Home Screen** (iPhone) or browser menu → **Install app** (Android).

## Project layout

```
counter/
  src/data/exercises.ts    exercise library
  src/data/equipment.ts    equipment list + muscle labels
  src/data/programs.ts     Carolyn's seeded programs
  src/lib/store.ts         local-first state (localStorage) + actions
  src/lib/photos.ts        sheet photos in IndexedDB (compress, store, object-URL cache, backup)
  src/lib/scan.ts          calls the sheet reader, matches read rows to the exercise library
  netlify/functions/       scan-sheet.mts — reads a sheet photo into rows with Claude
  src/components/MuscleMap.tsx, FormDiagram.tsx   exercise diagrams
  src/components/AddSheet.tsx, SheetPhotos.tsx, PhotoViewer.tsx   weekly sheet photo flow
  public/fonts/*           self-hosted Manrope + Bebas Neue (works offline)
  src/lib/timer.ts         countdown / stopwatch / beeps / wake lock
  src/pages/*              Today, Programs, ProgramDetail, Library, ExerciseDetail,
                           Workout (logging + guided 45), Progress, SessionDetail, Timer, Settings, Onboarding
  public/exercises/*.webp  illustrations (one per `image` key in exercises.ts)
  scripts/                 icon + webp helpers
```

## Adding a new program from one of Carolyn's sheets

The everyday way is **Today → Add this week's sheet** (photo first, then type the rows). To seed one for
everyone, add an entry to `src/data/programs.ts` (with a `date`) using the
`row(id, slot, exerciseId, weight, sets, reps, rest, label?)` helper. Slots are strings exactly as on the sheet
(`"1"`, `"1+"`, `"TABATA"`, `"ALL"`). Existing users pick up new seeded programs automatically.
