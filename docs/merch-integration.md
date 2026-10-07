# CSS Merch migration

## Delivered routes

- `/merch`: the owner-supplied merch site's story adapted to the CSS KNUST shell.
  Shared header/menu/footer, interactive GLB hero, six colourways, five-stage
  photographic tour, two-product collection, Pink October, lookbook and FAQ.
- `/merch/shop`: standalone CSS and Pink October tees, regular/oversized options
  where valid, S–3XL, multiple configurations, persistent order draft and review.
- `/merch/order/[publicId]`: API-backed payment status, totals and pickup code.
- `/merch/order`: payment-return landing. Accepts a UUID in `public_id`, `order_id`
  or `id`; otherwise restores the saved public ID on the same browser.

## Approved offer and catalog

The owner approved both tees at GH₵70, six CSS colourways, CSS oversized +GH₵20,
XXL +GH₵10, 3XL +GH₵15, and Pink October through 31 October 2026 (Accra time).
No printed names, executive polo, ID cards, packs, cash selection, discount-code
input, student ID or hostel fields. Buyer details are name, phone and email.

Any **two or more tee units**, including identical units or mixed products,
receive **5% off the entire merchandise subtotal including fit/size extras**.
Round the discount to the nearest pesewa. Apply the payment fee after discount.
Examples:

- 2 regular M tees: subtotal 140.00, discount 7.00, merchandise total 133.00.
- CSS oversized 3XL + Pink October XXL: subtotal 185.00, discount 9.25,
  merchandise total 175.75.

Local approved content lives behind `getMerchStore()`. Live product IDs, stock
and catalog pricing are read independently from the ordering service. The
frontend does not invent inventory or connect an approved tee to a test record.

## Backend handoff — required before enabling real payments

Base: `https://css-knust-api.onrender.com/api/v1/`.
During implementation the live catalog returned only one `Test Item`, ID 1.
The supplied and live schemas have `product`, `quantity` and `note` on items;
the dedicated size/fit/colourway fields and discount response are pending.

1. Publish the actual **CSS Tee** and **Pink October Tee** merchandise records.
   Unique, exact names map automatically; explicit IDs can be set with
   `CSS_MERCH_TEE_ID` and `CSS_MERCH_PINK_ID` if names differ. Never use Test Item.
2. For this build, interpret and retain the generated note:

   ```text
   size=3XL;fit=oversized;colourway=kernel-panic
   ```

   Keys and values are stable IDs. Pink October uses `colourway=pink-october`
   and `fit=regular`. Every approved note fits the current 100-character limit.
   The request adapter is `makeOrderRequest()` in `lib/merch/order.ts`; change
   only its serialization when dedicated API fields arrive.
3. Validate options and calculate size/fit extras **on the backend**. A note
   does not automatically change Paystack's amount. Count stock across all
   configurations of the same merchandise record.
4. Implement the automatic offer. Include `discount` as a decimal GHS string
   in create/status responses. This adapter expects `subtotal` **before** the
   discount, and `total = subtotal - discount + fee`.

   ```json
   {
     "id": "<public order UUID>",
     "status": "PENDING",
     "subtotal": "140.00",
     "discount": "7.00",
     "fee": "<backend-calculated decimal>",
     "total": "<133.00 plus fee>",
     "authorization_url": "https://checkout.paystack.com/<session>",
     "expires_at": "<ISO datetime>"
   }
   ```

5. Set the Paystack callback to the deployed frontend's
   `/merch/order/<public order UUID>`, or `/merch/order?public_id=<UUID>`.
   The website's real production origin needs to be supplied in backend setup.
   Paystack's transaction reference alone is not the documented public order ID.
6. Confirm status names. The frontend explicitly recognises `PAID`, `COLLECTED`,
   common pending spellings, `FAILED`, `EXPIRED`, `CANCELLED`/`CANCELED`; other
   returned statuses remain visible and are never treated as paid.
   Receipt item descriptions support `product_name`/`name`, `quantity` and `note`.
7. After those contracts are verified, set `CSS_MERCH_PRICING_READY=true` in the
   frontend environment. `.env.example` contains the complete frontend setup.
   Keep Paystack keys/webhook processing in the existing backend.

The Next route handlers are thin adapters, not a replacement store backend:
`/api/merch/catalog`, `/api/merch/orders`, `/api/merch/orders/[id]`.
They call the approved service server-side, validate quantities/options, compare
backend amounts against the approved selections/offer and permit only HTTPS
Paystack payment links. A mismatched amount returns the saved public ID without
opening payment; its backend stock hold expires according to backend policy.
The readiness setting defaults false, so the present test catalog cannot take
payments. Catalog failure leaves the showcase and local order draft usable.

Preparing payment creates the backend order/stock hold. The buyer sees its final
fee-inclusive total before continuing to Paystack. A refresh retains a resumable
payment link for that session. Only confirmed Paid/Collected clears purchased
quantities; tees added after the submitted snapshot are retained. Public order
pages are `noindex` and do not return buyer contact details.

## Assets and performance

Source supplied from the sibling `cssmerch` folder: six studio mockups,
`assets/layers/shirt.webp`, Pink October cutouts/studio image, brand reference
and robot/ribbon artwork. Originals are copied under `public/merch/` and remain
in the source project. The layer renderer is exported offline into front/back
WebPs; its photo layer is never used as a GLB texture.

The existing clean shirt UV textures are resized into 2048px WebPs. Only the
selected model texture is preloaded. Source model/PNG textures remain intact.
The new `css_shirt.merch.glb` preserves UVs with a 0.1% simplification error
limit: 5.41 MB / 822,240 triangles → 1.12 MB / 123,045 triangles.
The shared viewer now serves both homepage and merch, uses static fallbacks,
handles WebGL context loss, and pauses outside view, in hidden tabs and menus.

Regenerate photo/texture derivatives: `node tools/prepare-merch.mjs` (uses the
Sharp already installed with Next). Regenerate the model with the installed CLI:

```powershell
pnpm exec gltf-transform optimize "public/css_shirt_3dmodel/models/css_shirt.web.glb" "public/css_shirt_3dmodel/models/css_shirt.merch.glb" --simplify-ratio 0.15 --simplify-error 0.001 --texture-size 2048 --texture-compress webp --compress meshopt
```

No new packages were installed. Desktop's scoped tour pin becomes readable
un-pinned content on narrow/touch layouts or when there is insufficient room. The print bot uses
event-driven motion; it and the band pause while inactive. Fonts/design tokens,
navigation and footer are shared with the existing site. Merch metadata uses
the canonical origin only once it is approved in shared site content.

## Verification

- `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`.
- `node --experimental-strip-types --test tests/merch.test.mjs tests/events.test.mjs`.
- Isolated cached Playwright against a production build: colourways, front/back/
  3D views, menu focus return/render pause, all five tour stages, Dr. Bot Escape,
  lookbook deep links, mixed-item cart, editing/removal, refresh restoration,
  discount thresholds/extras, mocked payment redirect/paid receipt/cart cleanup.
- Viewports 320, 390, 768, 1024 and 1920; reduced motion, 200% text, model failure,
  and no-JavaScript document reading. No live order or payment was created.
- Touch configuration, hash Back/Forward, callback UUID redirects, resumable
  payment after refresh, expired-order cart retention, image failures, explicit
  WebGL context loss and the extracted shared homepage viewer.

Enlarged-text checks uncovered an existing global `body` minimum in rem units
that widened the document at 200% text. `app/globals.css` now bounds that minimum
by the viewport; merch headings also wrap rather than clip at increased sizes.
The shared header reserves the menu's width and lets the identity wrap without
overlapping the menu when text is enlarged.

## Merch motion refinement

The owner approved character-by-character entrances on the hero, manifesto, five
tour titles, Shop, Pink October, Lookbook and README. Headings take one second;
the manifesto takes 3.5 seconds. Each runs once per mounted page, with tour
headings activated by their current step. The caret is removed on completion.
The complete semantic text reserves the final layout; the animated visual copy
is aria-hidden. No-JavaScript views display the complete text.

The merch navigation stays fixed below the shared header, including at the
footer. A ResizeObserver measures both bars; anchors, direct hashes/history,
hero sizing, bot position and tour pinning use the combined height. When there
is insufficient room (including enlarged text), the tour uses normal flow.

The CSS Tee shop card cycles through all six approved photographic colourways
at one-second intervals with a short opacity crossfade. Its image and product
name links both select the displayed colourway. It pauses on hover/focus, touch
presses, explicit Pause, hidden tabs, offscreen positioning and menu opening.
The same animated preview and Pause/Play control are used for every motion
preference. Other previews retain their independently selected colourways.
Only nearby shop images load.

The README now contains the discount, payment and sizing questions; the owner
requested removal of the CSS identity and colourway-rationale entries.

Verification for this refinement: lint, TypeScript, production build and the ten
merch tests; browser samples of actual typing and one-second colourway updates,
reserved layout heights, all five tour activations/once-only returns, fixed bar
alignment through the footer, anchor focus and direct/hash-history navigation,
six-colourway ordering links, hover/focus/pause/menu/touch behaviour, 320–1920px,
200% text, reduced motion, responsive tour reflow, no-JS text and image failure.
No new assets or dependencies were required.

### Full-motion setting

The owner subsequently requested removal of all reduced-motion behaviour from
the merch experience. Typing, entrances, reveals, the desktop tour, robot,
binary ribbon, CSS transitions, carousel and hero auto-rotation now use full
motion regardless of `prefers-reduced-motion`. Merch-route smooth scrolling and
section navigation also use full motion. The shared shirt viewer receives an
explicit `motion="full"` on the merch hero; its default still serves the separate
homepage viewer. Responsive layouts, no-JS/media fallbacks, manual pause, focus/
hover pauses and inactive rendering/timer cleanup remain functional.

Verification includes desktop and touch contexts emulating reduced motion:
typing progress, desktop pinning, carousel cycling/Pause, CSS animation and
crossfade durations, animated section navigation, rotating hero canvas, responsive
layout, and restoration of the shared scroll/viewer defaults after leaving merch.

Browser evidence and temporary QA scripts are outside the repository under the
pre-approved temporary directory. The supplied API YAML is owner work and has
not been overwritten to invent forthcoming backend fields.
