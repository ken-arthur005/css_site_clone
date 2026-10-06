import { getMerchStore } from "@/lib/content/merch-store";
import { amountMinor, getCheckoutCatalog, MerchApiError, merchApi, parseOrder, safePaymentUrl } from "@/lib/api/merch";
import { calculateTotals, makeOrderRequest, validateLine } from "@/lib/merch/order";
import type { Buyer, TeeLine } from "@/types/merch-store";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => { throw new MerchApiError("The order could not be read.", 400); });
    const content = await getMerchStore();
    const buyer = body?.buyer as Buyer;
    if (!buyer || typeof buyer.name !== "string" || !buyer.name.trim() || buyer.name.length > 150 ||
      typeof buyer.email !== "string" || buyer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email.trim()) ||
      typeof buyer.phone !== "string" || !/^\+?[\d\s()-]{9,20}$/.test(buyer.phone.trim())) throw new MerchApiError("Please check your name, email and phone number.", 400);
    const lines = body?.lines as TeeLine[];
    if (!Array.isArray(lines) || !lines.length || lines.length > 40 || !lines.every((line) => validateLine(line, content))) throw new MerchApiError("Please check the tee options and quantities in your order.", 400);
    const catalog = await getCheckoutCatalog();
    if (!catalog.pricingReady) throw new MerchApiError("Online ordering is being connected. Your tees are saved on this device.", 503);
    const ids: Partial<Record<TeeLine["productId"], number>> = {};
    for (const product of content.products) {
      const chosen = lines.filter((line) => line.productId === product.id);
      if (!chosen.length) continue;
      const live = catalog.products[product.id];
      const quantity = chosen.reduce((sum, line) => sum + line.quantity, 0);
      if (!live || !live.in_stock || live.price === null) throw new MerchApiError(`${product.name} is currently unavailable. Please edit your order.`, 409);
      if (live.stock_quantity !== null && quantity > live.stock_quantity) throw new MerchApiError(`Only ${live.stock_quantity} ${product.name}s remain. Please update your quantities.`, 409);
      if (amountMinor(live.price) !== product.priceMinor) throw new MerchApiError(`${product.name} pricing has changed. Please try again once the catalog has been updated.`, 409);
      ids[product.id] = live.id;
    }
    const expected = calculateTotals(lines, content);
    const raw = await merchApi("orders/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(makeOrderRequest(buyer, lines, ids)) });
    const order = parseOrder(raw);
    // Never send a buyer to payment with a silently missing discount or surcharge.
    if (amountMinor(order.subtotal) !== expected.subtotalMinor || amountMinor(order.discount ?? "0") !== expected.discountMinor ||
      amountMinor(order.total) !== expected.totalMinor + amountMinor(order.fee)) {
      return Response.json({ error: { message: "The service’s total doesn’t match your tee options and offer. Payment has not been opened; please keep this order reference for support.", orderId: order.id } }, { status: 409 });
    }
    return Response.json({ ...order, authorization_url: safePaymentUrl(order.authorization_url) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: { message: error instanceof Error ? error.message : "The order could not be placed." } }, { status: error instanceof MerchApiError ? error.status : 502 });
  }
}
