"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { AnimatePresence, motion } from "framer-motion";
import { movies, type Movie } from "@/lib/movies";

// ---- layout knobs ----------------------------------------------------------
const POSTER_W = 240;
const POSTER_H = 360; // 2:3 poster ratio
const GAP = 64;
const CELL_W = POSTER_W + GAP;
const CELL_H = POSTER_H + GAP;
const N = movies.length;

// Lattice indexing: movie at cell (gx,gy) = DECK[(gx + K·gy) mod N].
// With N prime (29) and K=7, the nearest repeat of any movie is ~7 cells away,
// so identical posters never land next to each other.
const K = 7;

// Deterministic shuffle so the lattice isn't in plain Letterboxd order
// (no Math.random → stable between server and client).
function shuffled(arr: Movie[]): Movie[] {
  const a = arr.slice();
  let seed = 0x9e3779b1;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const DECK = shuffled(movies);
const movieAt = (gx: number, gy: number): Movie =>
  DECK[(((gx + K * gy) % N) + N) % N];

type Range = { minGX: number; maxGX: number; minGY: number; maxGY: number };
type Selection = { movie: Movie; layoutId: string };

function Stars({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="text-amber-400" aria-label={`${rating} out of 5`}>
      {"★".repeat(full)}
      {half ? "½" : ""}
    </span>
  );
}

export default function MovieWall() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const offset = useRef({ x: 0, y: 0 });
  const lastDragEnd = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [range, setRange] = useState<Range>({
    minGX: 0,
    maxGX: 0,
    minGY: 0,
    maxGY: 0,
  });
  const [selected, setSelected] = useState<Selection | null>(null);

  useEffect(() => {
    setMounted(true);
    gsap.registerPlugin(Draggable, InertiaPlugin);
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;

    let vw = viewport.clientWidth;
    let vh = viewport.clientHeight;

    const computeRange = (): Range => {
      const { x, y } = offset.current;
      return {
        minGX: Math.floor(-x / CELL_W) - 1,
        maxGX: Math.ceil((vw - x) / CELL_W) + 1,
        minGY: Math.floor(-y / CELL_H) - 1,
        maxGY: Math.ceil((vh - y) / CELL_H) + 1,
      };
    };

    let cur = computeRange();
    setRange(cur);

    const tick = () => {
      const { x, y } = offset.current;
      stage.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const r = computeRange();
      if (
        r.minGX !== cur.minGX ||
        r.maxGX !== cur.maxGX ||
        r.minGY !== cur.minGY ||
        r.maxGY !== cur.maxGY
      ) {
        cur = r;
        setRange(r);
      }
    };
    gsap.ticker.add(tick);

    // Drag a detached proxy and mirror its position into our offset.
    const proxy = document.createElement("div");
    let drag: Draggable;
    drag = Draggable.create(proxy, {
      type: "x,y",
      trigger: viewport,
      inertia: true,
      onPress() {
        gsap.set(proxy, { x: offset.current.x, y: offset.current.y });
      },
      onDrag() {
        offset.current.x = drag.x;
        offset.current.y = drag.y;
      },
      onThrowUpdate() {
        offset.current.x = drag.x;
        offset.current.y = drag.y;
      },
      onDragEnd() {
        lastDragEnd.current = Date.now();
      },
    })[0];

    const onResize = () => {
      vw = viewport.clientWidth;
      vh = viewport.clientHeight;
    };
    window.addEventListener("resize", onResize);

    return () => {
      gsap.ticker.remove(tick);
      drag?.kill();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const openIfNotDragging = (sel: Selection) => {
    if (Date.now() - lastDragEnd.current < 200) return;
    setSelected(sel);
  };

  // build the visible window of cells
  const cells: { gx: number; gy: number; movie: Movie }[] = [];
  if (mounted) {
    for (let gy = range.minGY; gy <= range.maxGY; gy++) {
      for (let gx = range.minGX; gx <= range.maxGX; gx++) {
        cells.push({ gx, gy, movie: movieAt(gx, gy) });
      }
    }
  }

  return (
    <>
      <div
        ref={viewportRef}
        className="fixed inset-0 overflow-hidden bg-background cursor-grab touch-none active:cursor-grabbing"
      >
        <div ref={stageRef} className="absolute left-0 top-0 will-change-transform">
          {cells.map(({ gx, gy, movie }) => {
            const layoutId = `cell-${gx}-${gy}`;
            return (
              <motion.button
                key={layoutId}
                layoutId={layoutId}
                onClick={() => openIfNotDragging({ movie, layoutId })}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute overflow-hidden rounded-xl bg-neutral-800 shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                style={{
                  left: gx * CELL_W,
                  top: gy * CELL_H,
                  width: POSTER_W,
                  height: POSTER_H,
                }}
              >
                {movie.poster && (
                  <Image
                    src={movie.poster}
                    alt={`${movie.title} poster`}
                    width={POSTER_W}
                    height={POSTER_H}
                    className="pointer-events-none h-full w-full select-none object-cover"
                    draggable={false}
                    sizes="240px"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-neutral-500">
          drag anywhere to explore · {N} films
        </p>
      </div>

      {/* placeholder detail card — Shalini will redesign this */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              layoutId={selected.layoutId}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 flex max-w-2xl gap-6 overflow-hidden rounded-2xl bg-neutral-900 p-6 text-neutral-100 shadow-2xl"
            >
              {selected.movie.poster && (
                <Image
                  src={selected.movie.poster}
                  alt={`${selected.movie.title} poster`}
                  width={200}
                  height={300}
                  className="h-[300px] w-[200px] flex-none rounded-lg object-cover"
                />
              )}
              <div className="flex flex-col gap-2 py-2">
                <h2 className="text-2xl font-semibold leading-tight">
                  {selected.movie.title}{" "}
                  <span className="font-normal text-neutral-400">
                    {selected.movie.year}
                  </span>
                </h2>
                {selected.movie.director && (
                  <p className="text-sm text-neutral-400">
                    dir. {selected.movie.director}
                  </p>
                )}
                <div className="text-lg">
                  <Stars rating={selected.movie.rating} />
                </div>
                {selected.movie.review && (
                  <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-neutral-300">
                    {selected.movie.review}
                  </p>
                )}
                <a
                  href={selected.movie.letterboxdUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto text-xs uppercase tracking-widest text-amber-400 hover:underline"
                >
                  View on Letterboxd ↗
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
