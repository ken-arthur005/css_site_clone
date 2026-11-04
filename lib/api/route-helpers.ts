import { MerchApiError } from "@/lib/api/merch";

/** A JSON error in the shape the shop's client code reads: { error: { message } }. */
export function errorResponse(error: unknown, fallback: string, extra: Record<string, unknown> = {}): Response {
  const status = error instanceof MerchApiError ? error.status : 502;
  const message = error instanceof Error && error.message ? error.message : fallback;
  return Response.json({ error: { message, ...extra } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new MerchApiError("The request could not be read.", 400);
  return body as Record<string, unknown>;
}

/** Ghana numbers in any common format; the backend normalises and re-checks. */
export function looksLikePhone(value: unknown): value is string {
  return typeof value === "string" && /^\+?[\d\s()-]{9,20}$/.test(value.trim());
}
