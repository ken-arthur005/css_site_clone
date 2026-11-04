# CSS Merch migration

## Delivered routes

- `/merch`: the owner-supplied merch site's story adapted to the CSS KNUST shell.
  Shared header/menu/footer, interactive GLB hero, six colourways, five-stage
  photographic tour, two-product collection, Pink October, lookbook and FAQ.
- `/merch/shop`: CSS and Pink October tees, live available sizes, a two-stage builder with an
  editable visual order shelf, persistent order draft and review.
- `/merch/order/[publicId]`: server-rendered receipt, live payment status, item
  images/details, verified amount paid, copyable pickup code and Shop again.
- `/merch/order`: payment-return landing. Accepts a UUID in `public_id`, `order_id`
  or `id`; otherwise restores the saved public ID on the same browser.
- `/checkout/[publicId]`: absolute compatibility redirect to
  `https://thecssknust.com/merch/order/[publicId]` for older Vercel callbacks.
  Invalid IDs 404. Legacy Vercel canonical-origin settings fall back to the
  approved custom domain.

## Current payment contract — 9 October 2026

The backend controls prices, discounts, stock, sizes and colourway availability.
The owner has removed all size/fit surcharges for now; both tees use their live
base price. Pink October remains open through 31 October 2026 (Accra time).
Buyer details are name, phone and email; there are no student ID, hostel, cash,
printed-name or discount-code fields.

Base: `https://css-knust-api.onrender.com/api/v1/`.

| Local product | Confirmed API ID | Observed API name |
| --- | --- | --- |
| CSS Tee | 2 | Css Shirt |
| Pink October Tee | 3 | Pink Octobee |

IDs live in the typed content and can be overridden by `CSS_MERCH_TEE_ID` and
`CSS_MERCH_PINK_ID` when moving to another catalog. `Test Item` is never mapped.
At verification both tees cost GH₵70 and expose M/L/XL/XXL. The service's
`merchandise/discount/` endpoint returns enabled=true, percent="5.00", min_units=2.
These are a snapshot, not frontend constants to enforce against backend updates.

CSS colourway mappings are part of the content data:

| Local visual ID | API `colorway` |
| --- | --- |
| kernel-panic | black-pink |
| hot-reload | pink-white |
| blue-screen | blue-white |
| dark-mode | black-white |
| light-mode | white-black |
| hyperlink | white-blue |

New order items send `{ product, quantity, size, colorway }`. Pink October has
no backend colourway option and omits `colorway`. Neither product sends option
notes or fit. Receipts still understand legacy note-based selections.

`getMerchStore()` supplies creative content, measurement references and stable
cart IDs. `getCheckoutCatalog()` supplies validated commerce data. Shared helpers
derive display estimates and selection/aggregate-stock checks from that catalog.
Unsupported saved sizes remain visible and editable; their units are not dropped.
Showcase prices/offers load separately so API failure does not block first view.
Offline builder prices are marked estimates and new payments are disabled.

The Next handlers remain thin adapters:
`/api/merch/catalog`, `/api/merch/orders`, `/api/merch/orders/[id]`.
Orders are revalidated server-side against fresh options and stock. Decimal GHS
responses use `discount_amount` and `discount_percent`. The backend quote is
authoritative, with `subtotal - discount_amount + fee = total`; invalid amounts,
arithmetic or payment URLs are rejected while retaining a valid created order ID.
Only HTTPS Paystack checkout URLs are exposed. Public responses explicitly
select fields, including receipt-item fields, to exclude buyer contact details.

The owner's latest flow is **Build order → Review & pay → Proceed to pay →
Paystack → receipt**. Review is the checkout screen. A single submit validates
buyer/options, creates the backend order/stock hold, saves its reference, and
opens Paystack immediately. There is no prepare/confirm-payment intermediate
screen. Merchandise amounts are estimates; the buyer pays the processing fee,
and Paystack shows the final fee-inclusive total before payment authorization.

The shop rechecks saved attempts on mount, return/focus/visibility and just before
submission. Paid/Collected attempts are reconciled once; Cancelled/Expired/Failed
attempts are retired without discarding unpaid selections. An earlier pending
attempt is an optional disclosure, never a lock on the current checkout.
Editing/removing submitted selections detaches the older snapshot from the cart;
creating a replacement also archives its predecessor without cart ownership.
Later receipt visits cannot subtract purchased units again from a new cart.
Adding extra units retains the existing snapshot so those later additions survive
normal completion. A small local journal retains up to 20 order snapshots, with
no buyer contact details, and keeps a link to the last confirmed receipt.

There is no documented backend cancellation endpoint. Replacing a frontend
attempt does not cancel its Paystack link or release its backend stock hold;
the backend's existing expiry policy applies. No inventory changes are made by
the frontend reconciliation helpers.

Review/build step buttons explicitly reset the shared Lenis/native scroll
coordinator to the top after rendering, with keyboard focus moved without a
second browser scroll. The receipt loads validated initial status server-side
and polls pending payments (or a missing pickup code) for up to two minutes,
with manual Check payment. Paid/Collected alone enables success and pickup code
display. Images/names and historical unit/line prices come from confirmed
catalog mappings and validated receipt fields; totals never use today's catalog
price in place of a historical paid amount. Public order pages are `noindex`.

Checkout has no frontend readiness environment switch. The backend controls
ordering availability; stale deployment readiness values are ignored by this
build. Paystack test/live mode is determined by backend credentials. No Paystack
public or secret key is used in the frontend; all credentials belong in the backend.
`.env.example` contains the frontend's API/ID/origin settings.

### Callback and webhook setup

Approved callback: `https://thecssknust.com/merch/order/<public order UUID>`.
The backend must substitute the actual order ID while initialising each payment;
Paystack's reference alone is not the public order UUID.

Backend webhook: `https://css-knust-api.onrender.com/api/v1/payments/paystack/webhook/`.
Returning to the callback does not confirm payment. The website reads the
backend's confirmed status; webhook verification remains in the backend.

**Observed mismatch:** the completed test transaction returned to
`https://thecssknust.vercel.app/checkout/<UUID>?trxref=...&reference=...`, which
was a 404 on the existing deployment. The compatibility route now redirects
absolutely to the custom domain, rather than remaining on the Vercel origin.
The backend should still initialise new transactions with the approved URL.

### Payment verification and live-mode handoff

A real Paystack **test-mode** Mobile Money checkout completed for order
`3e01d967-f287-4eca-8631-3fc7335bad3c`, buyer name `CSS PAYMENT QA — TEST ORDER`,
using Paystack's MTN test number. The checkout visibly identified itself as Test.
The order contains one CSS XXL Kernel Panic tee and one Pink October L tee.
The service confirmed subtotal 140.00, discount 7.00, fee 2.65, total 135.65,
then status `paid` with a pickup code. The local receipt and cart cleanup worked.
No real-money transaction was performed. This test order uses one unit of each
product in the shared backend stock; the owner will manually reconcile those
test records before live sales.

When switching the same Render backend to live: finish tests, resolve the
callback mismatch, close out test sessions/stock holds, set live backend
credentials, confirm live webhook/callback settings, and redeploy. Signature
verification must use the matching live secret. The frontend keeps the same API
and receipt flow. A controlled real transaction remains a separate launch check.
The YAML source is owner-maintained and has not been altered.

### Checkout UX correction checks

- `pnpm lint`, TypeScript and production build checks pass. The automated suite
  now contains 21 merchandise tests plus 9 event regression tests, including
  legacy paid-attempt retirement, one-time reconciliation, superseded/edited
  snapshots, historic receipt item prices, and private-field filtering.
- The owner's existing order `9800caae-6800-4b4e-85d4-76e6f1b9a74c` was checked
  read-only: Paid, two Light Mode L tees, subtotal 140.00, discount 7.00, fee
  2.65, amount paid 135.65 and a supplied pickup code. Its new receipt renders
  fully without JavaScript. The code itself is not copied into this document.
- Production-build browser checks cover 320/390/768/1024/1920, 200% text,
  keyboard/touch, scrolling to the top from the bottom, replacing an earlier
  unpaid cart, single-click redirect, and double-submit protection. Two successive
  purchases and visits to older receipts preserve the new cart correctly.
- Pending/Cancelled/unknown payment statuses, delayed pickup code, clipboard
  denial/manual-copy fallback, image failure, missing receipts, and canonical
  legacy redirect are verified. The receipt remains readable without motion.
- Checkout mutations for this correction were tested against isolated local API
  fixtures, not the deployed order service. No new external payments or inventory
  changes were made. No assets or packages were added. Temporary browser evidence
  and fixtures remain outside the source repository.

### Original payment integration checks (historical)

- Passed `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build`.
- Passed `node --experimental-strip-types --test tests/merch.test.mjs tests/events.test.mjs`:
  17 merchandise tests plus 9 event regression tests.
- Production-browser checks: live catalog and dedicated option submission,
  backend quote/fee/receipt, refresh restoration, single-flight submission,
  mixed products, changing prices/offer thresholds, disabled options and
  combinations, stock reductions, failed catalog/retry, unsupported legacy
  size preservation/editing, Pending/Cancelled/Collected/unknown statuses,
  cleanup preserving later additions, and legacy callback redirect/invalid IDs.
- Viewports 320/390/768/1024/1920, 200% text, keyboard activation, a separate
  double-density touch context using taps, reduced motion, no-JavaScript
  showcase pricing fallback, and readable content with model requests blocked.
- Only one external test-mode order/payment was created (documented above).
  Other checkout/status cases were mocked or blocked. No new assets or packages
  were needed; existing supplied tee cutouts and the shelf/review cart were reused.

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

## Original migration verification (historical)

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

The following refinement entries record earlier work. The current payment
contract above supersedes their historical pricing and mocked-payment notes.

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

## Order shelf redesign

The shop now uses **Build your order → Review & pay**. Design selection lives
inside the configurator, and the order shelf remains visible below it. The shelf
reuses the supplied front WebP cutouts (`public/merch/tees/` and
`public/merch/pink/`); its shallow tray, front lip and shadows are CSS surfaces.
No additional images, models or packages are needed.

Each product/colourway/size combination has its own entry. Identical additions
merge quantities. Shelf controls share the review's quantity/stock checks; Edit
loads the configuration with Save/Cancel, and Remove has a ten-second Undo.
New additions settle into place, matching quantities receive confirmation, and
the new shelf motion respects reduced motion independently of the showcase.
Desktop rows wrap; narrow layouts use stacked image/detail entries that reflow
at enlarged text sizes. Images have the shared failure fallback.

Fit was removed from product options, pricing, types and new order notes.
At that stage XXL and 3XL each added GH₵10; these extras are now removed by the
current payment contract. Legacy saved fit entries normalize into the new
product/colourway/size key without discarding units. Above-limit merged quantities
remain visible and must be reduced before checkout. Existing payment snapshots
and backend-confirmed amounts are not rewritten; receipt cleanup normalizes
their selections when subtracting purchased units from the current cart.

Checks: eleven merch tests, ESLint, TypeScript and production build; isolated
browser verification of mixed designs/sizes, duplicates, edit merging/cancellation,
removal/Undo/focus, stock checks, refresh/hash history, legacy migration, pricing,
320–1920px layouts, 200% text, keyboard, reduced motion and failed images.
A separate 390px double-density touch context verified add, quantity, edit/save,
remove/Undo and review using taps.
Checkout and receipt responses were mocked; no live order or payment was made.

## Saved-order review cart

Review & pay now replaces the configurator's carried-over preview with
`MerchReviewCart`, which consumes only saved order lines. The same front WebP
cutouts sit inside a custom SVG wire cart with a handle, wheels, front/side mesh
and grounding shadow. Repeated shirt images represent units; size tags distinguish
otherwise identical imagery. No new assets, models or dependencies were added.

The composition displays up to eight units. Allocation represents distinct
configurations before adding repeated copies; remaining units are counted by
the **+N more tees** control. The **Find a selection** disclosure exposes every
configuration, including those outside the visible composition. Selecting an
otherwise hidden configuration brings a representative shirt into the cart.

Each shirt is a labelled native button controlling a stable review-row ID.
Click, tap or keyboard activation selects its matching group, highlights the
row, and moves focus to it. Offscreen rows are brought into view. Focus within
the itemised list also updates cart selection. Quantity/removal/Undo updates
the composition immediately; an empty cart links back to the builder.

Mobile uses a compact cart above the list. Review rows and monetary totals
reflow at narrow container widths/enlarged text, and review quantity buttons
have at least 44px touch targets. Cart entrances, hover transitions and row
scrolling account for reduced motion. Failed images retain labelled selection
controls and the itemised breakdown.

Verification: ESLint, TypeScript, production build and all eleven merch tests;
the existing shelf/checkout browser regression; and a focused cart browser
pass covering saved-order-only images, repeated units, mouse/keyboard/touch row
selection/focus, same colour with different sizes, quantity/removal/Undo, empty
state, refresh, large orders, hidden configurations, 320–1920px, 200% text,
reduced motion and image failure. Payment requests were blocked or mocked.

## Phase 2: one shop for everything — 4 November 2026

The cssknust shop now carries the whole old css-merch catalogue, backed by the
Django API (see the backend README §21, §23, §24).

**Products** (`content/merch-store.ts`, `types/merch-store.ts`). Each product
has a `kind`: a customisable `tee` (CSS Tee: colourway, Spec Sheet or Backbone
back, regular or oversized fit, optional name on the back), a `simple` item
(Pink October Tee, General Lacoste) or a `bundle` (Monorepo, Pair Programming,
Dual Boot, Three-Way Merge) whose pieces each get their own colourway and size.
Content IDs equal the backend product **slug**; the numeric `CSS_MERCH_*_ID`
variables are only a fallback for records without a slug. Names and taglines
come from the old `catalog.json`; prices shown before the catalogue loads are
estimates, the backend prices every order.

**Cart lines** (`lib/merch/order.ts`). One `ShopLine` type covers all kinds.
Saved carts from the tee-only shop migrate automatically (a CSS Tee without a
back becomes a Spec Sheet in a regular fit). Line keys include the back, fit,
name and every bundle piece, so different configurations never merge.

**Checkout** (`components/merch/merch-shop.tsx`, `components/merch/shop/*`).
Review & pay adds an optional promo code (bundle codes lower bundles to their
promo price) and a payment choice:
- **Mobile Money** is charged on the page (`/api/merch/orders/[id]/momo`): the
  buyer approves the prompt on their phone (with network-specific USSD help),
  or types the network's OTP (`/otp`). The page polls the receipt endpoint
  until the backend has verified the payment.
- **Card** opens Paystack's inline popup with the order's `access_code`,
  falling back to the redirect checkout if the script can't load.
Closing the pay sheet and paying again reuses the same order for the same cart.

**After payment.** Receipts show a 5-step tracker (placed → paid → printing →
ready → collected) and which pieces of a partly collected order were handed
over. `/merch/orders` finds orders on this device or, on any device, by phone
number plus a texted 6-digit code (or a 7-digit order code). The pickup desk's
QR code opens `/merch/pickup?s=<code>`, where the buyer checks a paid order into
the queue. Old css-merch receipt links (`/merch/order?ref=CSS-XXXXXXXX`) open
the imported order once Phase 4 has imported it.

**Assets.** `tools/prepare-merch-extras.mjs ../css-merch` generates the six
Backbone backs (`public/merch/tees/*-back-backbone.webp`) with the same colour
recipe as `prepare-merch.mjs`, and the General Lacoste images
(`public/merch/lacoste/`). No new packages; it reuses Next's `sharp`.

**Checks.** `node --experimental-strip-types --test tests/*.test.mjs` (25 merch
tests), `pnpm lint`, `pnpm build`, plus an end-to-end run against a local
Django and a local Paystack stand-in: bundle code, tee + Monorepo order
(GH₵320 − GH₵10 + GH₵6.17 fee = GH₵316.17), MoMo approval → paid, My orders by
SMS code, pickup check-in with the daily desk code, and every page rendering.

**Not yet verified visually:** the name-on-back overlay's exact placement on a
real phone (it is positioned from the old store's print coordinates).

## Phase 3: staff dashboard at /admin

Staff sign in at `/admin/login` with their own Django staff accounts (no shared
codes). The backend's token is kept in an httpOnly, `SameSite=Strict` cookie
(`css_staff`, 12 hours) and never reaches browser code; every dashboard call
goes through `/api/admin/*` (`app/api/admin/[...path]/route.ts`), which adds the
token, refuses writes whose `Origin` doesn't match the host the browser used,
rejects odd paths and clears the cookie when the backend revokes the token.
The backend checks every permission; the dashboard only hides what a role can't
use. `/admin` and `/api/` are disallowed in `robots.txt` and pages are `noindex`.

| Tab | Who (role) | What |
| --- | --- | --- |
| Pickup desk | Sales Desk, Merch Admin | Today's desk QR (full screen, printable sign, new code for admins), live queue, find a buyer, serve and hand over pieces |
| Orders | all | Search (name, phone, code, old CSS- ref), filters, order panel with check-in, serve, per-piece hand-over, undo (Merch Admin), cancel (Treasurer, Merch Admin), CSV export |
| New sale | Sales Desk, Merch Admin | Desk point of sale with the shop's own product options, bundle code, handed-over toggle |
| Printing | Merch Admin | Paid pieces first-paid-first, send N to the printer as a batch, mark back (texts ready buyers), delete an unreturned batch |
| Counts | all | Units by product, design and size; CSV and print sheet |
| Activity | Treasurer, Merch Admin | Everything staff did on a day, per-person totals, CSV |
| Books | Treasurer, Merch Admin | Expenses and payables, money accounted for, promo codes |
| Settings | Merch Admin | Pickup details used in texts and emails |

New package: `qrcode-generator` (MIT, no dependencies) draws the desk QR code
on the pickup tab. Tests: `tests/admin.test.mjs` (session cookie, proxy, origin
and path guards, sign-out).
