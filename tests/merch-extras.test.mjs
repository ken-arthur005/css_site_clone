import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  return nextResolve(specifier, context);
} });

const { parseStats, proofLine, mostPopular, EMPTY_STATS } = await import("@/lib/merch/stats");
const { GET: STATS } = await import("@/app/api/merch/stats/route");
const { GET: PUSH_KEY, POST: PUSH_SUBSCRIBE } = await import("@/app/api/merch/push/route");

const publicId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const KEY = "B" + "A".repeat(86);

test("stats keep only well-formed counts, keyed by product slug", () => {
  const stats = parseStats({ products: [{ id: 1, slug: "css-tee", week: 7, buyers: 30 }, { id: 2, slug: null, week: 9 }, { slug: "BAD SLUG", week: 3 }, { slug: "bundle-duo", week: -1, buyers: 2.5 }], people: 41 });
  assert.deepEqual(stats, { week: { "css-tee": 7 }, buyers: { "css-tee": 30 }, people: 41 });
  assert.deepEqual(parseStats(null), EMPTY_STATS);
  assert.deepEqual(parseStats("nope"), EMPTY_STATS);
});

test("social proof is only shown from real thresholds", () => {
  const stats = { week: { a: 5, b: 4 }, buyers: { b: 10, c: 9 }, people: 50 };
  assert.equal(proofLine("a", stats), "5 ordered this week");
  assert.equal(proofLine("b", stats), "10 people bought this");
  assert.equal(proofLine("c", stats), "");
  assert.equal(proofLine("missing", EMPTY_STATS), "");
});

test("most popular needs 10 buyers and an outright lead", () => {
  assert.equal(mostPopular(["x", "y"], { week: {}, buyers: { x: 12, y: 3 }, people: 0 }), "x");
  assert.equal(mostPopular(["x", "y"], { week: {}, buyers: { x: 12, y: 12 }, people: 0 }), null);
  assert.equal(mostPopular(["x", "y"], { week: {}, buyers: { x: 9 }, people: 0 }), null);
  assert.equal(mostPopular([], EMPTY_STATS), null);
});

test("the stats proxy is edge-cached and quiet when the backend is down", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ products: [{ slug: "css-tee", week: 6, buyers: 11 }], people: 11 }));
  const response = await STATS();
  assert.deepEqual(await response.json(), { week: { "css-tee": 6 }, buyers: { "css-tee": 11 }, people: 11 });
  assert.match(response.headers.get("Cache-Control"), /s-maxage=600/);
  assert.match(String(fetch.mock.calls[0].arguments[0]), /merchandise\/stats\/$/);
  fetch.mock.mockImplementation(async () => { throw new Error("down"); });
  const down = await STATS();
  assert.deepEqual(await down.json(), EMPTY_STATS);
  assert.equal(down.headers.get("Cache-Control"), "no-store");
});

test("the push key proxy only reports push on with a sane key", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ enabled: true, public_key: KEY }));
  assert.deepEqual(await (await PUSH_KEY()).json(), { enabled: true, publicKey: KEY });
  fetch.mock.mockImplementation(async () => Response.json({ enabled: true, public_key: "<script>" }));
  assert.deepEqual(await (await PUSH_KEY()).json(), { enabled: false, publicKey: "" });
  fetch.mock.mockImplementation(async () => { throw new Error("down"); });
  assert.equal((await (await PUSH_KEY()).json()).enabled, false);
});

test("subscribing forwards only the subscription's endpoint and keys, for real order ids", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ following: 1 }));
  const subscription = { endpoint: "https://push.example/abc", expirationTime: null, keys: { p256dh: "BPk3", auth: "au7h" }, extra: "dropped" };
  const request = (body) => new Request("http://localhost/api/merch/push", { method: "POST", body: JSON.stringify(body) });
  const ok = await PUSH_SUBSCRIBE(request({ subscription, orders: [publicId, "not-an-id"] }));
  assert.deepEqual(await ok.json(), { following: 1 });
  const sent = JSON.parse(fetch.mock.calls[0].arguments[1].body);
  assert.deepEqual(sent, { subscription: { endpoint: "https://push.example/abc", keys: { p256dh: "BPk3", auth: "au7h" } }, orders: [publicId] });
  assert.equal((await PUSH_SUBSCRIBE(request({ subscription: { ...subscription, endpoint: "http://insecure" }, orders: [publicId] }))).status, 400);
  assert.equal((await PUSH_SUBSCRIBE(request({ subscription, orders: ["x"] }))).status, 400);
  assert.equal(fetch.mock.callCount(), 1);
});
