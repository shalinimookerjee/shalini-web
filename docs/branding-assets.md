# Branding assets — drop-in spec

The metadata is already wired (see `src/app/layout.tsx` + `src/app/films/page.tsx`).
Next.js auto-detects the files below **by filename** — just export them from Figma,
drop them at these exact paths, and they take effect on the next deploy. No code
changes needed.

## 1. Favicon / app icon (the small icon — browser tab + share-preview circle)

Replaces the default Vercel/Next triangle. Add **either or both**:

| File | Size | Notes |
| --- | --- | --- |
| `src/app/icon.svg` | vector | Crispest. Preferred if your mark is vector. |
| `src/app/icon.png` | 512×512 | Use if PNG. Next downsizes as needed. |
| `src/app/apple-icon.png` | 180×180 | iOS home-screen icon (optional but nice). |

You can also just overwrite `src/app/favicon.ico` if you have an `.ico`.
(If both `favicon.ico` and `icon.*` exist, that's fine.)

## 2. Open Graph image (the big link-preview image)

The large image shown when the link is shared (WhatsApp, iMessage, Twitter, etc.).

| File | Size | Applies to |
| --- | --- | --- |
| `src/app/opengraph-image.png` | **1200×630** | the whole site (homepage + fallback) |
| `src/app/films/opengraph-image.png` | **1200×630** | the `/films` page specifically |

- 1200×630 is the standard ratio (≈1.91:1). Keep important content centered with
  margin — some apps crop the edges.
- Same image is reused for Twitter automatically (card = `summary_large_image`).
  To use a *different* Twitter image, add `twitter-image.png` next to the OG one.

## Verify after adding

```bash
npm run build          # confirms Next picked up the files (no errors)
git add -A && git commit -m "Add branding assets" && git push   # deploys
```

Then test the preview with these (paste your URL):
- WhatsApp/iMessage: just send the link to yourself
- Facebook: https://developers.facebook.com/tools/debug/  (use "Scrape Again")
- Twitter/X: https://cards-dev.twitter.com/validator
- General: https://www.opengraph.xyz/

> Social platforms **cache** previews aggressively. If you still see the old icon
> after deploying, use the debuggers above to force a re-scrape, or add a dummy
> `?v=2` to the URL when testing.
