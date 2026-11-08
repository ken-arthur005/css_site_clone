import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  return nextResolve(specifier, context);
} });

const mag = await import("@/lib/merch/magazine");
const { parseOrder } = await import("@/lib/api/merch");
const { POST: ORDER } = await import("@/app/api/merch/magazine/order/route");
const { POST: OPEN } = await import("@/app/api/merch/magazine/open/route");
const { GET: PAGE } = await import("@/app/api/merch/magazine/page/[edition]/[page]/route");
const { GET: JAR } = await import("@/app/api/merch/fundraiser/route");

const publicId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const DEVICE = "a".repeat(32);
const TOKEN = `1234567.female.${DEVICE}.1999999999.${"f".repeat(32)}`;
const BUYER = { name: "Ama Mensah", phone: "024 123 4567", email: "ama@example.com" };

const record = (id, slug, extra = {}) => ({ id, slug, kind: "magazine", name: slug, price: "5.00", in_stock: true, stock_quantity: null, availability: "available",
  sizes: [], colorways: [], unavailable_combinations: [], ...extra });
const catalogue = (results) => Response.json({ results, next: null });
const created = (subtotal) => ({ id: publicId, status: "PENDING", subtotal, discount_amount: "0.00", discount_percent: "0.00", fee: "0.00", total: subtotal,
  expires_at: null, authorization_url: "https://checkout.paystack.com/abc", access_code: "abc123" });
const post = (body) => new Request("http://localhost/x", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("amounts are cedis with at most two decimals, GH₵5 to GH₵5,000", () => {
  assert.equal(mag.cedisToMinor("12.5"), 1250);
  assert.equal(mag.cedisToMinor(20), 2000);
  assert.equal(mag.cedisToMinor("1e3"), null);
  assert.equal(mag.cedisToMinor("5.001"), null);
  assert.equal(mag.magazineAmountIssue(499), "The minimum is GH₵5 per magazine.");
  assert.equal(mag.magazineAmountIssue(500001), "The most per magazine is GH₵5,000.");
  assert.equal(mag.magazineAmountIssue(500), null);
});

test("totals count the gift above GH₵5 per copy", () => {
  assert.deepEqual(mag.magazineTotals({ female: 2, male: 1 }, 1000), { count: 3, totalMinor: 3000, extraMinor: 1500 });
  assert.equal(mag.copiesOf({ female: 0, male: 0 }), null);
  assert.equal(mag.copiesOf({ female: 21 }), null);
  assert.deepEqual(mag.copiesOf({ male: 2 }), { female: 0, male: 2 });
});

test("references: receipt id, 7-digit code or an old CSS ref", () => {
  assert.ok(mag.isMagazineRef(publicId));
  assert.ok(mag.isMagazineRef("123 4567"));
  assert.ok(mag.isMagazineRef("css-ab12cd34"));
  assert.ok(!mag.isMagazineRef("../admin"));
});

test("receipts keep the magazine edition, and know which orders have one", () => {
  const order = parseOrder({ ...created("10.00"), status: "PAID", items: [{ quantity: 2, product_name: "Code & Her", unit_price: "5.00", line_total: "10.00", magazine_edition: "female" }, { quantity: 1, magazine_edition: "<b>" }] });
  assert.equal(order.items[0].magazine_edition, "female");
  assert.equal(order.items[1].magazine_edition, undefined);
  assert.deepEqual(mag.orderMagazines(order), ["female"]);
});

test("a magazine order sends the amount per copy for each edition picked", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async (url, init) => {
    if (String(url).includes("merchandise/")) return catalogue([record(7, "mag-female"), record(8, "mag-male")]);
    return Response.json(created("30.00"), { status: 201 });
  });
  const response = await ORDER(post({ buyer: BUYER, copies: { female: 2, male: 1 }, amount: "10" }));
  assert.equal(response.status, 201);
  const sent = JSON.parse(fetch.mock.calls.at(-1).arguments[1].body);
  assert.deepEqual(sent.items, [{ product: 7, quantity: 2, amount: "10.00" }, { product: 8, quantity: 1, amount: "10.00" }]);
  assert.equal(sent.buyer_email, "ama@example.com");
});

test("a magazine order is refused below GH₵5 or when the edition isn't on sale", async (t) => {
  t.mock.method(globalThis, "fetch", async () => catalogue([record(7, "mag-female", { availability: "unavailable", in_stock: false })]));
  const low = await ORDER(post({ buyer: BUYER, copies: { female: 1 }, amount: "4" }));
  assert.equal(low.status, 400);
  const closed = await ORDER(post({ buyer: BUYER, copies: { female: 1 }, amount: "5" }));
  assert.equal(closed.status, 409);
  assert.match((await closed.json()).error.message, /Code & Her/);
});

test("opening forwards the ref and device and passes back only the reader fields", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ id: publicId, code: "1234567", token: TOKEN, editions: [{ id: "female", name: "Code & Her", pages: 17 }], watermark: "Ama · 4567 · 1234567", phone: "secret" }));
  const response = await OPEN(post({ ref: publicId, device: DEVICE }));
  const body = await response.json();
  assert.equal(body.editions[0].pages, 17);
  assert.equal(body.phone, undefined);
  assert.deepEqual(JSON.parse(fetch.mock.calls[0].arguments[1].body), { ref: publicId, device: DEVICE });
  assert.equal((await OPEN(post({ ref: publicId, device: "short" }))).status, 400);
  assert.equal((await OPEN(post({ ref: "drop table", device: DEVICE }))).status, 400);
});

test("pages stream through only for a well-formed key and the backend's webp", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/webp" } }));
  const ok = await PAGE(new Request(`http://localhost/x?t=${TOKEN}`), { params: Promise.resolve({ edition: "female", page: "3" }) });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("Cache-Control"), "private, max-age=3600");
  assert.match(String(fetch.mock.calls[0].arguments[0]), /magazine\/page\/female\/3\/\?t=/);
  const noKey = await PAGE(new Request("http://localhost/x"), { params: Promise.resolve({ edition: "female", page: "3" }) });
  assert.equal(noKey.status, 404);
  const badEdition = await PAGE(new Request(`http://localhost/x?t=${TOKEN}`), { params: Promise.resolve({ edition: "../etc", page: "3" }) });
  assert.equal(badEdition.status, 404);
  fetch.mock.mockImplementation(async () => Response.json({ error: "no" }, { status: 403 }));
  const refused = await PAGE(new Request(`http://localhost/x?t=${TOKEN}`), { params: Promise.resolve({ edition: "female", page: "3" }) });
  assert.equal(refused.status, 403);
});

test("the jar reads aggregates and falls back quietly", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ name: "Breast cancer fundraiser", goal: "5000.00", raised: "70.00", copies: 3, supporters: 2 }));
  assert.deepEqual(await (await JAR()).json(), { name: "Breast cancer fundraiser", goalMinor: 500000, raisedMinor: 7000, copies: 3, supporters: 2 });
  fetch.mock.mockImplementation(async () => { throw new Error("down"); });
  assert.deepEqual(await (await JAR()).json(), mag.EMPTY_FUNDRAISER);
});
