# Homepage scroll repairs and events exit

## Findings and repairs

- The photo wall's CSS grid already had zero gaps. During the centre-out burst,
  GSAP inferred percentage translations when some pixel offsets equalled half a
  tile. A completed 1920 × 900 wall retained a `-113px` vertical translation on
  its third row. Explicit `xPercent: 0` and `yPercent: 0` on both ends of the
  reveal remove the residual offsets while retaining the approved burst.
- Both preview rails opted out of Lenis for every gesture. They now opt out only
  for horizontal gestures, preserving native sideways navigation without
  switching vertical scrolling between competing native/interpolated positions.
- Homepage Lenis uses `lerp: 0.14` and an unscaled wheel delta. Its shared GSAP
  clock uses elapsed time rather than lag smoothing. CSS smooth scrolling is
  suspended while Lenis is active and restored on cleanup.
- Event geometry refreshes observe actual stage/card dimensions, not the entire
  homepage. Refreshing no longer seeks back to the focused event's timeline label.
  Deliberate keyboard focus still reveals the relevant link.
  The desktop exit wrapper is pointer-transparent until the actual panel arrives,
  so its offscreen contents cannot block event cards and their links.
- Leadership's diagonal clips only its background surface, avoiding a large
  clipped composite of all portraits during vertical scrolling. Existing hover
  accordion behaviour is retained, with painting contained to the gallery frame.
- Menu focus return waits for the scroll lock's separate state commit to remove
  the header's `inert` attribute before focusing its MENU control.

## Visual behaviour

- The terminal is near-black (`#080909`), with green prompts/path names/caret,
  white command/descriptions, and neutral muted labels.
- The mouse is attached to a local track in `.home-leadership`, outside the
  leadership background's clip. Track height inherits the same
  `--leadership-edge` as the diagonal. Its centre follows that line, with clamped
  starting/ending positions. It stays visible at rest and reverses on upward
  scroll. A small, demand-rendered tilt settles back to neutral after input.
- One small Canvas mounts near the line, stays mounted at both endpoints, and
  stops rendering at rest/offscreen/behind the menu. The original mouse GLB is
  reused. A decorative inline SVG mouse preserves the line treatment while the
  model loads or if the model/WebGL fails.
- The Linus quotation sits in a centred bridge between leadership and events.
  Its complete text reserves layout dimensions and remains available to
  assistive technology. A short entrance and bounded character reveal play once
  per homepage mount, pause offscreen/behind navigation/in hidden tabs, and do
  not restart when scrolling back.
- The events timeline ends with a standalone, vertically centred “View all
  events” button immediately in front of a full-height quote panel. The final
  card-to-button gap matches the actual rail gap; the button's right edge touches
  the panel's left edge with no gap. One track drives desktop movement and the
  attached lead is derived from that track, preserving both joins throughout
  forward/reverse scrolling and resize. The button exits completely left when
  the quote fills the viewport. Keyboard focus seeks the button-centred beat,
  rather than its offscreen endpoint. The panel uses the existing
  `--background`, carries the centred Steve Jobs quotation, and replaces the
  former standalone quotation after events. The link still navigates to `/events`.
- Desktop incorporates the panel into the existing events timeline. Mobile and
  coarse-pointer contexts retain swipeable cards followed by a short CSS-sticky
  horizontal takeover driven by native vertical scrolling. There are no custom
  wheel/touch interception handlers for the takeover, no snap-back, and no timed
  hold at its end. Further scrolling moves vertically into merch.
  A noninteractive, aria-hidden/inert rendering of the final event card carries
  that card into the mobile takeover with the same card-gap/button/panel chain.
  It reuses the verified event data and artwork; accessible links remain in the
  original swipe rail. Static/reduced-motion layouts place the button before,
  rather than inside, the quote panel and hide the decorative card copy.
- Reduced motion uses complete static quotations and natural document flow.
  Enlarged text/short viewports also use natural flow whenever the quotation and
  its padding cannot fit the scene, preserving complete text and native rail
  controls. Without JavaScript, text, imagery and event links remain available.

## Content and dependencies

Existing quotations now live in `content/home.ts`, typed by `HomeQuote` and
retrieved through `getHomeQuotes()`. No new public facts or placeholder content
were introduced. Photos, portraits, CSS logo, mouse GLB, `event1.jpg` and the
existing KNUST entrance imagery are reused. No packages were added.

## Verification

Browser checks cover 320px/390px phones, a 768px touch tablet, and 1440px/1920px
desktop layouts: full tile coverage, terminal colours, line alignment, mouse
endpoints/reversal/idle rendering, centred once-only quotations, forward/reverse
panel travel, matching panel/background colour, and vertical release into merch.
Additional checks exercise real wheel reversals over the galleries, CPU-throttled
scrolling, actual touch swipes, keyboard link reveal, refresh with a focused event,
menu/Escape/focus return, route cleanup and Back, reduced motion, 200% text, short
landscape views, no JavaScript, executive hover/keyboard selection, a failed mouse
asset request, and unavailable WebGL.

The leading-button refinement is measured at 320px, 390px, 768px, 1024px, 1440px
and 1920px: matching card gaps, zero button/panel gap, vertical centring, reversible
shared movement, fully offscreen button at completion, usable focused/clicked
event links, resize recalculation, static fallbacks, and vertical release.

Project checks: `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build`.
Browser scripts/screenshots are temporary QA artifacts, outside the application.

## Changed files

- `app/page.tsx`: quote retrieval and the revised section composition.
- `app/globals.css`: terminal palette, diagonal/gallery paint boundaries, local
  mouse track, quote spacing, panel/sticky layouts, and native-rail fallbacks.
- `components/home/home-about-experience.tsx`: explicit tile percentage offsets.
- `components/home/home-executive-gallery.tsx`: horizontal-only Lenis opt-out.
- `components/home/home-executives.tsx`: the section-attached mouse wrapper.
- `components/home/leadership-mouse-pass.tsx`: clamped line geometry, a small
  demand-rendered model, endpoint reactions, and a static SVG fallback.
- `components/home/home-quote-bridge.tsx`: accessible once-only typed entrances.
- `components/home/home-events.tsx`: desktop/mobile exits, content-fit checks,
  focus seeking, and bounded geometry refreshes.
- `components/providers/smooth-scroll-provider.tsx`: homepage interpolation,
  elapsed-time synchronization, and CSS scrolling coordination.
- `components/navigation/site-header.tsx`: scroll-lock-aware menu focus return.
- `lib/animations/use-snap-rail.ts`: native controls for content-fit fallbacks.
- `content/home.ts`, `lib/content/home.ts`, `types/home.ts`: the typed quotation
  content and retrieval boundary.
- `docs/home-scroll-handoff.md`: findings, behaviour, assets, and checks.
