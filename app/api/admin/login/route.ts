import { cookies } from "next/headers";
import { jsonError, sameOrigin } from "@/lib/admin/guard";
import { errorMessage, SESSION_HOURS, STAFF_COOKIE, staffFetch, StaffApiError } from "@/lib/admin/session";

/** Swap a staff username + password for a session cookie (the token never reaches the browser). */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Sign in from the CSS website.", 403);
  const body = await request.json().catch(() => null) as { username?: unknown; password?: unknown } | null;
  if (typeof body?.username !== "string" || typeof body.password !== "string" || !body.username.trim() || !body.password) return jsonError("Enter your username and password.", 400);
  try {
    const response = await staffFetch("auth/login/", null, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: body.username.trim(), password: body.password }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return jsonError(response.status === 429 ? "Too many attempts. Wait a minute, then try again." : errorMessage(data, "Wrong username or password."), response.status === 429 ? 429 : 401);
    if (typeof data.token !== "string") return jsonError("Sign-in failed. Try again.", 502);
    (await cookies()).set(STAFF_COOKIE, data.token, {
      httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_HOURS * 3600,
    });
    return Response.json({ user: data.user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error instanceof StaffApiError ? error.message : "Sign-in failed. Try again.", error instanceof StaffApiError ? error.status : 502);
  }
}
