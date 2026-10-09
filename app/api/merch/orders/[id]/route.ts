import { getOrderStatus, isOrderId, MerchApiError } from "@/lib/api/merch";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isOrderId(id)) return Response.json({ error: { message: "This order link is not valid." } }, { status: 400 });
  try {
    return Response.json(await getOrderStatus(id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: { message: error instanceof Error ? error.message : "The order could not be loaded." } }, { status: error instanceof MerchApiError ? error.status : 502 });
  }
}
