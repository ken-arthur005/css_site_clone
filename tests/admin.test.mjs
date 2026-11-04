import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

// A fake next/headers: route handlers read and write this cookie jar.
const jar = new Map();
globalThis.__adminTestJar = jar;
const fakeHeaders = `data:text/javascript,${encodeURIComponent(`
  const jar = globalThis.__adminTestJar;
  export async function cookies() {
    return {
      get: (name) => jar.has(name) ? { name, value: jar.get(name).value } : undefined,
      set: (name, value, options) => jar.set(name, { value, options }),
      delete: (name) => jar.delete(name),
    };
  }
`)}`;

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers") return { url: fakeHeaders, shortCircuit: true };
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  return nextResolve(specifier, context);
} });

const { safeStaffPath, errorMessage, STAFF_COOKIE } = await import("@/lib/admin/session");
const { sameOrigin } = await import("@/lib/admin/guard");
const login = await import("@/app/api/admin/login/route");
const logout = await import("@/app/api/admin/logout/route");
const proxy = await import("@/app/api/admin/[...path]/route");

const TOKEN = "0123456789abcdef0123456789abcdef01234567";
const SITE = "http://localhost:3000";
const req = (path, { method = "GET", origin = SITE, body } = {}) => new Request(`${SITE}${path}`, {
  method, headers: { ...(origin ? { Origin: origin } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}),
});
const params = (...path) => ({ params: Promise.resolve({ path }) });

test("only plain staff API paths can be forwarded", () => {
  for (const ok of ["orders/", "orders/1234567/handover/", "orders/CSS-AB12CD34/", "print-runs/12/back/", "orders/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/"]) assert.equal(safeStaffPath(ok), true, ok);
  for (const bad of ["../me/", "orders/../../x/", "orders//", "https://evil.test/", "orders/a b/", "orders/%2e%2e/"]) assert.equal(safeStaffPath(bad), false, bad);
});

test("writes must come from this site", () => {
  assert.equal(sameOrigin(req("/api/admin/x", { method: "POST" })), true);
  assert.equal(sameOrigin(req("/api/admin/x", { method: "POST", origin: "https://evil.test" })), false);
  assert.equal(sameOrigin(req("/api/admin/x", { method: "POST", origin: null })), false);
});

test("the origin is compared with the host the browser used, not Next's normalised URL", () => {
  // Next may report request.url as localhost while the browser used 127.0.0.1
  // (or, on Vercel, the proxy forwards the public host).
  const viaProxy = (origin, forwarded) => new Request("http://localhost:3000/api/admin/x", { method: "POST", headers: { Origin: origin, "X-Forwarded-Host": forwarded } });
  assert.equal(sameOrigin(viaProxy("http://127.0.0.1:3000", "127.0.0.1:3000")), true);
  assert.equal(sameOrigin(viaProxy("https://thecssknust.com", "thecssknust.com")), true);
  assert.equal(sameOrigin(viaProxy("https://evil.test", "thecssknust.com")), false, "a forged request still carries the attacker's Origin");
  assert.equal(sameOrigin(viaProxy("not a url", "thecssknust.com")), false);
});

test("backend error details become readable messages", () => {
  assert.equal(errorMessage({ error: { message: "Invalid request." }, details: { non_field_errors: ["Order 1234567 is collected, not paid."] } }, "x"), "Order 1234567 is collected, not paid.");
  assert.equal(errorMessage({ error: { message: "Wrong username or password." } }, "x"), "Wrong username or password.");
  assert.equal(errorMessage(null, "fallback"), "fallback");
});

test("sign-in keeps the token in an httpOnly, SameSite=Strict cookie and never returns it", async (t) => {
  jar.clear();
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.match(String(url), /staff\/auth\/login\/$/);
    assert.deepEqual(JSON.parse(init.body), { username: "kojo", password: "pw" });
    return Response.json({ token: TOKEN, user: { username: "kojo", name: "Kojo", is_superuser: false, roles: ["Sales Desk"], permissions: [] } });
  });
  const response = await login.POST(req("/api/admin/login", { method: "POST", body: { username: " kojo ", password: "pw" } }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.token, undefined);
  assert.equal(body.user.name, "Kojo");
  const cookie = jar.get(STAFF_COOKIE);
  assert.equal(cookie.value, TOKEN);
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, "strict");
});

test("sign-in refuses other sites and passes on the backend's refusal", async (t) => {
  jar.clear();
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: { message: "Invalid request." }, details: { non_field_errors: ["Wrong username or password."] } }, { status: 400 }));
  assert.equal((await login.POST(req("/api/admin/login", { method: "POST", origin: "https://evil.test", body: { username: "a", password: "b" } }))).status, 403);
  const refused = await login.POST(req("/api/admin/login", { method: "POST", body: { username: "a", password: "b" } }));
  assert.equal(refused.status, 401);
  assert.equal((await refused.json()).error.message, "Wrong username or password.");
  assert.equal(jar.has(STAFF_COOKIE), false);
});

test("the proxy needs a session, adds the token, and keeps query strings", async (t) => {
  jar.clear();
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => { calls.push({ url: String(url), auth: init.headers.get("Authorization"), method: init.method, body: init.body }); return Response.json({ ok: true }); });
  assert.equal((await proxy.GET(req("/api/admin/orders"), params("orders"))).status, 401);
  jar.set(STAFF_COOKIE, { value: TOKEN });
  const response = await proxy.GET(req("/api/admin/orders?status=paid&q=ama"), params("orders"));
  assert.equal(response.status, 200);
  assert.match(calls[0].url, /\/staff\/orders\/\?status=paid&q=ama$/);
  assert.equal(calls[0].auth, `Token ${TOKEN}`);
  await proxy.POST(req("/api/admin/orders/1234567/handover", { method: "POST", body: { pieces: [1] } }), params("orders", "1234567", "handover"));
  assert.equal(calls[1].method, "POST");
  assert.deepEqual(JSON.parse(calls[1].body), { pieces: [1] });
});

test("the proxy refuses cross-site writes, auth paths and odd paths", async (t) => {
  jar.clear(); jar.set(STAFF_COOKIE, { value: TOKEN });
  let called = 0;
  t.mock.method(globalThis, "fetch", async () => { called++; return Response.json({}); });
  assert.equal((await proxy.POST(req("/api/admin/sales", { method: "POST", origin: "https://evil.test", body: {} }), params("sales"))).status, 403);
  assert.equal((await proxy.GET(req("/api/admin/auth/logout"), params("auth", "logout"))).status, 404);
  assert.equal((await proxy.GET(req("/api/admin/x"), params("..", "me"))).status, 404);
  assert.equal(called, 0);
});

test("a revoked token clears the cookie", async (t) => {
  jar.clear(); jar.set(STAFF_COOKIE, { value: TOKEN });
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: { message: "Invalid token." } }, { status: 401 }));
  const response = await proxy.GET(req("/api/admin/me"), params("me"));
  assert.equal(response.status, 401);
  assert.equal(jar.has(STAFF_COOKIE), false);
});

test("sign-out revokes the token on the backend and clears the cookie", async (t) => {
  jar.clear(); jar.set(STAFF_COOKIE, { value: TOKEN });
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => { calls.push([String(url), init.headers.get("Authorization")]); return new Response(null, { status: 204 }); });
  assert.equal((await logout.POST(req("/api/admin/logout", { method: "POST" }))).status, 204);
  assert.match(calls[0][0], /staff\/auth\/logout\/$/);
  assert.equal(calls[0][1], `Token ${TOKEN}`);
  assert.equal(jar.has(STAFF_COOKIE), false);
});
