# 324 S Howard St — Renovation Hub

A small web app for tracking the live-in restoration of a 1925 cottage in Miller Beach, Gary, Indiana.

- **Showcase** — before/after photo pairs with a drag (or keyboard) comparison slider, filterable by room.
- **Tasks & time** — a three-column task board with search and filters, project stats, and a work timer that logs hours to a task.
- **History & log** — property background plus a dated project journal.

Data is stored in the browser (localStorage). Use **Backup → Export backup** regularly; clearing site data or switching devices otherwise loses it.

## Getting started

Requires Node 22 (see `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script            | What it does                                            |
| ----------------- | ------------------------------------------------------- |
| `npm run dev`     | Start the dev server with hot reload                    |
| `npm run build`   | Type-check and build to `dist/`                         |
| `npm run preview` | Serve the production build locally                      |
| `npm test`        | Run the unit tests (Vitest)                             |
| `npm run lint`    | ESLint                                                  |
| `npm run format`  | Prettier (write)                                        |
| `npm run check`   | Type-check, lint, format check and tests — what CI runs |

## Stack

Vite, TypeScript (strict), Tailwind CSS v4, Lucide icons (tree-shaken from npm, pinned), Vitest + jsdom. No UI framework: features are plain TypeScript modules around a small store.

## Project structure

```
index.html                  App shell: header, tab panels, dialogs
src/
  main.ts                   Wires the store to each feature
  types.ts                  Photo, Task, JournalEntry, AppData
  config/constants.ts       Rooms, statuses, priorities, tags — one source of truth
  data/seed.ts              Optional sample data (flagged, removable)
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
tests/                      Unit tests for store, timer, filters, migration, escaping
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

## Upgrading from the single-file version

On first load, if no v2 data exists, the app reads the old `m324_*_v1` localStorage keys and converts them. The old keys are left in place. The demo records the old version wrote on first run are marked **Sample** and can be removed from the Backup dialog.

## Deployment

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. One-time setup: **Settings → Pages → Source: GitHub Actions**. The site will be at `https://jerry-vrabel-development.github.io/324-Howard/`.

`.github/workflows/ci.yml` runs `npm run check` and a build on every push and pull request.
