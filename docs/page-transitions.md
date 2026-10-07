# CSS KNUST page transitions

## Direction

One consistent **sweep → confident stamp → click → reveal** treatment:

- The existing electric-blue panel sweeps in with an angled leading edge.
- The supplied dark CSS mark lands decisively with a tiny contact compression
  and a clean settle. Oversized off-white destination typography arrives below.
- Once the route commits **and** the stamp settles, a short click pulse cues
  the angular exit. Ready routes have roughly a one-second visual sequence.
- Typography is fitted to the available width, including longer labels on
  phones and at doubled text size. Short landscape windows get a smaller mark.
- Direct URL loads render normally. Browser Back/Forward uses the same visual
  treatment with labels resolved from the destination path.

## Navigation coordinator

`components/transitions/route-transition-provider.tsx` persists in the root
layout. Each navigation owns an independent, scoped GSAP context; completion,
replacement, and unmount clear its timelines, observers, timers, and handlers.

The coordinator waits for pathname commitment rather than exposing the
destination on an arbitrary animation timer. Fast commits still finish the
stamp; slow commits hold a complete logo/title composition. The initial
stylesheet transform is normalized before GSAP takes control to avoid adding
a computed pixel offset to the percentage wipe.

The cover has a **four-second bounded wait**. If the route has not committed,
it releases without a success click and displays a dismissible message. Late
commitment clears the message and focuses the destination without replaying
the transition. Escape can release a held, pending cover too.

`TransitionLink` preserves same-page query/hash navigation, modified clicks,
new-tab targets, downloads, and external destinations. Repeated internal
navigation is suppressed during an active transaction.

## Interaction and scrolling

- Background content and the header are inert while navigation owns the cover.
- Keyboard focus moves to the destination heading/main after reveal, using
  `preventScroll`. Temporary tabindex changes are restored on blur/cleanup.
- The menu, route transition, and first-session homepage loader have separate
  scroll-lock owners in `SmoothScrollProvider`. The native lock attribute and
  Lenis stay locked until every owner has released its lock.
- The homepage loader leaves header inertness to the shared lock state. This
  prevents a transition-to-home handoff from restoring a stale header lock.
- Scroll positions are tracked per browser history entry, using a namespaced
  state field while preserving Next.js history state. Back/Forward restores
  the saved position before restarting Lenis. Query/hash entries are distinct.
- History entry IDs also work in local-network HTTP previews where
  `crypto.randomUUID()` may not be available.

## Assets and dependencies

Uses `public/css_logo.svg`, the existing colour tokens and Bricolage font.
No source artwork was changed and no packages were added. Verified installation:
pnpm 12.5.1, Next.js 16.3.6, GSAP 3.15.0 and @gsap/react 2.1.2. Navigation APIs
were checked against the documentation shipped with the installed Next.js.

## Changed files

- `components/transitions/route-transition-provider.tsx`: persistent animated
  coordinator, route readiness, bounded recovery, history and destination focus.
- `components/transitions/transition-link.tsx`: native-link semantics and
  duplicate-navigation protection.
- `lib/animations/route-label.ts`: consistent destination labels.
- `app/globals.css`: angular surface, stamp/title/pulse, responsive composition,
  native scroll-lock selector, and recovery message styling.
- `components/providers/smooth-scroll-provider.tsx`: source-owned locks and
  reactive lock state, preserving the existing Lenis tuning.
- `components/providers/navigation-state-provider.tsx`: combined menu/transition
  background interaction state.
- `components/navigation/site-header.tsx`: lock-aware header and coordinated
  menu/destination focus.
- `components/home/home-loader.tsx`: independent loader lock and header handoff.

## Verification

- TypeScript, ESLint, production build, and whitespace/diff checks passed.
- Isolated Chromium production checks passed at 1440×900, 390×844, 320×568,
  768×1024 and 844×390, plus doubled text sizing on a 390×844 viewport.
- All four viewport corners were covered during the holding state. Destination
  titles fit, compositions remained separated, and background focus was blocked.
- Verified click/pulse/reveal phases, restored destination focus, menu and
  footer navigation, repeated-click suppression, modified-click/new-tab behavior,
  same-route menu focus return, and independent first-session homepage loading.
- Back/Forward restored the saved About position (2,066 px in the production
  check) and displayed the correct destination labels.
- A 7.2-second artificial route delay exercised the four-second recovery and
  late destination commit without replaying the cover. No uncaught page errors
  in these checks. Browser scripts/screenshots are local temporary QA artifacts.
- Additional production checks passed with `crypto.randomUUID` unavailable,
  same-page query/hash history changes, Escape releasing a held cover, and
  dismissing the recovery message.
