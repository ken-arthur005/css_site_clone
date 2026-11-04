import { MerchApiError, merchApi } from "@/lib/api/merch";
import { errorResponse, looksLikePhone, readJson } from "@/lib/api/route-helpers";

/** Text a 6-digit code to the phone. The answer is the same whether or not it has orders. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    if (!looksLikePhone(body.phone)) throw new MerchApiError("Enter the phone number you ordered with.", 400);
    await merchApi("my-orders/code/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: body.phone.trim() }) });
    return Response.json({ message: "If that number has orders, we’ve texted it a 6-digit code." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof MerchApiError && error.status === 429) return errorResponse(new MerchApiError("Too many codes requested. Wait a while, then try again.", 429), "");
    return errorResponse(error, "We couldn’t send a code right now.");
  }
}
