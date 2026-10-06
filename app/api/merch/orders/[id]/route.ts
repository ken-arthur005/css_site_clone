import { isOrderId, MerchApiError, merchApi, parseOrder } from "@/lib/api/merch";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isOrderId(id)) return Response.json({ error: { message: "This order link is not valid." } }, { status: 400 });
  try {
    const order = parseOrder(await merchApi(`orders/${id}/`));
    // Keep contact details out of this public status endpoint, even if upstream grows.
    return Response.json({ id: order.id, status: order.status, payment: order.payment, subtotal: order.subtotal, discount: order.discount,
      fee: order.fee, total: order.total, expires_at: order.expires_at,
      pickup_code: ["PAID", "COLLECTED"].includes(order.status.toUpperCase()) ? order.pickup_code : null, items: order.items });
  } catch (error) {
    return Response.json({ error: { message: error instanceof Error ? error.message : "The order could not be loaded." } }, { status: error instanceof MerchApiError ? error.status : 502 });
  }
}
