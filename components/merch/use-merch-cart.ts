"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CART_KEY, normalizeStoredLines, PENDING_ORDER_KEY } from "@/lib/merch/order";
import type { MerchStoreContent, TeeLine } from "@/types/merch-store";

const memory = new Map<string, string>();
const CHANGE_EVENT = "cssknust-merch-storage";

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(CHANGE_EVENT, listener); };
}

export function storedValue(key: string): string {
  try { return localStorage.getItem(key) ?? memory.get(key) ?? ""; }
  catch { return memory.get(key) ?? ""; }
}

export function saveStoredValue(key: string, value: string) {
  memory.set(key, value);
  try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch { /* Keep the current session useful when storage is unavailable. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useStoredValue(key: string): string {
  return useSyncExternalStore(subscribe, () => storedValue(key), () => "");
}

export function useMerchCart(content: MerchStoreContent) {
  const raw = useStoredValue(CART_KEY);
  const lines = useMemo(() => {
    try { return normalizeStoredLines(JSON.parse(raw), content); }
    catch { return []; }
  }, [raw, content]);
  return { lines, setLines: (next: TeeLine[]) => saveStoredValue(CART_KEY, JSON.stringify(next)) };
}

function subscribePaymentClock(listener: () => void) {
  const timer = window.setInterval(listener, 1000);
  document.addEventListener("visibilitychange", listener);
  return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", listener); };
}

export function usePendingOrder() {
  const raw = useStoredValue(PENDING_ORDER_KEY);
  const session = useMemo(() => {
    try {
      const saved = JSON.parse(raw);
      if (typeof saved.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.id)) return null;
      return { id: saved.id as string, authorization_url: typeof saved.authorization_url === "string" ? saved.authorization_url as string : null,
        expires_at: typeof saved.expires_at === "string" ? saved.expires_at as string : null };
    } catch { return null; }
  }, [raw]);
  // The snapshot is a stable boolean, so time checks do not re-render the order
  // builder each second. It changes only when the saved session expires.
  const active = useSyncExternalStore(subscribePaymentClock, () => !session?.expires_at || Date.parse(session.expires_at) > Date.now(), () => false);
  let resumeUrl: string | null = null;
  if (active && session?.authorization_url) {
    try {
      const url = new URL(session.authorization_url);
      if (url.protocol === "https:" && (url.hostname === "paystack.com" || url.hostname.endsWith(".paystack.com")) && !url.username && !url.password) resumeUrl = url.href;
    } catch { /* A damaged saved URL never becomes a payment link. */ }
  }
  return { session, resumeUrl };
}
