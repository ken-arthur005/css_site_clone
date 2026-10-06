import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  return nextResolve(specifier, context);
} });

const { getMerchStore } = await import("@/lib/content/merch-store");
const { calculateTotals, addLine, updateLine, lineKey, serializeOptions, makeOrderRequest, productIsOpen, validateLine, subtractPurchasedLines } = await import("@/lib/merch/order");
const { safePaymentUrl, getCheckoutCatalog } = await import("@/lib/api/merch");
const { POST } = await import("@/app/api/merch/orders/route");
const content = await getMerchStore();
const line = (overrides = {}) => ({ productId: "css-tee", colourwayId: "kernel-panic", fit: "regular", size: "M", quantity: 1, ...overrides });
const pink = (overrides = {}) => line({ productId: "pink-october", colourwayId: "pink-october", ...overrides });
const buyer = { name: "Test Buyer", phone: "0240000000", email: "test@example.test" };

test("the offer counts units across mixed products, duplicate units and three-or-more orders", () => {
  assert.deepEqual(calculateTotals([line()], content), { quantity: 1, subtotalMinor: 7000, discountMinor: 0, totalMinor: 7000 });
  for (const lines of [[line({ quantity: 2 })], [line(), pink()]]) assert.deepEqual(calculateTotals(lines, content), { quantity: 2, subtotalMinor: 14000, discountMinor: 700, totalMinor: 13300 });
  assert.deepEqual(calculateTotals([line({ quantity: 2 }), pink()], content), { quantity: 3, subtotalMinor: 21000, discountMinor: 1050, totalMinor: 19950 });
});

test("fit and size extras are included before discount; calculations use pesewas", () => {
  assert.deepEqual(calculateTotals([line({ fit: "oversized", size: "3XL" }), pink({ size: "XXL" })], content), { quantity: 2, subtotalMinor: 18500, discountMinor: 925, totalMinor: 17575 });
  assert.equal(calculateTotals([line({ size: "XXL" })], content).totalMinor, 8000);
});

test("only identical configurations merge, and the per-configuration quantity cap is enforced", () => {
  assert.equal(addLine([line()], line({ quantity: 2 }), 20)[0].quantity, 3);
  assert.equal(addLine([line()], line({ size: "L" }), 20).length, 2);
  assert.equal(addLine([line()], line({ colourwayId: "dark-mode" }), 20).length, 2);
  assert.throws(() => addLine([line({ quantity: 20 })], line(), 20));
});

test("editing retains the line's position, merging only when its new configuration already exists", () => {
  assert.deepEqual(updateLine([line(), pink()], lineKey(line()), line({ size: "3XL" }), 20), [line({ size: "3XL" }), pink()]);
  assert.deepEqual(updateLine([line(), line({ size: "L", quantity: 2 })], lineKey(line()), line({ size: "L" }), 20), [line({ size: "L", quantity: 3 })]);
});

test("invalid combinations and quantities cannot be ordered; Pink October closes at Accra midnight", () => {
  const date = new Date("2026-10-20T12:00:00Z");
  for (const bad of [line({ quantity: 0 }), line({ quantity: 21 }), line({ quantity: 1.5 }), line({ colourwayId: "invented" }), pink({ fit: "oversized" }), line({ size: "4XL" })]) assert.equal(validateLine(bad, content, date), false);
  assert.equal(productIsOpen(content.products[1], new Date("2026-10-31T23:59:59.999Z")), true);
  assert.equal(productIsOpen(content.products[1], new Date("2026-11-01T00:00:00Z")), false);
});

test("the temporary adapter fits every approved configuration within the backend note limit", () => {
  for (const product of content.products) for (const cw of product.colourways) for (const fit of product.fits) for (const size of content.sizes) {
    const configured = line({ productId: product.id, colourwayId: cw.id, fit: fit.id, size: size.id });
    assert.ok(serializeOptions(configured).length <= 100);
    assert.equal(serializeOptions(configured), `size=${size.id};fit=${fit.id};colourway=${cw.id}`);
  }
  assert.deepEqual(makeOrderRequest(buyer, [line()], { "css-tee": 101 }).items, [{ product: 101, quantity: 1, note: "size=M;fit=regular;colourway=kernel-panic" }]);
  assert.throws(() => makeOrderRequest(buyer, [pink()], { "css-tee": 101 }));
});

test("paid-order cleanup preserves tees added after the submitted snapshot", () => {
  assert.deepEqual(subtractPurchasedLines([line({ quantity: 3 }), pink()], [line({ quantity: 2 })]), [line(), pink()]);
});

test("payment URLs must be genuine HTTPS Paystack URLs", () => {
  assert.equal(safePaymentUrl("https://checkout.paystack.com/example"), "https://checkout.paystack.com/example");
  for (const value of ["http://checkout.paystack.com/x", "https://checkout.paystack.com.attacker.test/x", "javascript:alert(1)", "https://user:password@checkout.paystack.com/x"]) assert.throws(() => safePaymentUrl(value));
});

const records = [
  { id: 101, name: "CSS Tee", price: "70.00", in_stock: true, stock_quantity: 30, availability: "available" },
  { id: 202, name: "Pink October Tee", price: "70.00", in_stock: true, stock_quantity: 30, availability: "available" },
];

test("the live test merchandise is never silently mapped to an approved tee", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ results: [{ ...records[0], id: 1, name: "Test Item" }], next: null }));
  assert.deepEqual((await getCheckoutCatalog()).products, {});
});

test("order proxy validates note pricing, discount and fee-inclusive totals before exposing payment", async (t) => {
  const prior = process.env.CSS_MERCH_PRICING_READY;
  process.env.CSS_MERCH_PRICING_READY = "true";
  t.after(() => { if (prior === undefined) delete process.env.CSS_MERCH_PRICING_READY; else process.env.CSS_MERCH_PRICING_READY = prior; });
  let returnedDiscount = "7.00", stock = 30, posted = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (String(url).includes("merchandise/")) return Response.json({ results: records.map((record) => ({ ...record, stock_quantity: stock })), next: null });
    posted.push(JSON.parse(init.body));
    return Response.json({ id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", status: "PENDING", subtotal: "140.00", discount: returnedDiscount, fee: "2.00", total: "135.00", authorization_url: "https://checkout.paystack.com/example", expires_at: "2099-01-01T00:00:00Z" }, { status: 201 });
  });
  const request = (lines) => new Request("http://localhost/api/merch/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ buyer, lines }) });
  const response = await POST(request([line(), pink()]));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).authorization_url, "https://checkout.paystack.com/example");
  assert.deepEqual(posted[0].items.map(({ product }) => product), [101, 202]);
  returnedDiscount = "0";
  const mismatch = await POST(request([line(), pink()]));
  assert.equal(mismatch.status, 409);
  const mismatchBody = await mismatch.json();
  assert.equal(mismatchBody.authorization_url, undefined);
  assert.equal(mismatchBody.error.orderId, "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
  stock = 1;
  const count = posted.length;
  assert.equal((await POST(request([line(), line({ colourwayId: "dark-mode" })]))).status, 409);
  assert.equal(posted.length, count, "aggregate stock must be checked before creating an order");
});
