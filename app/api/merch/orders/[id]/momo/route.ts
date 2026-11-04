import { isOrderId, MerchApiError, merchApi, parseCharge } from "@/lib/api/merch";
import { errorResponse, looksLikePhone, readJson } from "@/lib/api/route-helpers";

const PROVIDERS = new Set(["mtn", "vod", "atl"]);

/** Charge a Mobile Money number for this order (our own pay screen). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    if (!isOrderId(id)) throw new MerchApiError("This order link is not valid.", 400);
    const body = await readJson(request);
    if (!looksLikePhone(body.phone)) throw new MerchApiError("Enter your Mobile Money number, e.g. 024 123 4567.", 400);
    if (typeof body.provider !== "string" || !PROVIDERS.has(body.provider)) throw new MerchApiError("Choose your network: MTN, Telecel or AirtelTigo.", 400);
    const result = await merchApi(`orders/${id}/momo/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: body.phone.trim(), provider: body.provider }) });
    return Response.json(parseCharge(result), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "The Mobile Money payment couldn’t be started.");
  }
}
