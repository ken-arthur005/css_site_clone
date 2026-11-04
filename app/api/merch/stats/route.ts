import { merchApi } from "@/lib/api/merch";
import { EMPTY_STATS, parseStats } from "@/lib/merch/stats";

/** Social proof for the shop (aggregates only), cached at the edge for 10 minutes. */
export async function GET() {
  try {
    return Response.json(parseStats(await merchApi("merchandise/stats/")), {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=86400" },
    });
  } catch {
    return Response.json(EMPTY_STATS, { headers: { "Cache-Control": "no-store" } });
  }
}
