import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  return nextResolve(specifier, context);
} });

const { getMerchStore } = await import("@/lib/content/merch-store");
const { calculateTotals, addLine, updateLine, lineKey, normalizeStoredLines, makeOrderRequest, productIsOpen, validateLine, subtractPurchasedLines, readMerchQuote, receiptOptions, receiptProduct, orderPhase, readSavedOrder, snapshotReduced, reconcileOrderCart, CART_KEY, PENDING_ORDER_KEY, ORDER_HISTORY_KEY, LAST_RECEIPT_KEY } = await import("@/lib/merch/order");
const { selectionIssue, stockIssue, withCatalogPricing } = await import("@/lib/merch/catalog");
const { safePaymentUrl, getCheckoutCatalog, getOrderStatus, parseOrder, amountMinor } = await import("@/lib/api/merch");
const { saveStoredValue, storedValue, saveCheckoutOrder, currentSavedOrder, reconcileStoredOrder } = await import("@/components/merch/use-merch-cart");
const { POST } = await import("@/app/api/merch/orders/route");
const { GET } = await import("@/app/api/merch/orders/[id]/route");
const content = await getMerchStore();
const line = (overrides = {}) => ({ productId: "css-tee", colourwayId: "kernel-panic", size: "M", quantity: 1, ...overrides });
const pink = (overrides = {}) => line({ productId: "pink-october", colourwayId: "pink-october", ...overrides });
const buyer = { name: "Test Buyer", phone: "0240000000", email: "test@example.test" };

test("the offer counts units across mixed products, duplicate units and three-or-more orders", () => {
  assert.deepEqual(calculateTotals([line()], content), { quantity: 1, subtotalMinor: 7000, discountMinor: 0, totalMinor: 7000 });
  for (const lines of [[line({ quantity: 2 })], [line(), pink()]]) assert.deepEqual(calculateTotals(lines, content), { quantity: 2, subtotalMinor: 14000, discountMinor: 700, totalMinor: 13300 });
  assert.deepEqual(calculateTotals([line({ quantity: 2 }), pink()], content), { quantity: 3, subtotalMinor: 21000, discountMinor: 1050, totalMinor: 19950 });
});

test("all sizes use the base price; legacy fit and old size surcharges do not affect pricing", () => {
  assert.deepEqual(calculateTotals([line({ size: "3XL" }), pink({ size: "XXL" })], content), { quantity: 2, subtotalMinor: 14000, discountMinor: 700, totalMinor: 13300 });
  assert.equal(calculateTotals([line({ size: "XXL" })], content).totalMinor, 7000);
  assert.equal(calculateTotals([line({ size: "3XL", fit: "oversized" })], content).totalMinor, 7000);
});

test("saved drafts remove obsolete fit and merge matching sizes without losing units", () => {
  const migrated = normalizeStoredLines([line({ fit: "regular", quantity: 2 }), line({ fit: "oversized", quantity: 3 }), line({ size: "L" }), line({ colourwayId: "invented" })], content);
  assert.deepEqual(migrated, [line({ quantity: 5 }), line({ size: "L" })]);
  assert.deepEqual(normalizeStoredLines(migrated, content), migrated);
  const overLimit = normalizeStoredLines([line({ fit: "regular", quantity: 15 }), line({ fit: "oversized", quantity: 15 })], content);
  assert.equal(overLimit[0].quantity, 30);
  assert.equal(validateLine(overLimit[0], content), false);
  assert.deepEqual(subtractPurchasedLines(migrated, normalizeStoredLines([line({ fit: "oversized", quantity: 3 })], content)), [line({ quantity: 2 }), line({ size: "L" })]);
});

test("only identical configurations merge, and the per-configuration quantity cap is enforced", () => {
  assert.equal(addLine([line()], line({ quantity: 2 }), 20)[0].quantity, 3);
  assert.equal(addLine([line()], line({ size: "L" }), 20).length, 2);
  assert.equal(addLine([line()], line({ colourwayId: "dark-mode" }), 20).length, 2);
  assert.throws(() => addLine([line({ quantity: 20 })], line(), 20));
  assert.throws(() => addLine([], line({ quantity: 21 }), 20));
  assert.throws(() => updateLine([line()], lineKey(line()), line({ quantity: 21 }), 20));
  const full = Array.from({ length: 40 }, (_, index) => line({ colourwayId: `stored-${index}` }));
  assert.throws(() => addLine(full, line(), 20));
});

test("editing retains the line's position, merging only when its new configuration already exists", () => {
  assert.deepEqual(updateLine([line(), pink()], lineKey(line()), line({ size: "3XL" }), 20), [line({ size: "3XL" }), pink()]);
  assert.deepEqual(updateLine([line(), line({ size: "L", quantity: 2 })], lineKey(line()), line({ size: "L" }), 20), [line({ size: "L", quantity: 3 })]);
});

test("invalid combinations and quantities cannot be ordered; Pink October closes at Accra midnight", () => {
  const date = new Date("2026-10-20T12:00:00Z");
  for (const bad of [line({ quantity: 0 }), line({ quantity: 21 }), line({ quantity: 1.5 }), line({ colourwayId: "invented" }), line({ size: "4XL" })]) assert.equal(validateLine(bad, content, date), false);
  assert.equal(productIsOpen(content.products[1], new Date("2026-10-31T23:59:59.999Z")), true);
  assert.equal(productIsOpen(content.products[1], new Date("2026-11-01T00:00:00Z")), false);
});

test("dedicated size and backend colour codes are sent, with no colourway or note for Pink October", () => {
  for (const product of content.products) for (const cw of product.colourways) for (const size of content.sizes) {
    const configured = line({ productId: product.id, colourwayId: cw.id, size: size.id });
    const [item] = makeOrderRequest(buyer, [configured], { "css-tee": 2, "pink-october": 3 }, content).items;
    assert.equal(item.size, size.id);
    assert.equal(item.colorway, cw.apiValue);
    assert.equal(Object.hasOwn(item, "note"), false);
    if (product.id === "pink-october") assert.equal(Object.hasOwn(item, "colorway"), false);
  }
  assert.deepEqual(makeOrderRequest(buyer, [line(), pink()], { "css-tee": 2, "pink-october": 3 }, content).items, [{ product: 2, quantity: 1, size: "M", colorway: "black-pink" }, { product: 3, quantity: 1, size: "M" }]);
  assert.throws(() => makeOrderRequest(buyer, [pink()], { "css-tee": 2 }, content));
});

test("paid-order cleanup preserves tees added after the submitted snapshot", () => {
  assert.deepEqual(subtractPurchasedLines([line({ quantity: 3 }), pink()], [line({ quantity: 2 })]), [line(), pink()]);
});

test("payment URLs must be genuine HTTPS Paystack URLs", () => {
  assert.equal(safePaymentUrl("https://checkout.paystack.com/example"), "https://checkout.paystack.com/example");
  for (const value of ["http://checkout.paystack.com/x", "https://checkout.paystack.com.attacker.test/x", "javascript:alert(1)", "https://user:password@checkout.paystack.com/x"]) assert.throws(() => safePaymentUrl(value));
});

const records = [
  { id: 2, name: "Css Shirt", price: "70.00", in_stock: true, stock_quantity: 30, availability: "available", sizes: ["M", "L", "XL", "XXL"].map((value) => ({ value, label: value, available: true })), colorways: content.products[0].colourways.map(({ apiValue: value }) => ({ value, label: value, available: true })), unavailable_combinations: [] },
  { id: 3, name: "Pink Octobee", price: "70.00", in_stock: true, stock_quantity: 20, availability: "available", sizes: ["M", "L", "XL", "XXL"].map((value) => ({ value, label: value, available: true })), colorways: [], unavailable_combinations: [] },
];
const discountSettings = { enabled: true, percent: "5.00", min_units: 2 };
const publicId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const quote = { id: publicId, status: "Pending", subtotal: "140.00", discount_amount: "7.00", discount_percent: "5.00", fee: "2.00", total: "135.00", authorization_url: "https://checkout.paystack.com/example", expires_at: "2099-01-01T00:00:00Z" };
const catalog = { products: { "css-tee": records[0], "pink-october": records[1] }, discount: content.discount };
const request = (lines) => new Request("http://localhost/api/merch/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ buyer, lines }) });

test("the live test merchandise is never silently mapped to an approved tee", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => Response.json(String(url).includes("discount/") ? discountSettings : { results: [{ ...records[0], id: 1, name: "Test Item" }], next: null }));
  assert.deepEqual((await getCheckoutCatalog()).products, {});
});

test("order proxy accepts backend pricing and discount changes, validates arithmetic, and checks aggregate stock", async (t) => {
  let returned = quote, stock = 30, posted = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (String(url).includes("discount/")) return Response.json(discountSettings);
    if (String(url).includes("merchandise/")) return Response.json({ results: records.map((record) => ({ ...record, stock_quantity: stock })), next: null });
    posted.push(JSON.parse(init.body));
    return Response.json(returned, { status: 201 });
  });
  const response = await POST(request([line(), pink()]));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).authorization_url, "https://checkout.paystack.com/example");
  assert.deepEqual(posted[0].items.map(({ product }) => product), [2, 3]);
  returned = { ...quote, subtotal: "160.00", discount_amount: "16.00", discount_percent: "10.00", total: "146.00" };
  assert.equal((await POST(request([line(), pink()]))).status, 201, "backend-confirmed changes are presented to the buyer instead of enforcing local prices");
  returned = { ...quote, discount_amount: "0" };
  const mismatch = await POST(request([line(), pink()]));
  assert.equal(mismatch.status, 502);
  const mismatchBody = await mismatch.json();
  assert.equal(mismatchBody.authorization_url, undefined);
  assert.equal(mismatchBody.error.orderId, publicId);
  stock = 1;
  const count = posted.length;
  assert.equal((await POST(request([line(), line({ colourwayId: "dark-mode" })]))).status, 409);
  assert.equal(posted.length, count, "aggregate stock must be checked before creating an order");
});

test("live size/colourway restrictions and missing products block checkout before creating a stock hold", async (t) => {
  let posted = 0;
  const blocked = { ...records[0], colorways: records[0].colorways.map((option) => ({ ...option, available: option.value !== "black-pink" })), unavailable_combinations: [{ size: "L", colorway: "black-white" }] };
  t.mock.method(globalThis, "fetch", async (url) => {
    if (String(url).includes("discount/")) return Response.json(discountSettings);
    if (String(url).includes("merchandise/")) return Response.json({ results: [blocked], next: null });
    posted++; return Response.json(quote);
  });
  for (const lines of [[line()], [line({ size: "S" })], [line({ size: "L", colourwayId: "dark-mode" })], [pink()]]) assert.equal((await POST(request(lines))).status, 409);
  assert.equal(posted, 0);
  assert.equal(selectionIssue(line({ colourwayId: "light-mode" }), content, catalog), null);
  assert.match(selectionIssue(line({ size: "3XL" }), content, catalog), /Size 3XL/);
  assert.match(stockIssue([line({ quantity: 20 }), line({ size: "L", quantity: 20 })], content, catalog), /30/);
});

test("display estimates follow live prices and enabled/disabled discount configuration without size extras", () => {
  const changed = { ...catalog, products: { ...catalog.products, "css-tee": { ...records[0], price: "75.01" } }, discount: { enabled: true, percent: 7.5, minimumQuantity: 3 } };
  assert.deepEqual(calculateTotals([line({ quantity: 3, size: "XXL" })], withCatalogPricing(content, changed)), { quantity: 3, subtotalMinor: 22503, discountMinor: 1688, totalMinor: 20815 });
  assert.equal(calculateTotals([line({ quantity: 3 })], withCatalogPricing(content, { ...changed, discount: { ...changed.discount, enabled: false } })).discountMinor, 0);
  assert.equal(calculateTotals([line({ quantity: 2 })], withCatalogPricing(content, null)).discountMinor, 0, "no live offer is advertised while disconnected");
  assert.equal(amountMinor("70.01"), 7001);
});

test("new and legacy receipt options remain readable and confirmed quotes survive storage safely", () => {
  assert.equal(receiptOptions({ quantity: 1, size: "XXL", colorway: "black-pink" }, content), "Kernel Panic · Size XXL");
  assert.equal(receiptOptions({ quantity: 1, size: "M", colorway: "" }, content), "Size M");
  assert.equal(receiptOptions({ quantity: 1, note: "size=L;colourway=dark-mode;fit=oversized" }, content), "Dark Mode · Size L");
  assert.equal(readMerchQuote(quote).total, "135.00");
  assert.equal(readMerchQuote({ ...quote, total: "100.00" }), null);
  assert.equal(readMerchQuote({ ...quote, fee: "NaN" }), null);
});

test("order parsing rejects invalid amounts/expiry and never forwards private contact fields", () => {
  const parsed = parseOrder({ ...quote, status: "Paid", pickup_code: "PICKUP", buyer_email: "private@example.test", items: [{ quantity: 1, product_name: "Css Shirt", size: "M", colorway: "black-white", buyer_phone: "private" }] });
  assert.equal(parsed.pickup_code, "PICKUP");
  assert.equal(Object.hasOwn(parsed, "buyer_email"), false);
  assert.equal(Object.hasOwn(parsed.items[0], "buyer_phone"), false);
  assert.equal(parseOrder({ ...quote, pickup_code: "PRIVATE" }).pickup_code, null);
  for (const invalid of [{ total: "135.01" }, { discount_amount: "141.00" }, { discount_percent: "101.00" }, { expires_at: "invalid" }, { fee: "-2.00" }]) assert.throws(() => parseOrder({ ...quote, ...invalid }));
});

test("receipt proxy checks the requested order ID and handles Paid/Collected capitalization", async (t) => {
  let returned = { ...quote, status: "Collected", pickup_code: "CODE" };
  t.mock.method(globalThis, "fetch", async () => Response.json(returned));
  const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: publicId }) });
  assert.equal((await response.json()).pickup_code, "CODE");
  returned = { ...returned, id: "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee" };
  assert.equal((await GET(new Request("http://localhost"), { params: Promise.resolve({ id: publicId }) })).status, 502);
});

test("backend ordering failures propagate and unsafe payment links retain the created order reference", async (t) => {
  let backendDisabled = true, posted = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (String(url).includes("discount/")) return Response.json(discountSettings);
    if (String(url).includes("merchandise/")) return Response.json({ results: records, next: null });
    posted++;
    if (backendDisabled) return Response.json({ error: { message: "Online orders are disabled by the ordering service." } }, { status: 503 });
    return Response.json({ ...quote, authorization_url: "https://attacker.test/pay" });
  });
  const unavailable = await POST(request([line({ quantity: 2 })]));
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error.message, "Online orders are disabled by the ordering service.");
  assert.equal(posted, 1, "ordering availability is determined by the backend");
  backendDisabled = false;
  const rejected = await POST(request([line({ quantity: 2 })]));
  assert.equal(rejected.status, 502);
  assert.equal((await rejected.json()).error.orderId, publicId);
});

test("paid snapshots retain later additions; editing or replacing them never removes a different checkout's cart", () => {
  const snapshot = readSavedOrder({ id: publicId, lines: [line({ quantity: 2 })] });
  const cart = [line({ quantity: 3 }), pink()];
  assert.equal(orderPhase("paid"), "paid");
  assert.equal(orderPhase("Cancelled"), "closed");
  assert.equal(orderPhase("Processing"), "unknown");
  assert.deepEqual(reconcileOrderCart(cart, snapshot, "Paid", content), [line(), pink()]);
  assert.equal(reconcileOrderCart(cart, { ...snapshot, ownsCart: false }, "Paid", content), cart);
  assert.equal(reconcileOrderCart(cart, { ...snapshot, reconciled: true }, "Paid", content), cart);
  assert.equal(reconcileOrderCart(cart, snapshot, "Cancelled", content), cart);
  assert.equal(snapshotReduced([line({ quantity: 2 })], [line({ quantity: 3 })], [line({ quantity: 2 })]), false);
  assert.equal(snapshotReduced([line({ quantity: 3 })], [line({ quantity: 2 })], [line({ quantity: 2 })]), false);
  assert.equal(snapshotReduced([line({ quantity: 2 })], [line({ size: "L", quantity: 2 })], [line({ quantity: 2 })]), true);
  assert.equal(snapshotReduced([line()], [], [line()]), true);
});

test("browser reconciliation retires a stale paid attempt once and supports subsequent purchases and older receipts", (t) => {
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
  saveStoredValue(CART_KEY, JSON.stringify([line({ quantity: 3 }), pink()]));
  // Legacy saved attempts have neither ownsCart nor reconciliation metadata.
  saveStoredValue(PENDING_ORDER_KEY, JSON.stringify({ id: publicId, lines: [line({ quantity: 2 })] }));
  reconcileStoredOrder({ ...quote, status: "Paid" }, content);
  assert.equal(currentSavedOrder(), null);
  assert.deepEqual(JSON.parse(storedValue(CART_KEY)), [line(), pink()]);
  assert.equal(storedValue(LAST_RECEIPT_KEY), publicId);
  saveStoredValue(CART_KEY, JSON.stringify([line({ quantity: 4 })]));
  reconcileStoredOrder({ ...quote, status: "Paid" }, content);
  assert.deepEqual(JSON.parse(storedValue(CART_KEY)), [line({ quantity: 4 })], "revisiting a receipt must not clear the new cart");
  const nextId = "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee", latestId = "cccccccc-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  saveCheckoutOrder({ ...quote, id: nextId }, [line({ quantity: 4 })]);
  saveCheckoutOrder({ ...quote, id: latestId }, [line({ size: "L" })]);
  saveStoredValue(CART_KEY, JSON.stringify([line({ size: "L" }), pink()]));
  reconcileStoredOrder({ ...quote, id: nextId, status: "Paid" }, content);
  assert.equal(currentSavedOrder().id, latestId);
  assert.deepEqual(JSON.parse(storedValue(CART_KEY)), [line({ size: "L" }), pink()], "a superseded attempt does not own the new cart");
  reconcileStoredOrder({ ...quote, id: latestId, status: "Cancelled" }, content);
  assert.equal(currentSavedOrder(), null);
  assert.deepEqual(JSON.parse(storedValue(CART_KEY)), [line({ size: "L" }), pink()]);
});

test("receipt product lookup uses verified API names and never invents an image for an unknown colour", () => {
  const css = receiptProduct({ product_name: "Css Shirt", size: "L", colorway: "white-black", quantity: 2 }, content);
  assert.equal(css.product.name, "CSS Tee");
  assert.equal(css.colourway.id, "light-mode");
  assert.equal(receiptProduct({ product_name: "Pink Octobee", quantity: 1 }, content).colourway.id, "pink-october");
  assert.equal(receiptProduct({ product_name: "Unrelated Product", quantity: 1 }, content), null);
  assert.equal(receiptProduct({ product_name: "Css Shirt", colorway: "unknown", quantity: 1 }, content).colourway, null);
});

test("initial server receipts and polling share validated amounts/items while excluding payment links and contacts", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ ...quote, status: "paid", pickup_code: "QA-CODE", created_at: "2026-10-09T12:00:00Z", buyer_email: "private@example.test", items: [{ product_name: "Css Shirt", quantity: 2, size: "L", colorway: "white-black", unit_price: "70.00", line_total: "140.00", buyer_phone: "private" }] }));
  const receipt = await getOrderStatus(publicId);
  assert.equal(receipt.authorization_url, undefined);
  assert.equal(receipt.items[0].line_total, "140.00");
  assert.equal(receipt.discount_amount, "7.00");
  assert.equal(receipt.pickup_code, "QA-CODE");
  assert.equal(Object.hasOwn(receipt, "buyer_email"), false);
  assert.equal(Object.hasOwn(receipt.items[0], "buyer_phone"), false);
  const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: publicId }) });
  assert.deepEqual(await response.json(), JSON.parse(JSON.stringify(receipt)));
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.throws(() => parseOrder({ ...quote, items: [{ quantity: 1, unit_price: "NaN" }] }));
});
