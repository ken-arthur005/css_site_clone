import { merchApi } from "@/lib/api/merch";
import { EMPTY_FUNDRAISER, parseFundraiser } from "@/lib/merch/magazine";

/** The magazine jar (aggregates only), cached briefly at the edge. */
export async function GET() {
  try {
    return Response.json(parseFundraiser(await merchApi("merchandise/fundraiser/")), {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=600" },
    });
  } catch {
    return Response.json(EMPTY_FUNDRAISER, { headers: { "Cache-Control": "no-store" } });
  }
}
