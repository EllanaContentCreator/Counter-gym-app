# Counter — Accountability Training

**Counter** is a mobile-first gym app built on the training sheets of Carolyn Counter. It is a standalone
progressive web app (PWA): install it to your phone's home screen, and it works offline with every workout,
weight and rep stored on the device.

> Count it. Own it. Stay accountable.

## What it does

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
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages).
Then on the phone: Safari → Share → **Add to Home Screen** (iPhone) or browser menu → **Install app** (Android).

## Project layout

```
counter/
  src/data/exercises.ts    exercise library
  src/data/equipment.ts    equipment list + muscle labels
  src/data/programs.ts     Carolyn's seeded programs
  src/lib/store.ts         local-first state (localStorage) + actions
  src/lib/timer.ts         countdown / stopwatch / beeps / wake lock
  src/pages/*              Today, Programs, ProgramDetail, Library, ExerciseDetail,
                           Workout (logging + guided 45), Progress, SessionDetail, Timer, Settings, Onboarding
  public/exercises/*.webp  illustrations (one per `image` key in exercises.ts)
  scripts/                 icon + webp helpers
```

## Adding a new program from one of Carolyn's sheets

Either use **Programs → Add new workout** in the app, or add an entry to `src/data/programs.ts` using the
`row(id, slot, exerciseId, weight, sets, reps, rest, label?)` helper. Slots are strings exactly as on the sheet
(`"1"`, `"1+"`, `"TABATA"`, `"ALL"`). Existing users pick up new seeded programs automatically.
