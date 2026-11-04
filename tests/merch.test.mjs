import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  return nextResolve(specifier, context);
} });

const { getMerchStore } = await import("@/lib/content/merch-store");
const order = await import("@/lib/merch/order");
const { calculateTotals, addLine, updateLine, lineKey, normalizeStoredLines, normalizeLine, makeOrderRequest, productIsOpen, validateLine, subtractPurchasedLines, readMerchQuote, receiptOptions, receiptProduct, orderPhase, readSavedOrder, snapshotReduced, reconcileOrderCart, describeLine, unitPrice, CART_KEY, PENDING_ORDER_KEY, ORDER_HISTORY_KEY, LAST_RECEIPT_KEY } = order;
const { selectionIssue, stockIssue, withCatalogPricing } = await import("@/lib/merch/catalog");
const { defaultDraft } = await import("@/lib/merch/draft");
const { safePaymentUrl, getCheckoutCatalog, getOrderStatus, parseOrder, parsePromo, parseCharge, amountMinor } = await import("@/lib/api/merch");
const { saveStoredValue, storedValue, saveCheckoutOrder, currentSavedOrder, reconcileStoredOrder } = await import("@/components/merch/use-merch-cart");
const { POST } = await import("@/app/api/merch/orders/route");
const { GET } = await import("@/app/api/merch/orders/[id]/route");
const { POST: MOMO } = await import("@/app/api/merch/orders/[id]/momo/route");
const { GET: PROMO } = await import("@/app/api/merch/promo/[code]/route");
const { POST: MY_ORDERS } = await import("@/app/api/merch/my-orders/route");
const { POST: PICKUP } = await import("@/app/api/merch/pickup/route");
const content = await getMerchStore();

const tee = (overrides = {}) => ({ productId: "css-tee", colourwayId: "kernel-panic", size: "M", back: "spec-sheet", fit: "regular", quantity: 1, ...overrides });
const lacoste = (overrides = {}) => ({ productId: "general-lacoste", size: "L", quantity: 1, ...overrides });
const mono = (overrides = {}) => ({ productId: "bundle-mono", quantity: 1, pieces: { tee: { colourwayId: "dark-mode", size: "M" }, tee2: { colourwayId: "hyperlink", size: "L" }, gpolo: { size: "XL" } }, ...overrides });
const buyer = { name: "Test Buyer", phone: "0240000000", email: "test@example.test" };
const publicId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

// ── Live catalogue fixtures (the Django API's shape) ──────────────────────────
const option = (value) => ({ value, label: value, available: true });
const sizes = ["S", "M", "L", "XL", "XXL", "3XL"].map(option);
const teeRecord = {
  id: 2, slug: "css-tee", kind: "tee", name: "CSS Tee", price: "80.00", in_stock: true, stock_quantity: null, availability: "available", available_until: null,
  sizes, colorways: content.products[0].colourways.map(({ apiValue }) => option(apiValue)), unavailable_combinations: [],
  backs: [{ value: "spec-sheet", label: "Spec Sheet", price: "80.00", available: true }, { value: "backbone", label: "The Backbone", price: "75.00", available: true }],
  fits: [{ value: "regular", label: "Regular", extra: "0.00", available: true }, { value: "oversized", label: "Oversized", extra: "20.00", available: true }],
  back_name_price: "15.00", components: [],
};
const lacosteRecord = { ...teeRecord, id: 5, slug: "general-lacoste", kind: "simple", name: "General Lacoste", price: "70.00", colorways: [], backs: [], fits: [], back_name_price: null };
const monoRecord = { ...lacosteRecord, id: 9, slug: "bundle-mono", kind: "bundle", name: "Monorepo", price: "210.00", sizes: [], components: [
  { slot: "tee", label: "Spec Sheet tee", product: 2, requires_size: true, requires_colorway: true, back_design: { value: "spec-sheet", label: "Spec Sheet" } },
  { slot: "tee2", label: "Backbone tee", product: 2, requires_size: true, requires_colorway: true, back_design: { value: "backbone", label: "The Backbone" } },
  { slot: "gpolo", label: "General Lacoste", product: 5, requires_size: true, requires_colorway: false, back_design: null },
] };
const duoRecord = { ...monoRecord, id: 8, slug: "bundle-duo", name: "Pair Programming", price: "150.00", components: monoRecord.components.slice(0, 2) };
const records = [teeRecord, lacosteRecord, monoRecord, duoRecord];
const merchandisePage = (list = records) => Response.json({ results: list, next: null });
const quote = { id: publicId, status: "Pending", subtotal: "290.00", discount_amount: "0.00", discount_percent: "0.00", fee: "5.77", total: "295.77", authorization_url: "https://checkout.paystack.com/example", access_code: "abc123", expires_at: "2099-01-01T00:00:00Z" };
const request = (lines, extra = {}) => new Request("http://localhost/api/merch/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ buyer, lines, ...extra }) });
const jsonRequest = (url, body) => new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
let catalogCache;
async function liveCatalog(t, list = records) {
  t.mock.method(globalThis, "fetch", async () => merchandisePage(list));
  catalogCache = await getCheckoutCatalog(content);
  t.mock.restoreAll();
  return catalogCache;
}

// ── Prices ────────────────────────────────────────────────────────────────────

test("tees are priced by back design, plus the fit extra and the name on the back", () => {
  assert.equal(unitPrice(tee(), content), 8000);
  assert.equal(unitPrice(tee({ back: "backbone" }), content), 7500);
  assert.equal(unitPrice(tee({ back: "backbone", fit: "oversized", backName: "KOFI" }), content), 7500 + 2000 + 1500);
  assert.equal(unitPrice(lacoste(), content), 7000);
  assert.equal(unitPrice(mono(), content), 21000, "bundles are a flat price whatever the pieces");
});

test("live prices replace the estimates", async (t) => {
  const catalog = await liveCatalog(t, [{ ...teeRecord, backs: [{ ...teeRecord.backs[0], price: "85.00" }, teeRecord.backs[1]] }, { ...monoRecord, price: "205.00" }, lacosteRecord]);
  assert.equal(unitPrice(tee(), content, catalog), 8500);
  assert.equal(unitPrice(mono(), content, catalog), 20500);
  assert.equal(withCatalogPricing(content, catalog).products.find(({ id }) => id === "css-tee").priceMinor, 7500, "a tee's From price is its cheapest back");
});

test("a bundle code takes bundles to their promo price; a percentage code takes a share off everything", () => {
  const bundleCode = { code: "BUNDLE-AB12", kind: "bundle", bundlePricesMinor: { "bundle-mono": 20000 } };
  assert.deepEqual(calculateTotals([mono({ quantity: 2 }), tee()], content, null, bundleCode), { quantity: 3, subtotalMinor: 50000, discountMinor: 2000, totalMinor: 48000 });
  assert.equal(calculateTotals([tee()], content, null, bundleCode).discountMinor, 0, "no bundle, no saving");
  assert.equal(calculateTotals([tee({ quantity: 2 })], content, null, { code: "CSS5-X", kind: "percent", percent: 5 }).discountMinor, 800);
  assert.equal(calculateTotals([tee()], content).discountMinor, 0, "there is no automatic bulk discount any more");
});

// ── Lines ─────────────────────────────────────────────────────────────────────

test("old tee-only carts migrate: CSS Tees get the Spec Sheet in a regular fit, single-colour items drop the colourway", () => {
  const legacyTee = { productId: "css-tee", colourwayId: "dark-mode", size: "L", quantity: 2 };
  const legacyPink = { productId: "pink-october", colourwayId: "pink-october", size: "M", quantity: 1 };
  assert.deepEqual(normalizeLine(legacyTee, content), { productId: "css-tee", quantity: 2, size: "L", colourwayId: "dark-mode", back: "spec-sheet", fit: "regular" });
  assert.deepEqual(normalizeLine(legacyPink, content), { productId: "pink-october", quantity: 1, size: "M" });
  assert.deepEqual(normalizeStoredLines([legacyTee, tee({ colourwayId: "dark-mode", size: "L" }), { productId: "invented", size: "M", quantity: 1 }], content), [{ ...tee({ colourwayId: "dark-mode", size: "L" }), quantity: 3 }]);
});

test("invalid options never make it into a cart", () => {
  for (const bad of [tee({ quantity: 0 }), tee({ quantity: 1.5 }), tee({ colourwayId: "invented" }), tee({ size: "4XL" }), tee({ back: "made-up" }), tee({ fit: "baggy" }), tee({ backName: "THIRTEENCHARS" }), tee({ backName: "<script>" }),
    mono({ pieces: { tee: { colourwayId: "dark-mode", size: "M" } } }), mono({ pieces: { ...mono().pieces, gpolo: { size: "9XL" } } }), lacoste({ size: undefined })]) {
    assert.equal(normalizeLine(bad, content), null, JSON.stringify(bad));
  }
  assert.equal(normalizeLine(tee({ backName: "  kofi  " }), content).backName, "KOFI");
});

test("lines with different backs, names or bundle pieces stay separate; identical ones merge up to the cap", () => {
  assert.notEqual(lineKey(tee()), lineKey(tee({ back: "backbone" })));
  assert.notEqual(lineKey(tee()), lineKey(tee({ backName: "ESI" })));
  assert.notEqual(lineKey(mono()), lineKey(mono({ pieces: { ...mono().pieces, gpolo: { size: "M" } } })));
  assert.equal(addLine([tee()], tee({ quantity: 2 }), 20)[0].quantity, 3);
  assert.equal(addLine([tee()], tee({ backName: "ESI" }), 20).length, 2);
  assert.throws(() => addLine([tee({ quantity: 20 })], tee(), 20));
  assert.throws(() => updateLine([tee()], lineKey(tee()), tee({ quantity: 21 }), 20));
  assert.deepEqual(updateLine([tee(), lacoste()], lineKey(tee()), tee({ size: "3XL" }), 20), [tee({ size: "3XL" }), lacoste()]);
});

test("limited editions close at midnight UTC, and a bundle closes with any of its pieces", () => {
  const pink = content.products.find(({ id }) => id === "pink-october");
  const trio = content.products.find(({ id }) => id === "bundle-trio");
  assert.equal(productIsOpen(pink, new Date("2026-10-31T23:59:59.999Z")), true);
  assert.equal(productIsOpen(pink, new Date("2026-11-01T00:00:00Z")), false);
  assert.equal(productIsOpen(trio, new Date("2026-11-01T00:00:00Z"), content), false);
  assert.equal(productIsOpen(content.products.find(({ id }) => id === "bundle-mono"), new Date("2027-01-01T00:00:00Z"), content), true);
  assert.equal(validateLine({ productId: "pink-october", size: "M", quantity: 1 }, content, new Date("2026-11-02T00:00:00Z")), false);
});

test("lines describe themselves for the shelf, cart and screen readers", () => {
  const described = describeLine(tee({ back: "backbone", fit: "oversized", backName: "ESI" }), content);
  assert.equal(described.label, "CSS Tee, Kernel Panic, The Backbone back, Oversized fit, Name: ESI, Size M");
  const bundle = describeLine(mono(), content);
  assert.deepEqual(bundle.details, ["Spec Sheet tee: Dark Mode, size M", "Backbone tee: Hyperlink, size L", "General Lacoste: size XL"]);
  assert.equal(bundle.images.length, 3);
});

test("drafts keep sensible choices when switching products", () => {
  const product = (id) => content.products.find((item) => item.id === id);
  const draft = defaultDraft(product("bundle-duo"), content, null, tee({ size: "XL", colourwayId: "hyperlink" }));
  assert.deepEqual(draft.pieces, { tee: { size: "XL", colourwayId: "hyperlink" }, tee2: { size: "XL", colourwayId: "hyperlink" } });
  assert.deepEqual(defaultDraft(product("css-tee"), content, null, lacoste({ size: "S" })), { productId: "css-tee", quantity: 1, size: "S", colourwayId: "kernel-panic", back: "spec-sheet", fit: "regular" });
});

// ── The order request ─────────────────────────────────────────────────────────

test("order requests send backend values: colour codes, backs, names and per-piece sizes", () => {
  const ids = { "css-tee": 2, "general-lacoste": 5, "bundle-mono": 9 };
  const body = makeOrderRequest(buyer, [tee({ back: "backbone", fit: "oversized", backName: "ESI" }), lacoste(), mono()], ids, content, "bundle-ab12");
  assert.equal(body.promo_code, "BUNDLE-AB12");
  assert.deepEqual(body.items, [
    { product: 2, quantity: 1, size: "M", colorway: "black-pink", back: "backbone", fit: "oversized", back_name: "ESI" },
    { product: 5, quantity: 1, size: "L" },
    { product: 9, quantity: 1, pieces: { tee: { size: "M", colorway: "black-white" }, tee2: { size: "L", colorway: "white-blue" }, gpolo: { size: "XL" } } },
  ]);
  assert.equal(Object.hasOwn(makeOrderRequest(buyer, [tee()], ids, content), "promo_code"), false);
  assert.throws(() => makeOrderRequest(buyer, [lacoste()], { "css-tee": 2 }, content));
});

// ── Live catalogue ────────────────────────────────────────────────────────────

test("products are matched by slug; legacy numeric IDs only match records without a slug; test items never match", async (t) => {
  const catalog = await liveCatalog(t, [teeRecord, { ...lacosteRecord, slug: null, id: 3, name: "Pink Octobee" }, { ...teeRecord, id: 1, slug: "general-lacoste", name: "Test Item" }]);
  assert.equal(catalog.products["css-tee"].id, 2);
  assert.equal(catalog.products["pink-october"].id, 3, "the old Pink record (id 3) still maps while it has no slug");
  assert.equal(catalog.products["general-lacoste"], undefined);
  const older = await liveCatalog(t, [{ id: 2, name: "Css Shirt", price: "70.00", in_stock: true, stock_quantity: 5, availability: "available", sizes, colorways: teeRecord.colorways, unavailable_combinations: [] }]);
  assert.deepEqual(older.products["css-tee"].backs, [], "an older backend's records still parse, without tee options");
});

test("live availability blocks unavailable backs, sizes, colours and pieces", async (t) => {
  const catalog = await liveCatalog(t, [
    { ...teeRecord, backs: [teeRecord.backs[0], { ...teeRecord.backs[1], available: false }], unavailable_combinations: [{ size: "L", colorway: "black-white" }], back_name_price: null },
    { ...lacosteRecord, sizes: sizes.map((size) => ({ ...size, available: size.value !== "XL" })) }, monoRecord,
  ]);
  assert.equal(selectionIssue(tee(), content, catalog), null);
  assert.match(selectionIssue(tee({ back: "backbone" }), content, catalog), /back design/);
  assert.match(selectionIssue(tee({ colourwayId: "dark-mode", size: "L" }), content, catalog), /Size L in Dark Mode/);
  assert.match(selectionIssue(tee({ backName: "ESI" }), content, catalog), /Names on the back/);
  assert.match(selectionIssue(mono(), content, catalog), /Backbone tee back/, "a bundle can't be sold while one of its fixed backs is off");
  assert.match(selectionIssue({ productId: "bundle-duo", quantity: 1, pieces: { tee: { colourwayId: "dark-mode", size: "M" }, tee2: { colourwayId: "dark-mode", size: "M" } } }, content, catalog), /unavailable/);
});

test("a bundle reports the first piece that can't be sold", async (t) => {
  const catalog = await liveCatalog(t, [teeRecord, { ...lacosteRecord, sizes: sizes.map((size) => ({ ...size, available: size.value !== "XL" })) }, monoRecord]);
  assert.match(selectionIssue(mono(), content, catalog), /Size XL of the General Lacoste/);
  assert.equal(selectionIssue(mono({ pieces: { ...mono().pieces, gpolo: { size: "L" } } }), content, catalog), null);
});

test("stock counts the pieces inside bundles", async (t) => {
  const catalog = await liveCatalog(t, [teeRecord, { ...lacosteRecord, stock_quantity: 2 }, monoRecord]);
  assert.equal(stockIssue([mono({ quantity: 2 })], content, catalog), null);
  assert.match(stockIssue([mono({ quantity: 2 }), lacoste()], content, catalog), /Only 2 General Lacostes/);
});

// ── Route handlers ────────────────────────────────────────────────────────────

test("the order proxy validates against the live catalogue, then returns the payment session", async (t) => {
  const posted = [];
  let returned = quote;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (String(url).includes("merchandise/")) return merchandisePage();
    posted.push(JSON.parse(init.body));
    return Response.json(returned, { status: 201 });
  });
  const response = await POST(request([tee(), mono()], { promoCode: "bundle-ab12" }));
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.authorization_url, "https://checkout.paystack.com/example");
  assert.equal(body.access_code, "abc123");
  assert.equal(posted[0].promo_code, "BUNDLE-AB12");
  assert.deepEqual(posted[0].items.map(({ product }) => product), [2, 9]);

  assert.equal((await POST(request([tee()], { promoCode: "bad code!" }))).status, 400);
  assert.equal((await POST(request([tee({ back: "made-up" })]))).status, 400);
  const before = posted.length;
  assert.equal((await POST(request([{ productId: "bundle-dual", quantity: 1, pieces: { tee: { colourwayId: "dark-mode", size: "M" }, gpolo: { size: "M" } } }]))).status, 409, "a bundle missing from the live catalogue can't be ordered");
  assert.equal(posted.length, before, "nothing is created when the catalogue says no");

  returned = { ...quote, total: "300.00" };
  const mismatch = await POST(request([tee()]));
  assert.equal(mismatch.status, 502);
  assert.equal((await mismatch.json()).error.orderId, publicId, "the created order's reference survives a bad response");
  returned = { ...quote, authorization_url: "https://attacker.test/pay" };
  assert.equal((await POST(request([tee()]))).status, 502);
});

test("backend errors reach the buyer with the backend's own message", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => String(url).includes("merchandise/") ? merchandisePage()
    : Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request." }, details: { non_field_errors: ["That code has already been used."] } }, { status: 400 }));
  const response = await POST(request([tee()], { promoCode: "CSS5-USED" }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.message, "That code has already been used.");
});

test("the MoMo proxy validates the network and number and passes only status and message back", async (t) => {
  const sent = [];
  t.mock.method(globalThis, "fetch", async (url, init) => { sent.push([String(url), JSON.parse(init.body)]); return Response.json({ status: "pay_offline", message: "Approve", secret: "x" }); });
  const call = (body, id = publicId) => MOMO(jsonRequest("http://localhost", body), { params: Promise.resolve({ id }) });
  assert.equal((await call({ phone: "0241234567", provider: "glo" })).status, 400);
  assert.equal((await call({ phone: "abc", provider: "mtn" })).status, 400);
  assert.equal((await call({ phone: "0241234567", provider: "mtn" }, "nope")).status, 400);
  const response = await call({ phone: " 024 123 4567 ", provider: "mtn" });
  assert.deepEqual(await response.json(), { status: "pay_offline", message: "Approve" });
  assert.match(sent[0][0], new RegExp(`orders/${publicId}/momo/$`));
  assert.deepEqual(sent[0][1], { phone: "024 123 4567", provider: "mtn" });
  assert.deepEqual(parseCharge({ status: "weird" }), { status: "pending", message: "" });
});

test("the promo proxy maps bundle prices to local products and hides why a code failed", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    if (String(url).includes("merchandise/")) return merchandisePage();
    if (String(url).includes("BUNDLE-AB12")) return Response.json({ code: "BUNDLE-AB12", kind: "bundle", bundle_prices: [{ product: 9, slug: "bundle-mono", price: "210.00", promo_price: "200.00" }, { product: 77, promo_price: "1.00" }] });
    return Response.json({ error: { message: "Not found." } }, { status: 404 });
  });
  const ok = await PROMO(new Request("http://localhost"), { params: Promise.resolve({ code: "bundle-ab12" }) });
  assert.deepEqual(await ok.json(), { code: "BUNDLE-AB12", kind: "bundle", bundlePricesMinor: { "bundle-mono": 20000 } });
  const missing = await PROMO(new Request("http://localhost"), { params: Promise.resolve({ code: "NOPE" }) });
  assert.equal(missing.status, 404);
  assert.match((await missing.json()).error.message, /doesn’t exist or has already been used/);
  assert.throws(() => parsePromo({ code: "X", kind: "percent", percent: "500" }, { products: {} }));
});

test("My orders and pickup check-in never forward contact details or payment links", async (t) => {
  const backendOrder = { ...quote, status: "Paid", pickup_code: "123 4567", buyer_phone: "+233200000000", buyer_email: "private@example.test", stage: "ready", ready_at: "2026-11-02T10:00:00Z" };
  t.mock.method(globalThis, "fetch", async (url) => Response.json(String(url).includes("my-orders") ? { orders: [backendOrder] } : backendOrder));
  const found = await (await MY_ORDERS(jsonRequest("http://localhost", { phone: "0200000000", code: "123456" }))).json();
  assert.equal(found.orders[0].pickup_code, "123 4567");
  assert.equal(found.orders[0].stage, "ready");
  for (const field of ["buyer_phone", "buyer_email", "authorization_url", "access_code"]) assert.equal(found.orders[0][field], undefined, field);
  assert.equal((await MY_ORDERS(jsonRequest("http://localhost", { phone: "0200000000" }))).status, 400, "a code or an order code is required");
  assert.equal((await PICKUP(jsonRequest("http://localhost", { deskCode: "ABCD2345", order: "not-a-uuid" }))).status, 400);
  const ticket = await (await PICKUP(jsonRequest("http://localhost", { deskCode: "ABCD2345", order: publicId }))).json();
  assert.equal(ticket.pickup_code, "123 4567");
  assert.equal(ticket.buyer_phone, undefined);
});

// ── Receipts ──────────────────────────────────────────────────────────────────

test("order parsing validates totals and keeps only public fields, including on bundle pieces", () => {
  const parsed = parseOrder({ ...quote, status: "Paid", pickup_code: "PICKUP", buyer_email: "private@example.test", stage: "printing", access_code: "bad code!",
    items: [{ quantity: 1, product_name: "Monorepo", unit_price: "210.00", buyer_phone: "private", pieces: [{ slot: "tee", label: "Spec Sheet tee", size: "M", colorway: "black-white", back: "spec-sheet", handed: true, secret: "x" }] }] });
  assert.equal(parsed.pickup_code, "PICKUP");
  assert.equal(parsed.stage, "printing");
  assert.equal(parsed.access_code, undefined, "an access code that doesn't look like one is dropped");
  assert.equal(Object.hasOwn(parsed, "buyer_email"), false);
  assert.equal(Object.hasOwn(parsed.items[0], "buyer_phone"), false);
  assert.deepEqual(parsed.items[0].pieces, [{ slot: "tee", label: "Spec Sheet tee", size: "M", colorway: "black-white", back: "spec-sheet", handed: true }]);
  assert.equal(parseOrder({ ...quote, pickup_code: "PRIVATE" }).pickup_code, null);
  for (const invalid of [{ total: "135.01" }, { discount_amount: "300.00" }, { discount_percent: "101.00" }, { expires_at: "invalid" }, { fee: "-2.00" }]) assert.throws(() => parseOrder({ ...quote, ...invalid }));
});

test("receipts describe tees, bundles and old note-based items", () => {
  assert.equal(receiptOptions({ quantity: 1, size: "XXL", colorway: "black-pink", back: "backbone", fit: "oversized", back_name: "ESI" }, content), "Kernel Panic · The Backbone back · Oversized fit · Name: ESI · Size XXL");
  assert.equal(receiptOptions({ quantity: 1, note: "size=L;colourway=dark-mode;fit=oversized" }, content), "Dark Mode · Size L");
  assert.equal(receiptOptions({ quantity: 1, pieces: [{ slot: "tee", label: "Spec Sheet tee", colorway: "black-white", size: "M" }, { slot: "gpolo", label: "General Lacoste", size: "XL" }] }, content), "Spec Sheet tee Dark Mode size M · General Lacoste size XL");
  const css = receiptProduct({ product_name: "Css Shirt", size: "L", colorway: "white-black", quantity: 2 }, content);
  assert.equal(css.colourway.id, "light-mode");
  assert.equal(receiptProduct({ product_name: "Monorepo", quantity: 1, pieces: [{ slot: "tee", label: "x", colorway: "white-blue" }] }, content).colourway.id, "hyperlink");
  assert.equal(receiptProduct({ product_name: "Unrelated Product", quantity: 1 }, content), null);
  assert.equal(readMerchQuote(quote).total, "295.77");
  assert.equal(readMerchQuote({ ...quote, total: "100.00" }), null);
});

test("the receipt proxy checks the order ID and drops payment links", async (t) => {
  let returned = { ...quote, status: "Collected", pickup_code: "CODE", stage: "collected" };
  t.mock.method(globalThis, "fetch", async () => Response.json(returned));
  const receipt = await getOrderStatus(publicId);
  assert.equal(receipt.authorization_url, undefined);
  assert.equal(receipt.access_code, undefined);
  const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: publicId }) });
  assert.equal((await response.json()).pickup_code, "CODE");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  returned = { ...returned, id: "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee" };
  assert.equal((await GET(new Request("http://localhost"), { params: Promise.resolve({ id: publicId }) })).status, 502);
});

test("payment URLs must be genuine HTTPS Paystack URLs", () => {
  assert.equal(safePaymentUrl("https://checkout.paystack.com/example"), "https://checkout.paystack.com/example");
  for (const value of ["http://checkout.paystack.com/x", "https://checkout.paystack.com.attacker.test/x", "javascript:alert(1)", "https://user:password@checkout.paystack.com/x"]) assert.throws(() => safePaymentUrl(value));
  assert.equal(amountMinor("70.01"), 7001);
});

// ── Cart reconciliation after payment ─────────────────────────────────────────

test("paid snapshots retain later additions; editing or replacing them never removes a different checkout's cart", () => {
  const snapshot = readSavedOrder({ id: publicId, lines: [tee({ quantity: 2 })] });
  const cart = [tee({ quantity: 3 }), lacoste()];
  assert.equal(orderPhase("paid"), "paid");
  assert.equal(orderPhase("Cancelled"), "closed");
  assert.equal(orderPhase("Processing"), "unknown");
  assert.deepEqual(reconcileOrderCart(cart, snapshot, "Paid", content), [tee(), lacoste()]);
  assert.equal(reconcileOrderCart(cart, { ...snapshot, ownsCart: false }, "Paid", content), cart);
  assert.equal(reconcileOrderCart(cart, { ...snapshot, reconciled: true }, "Paid", content), cart);
  assert.equal(reconcileOrderCart(cart, snapshot, "Cancelled", content), cart);
  assert.deepEqual(subtractPurchasedLines([mono({ quantity: 2 }), tee()], [mono()]), [mono(), tee()]);
  assert.equal(snapshotReduced([tee({ quantity: 2 })], [tee({ quantity: 3 })], [tee({ quantity: 2 })]), false);
  assert.equal(snapshotReduced([tee({ quantity: 2 })], [tee({ size: "L", quantity: 2 })], [tee({ quantity: 2 })]), true);
});

test("browser reconciliation retires a stale paid attempt once and supports later purchases", (t) => {
  const previousWindow = globalThis.window, previousStorage = globalThis.localStorage;
  const storage = new Map();
  globalThis.window = { dispatchEvent: () => true };
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
  const keys = [CART_KEY, PENDING_ORDER_KEY, ORDER_HISTORY_KEY, LAST_RECEIPT_KEY];
  t.after(() => {
    keys.forEach((key) => saveStoredValue(key, ""));
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
  });
  keys.forEach((key) => saveStoredValue(key, ""));
  saveStoredValue(CART_KEY, JSON.stringify([tee({ quantity: 3 }), mono()]));
  // An old pending attempt from the tee-only shop (no back/fit, no metadata).
  saveStoredValue(PENDING_ORDER_KEY, JSON.stringify({ id: publicId, lines: [{ productId: "css-tee", colourwayId: "kernel-panic", size: "M", quantity: 2 }] }));
  reconcileStoredOrder({ ...quote, status: "Paid" }, content);
  assert.equal(currentSavedOrder(), null);
  assert.deepEqual(JSON.parse(storedValue(CART_KEY)), [tee(), mono()]);
  assert.equal(storedValue(LAST_RECEIPT_KEY), publicId);
  saveStoredValue(CART_KEY, JSON.stringify([tee({ quantity: 4 })]));
  reconcileStoredOrder({ ...quote, status: "Paid" }, content);
  assert.deepEqual(JSON.parse(storedValue(CART_KEY)), [tee({ quantity: 4 })], "revisiting a receipt must not clear the new cart");
  const nextId = "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee", latestId = "cccccccc-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  saveCheckoutOrder({ ...quote, id: nextId }, [tee({ quantity: 4 })]);
  saveCheckoutOrder({ ...quote, id: latestId }, [lacoste()]);
  saveStoredValue(CART_KEY, JSON.stringify([lacoste(), mono()]));
  reconcileStoredOrder({ ...quote, id: nextId, status: "Paid" }, content);
  assert.equal(currentSavedOrder().id, latestId);
  assert.deepEqual(JSON.parse(storedValue(CART_KEY)), [lacoste(), mono()], "a superseded attempt does not own the new cart");
});
