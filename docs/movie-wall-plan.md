# Movie Wall — Infinite Canvas Plan

A landing page showing every movie I've watched as a pannable/zoomable wall of
posters. Clicking a poster opens a short detail card.

## Decisions locked

| Decision        | Choice                                                                 |
| --------------- | --------------------------------------------------------------------- |
| Scale           | A few hundred movies                                                   |
| Layout          | Tidy grid / mosaic                                                     |
| Data source     | **Letterboxd CSV export** (manual re-export) → committed `movies.json`. Posters/director enriched from **TMDB** by title+year via a re-runnable script. Fully static at runtime — no live feed. |
| Sync model      | **Manual** — re-export from Letterboxd when she wants updates; regenerate `movies.json`; commit. (Letterboxd RSS auto-sync was considered and declined for predictability.) |
| Interaction     | **Infinite pan** — drag + inertia in all directions, no zoom               |
| Canvas engine   | **DOM infinite lattice**: GSAP Draggable (on a detached proxy) + InertiaPlugin feed an `offset`; a `gsap.ticker` translates the stage and re-renders only the visible window of cells (culling built in). Movie at cell (gx,gy) = `DECK[(gx + 7·gy) mod N]` so the wall is endless, seamless, and never shows the same poster adjacent (nearest repeat ~7 cells away, off-screen). Sizes: poster 240×360, gap 64. Upgrade path to **WebGL (OGL)** only if hundreds don't hold 60fps |
| Data richness   | **Lean** — poster + notes (no per-movie Rive or theme colors)              |
| Card transition | Framer Motion shared-element morph (`layoutId`) — poster becomes card  |

**Why DOM-first:** a grid makes culling deterministic (we can compute exactly
which cells are visible), so a few hundred posters can stay smooth in the DOM.
Simpler to build, easy image optimization, and the click→card morph is nearly
free. If it doesn't hold 60fps at the real count, swap only the rendering layer
to WebGL — the data, layout math, and card all stay.

## Reference — Francobolli per la Lessinia (`francobollimontilessini.com/discover`)

A Next.js site showing 16 illustrated mountain "stamps" on a draggable plane.
Decoded from its HTML/scripts:

- **Stack:** Next.js (Pages Router) + **GSAP** for drag/pan/inertia. **No WebGL**
  — DOM-based canvas. Validates our DOM-first approach.
- **Data pattern:** a static array (`posterItems`) baked at build via
  `getStaticProps`. No CMS — images are local files in `/public/posters/`.
  Each item:
  ```json
  { "id", "slug", "name", "location", "image": "/posters/X.jpg",
    "riv": "/animations/X.riv", "description",
    "bg": "#51B37C", "fg": "#DF6A69", "path": "#F9CD6C", "coordinates" }
  ```
- **Rive per item:** each stamp ships its own `.riv` animation file.
- **Per-item theming:** each item carries `bg`/`fg`/`path` colors so the detail
  card re-themes to match the artwork.
- **Card:** click → detail view with image/Rive + description + location +
  coordinates.

**Key divergence for us:** the reference has only **16 items** so it does NO
culling and NO image optimization (raw JPGs). We want **a few hundred** — so we
copy its feel + data pattern but MUST add viewport culling + `next/image`
optimization it skips. This is the main thing not to cargo-cult.

### What to borrow vs. adapt
| Reference does | We do |
| --- | --- |
| GSAP Draggable + inertia for pan | Same — matches the feel (pan only, no zoom) |
| Static baked data array | Same pattern; source TBD (Phase 1) |
| Rive per item + theme colors | **Skip** — decided lean (poster + notes only) |
| Raw JPGs, no culling (fine at 16) | **Add** culling + `next/image` (needed at hundreds) |

## Open questions

- Data source (see Phase 1).
- Card fields — what shows on the short card? (Shalini designs this.)
- Should each movie be deep-linkable (e.g. `/movies/the-shining`)?
- Sort/cluster the grid by anything (year, rating, genre) or arbitrary order?

---

## To-do

### Phase 0 — Decide & gather
- [ ] Pick the reference page and extract its tricks
- [ ] Decide data source (Phase 1)
- [ ] Confirm DOM-first approach (revisit if count climbs)

### Phase 1 — Data (manual re-export pipeline)
- [ ] Define the movie schema (lean — poster + notes):
      `id, slug, title, year, director, posterThumb, posterFull, rating,
      watchedDate, notes(review), tags`
      (no per-movie `riv`/theme colors — decided lean)
- [ ] Get a free **TMDB API key** → store as env var (`TMDB_API_KEY`)
- [ ] Write enrichment script: read Letterboxd CSVs (watched/ratings/reviews) →
      match each film on TMDB by title+year → pull poster + director →
      download + optimize posters into `/public/posters/` → write `movies.json`
- [ ] Run it on the current export (29 films); spot-check TMDB matches by hand
      (title+year matching can mis-hit on remakes/ambiguous titles)
- [ ] Commit `movies.json` + posters as the source of truth

**Re-export workflow (ongoing):** download new Letterboxd export → re-run the
enrichment script (it only fetches posters for films not already cached) →
commit. Letterboxd CSV columns: `Date, Name, Year, Letterboxd URI` (+ `Rating`
in ratings.csv, + `Review/Rewatch/Tags/Watched Date` in reviews.csv).
Ratings are 0.5–5 in half-star steps. Username: `shalz_mookerjee`.

### Phase 2 — Canvas shell
- [ ] Pan / zoom / inertia canvas (drag, scroll+pinch, momentum)
- [ ] Grid layout of posters on the plane
- [ ] Viewport culling (render only visible cells + buffer)

### Phase 3 — Images
- [ ] Optimized loading: `next/image`, lazy, blur placeholders, responsive sizes

### Phase 4 — The card
- [ ] Click-to-expand shared-element transition into the card design
- [ ] (Optional) deep-linkable movie URLs via Next.js intercepting routes

### Phase 5 — Responsive & polish
- [ ] Touch gestures + mobile layout
- [ ] `prefers-reduced-motion`, keyboard nav, focus trap in the card

### Phase 6 — Ship
- [ ] Push → live on shalini.one

## Likely dependencies (install when we reach them)
- **GSAP Draggable + InertiaPlugin** — pan/inertia, matching the reference feel
  (GSAP is already installed; Draggable/Inertia are free as of GSAP 3.12+).
  Alternative if we also want pinch-zoom: `react-zoom-pan-pinch`.
- `framer-motion` — already installed (click→card shared-element morph)
- `@rive-app/react-canvas` — already installed (optional per-movie Rive, like the reference)
- (later, only if a few hundred posters don't hold 60fps) `ogl` — WebGL upgrade
  for just the poster-rendering layer
