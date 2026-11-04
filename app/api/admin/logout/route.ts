import { cookies } from "next/headers";
import { jsonError, sameOrigin } from "@/lib/admin/guard";
import { STAFF_COOKIE, staffFetch, staffToken } from "@/lib/admin/session";

/** Sign out: revoke the token on the backend and clear the cookie. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Sign out from the CSS website.", 403);
  const token = await staffToken();
  if (token) await staffFetch("auth/logout/", token, { method: "POST" }).catch(() => null);
  (await cookies()).delete(STAFF_COOKIE);
  return new Response(null, { status: 204 });
}
