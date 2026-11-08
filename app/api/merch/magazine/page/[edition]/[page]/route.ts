import { apiBase } from "@/lib/api/merch";
import { isEdition } from "@/lib/merch/magazine";

/** One magazine page, passed through for a valid reader key only (the backend checks it). */
export async function GET(request: Request, { params }: { params: Promise<{ edition: string; page: string }> }) {
  const { edition, page } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? "";
  if (!isEdition(edition) || !/^\d{1,2}$/.test(page) || !/^[A-Za-z0-9.-]{20,200}$/.test(token)) return new Response(null, { status: 404 });
  try {
    const upstream = await fetch(new URL(`magazine/page/${edition}/${Number(page)}/?t=${encodeURIComponent(token)}`, apiBase()), {
      cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    if (!upstream.ok || upstream.headers.get("content-type") !== "image/webp" || !upstream.body) return new Response(null, { status: upstream.status === 403 ? 403 : 404 });
    return new Response(upstream.body, { headers: {
      "Content-Type": "image/webp", "Cache-Control": "private, max-age=3600", "Content-Disposition": "inline", "X-Robots-Tag": "noindex",
    } });
  } catch {
    return new Response(null, { status: 502 });
  }
}
