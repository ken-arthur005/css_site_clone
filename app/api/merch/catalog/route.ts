import { getCheckoutCatalog, MerchApiError } from "@/lib/api/merch";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return Response.json(await getCheckoutCatalog(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) {
    return Response.json({ error: { message: error instanceof Error ? error.message : "The catalog is unavailable." } }, { status: error instanceof MerchApiError ? error.status : 502 });
  }
}
