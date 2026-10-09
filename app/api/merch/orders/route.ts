import { getMerchStore } from "@/lib/content/merch-store";
import { getCheckoutCatalog, isOrderId, MerchApiError, merchApi, parseOrder, safePaymentUrl } from "@/lib/api/merch";
import { makeOrderRequest, validateLine } from "@/lib/merch/order";
import { selectionIssue, stockIssue } from "@/lib/merch/catalog";
import type { Buyer, TeeLine } from "@/types/merch-store";

export async function POST(request: Request) {
  let createdId: string | undefined;
  try {
    const body = await request.json().catch(() => { throw new MerchApiError("The order could not be read.", 400); });
    const content = await getMerchStore();
    const buyer = body?.buyer as Buyer;
    if (!buyer || typeof buyer.name !== "string" || !buyer.name.trim() || buyer.name.length > 150 ||
      typeof buyer.email !== "string" || buyer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email.trim()) ||
      typeof buyer.phone !== "string" || !/^\+?[\d\s()-]{9,20}$/.test(buyer.phone.trim())) throw new MerchApiError("Please check your name, email and phone number.", 400);
    const lines = body?.lines as TeeLine[];
    if (!Array.isArray(lines) || !lines.length || lines.length > 40 || !lines.every((line) => validateLine(line, content))) throw new MerchApiError("Please check the tee options and quantities in your order.", 400);
    const catalog = await getCheckoutCatalog(content);
    const ids: Partial<Record<TeeLine["productId"], number>> = {};
    const invalidSelection = lines.map((line) => selectionIssue(line, content, catalog)).find(Boolean);
    if (invalidSelection) throw new MerchApiError(invalidSelection, 409);
    const invalidStock = stockIssue(lines, content, catalog);
    if (invalidStock) throw new MerchApiError(invalidStock, 409);
    for (const product of content.products) {
      const chosen = lines.filter((line) => line.productId === product.id);
      if (!chosen.length) continue;
      const live = catalog.products[product.id];
      if (!live || !live.in_stock || live.price === null) throw new MerchApiError(`${product.name} is currently unavailable. Please edit your order.`, 409);
      ids[product.id] = live.id;
    }
    const raw = await merchApi("orders/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(makeOrderRequest(buyer, lines, ids, content)) });
    const id = raw && typeof raw === "object" ? (raw as { id?: unknown }).id : undefined;
    if (typeof id === "string" && isOrderId(id)) createdId = id;
    const order = parseOrder(raw);
    // The backend owns pricing. Validate its arithmetic before the single-click
    // redirect; Paystack shows the final amount before payment authorization.
    return Response.json({ ...order, authorization_url: safePaymentUrl(order.authorization_url) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: { message: error instanceof Error ? error.message : "The order could not be placed.", ...(createdId ? { orderId: createdId } : {}) } }, { status: error instanceof MerchApiError ? error.status : 502 });
  }
}
