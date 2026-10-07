# Homepage shirt interaction

## Behaviour

- The actual WebGL canvas is cropped around the garment instead of covering the
  entire merch section. The original full-stage camera field of view, distance,
  model scale, and centre are retained using `PerspectiveCamera.setViewOffset`.
  Responsive scale uses the original layout slot's width, not the cropped canvas.
- Mouse drags start only on the mesh or within a small 16px proximity margin.
  Touch/pen use 24px. Empty corners inside the rectangular canvas are not a
  substitute for a garment hit. The cursor shows grab only when a hit is close.
- Leaving the proximity zone cancels the drag and releases pointer capture. That
  press cannot resume rotation on re-entry. Idle rotation remains paused until
  the original press ends, followed by the existing interaction cooldown.
- Touch waits for at least 8px of movement and clear horizontal intent before
  rotating. Vertical swipes scroll the page, even when starting on the shirt.
  The focused viewer uses `touch-action: pan-y pinch-zoom` and has no OrbitControls
  DOM listeners to override it. Mouse retains horizontal turn and limited tilt.
- The compact canvas is keyboard-focusable, labelled with the current colourway
  and instructions, and supports left/right arrow-key rotation. Up/down remain
  available for page scrolling. Native pinch zoom is available on touch devices.
- Pointer state/capture and listeners are cleaned up on cancellation, menu or
  visibility suspension, variant changes, and unmount. Pending rotation timers
  are cleared when the viewer unmounts.

## Integration and assets

`HomeMerchSelector` opts into `interaction="shirt-only"` on the shared
`MerchShirtViewer`. `ShirtProximityControls` owns the compact camera window and
native gesture handling. The surrounding decorative surface has no pointer hit
area; the actual compact canvas remains interactive.

The supplied `/css_shirt_3dmodel/models/css_shirt.merch.glb` is reused with the
existing textures and static renders from `content/merch.ts`. Inspection found
123,045 triangles and one mesh. Drei's existing `Bvh` component accelerates the
mesh hit tests. The focused instance clones/owns its geometry; indirect BVH
construction preserves its indices/UV layout and does not modify shared loader
geometry. No new packages, models, textures, colours, or inventory data are added.

## Checks

- TypeScript, ESLint, and production build.
- Desktop/phone/tablet viewport widths: 320, 390, 768, 1024, and 1440px.
- Desktop: the actual canvas reduced from approximately 1425 × 900 to 647 × 568
  at the 1440 × 900 viewport (about 71% less canvas area), with original framing.
- Touch-emulated 390 × 844: canvas approximately 358 × 324 within the old
  358 × 405 slot. A real vertical touch swipe starting on the shirt scrolled the
  document by about 105px and applied no manual rotation. Horizontal touch
  movement rotated the garment without changing the document's scroll position.
- Empty-space drag, near-shirt drag, exit cancellation, held-pointer re-entry,
  keyboard rotation, valid colour/print choices, and front/back rendering.
- The `/merch` hero continues using the shared viewer's standard interaction mode.
- Existing photographic fallback is retained if the model or texture fails.
