import { cookies } from "next/headers";
import { jsonError, sameOrigin } from "@/lib/admin/guard";
import { STAFF_COOKIE, safeStaffPath, staffFetch, staffToken, StaffApiError } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

/**
 * Forwards dashboard calls to the backend's staff API with the session token.
 * The backend checks every permission; this layer only adds the token, refuses
 * cross-site writes and odd paths, and clears the cookie once it stops working.
 */
async function forward(request: Request, { params }: Context): Promise<Response> {
  const { path } = await params;
  const joined = `${path.join("/")}/`;
  if (!safeStaffPath(joined) || joined.startsWith("auth/")) return jsonError("Not found.", 404);
  if (request.method !== "GET" && !sameOrigin(request)) return jsonError("Use the CSS website to make changes.", 403);
  const token = await staffToken();
  if (!token) return jsonError("Your session has ended. Sign in again.", 401);

  const search = new URL(request.url).search;
  const body = ["POST", "PATCH"].includes(request.method) ? await request.text() : undefined;
  try {
    const response = await staffFetch(`${joined}${search}`, token, {
      method: request.method,
      ...(body !== undefined ? { body, headers: { "Content-Type": "application/json" } } : {}),
    });
    if (response.status === 401) {
      (await cookies()).delete(STAFF_COOKIE);
      return jsonError("Your session has ended. Sign in again.", 401);
    }
    const headers = { "Cache-Control": "no-store", "Content-Type": response.headers.get("Content-Type") ?? "application/json" };
    return new Response(response.status === 204 ? null : await response.text(), { status: response.status, headers });
  } catch (error) {
    return jsonError(error instanceof StaffApiError ? error.message : "The CSS service can’t be reached right now.", 503);
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
