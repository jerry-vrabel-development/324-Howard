# 324 S Howard St — Renovation Hub

A small web app for tracking the live-in restoration of a 1925 cottage in Miller Beach, Gary, Indiana.

- **Showcase** — before/after photo pairs with a drag (or keyboard) comparison slider, filterable by room.
- **Tasks & time** — a three-column task board with search and filters, project stats, and a work timer that logs hours to a task.
- **History & log** — property background plus a dated project journal.

Data is stored in the browser (localStorage). Use **Backup → Export backup** regularly; clearing site data or switching devices otherwise loses it.

https://jerry-vrabel-development.github.io/324-Howard/#home

## Getting started

Requires Node 22 (see `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script                    | What it does                                                      |
| ------------------------- | ----------------------------------------------------------------- |
| `npm run dev`             | Start the dev server with hot reload                              |
| `npm run build`           | Type-check and build to `dist/`                                   |
| `npm run preview`         | Serve the production build locally                                |
| `npm test`                | Run the unit tests (Vitest)                                       |
| `npm run lint`            | ESLint                                                            |
| `npm run format`          | Prettier (write)                                                  |
| `npm run check`           | Type-check, lint, format check and tests — what CI runs           |
| `npm run photos`          | Optimize photos in `photos-inbox/` and add draft showcase entries |
| `npm run photos:prune`    | Remove showcase entries whose image files no longer exist         |
| `npm run video -- <clip>` | Turn a video into the Home page background                        |

## Stack

Vite, TypeScript (strict), Tailwind CSS v4, Lucide icons (tree-shaken from npm, pinned), Vitest + jsdom. No UI framework: features are plain TypeScript modules around a small store.

## Project structure

```
index.html                  App shell: header, tab panels, dialogs
src/
  main.ts                   Wires the store to each feature
  types.ts                  Photo, Task, JournalEntry, AppData
  config/constants.ts       Rooms, statuses, priorities, tags — one source of truth
  content/showcase.json     Published photos, shown to every visitor (committed)
  content/published.ts      Loads and validates showcase.json
  content/home.json         Home page settings: background video, map pins
  features/home/            Hero video and neighborhood map
  data/seed.ts              Optional sample data (flagged, removable)
  config/supabase.ts        Supabase URL and publishable key; VITE_DATA_MODE=local turns it off
  backend/                  Supabase client, email sign-in, current viewer and role
  services/                 DataService: localService (browser) and remoteService (Supabase)
  store/
    store.ts                Minimal observable store: update → persist → notify
    actions.ts              Pure state transitions (tasks, timer, photos, journal)
    storage.ts              StorageAdapter interface + localStorage implementation
    validate.ts             Sanitizes anything loaded or imported
    migrate.ts              Converts data saved by the original single-file version
    backup.ts               JSON export/import
  features/
    showcase/               Gallery, before/after slider, add-photo form
    tasks/                  Board, task card, filters and stats
    timer/                  Live work-session banner
    journal/                Journal list and form
    backup/                 Backup & sample-data dialog
  components/               Dialog, confirm, toast, tabs, icons
  utils/                    Safe HTML templating, dates, formatting, DOM helpers
  styles/main.css           Tailwind theme tokens and component classes
scripts/photos.mjs          Resizes photos, strips GPS/EXIF, adds draft entries
scripts/prune-photos.mjs    Removes entries pointing at missing images
scripts/video.mjs           Encodes the Home background video, strips metadata
public/photos/              Optimized published images (WebP)
tests/                      Unit tests, including a check that showcase.json is valid
```

### How it fits together

1. `main.ts` loads data through a `StorageAdapter` and creates the store.
2. Every change is a pure function in `store/actions.ts`, applied with `store.update(fn)`.
3. The store saves the new state, then notifies subscribers. Each feature re-renders only when its own slice changed.
4. Rendering uses the `html` tagged template in `utils/html.ts`, which escapes every interpolated value.
5. Events are delegated: one listener per container, keyed off `data-action` attributes.

### Adding a room, tag or status

Edit `src/config/constants.ts`. Filters, forms and labels pick it up automatically. Stored records use the `id`, so renaming a `label` is safe; changing an `id` needs a migration.

### Swapping storage

Implement `StorageAdapter` (`load()` / `save()`) in `src/store/storage.ts` — for example IndexedDB for photo uploads, or a server API — and pass it to `createStore` in `main.ts`. Nothing else changes.

## Adding photos

Published photos live in the repo and are deployed with the site, so every visitor sees them. Photos added through the app's own form are saved in that browser only and marked "This device only".

1. Copy photos from your phone into `photos-inbox/` in the project folder (create it if needed; it is git-ignored).
2. Optionally name them to save editing later:
   - `kitchen-cabinets-before.jpg` + `kitchen-cabinets-after.jpg` → one before/after pair with the slider
   - `basement-joists.jpg` → a single progress photo
   - Starting a name with a room id (`kitchen`, `living-room`, `bathroom`, `basement`, `exterior`, `master-bedroom`) sets the room; anything else becomes `general`.
3. Run `npm run photos`. Each photo is rotated upright, resized to at most 1600 px, converted to WebP and stripped of all metadata (including GPS location). Draft entries are added to `src/content/showcase.json`, dated from when the photo was taken. Originals move to `photos-inbox/processed/`.
4. Edit the titles, rooms and descriptions in `src/content/showcase.json`, check with `npm run dev`, then commit and push. The site redeploys automatically.

`npm test` (and CI) fails if an entry is malformed or points at an image that isn't in `public/photos/`, so a broken card can't go live.

HEIC photos (the iPhone default) aren't supported by the image library. Set **Settings → Camera → Formats → Most Compatible** on the iPhone, or export as JPEG before copying.

This is an interim setup: once the hosted backend is in place, photos will upload straight from a phone.

## Backend (Supabase)

The site stores tasks, time, journal entries and uploaded photos in Supabase, with sign-in by
email. Setup, permissions and inviting the landowner are in [`supabase/README.md`](supabase/README.md).

| Who       | Can                                                                             |
| --------- | ------------------------------------------------------------------------------- |
| Visitors  | See the Home page, published photos and journal entries                         |
| Landowner | Also see tasks and hours; request tasks; leave feedback                         |
| Admin     | Everything: tasks, timer, photo uploads from phone, journal, accepting requests |

The connection details are in `src/config/supabase.ts` (both values are public by design).
To work without Supabase, run `VITE_DATA_MODE=local npm run dev`: everything is then saved in
the browser as before. After switching, sign in as admin and use **Backup → Copy to
Supabase** once to move the browser's old tasks, hours and journal into the database.

## Home page

The Home page has a full-width background video and a neighborhood map. Both are configured in `src/content/home.json`.

### Background video

```bash
npm run video -- ~/Videos/house.mp4 --start 3 --duration 12
```

This takes a clip (default: the first 15 seconds), resizes it to 1280 px wide, removes the audio and **all metadata including GPS location**, and writes `public/video/hero.mp4` plus a poster frame, `public/video/hero-poster.webp`. It then points `home.json` at them. A slow, steady landscape shot of 8–15 seconds works best; aim for under 8 MB. ffmpeg is bundled via the `ffmpeg-static` package, so nothing extra needs installing.

The video is muted and loops, has a pause button, pauses when you scroll past it or switch pages, and doesn't autoplay for visitors who have "reduce motion" turned on. Without a video, the poster or a plain gradient is shown.

### Map

The map uses Leaflet with OpenStreetMap tiles (no API key). To add the pin for the house, set `map.house` in `home.json`:

```json
"house": { "lat": 41.6000, "lng": -87.2500 }
```

To get the numbers, right-click the house in Google Maps (or long-press on a phone); the first line of the menu is the latitude and longitude. Add nearby spots to `map.places` in the same format with a `name` and `note`. `npm test` checks that every coordinate is valid.

## Upgrading from the single-file version

On first load, if no v2 data exists, the app reads the old `m324_*_v1` localStorage keys and converts them. The old keys are left in place. The demo records the old version wrote on first run are marked **Sample** and can be removed from the Backup dialog.

## Deployment

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. One-time setup: **Settings → Pages → Source: GitHub Actions**. The site will be at `https://jerry-vrabel-development.github.io/324-Howard/`.

`.github/workflows/ci.yml` runs `npm run check` and a build on every push and pull request.
