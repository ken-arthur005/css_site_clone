"use client";

import type { StaffUser } from "@/lib/admin/session";

export type { StaffUser };

export class AdminError extends Error {}

/** Call the staff API through our proxy. A lapsed session goes back to sign-in. */
export async function adminApi<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method: init.method ?? "GET",
    cache: "no-store",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (response.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the server re-checks the session
    location.assign(`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    throw new AdminError("Your session has ended.");
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new AdminError(staffMessage(data, response.status));
  return data as T;
}

function staffMessage(data: Record<string, unknown>, status: number): string {
  const details = (data.details ?? null) as Record<string, unknown> | null;
  if (details && typeof details === "object") {
    for (const value of Object.values(details)) if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  const message = (data.error as { message?: unknown } | undefined)?.message;
  if (typeof message === "string") return message;
  return status === 403 ? "You don’t have permission to do that." : "That didn’t work. Try again.";
}

export const can = (user: StaffUser, ...perms: string[]) => user.is_superuser || perms.every((perm) => user.permissions.includes(perm));

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

/** Every page of a paginated list (for exports), capped to stay sane. */
export async function allPages<T>(path: string, maxPages = 20): Promise<T[]> {
  const rows: T[] = [];
  const separator = path.includes("?") ? "&" : "?";
  for (let page = 1; page <= maxPages; page++) {
    const data = await adminApi<Page<T>>(`${path}${separator}page=${page}&page_size=200`);
    rows.push(...data.results);
    if (!data.next) break;
  }
  return rows;
}

export function cedis(value: string | number | null | undefined): string {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return `GH₵${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
}

export function when(value: string | null | undefined, withDate = true): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", { ...(withDate ? { day: "numeric", month: "short" } : {}), hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" });
}

export function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Accra" });
}

/** Download rows as a CSV file (Excel-friendly: BOM, quoted cells). */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const cell = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value);
    // Neutralise spreadsheet formulas in user-typed text.
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll("\"", "\"\"")}"`;
  };
  const csv = "﻿" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
