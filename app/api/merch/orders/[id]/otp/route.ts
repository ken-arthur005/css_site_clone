import { isOrderId, MerchApiError, merchApi, parseCharge } from "@/lib/api/merch";
import { errorResponse, readJson } from "@/lib/api/route-helpers";

/** Pass on the one-time code some networks text instead of a prompt. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    if (!isOrderId(id)) throw new MerchApiError("This order link is not valid.", 400);
    const body = await readJson(request);
    const otp = typeof body.otp === "string" ? body.otp.replace(/\s/g, "") : "";
    if (!/^[0-9A-Za-z]{3,12}$/.test(otp)) throw new MerchApiError("Enter the code from your phone.", 400);
    const result = await merchApi(`orders/${id}/otp/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ otp }) });
    return Response.json(parseCharge(result), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "That code couldn’t be sent. Try again.");
  }
}
