"use client";

import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

/**
 * Wraps the app in Lenis smooth scrolling.
 * This is a Client Component ("use client") because the animation libraries
 * (Lenis, Rive, GSAP) run in the browser only. Use the same pattern for any
 * other browser-only / interactive piece of the site.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
