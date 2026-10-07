# Homepage loading experience

## Agreed behavior

- Play the full entrance once per browser session (`css-home-intro-seen`).
- Trace the CSS logo's outline, then reveal its original solid SVG artwork.
- If assets are ready during drawing, finish drawing and reveal directly.
- Otherwise, an animated cursor pursues the logo in a bounded central stage.
- On readiness, stop the chase from its current position, catch the logo,
  click it, and reveal the homepage through an off-white/blue angled wipe.
- Rotate programming one-liners every 3.8 seconds while waiting.
- Wait for the complete homepage asset set, including below-the-fold media,
  all featured shirt colourways, models, textures, scene code, and used fonts.
- Release the readiness gate after 12 seconds of asset preparation. The
  catch/click/reveal animation finishes afterward; 12 seconds is the asset
  deadline, not a promise that the entire entrance lasts exactly 12 seconds.
- Warm public destination routes/media after the reveal. Navigation interrupts
  the low-priority background image queue.

This task explicitly replaces the earlier critical-first-view-only loading
policy for the homepage. Page-to-page transition art direction is a follow-up.

## Artwork and editorial

`components/home/loader-logo.tsx` preserves the six principal contour paths
from `public/css_logo.svg`. The original has 89 paths; the small overlapping
shade fragments are excluded from the outline animation. The solid fill still
uses the complete original SVG. Neither supplied logo source was overwritten.

The outline uses native SVG stroke-dash attributes, animated by GSAP. Animating
the attribute rather than a rounded CSS pixel value preserves fractional dash
positions with the normalized `pathLength="1"`.

Programming jokes live in `content/loading.ts`, retrieved through
`lib/content/loading.ts`. They are **editorial drafts pending owner review**.
The loader exposes that status as `data-content-status="placeholder"`.

## Asset preparation

- Rendered `next/image` elements are made eager and awaited through image
  decoding. They retain their actual responsive source sets and sizes.
- Additional interactive-state photos use `getImageProps`, including all
  featured merch fallbacks and footer hover previews.
- `HomeResourceWarmup` uses Suspense outside Canvas to prepare the exact
  `useGLTF` and `TextureLoader` caches consumed by visible scenes.
- The hidden preparation mounts **no WebGL canvases**. GPU/shader work remains
  associated with visible scene mounting; downloaded models do not imply that
  every scene has already rendered.
- Existing model/static fallbacks are selected for failed or timed-out models
  and textures. Slow photos show their reserved background until they arrive.
- Background routes are public About, Executives, Events, Merch, and event
  details. The queue uses two low-priority image workers, an 8-second per-image
  limit, and warms the About film after photographs. It does not fetch ordering
  endpoints or private order routes.

## Lifecycle and diagnostics

The loader makes background sections/header/footer inert and locks both native
and Lenis scrolling. Completion and unmount restore the prior states. Timers,
listeners, observers, requests, and GSAP timelines have scoped cleanup.

The loader exposes `data-phase` (`drawing`, `chasing`, `catching`, `revealing`),
`data-load-result`, `data-pending-assets`, and `data-failed-assets` for inspection.
No progress percentage is fabricated. A CSS-only 16-second dismissal protects
the initial overlay if hydration never starts; managed loading uses the real
readiness/deadline coordinator instead.

## Dependencies

No new packages. Uses the existing Next.js 16.3.6, React 19.2.8, GSAP 3.15.0,
@gsap/react 2.1.2, Drei 10.7.9, R3F 9.8.1, and Three 0.186.1 installation.

## Verification (2026-10-07)

- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`, and `git diff --check`
  passed. The final production build also completed its TypeScript check.
- Isolated Chromium production checks passed at 1440×900, 390×844, 320×568,
  768×1024, and 844×390, plus doubled text sizing at 390×844.
- Fractional outline drawing, direct ready-during-drawing reveal, delayed
  chase/catch/click reveal, joke rotation, keyboard background isolation,
  restored scrolling, and once-per-session refresh behavior were verified.
- Public route prefetch requests began after the completed reveal.
- Artificially delayed models released at 12,017 ms after asset preparation
  started; static fallbacks remained available afterward.
- A failed model and photograph did not trap loading or crash the homepage.
- Resizing during the chase kept the logo/cursor inside the new composition.
  SPA navigation during the chase restored header interaction and scrolling.
- No uncaught page errors in these checks. Screenshots and browser scripts are
  local verification artifacts under the approved temporary tools directory.

## Changed files

- Loader/artwork: `components/home/home-loader.tsx`, `loader-logo.tsx`,
  `home-resource-warmup.tsx`.
- Content/contracts: `content/loading.ts`, `lib/content/loading.ts`,
  `types/loading.ts`.
- Readiness/cache warming: `lib/loading/home-assets.ts`,
  `lib/loading/asset-fallback.ts`.
- Integration: `app/page.tsx`, `app/globals.css`,
  `components/home/home-hero.tsx`, `home-about-experience.tsx`,
  `home-merch-selector.tsx`, `leadership-mouse-pass.tsx`,
  `components/navigation/footer-logo-scene.tsx`.
- Task record: `docs/homepage-loading.md`.
