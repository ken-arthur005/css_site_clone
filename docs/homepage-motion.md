# Homepage typing and photo-wall reveal

## Implemented sequence

- `HomeHeroTyping` uses the installed Typed.js 3.0.0. THINK, BUILD, and BECOME
  type in the existing three-line layout, hold for 2.2 seconds, erase, and loop.
  It initializes on each homepage mount, independently of the session's opening
  panel. Keyboard-accessible pause/resume, offscreen suspension, menu suspension,
  and hidden-tab suspension are supported.
- `HomeSocietyHeading` types the full-screen “A society shaped by computing”
  statement on entering view, once per mount. Its invisible sizing copy reserves
  the completed text's layout. Advancing the scroll finishes outstanding typing
  immediately so it cannot block the logo/photo sequence.
- The community stage pins for 90% of its viewport height. The heading exits,
  the centred logo appears, and photos expand outward from the centre into a
  seamless grid. The grid is complete at 76% of that scroll range (about 68% of a
  viewport), with a short remaining scroll beat to see the finished wall.
- Desktop/tablet use 24 photos in a 6 × 4 grid. Below 48rem, eighteen photos make
  a 3 × 6 grid. Native touch scrolling drives the same short reveal. The existing
  career compass still uses its desktop-only conditions.
- The existing CSS logo GLB (~651 KB) spins above the wall. Its canvas stops
  rendering outside the scene and while the menu is active. The header logo is
  no longer the entrance/docking origin.

## Content and assets

`getHomeAboutContent()` in `lib/content/home.ts` provides typed heading lines,
photographs, and the existing career paths. The fixed selection is recorded in
`content/home.ts`; components do not import that local content directly.

Photos come from the supplied `public/about/{learning,life,sports,community}`
folders. The six initially unused selections lead the list: `learning.jpg`,
`life5_repyourschool.jpg`, `sports7_iconicpic.JPG`, `life7_repyourjersey.JPG`,
`sport1_coachandplayer.JPG`, and `sports1_reigningchamps.JPG`. The remaining photos
mix community, learning, social activities, and sports. Photos are decorative,
with no newly invented captions or factual claims. `next/image` serves responsive
tile-size derivatives rather than full-resolution originals.

No packages or source assets were added. The existing `CSS Logo 3d.glb` and
`css_logo.svg` are reused. The session boot script now lives in the persistent
server layout so returning to the homepage does not insert an inert React
script tag or repeat the opening panel.

## Fallbacks

- Reduced motion: complete text, a static photo grid and logo, no community pin
  or WebGL canvas. Changing the preference during the scene releases its styles
  and pin spacer.
- JavaScript disabled: both statements and the complete wall remain readable;
  career information stays in the document.
- Model/WebGL failure: the SVG logo replaces the canvas while the wall remains
  usable. An image failure leaves a deliberate blue tile background.
- A fixed canvas cannot remain visible over later sections after the scene
  deactivates. Scroll animations and observers are cleaned up on unmount.

## Review and checks

Browser checks cover 320px/390px phones (including touch emulation), 768px/1024px
tablets, and 1440px desktop: tile count/coverage, loaded images, forward/reverse
scrolling, keyboard pause/resume, menu/Escape/focus return, route navigation and
browser Back, live reduced-motion changes, JavaScript-disabled content, and a
deliberately failed model request. Build, lint, and TypeScript checks are run for
the task.

At 200% text size the revised hero and society heading wrap within their
containers. A separate existing issue remains at 320px: the executive arrival
word “forward.” and the executive/event rail controls overflow the viewport.
That belongs to a later homepage layout pass.

**Pending owner direction:** the final outgoing transition after the complete
photo wall. The existing career-path section follows it for this iteration.
