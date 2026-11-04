import { isOrderId, MerchApiError, merchApi } from "@/lib/api/merch";
import { errorResponse, readJson } from "@/lib/api/route-helpers";

export const dynamic = "force-dynamic";

/** Whether web push is on, and the public key browsers subscribe with. */
export async function GET() {
  try {
    const raw = await merchApi("push/key/") as { enabled?: unknown; public_key?: unknown } | null;
    const key = typeof raw?.public_key === "string" && /^[A-Za-z0-9_-]{80,100}$/.test(raw.public_key) ? raw.public_key : "";
    return Response.json({ enabled: raw?.enabled === true && !!key, publicKey: key }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json({ enabled: false, publicKey: "" }, { headers: { "Cache-Control": "no-store" } });
  }
}

/** Follow these orders on this browser: { subscription: PushSubscriptionJSON, orders: [ids] }. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const sub = body.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
    const orders = Array.isArray(body.orders) ? body.orders.filter((id): id is string => typeof id === "string" && isOrderId(id)).slice(0, 30) : [];
    if (!sub || typeof sub.endpoint !== "string" || !sub.endpoint.startsWith("https://") || typeof sub.keys?.p256dh !== "string" || typeof sub.keys?.auth !== "string") {
      throw new MerchApiError("That notification setup didn’t work. Try again.", 400);
    }
    if (!orders.length) throw new MerchApiError("No order to follow.", 400);
    const subscription = { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
    const raw = await merchApi("push/subscribe/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription, orders }) }) as { following?: unknown } | null;
    return Response.json({ following: typeof raw?.following === "number" ? raw.following : orders.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "Notifications couldn’t be turned on right now.");
  }
}
