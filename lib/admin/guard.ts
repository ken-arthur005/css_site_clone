/**
 * Writes must come from this site's own pages. The SameSite=Strict cookie
 * already stops cross-site requests from carrying the session; the Origin
 * check is a second, independent guard.
 *
 * The Origin's host is compared with the Host the browser sent (and the
 * proxy's forwarded host): in a forged cross-site request the browser sends
 * this site as Host but the attacker's site as Origin, so they never match.
 * Next can report request.url with a normalised host (e.g. localhost), so the
 * headers are the reliable source.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try { originHost = new URL(origin).host; } catch { return false; }
  const hosts = new Set<string>();
  const add = (value: string | null | undefined) => { for (const part of (value ?? "").split(",")) if (part.trim()) hosts.add(part.trim().toLowerCase()); };
  add(request.headers.get("host"));
  add(request.headers.get("x-forwarded-host"));
  try { add(new URL(request.url).host); } catch { /* ignore */ }
  try { if (process.env.NEXT_PUBLIC_SITE_ORIGIN) add(new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN).host); } catch { /* ignore */ }
  return hosts.has(originHost.toLowerCase());
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: { message } }, { status, headers: { "Cache-Control": "no-store" } });
}
