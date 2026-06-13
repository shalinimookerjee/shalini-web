/**
 * build-movies.mjs — turn a Letterboxd CSV export into the site's movie data.
 *
 * Reads watched.csv + ratings.csv + reviews.csv from a Letterboxd export,
 * enriches each film with a poster + director from TMDB, downloads the posters
 * into public/posters/, and writes src/data/movies.json.
 *
 * Usage:
 *   node --env-file=.env.local scripts/build-movies.mjs [path-to-export-dir]
 *   node scripts/build-movies.mjs [path-to-export-dir] --dry   # parse only, no TMDB
 *
 * Re-runs are cheap: films already in movies.json (matched by Letterboxd URI)
 * are reused and their posters aren't re-downloaded if the file already exists.
 */

import { parse } from "csv-parse/sync";
import { readFile, writeFile, mkdir, readdir, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const POSTERS_DIR = path.join(ROOT, "public", "posters");
const OUT_FILE = path.join(ROOT, "src", "data", "movies.json");

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const exportArg = args.find((a) => !a.startsWith("--"));

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_IMG = "https://image.tmdb.org/t/p/w780";

// ---- helpers ---------------------------------------------------------------

function slugify(title, year) {
  const base = String(title)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return year ? `${base}-${year}` : base;
}

async function resolveExportDir() {
  const candidates = [
    exportArg,
    process.env.LETTERBOXD_EXPORT,
    path.join(ROOT, "letterboxd-export"),
  ].filter(Boolean);
  for (const c of candidates) {
    const dir = path.resolve(c);
    if (existsSync(path.join(dir, "watched.csv"))) return dir;
  }
  throw new Error(
    `No Letterboxd export found. Pass the export folder path as an argument, ` +
      `e.g.\n  node scripts/build-movies.mjs ~/Downloads/letterboxd-...\n` +
      `(looked in: ${candidates.join(", ") || "nothing"})`
  );
}

async function readCsv(dir, name) {
  const file = path.join(dir, name);
  if (!existsSync(file)) return [];
  const text = await readFile(file, "utf8");
  return parse(text, { columns: true, skip_empty_lines: true, trim: true });
}

async function tmdbSearch(title, year) {
  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", TMDB_KEY);
  url.searchParams.set("query", title);
  if (year) url.searchParams.set("year", String(year));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB search ${res.status} for "${title}"`);
  const data = await res.json();
  return data.results?.[0] ?? null;
}

async function tmdbDirector(id) {
  const url = new URL(`https://api.themoviedb.org/3/movie/${id}/credits`);
  url.searchParams.set("api_key", TMDB_KEY);
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const dir = data.crew?.find((c) => c.job === "Director");
  return dir?.name ?? null;
}

async function downloadPoster(posterPath, slug) {
  const dest = path.join(POSTERS_DIR, `${slug}.jpg`);
  if (existsSync(dest)) return `/posters/${slug}.jpg`;
  const res = await fetch(`${TMDB_IMG}${posterPath}`);
  if (!res.ok) throw new Error(`poster download ${res.status} for ${slug}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return `/posters/${slug}.jpg`;
}

// ---- main ------------------------------------------------------------------

const exportDir = await resolveExportDir();
console.log(`📂 Reading Letterboxd export: ${exportDir}`);

const [watched, ratings, reviews] = await Promise.all([
  readCsv(exportDir, "watched.csv"),
  readCsv(exportDir, "ratings.csv"),
  readCsv(exportDir, "reviews.csv"),
]);

// index ratings + reviews by Letterboxd URI
const ratingByUri = new Map(ratings.map((r) => [r["Letterboxd URI"], r.Rating]));
const reviewByUri = new Map(reviews.map((r) => [r["Letterboxd URI"], r]));

// merge into a base list (watched = the canonical set of films)
const merged = watched.map((w) => {
  const uri = w["Letterboxd URI"];
  const rev = reviewByUri.get(uri);
  const ratingRaw = ratingByUri.get(uri) ?? rev?.Rating ?? "";
  return {
    title: w.Name,
    year: w.Year ? Number(w.Year) : null,
    letterboxdUri: uri,
    rating: ratingRaw === "" ? null : Number(ratingRaw),
    watchedDate: rev?.["Watched Date"] || w.Date || null,
    review: rev?.Review?.trim() || null,
    tags: rev?.Tags?.trim() || null,
  };
});

console.log(
  `🎬 ${merged.length} watched · ${ratingByUri.size} rated · ${reviewByUri.size} reviewed`
);

if (DRY) {
  console.log("\n--- DRY RUN (no TMDB calls) ---");
  for (const m of merged) {
    console.log(
      `${m.rating ? `${m.rating}★` : "  –"}  ${m.title} (${m.year})${m.review ? "  📝" : ""}`
    );
  }
  console.log(`\n✅ Parsed ${merged.length} films. Re-run without --dry to fetch posters.`);
  process.exit(0);
}

if (!TMDB_KEY) {
  console.error(
    "\n❌ TMDB_API_KEY not set. Get a free key at https://www.themoviedb.org/settings/api\n" +
      "   then add it to .env.local and run:\n" +
      "   node --env-file=.env.local scripts/build-movies.mjs"
  );
  process.exit(1);
}

await mkdir(POSTERS_DIR, { recursive: true });
await mkdir(path.dirname(OUT_FILE), { recursive: true });

// load existing output as a cache (so re-runs only fetch new films)
let existing = [];
if (existsSync(OUT_FILE)) {
  existing = JSON.parse(await readFile(OUT_FILE, "utf8"));
}
const cacheByUri = new Map(existing.map((m) => [m.letterboxdUri, m]));

const out = [];
const misses = [];
let id = 1;

for (const m of merged) {
  const slug = slugify(m.title, m.year);
  const cached = cacheByUri.get(m.letterboxdUri);

  let poster = cached?.poster ?? null;
  let director = cached?.director ?? null;
  let tmdbId = cached?.tmdbId ?? null;

  // ensure poster file still exists even if cached
  const posterExists = poster && existsSync(path.join(ROOT, "public", poster));

  if (!tmdbId || !posterExists) {
    try {
      const hit = await tmdbSearch(m.title, m.year);
      if (hit) {
        tmdbId = hit.id;
        director = director ?? (await tmdbDirector(hit.id));
        if (hit.poster_path) poster = await downloadPoster(hit.poster_path, slug);
        else misses.push(`${m.title} (${m.year}) — no poster on TMDB`);
        process.stdout.write(`✓ ${m.title}\n`);
      } else {
        misses.push(`${m.title} (${m.year}) — no TMDB match`);
        process.stdout.write(`✗ ${m.title} (no match)\n`);
      }
    } catch (err) {
      misses.push(`${m.title} (${m.year}) — ${err.message}`);
      process.stdout.write(`! ${m.title} (${err.message})\n`);
    }
  }

  out.push({
    id: id++,
    slug,
    title: m.title,
    year: m.year,
    director,
    poster,
    rating: m.rating,
    watchedDate: m.watchedDate,
    review: m.review,
    tags: m.tags,
    tmdbId,
    letterboxdUri: m.letterboxdUri,
  });
}

await writeFile(OUT_FILE, JSON.stringify(out, null, 2) + "\n");
console.log(`\n✅ Wrote ${out.length} films → ${path.relative(ROOT, OUT_FILE)}`);
console.log(`🖼️  Posters in ${path.relative(ROOT, POSTERS_DIR)}/`);
if (misses.length) {
  console.log(`\n⚠️  ${misses.length} need attention (fix by hand in movies.json):`);
  misses.forEach((m) => console.log(`   - ${m}`));
}
