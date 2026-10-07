# Homepage typing, photo wall, and career terminal

## Implemented sequence

- `HomeHeroTyping` uses the installed Typed.js 3.0.0. THINK, BUILD, and BECOME
  type in the existing three-line layout in 2–3 seconds, hold for a separate
  2.2 seconds, erase, and loop. The visual copy is plain text with line breaks,
  so HTML scaffolding cannot consume typing time.
  Typed handles the characters; a scoped GSAP timeline controls the hold and
  erasure. Pausing saves the printed prefix and destroys the current Typed timer;
  resuming types only the remaining tail. This also preserves a completed-word
  hold and avoids stale timers or blank-text jumps after browser restoration.
  It initializes on each homepage mount, independently of the session's opening
  panel. Keyboard-accessible pause/resume, offscreen suspension, menu suspension,
  and hidden-tab suspension are supported.
- `HomeSocietyHeading` types the full-screen “A society shaped by computing”
  statement with a masked, upward, line-by-line entrance (0.72 seconds with a
  0.13-second stagger). Stable line wrappers keep their transforms separate from
  Typed's nested text updates and the heading's later scroll exit. The entrance
  starts as the statement enters view, once per mount, with full text dimensions
  reserved. Fast scrolling only finishes outstanding typing after the rendered
  exit has hidden the heading; it cannot abruptly fill visible text at 4% scroll.
- The community stage pins for 90% of its viewport height. The heading exits,
  the centred logo appears, and photos expand outward from the centre into a
  seamless grid. The grid is complete at 76% of that scroll range (about 68% of a
  viewport), with a short remaining scroll beat to see the finished wall.
- Desktop/tablet use 24 photos in a 6 × 4 grid. Below 48rem, eighteen photos make
  a 3 × 6 grid. Native touch scrolling drives the same short reveal.
- The existing CSS logo GLB (~651 KB) spins above the wall. Its canvas stops
  rendering outside the scene and while the menu is active. It starts rendering
  for the logo's reveal, rather than beneath the society entrance. At least 5%
  of the stage must remain visible: a fractional pixel at the viewport boundary
  cannot keep a full-size canvas rendering. The canvas is positioned inside the
  clipped photo-wall stage and leaves with it. There is no docking/travel into
  the following section, no career compass, and no fixed scene overlay.
- `HomeCareerTerminal` follows the photo wall in normal document flow. The header
  targets 20% of the available desktop viewport; the near-black, green terminal
  occupies the remaining space. Short views and mobile can grow naturally,
  without an internally scrolling output panel.
- The terminal types `./choose-your-path`, then prints all seven career paths
  with their witty descriptions in approximately 2–3 seconds. Typed handles the
  command; bounded GSAP character bursts print each row in 0.24 seconds, avoiding
  hundreds of character-level timeouts. Output plays once per mount and remains
  readable. The command/output pause behind the menu, offscreen, and in hidden
  tabs. Only the final caret blinks, and only while the terminal is active.
  Playback uses viewport entry rather than a percentage of the entire frame,
  so even a tall terminal at 200% text size can trigger its entrance. The command
  also preserves its prefix when paused, rather than restarting or deleting it.

## Content and assets

`getHomeAboutContent()` in `lib/content/home.ts` provides typed heading lines,
photographs, career-path records (`id`, `name`, `description`), and terminal copy.
The fixed selection is recorded in
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

## Motion direction and fallbacks

- Per the owner's explicit direction, the hero typing/entrance, society entrance,
  photo-wall/logo sequence, and terminal playback run regardless of the operating
  system's reduced-motion preference. Viewport width still adapts the composition.
  Manual hero pause, menu suspension, and visibility suspension remain available.
- JavaScript disabled: both statements and the complete wall remain readable;
  career names and descriptions remain visible in the static terminal. Full
  source text stays available to assistive technology during animated playback;
  visual typing copies are aria-hidden and do not generate live announcements.
- Model/WebGL failure: the SVG logo replaces the canvas while the wall remains
  usable. An image failure leaves a deliberate blue tile background.
- The local clipped canvas cannot overlay later sections. Scroll animations,
  Typed instances, and observers are cleaned up on unmount.

## Review and checks

Browser checks cover 320px/390px phones (including touch emulation), 768px/1024px
tablets, and 1440px desktop: tile count/coverage, loaded images, forward/reverse
scrolling, measured timing, actual spinning canvas output, keyboard pause/resume,
menu/Escape/focus return, route navigation and browser Back, full playback with
reduced-motion enabled, JavaScript-disabled content, and a deliberately failed
model request. Terminal output is checked for wrapping, complete descriptions,
and once-only playback. Build, lint, and TypeScript checks are run for the task.

Foreground Chromium timing checks measured approximately 2.3–2.6 seconds for
hero typing and 2.4–2.6 seconds for the complete terminal command/output at the
tested widths. Pausing deliberately extends elapsed wall-clock duration.

At 200% text size the revised hero and society heading wrap within their
containers. A separate existing issue remains at 320px: the executive arrival
word “forward.” and the executive/event rail controls overflow the viewport.
That belongs to a later homepage layout pass.

The former outgoing-transition placeholder is resolved: the wall and logo leave
together, followed by the terminal section; the logo journey ends with the wall.
