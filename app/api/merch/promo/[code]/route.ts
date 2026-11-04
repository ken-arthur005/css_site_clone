import { getCheckoutCatalog, MerchApiError, merchApi, parsePromo } from "@/lib/api/merch";
import { errorResponse } from "@/lib/api/route-helpers";

export const dynamic = "force-dynamic";

/** What a promo code does, so the review step can show the saving before paying. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    if (!/^[A-Za-z0-9-]{3,32}$/.test(code)) throw new MerchApiError("That code doesn’t look right. Check it and try again.", 400);
    const [raw, catalog] = await Promise.all([merchApi(`promo-codes/${encodeURIComponent(code.toUpperCase())}/`), getCheckoutCatalog()]);
    return Response.json(parsePromo(raw, catalog), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof MerchApiError && error.status === 404) return errorResponse(new MerchApiError("That code doesn’t exist or has already been used.", 404), "");
    return errorResponse(error, "That code couldn’t be checked right now.");
  }
}
