import { cookies } from "next/headers";

/**
 * Staff session for /admin. The backend's DRF token lives only in an
 * httpOnly, SameSite=Strict cookie; browser code never sees it. Every staff
 * call goes through /api/admin/*, which attaches it server-side.
 */
export const STAFF_COOKIE = "css_staff";
export const SESSION_HOURS = 12;

export type StaffUser = {
  username: string;
  name: string | null;
  is_superuser: boolean;
  roles: string[];
  permissions: string[];
};

export class StaffApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

function apiBase(): string {
  return (process.env.CSS_API_BASE_URL ?? "https://css-knust-api.onrender.com/api/v1/").replace(/\/?$/, "/");
}

/** Only these characters may appear in a forwarded staff path. */
export function safeStaffPath(path: string): boolean {
  return /^[a-z0-9-]+(\/[A-Za-z0-9-]+)*\/?$/.test(path) && !path.includes("..");
}

export async function staffFetch(path: string, token: string | null, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Token ${token}`);
  try {
    return await fetch(new URL(`staff/${path}`, apiBase()), { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(25000) });
  } catch {
    throw new StaffApiError("The CSS service can’t be reached right now. Try again shortly.", 503);
  }
}

/** A readable message from the backend's error envelope. */
export function errorMessage(data: unknown, fallback: string): string {
  const body = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const details = (body.details ?? (body.error as Record<string, unknown> | undefined)?.details) as Record<string, unknown> | undefined;
  if (details && typeof details === "object") {
    for (const value of Object.values(details)) {
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  const message = (body.error as Record<string, unknown> | undefined)?.message;
  return typeof message === "string" ? message : fallback;
}

export async function staffToken(): Promise<string | null> {
  const value = (await cookies()).get(STAFF_COOKIE)?.value;
  return value && /^[a-f0-9]{20,64}$/i.test(value) ? value : null;
}

/** The signed-in staff member, or null if the cookie is missing, expired or revoked. */
export async function currentStaff(): Promise<StaffUser | null> {
  const token = await staffToken();
  if (!token) return null;
  const response = await staffFetch("me/", token).catch(() => null);
  if (!response?.ok) return null;
  return await response.json() as StaffUser;
}
