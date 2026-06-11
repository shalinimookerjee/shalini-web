# shalini-web

Personal website for Shalini Mookerjee — a designer's portfolio built as an
infinite-canvas, animation-heavy experience.

## Stack

- **[Next.js](https://nextjs.org) 16** (App Router) + **React 19** + **TypeScript**
- **[Tailwind CSS](https://tailwindcss.com)** for styling
- **[Lenis](https://lenis.darkroom.engineering)** — smooth scrolling
- **[GSAP](https://gsap.com)** — scroll-based / timeline animations
- **[Rive](https://rive.app)** (`@rive-app/react-canvas`) — interactive animations
- **[Framer Motion](https://www.framer.com/motion/)** — UI interactions & transitions

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command         | What it does                     |
| --------------- | -------------------------------- |
| `npm run dev`   | Start the dev server             |
| `npm run build` | Production build                 |
| `npm start`     | Run the production build locally |
| `npm run lint`  | Lint the codebase                |

## Project structure

```
src/
  app/
    layout.tsx        # Root layout — wraps the app in SmoothScroll
    page.tsx          # Home page
    globals.css       # Global styles + Tailwind
  components/
    SmoothScroll.tsx  # Lenis smooth-scroll provider (Client Component)
public/               # Static assets (images, .riv files, etc.)
```

### Note on animation libraries

Lenis, Rive, and GSAP run in the browser only, so any component using them must
be a Client Component — start the file with `"use client";`. `SmoothScroll.tsx`
is the reference example.

## Deployment

Deployed on [Vercel](https://vercel.com). Pushes to `main` deploy to production;
pull requests get automatic preview deployments.
