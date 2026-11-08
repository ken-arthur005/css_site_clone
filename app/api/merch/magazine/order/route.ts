import { getMagazineProducts, isOrderId, MerchApiError, merchApi, parseOrder, safePaymentUrl } from "@/lib/api/merch";
import { errorResponse, looksLikePhone, readJson } from "@/lib/api/route-helpers";
import { cedisToMinor, copiesOf, MAGAZINE_EDITIONS, magazineAmountIssue, minorToCedis } from "@/lib/merch/magazine";

/** Start a magazine order: copies per edition at one amount per copy (GH₵5 or more). */
export async function POST(request: Request) {
  let createdId: string | undefined;
  try {
    const body = await readJson(request);
    const buyer = body.buyer as { name?: unknown; phone?: unknown; email?: unknown } | undefined;
    if (!buyer || typeof buyer.name !== "string" || !buyer.name.trim() || buyer.name.length > 150 ||
      typeof buyer.email !== "string" || buyer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email.trim()) ||
      !looksLikePhone(buyer.phone)) throw new MerchApiError("Please check your name, email and phone number.", 400);
    const copies = copiesOf(body.copies);
    if (!copies) throw new MerchApiError("Add at least one magazine (up to 20 of each).", 400);
    const amountMinor = cedisToMinor(body.amount);
    const amountIssue = magazineAmountIssue(amountMinor);
    if (amountIssue || amountMinor === null) throw new MerchApiError(amountIssue ?? "Enter an amount in cedis.", 400);

    const products = await getMagazineProducts();
    const items = [];
    for (const edition of MAGAZINE_EDITIONS) {
      if (!copies[edition.id]) continue;
      const product = products[edition.id];
      if (!product || !product.in_stock || product.availability !== "available") throw new MerchApiError(`${edition.name} isn’t on sale right now.`, 409);
      items.push({ product: product.id, quantity: copies[edition.id], amount: minorToCedis(amountMinor) });
    }

    const created = await merchApi("orders/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      buyer_name: buyer.name.trim(), buyer_phone: buyer.phone.trim(), buyer_email: buyer.email.trim(), items,
    }) });
    const id = created && typeof created === "object" ? (created as { id?: unknown }).id : undefined;
    if (typeof id === "string" && isOrderId(id)) createdId = id;
    const order = parseOrder(created);
    return Response.json({ ...order, authorization_url: safePaymentUrl(order.authorization_url) }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "The order could not be placed.", createdId ? { orderId: createdId } : {});
  }
}
