import { isOrderId, MerchApiError, merchApi, parseOrder } from "@/lib/api/merch";
import { errorResponse, readJson } from "@/lib/api/route-helpers";

/** The buyer scanned the desk QR code: put their paid order in the pickup queue. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const deskCode = typeof body.deskCode === "string" ? body.deskCode.trim() : "";
    if (!/^[A-Za-z0-9]{4,12}$/.test(deskCode)) throw new MerchApiError("Scan the QR code at the pickup desk to check in.", 400);
    if (typeof body.order !== "string" || !isOrderId(body.order)) throw new MerchApiError("Choose the order you’re collecting.", 400);
    const raw = await merchApi("pickup/checkin/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ desk_code: deskCode, order: body.order }) });
    const order = parseOrder(raw);
    return Response.json({ ...order, authorization_url: undefined, access_code: undefined }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "You couldn’t be checked in. Ask at the desk.");
  }
}
