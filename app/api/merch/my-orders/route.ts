import { MerchApiError, merchApi, parseOrder } from "@/lib/api/merch";
import { errorResponse, looksLikePhone, readJson } from "@/lib/api/route-helpers";

/** A phone's orders, proven by the texted code or one of its 7-digit order codes. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    if (!looksLikePhone(body.phone)) throw new MerchApiError("Enter the phone number you ordered with.", 400);
    const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
    const orderCode = typeof body.orderCode === "string" ? body.orderCode.replace(/\D/g, "") : "";
    if (!/^\d{6}$/.test(code) && !/^\d{7}$/.test(orderCode)) throw new MerchApiError("Enter the 6-digit code we texted you, or a 7-digit order code.", 400);
    const raw = await merchApi("my-orders/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: body.phone.trim(), ...(code ? { code } : { order_code: orderCode }) }) }) as { orders?: unknown[] } | null;
    if (!raw || !Array.isArray(raw.orders)) throw new MerchApiError("Your orders couldn’t be loaded.");
    // parseOrder forwards public fields only; payment links are never included.
    const orders = raw.orders.slice(0, 20).map(parseOrder).map((order) => ({ ...order, authorization_url: undefined, access_code: undefined }));
    return Response.json({ orders }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "Your orders couldn’t be loaded right now.");
  }
}
