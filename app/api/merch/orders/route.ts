import { getMerchStore } from "@/lib/content/merch-store";
import { getCheckoutCatalog, isOrderId, MerchApiError, merchApi, parseOrder, safePaymentUrl } from "@/lib/api/merch";
import { errorResponse, looksLikePhone, readJson } from "@/lib/api/route-helpers";
import { findProduct, makeOrderRequest, normalizeLine, validateLine } from "@/lib/merch/order";
import { selectionIssue, stockIssue } from "@/lib/merch/catalog";
import type { Buyer, ProductId, ShopLine } from "@/types/merch-store";

export async function POST(request: Request) {
  let createdId: string | undefined;
  try {
    const body = await readJson(request);
    const content = await getMerchStore();
    const buyer = body.buyer as Buyer;
    if (!buyer || typeof buyer.name !== "string" || !buyer.name.trim() || buyer.name.length > 150 ||
      typeof buyer.email !== "string" || buyer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email.trim()) ||
      !looksLikePhone(buyer.phone)) throw new MerchApiError("Please check your name, email and phone number.", 400);
    const promoCode = typeof body.promoCode === "string" ? body.promoCode.trim() : "";
    if (promoCode && !/^[A-Za-z0-9-]{3,32}$/.test(promoCode)) throw new MerchApiError("That code doesn’t look right. Check it and try again.", 400);

    const raw = body.lines;
    if (!Array.isArray(raw) || !raw.length || raw.length > 40) throw new MerchApiError("Please check the items in your order.", 400);
    const lines = raw.map((line) => normalizeLine(line, content));
    if (!lines.every((line): line is ShopLine => !!line && validateLine(line, content))) throw new MerchApiError("Please check the options and quantities in your order.", 400);

    const catalog = await getCheckoutCatalog(content);
    const invalidSelection = lines.map((line) => selectionIssue(line, content, catalog)).find(Boolean);
    if (invalidSelection) throw new MerchApiError(invalidSelection, 409);
    const invalidStock = stockIssue(lines, content, catalog);
    if (invalidStock) throw new MerchApiError(invalidStock, 409);
    const ids: Partial<Record<ProductId, number>> = {};
    for (const line of lines) {
      const live = catalog.products[line.productId];
      if (!live) throw new MerchApiError(`${findProduct(content, line.productId)?.name ?? "An item"} is currently unavailable. Please edit your order.`, 409);
      ids[line.productId] = live.id;
    }

    const created = await merchApi("orders/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(makeOrderRequest(buyer, lines, ids, content, promoCode)) });
    const id = created && typeof created === "object" ? (created as { id?: unknown }).id : undefined;
    if (typeof id === "string" && isOrderId(id)) createdId = id;
    const order = parseOrder(created);
    // The backend owns pricing. Validate its arithmetic before opening payment;
    // Paystack shows the final amount before the buyer authorises it.
    return Response.json({ ...order, authorization_url: safePaymentUrl(order.authorization_url) }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "The order could not be placed.", createdId ? { orderId: createdId } : {});
  }
}
