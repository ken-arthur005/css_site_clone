import { amountMinor, getMagazineProducts } from "@/lib/api/merch";
import { errorResponse } from "@/lib/api/route-helpers";
import { MAGAZINE_EDITIONS } from "@/lib/merch/magazine";

export const dynamic = "force-dynamic";

/** The magazine editions on sale: backend product id and floor price (for the desk sale). */
export async function GET() {
  try {
    const products = await getMagazineProducts();
    const editions = MAGAZINE_EDITIONS.flatMap((edition) => {
      const product = products[edition.id];
      if (!product || product.price === null) return [];
      return [{
        id: edition.id, name: edition.name, product: product.id, priceMinor: amountMinor(product.price),
        available: product.in_stock && product.availability === "available",
      }];
    });
    return Response.json({ editions }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "The magazines couldn’t be loaded.");
  }
}
