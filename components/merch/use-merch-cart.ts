"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CART_KEY, LAST_RECEIPT_KEY, normalizeStoredLines, ORDER_HISTORY_KEY, orderPhase, PENDING_ORDER_KEY, readSavedOrder, reconcileOrderCart, snapshotReduced } from "@/lib/merch/order";
import type { ApiOrder, MerchStoreContent, SavedMerchOrder, TeeLine } from "@/types/merch-store";

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

function jsonValue(key: string): unknown {
  try { return JSON.parse(storedValue(key)); } catch { return null; }
}

function storedOrders(): SavedMerchOrder[] {
  const raw = jsonValue(ORDER_HISTORY_KEY);
  return Array.isArray(raw) ? raw.map(readSavedOrder).filter((order): order is SavedMerchOrder => order !== null).slice(0, 20) : [];
}

export function currentSavedOrder(): SavedMerchOrder | null { return readSavedOrder(jsonValue(PENDING_ORDER_KEY)); }

export function saveCheckoutOrder(order: ApiOrder, lines: TeeLine[]) {
  const previous = currentSavedOrder();
  const history = storedOrders().filter((entry) => entry.id !== order.id);
  if (previous && previous.id !== order.id) history.unshift({ ...previous, ownsCart: false });
  saveStoredValue(ORDER_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  saveStoredValue(PENDING_ORDER_KEY, JSON.stringify({ id: order.id, lines, authorization_url: order.authorization_url,
    expires_at: order.expires_at, quote: order, ownsCart: true, reconciled: false }));
}

export function rememberOrderReference(id: string, lines: TeeLine[]) {
  const saved = readSavedOrder({ id, lines, ownsCart: true });
  if (!saved) return;
  const previous = currentSavedOrder();
  const history = storedOrders();
  if (previous && previous.id !== id) history.unshift({ ...previous, ownsCart: false });
  saveStoredValue(ORDER_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  saveStoredValue(PENDING_ORDER_KEY, JSON.stringify(saved));
}

export function reconcileStoredOrder(order: ApiOrder, content: MerchStoreContent) {
  const phase = orderPhase(order.status);
  if (phase !== "paid" && phase !== "closed") return;
  const current = currentSavedOrder();
  const history = storedOrders();
  const saved = current?.id === order.id ? current : history.find((entry) => entry.id === order.id);
  if (saved && !saved.reconciled) {
    const cart = normalizeStoredLines(jsonValue(CART_KEY), content);
    const next = reconcileOrderCart(cart, saved, order.status, content);
    // Retire the snapshot first so initial server data, polling and revisits do
    // not subtract a completed purchase again from a newly built cart.
    const completed = { ...saved, reconciled: true, ownsCart: false, status: order.status };
    saveStoredValue(ORDER_HISTORY_KEY, JSON.stringify([completed, ...history.filter((entry) => entry.id !== order.id)].slice(0, 20)));
    if (current?.id === order.id) saveStoredValue(PENDING_ORDER_KEY, "");
    if (next !== cart) saveStoredValue(CART_KEY, JSON.stringify(next));
  } else if (current?.id === order.id) saveStoredValue(PENDING_ORDER_KEY, "");
  if (phase === "paid") saveStoredValue(LAST_RECEIPT_KEY, order.id);
}

export function useMerchCart(content: MerchStoreContent) {
  const raw = useStoredValue(CART_KEY);
  const lines = useMemo(() => {
    try { return normalizeStoredLines(JSON.parse(raw), content); }
    catch { return []; }
  }, [raw, content]);
  return { lines, setLines: (next: TeeLine[]) => {
    const saved = currentSavedOrder();
    if (saved?.ownsCart && snapshotReduced(lines, next, normalizeStoredLines(saved.lines, content))) {
      saveStoredValue(PENDING_ORDER_KEY, JSON.stringify({ ...saved, ownsCart: false }));
    }
    saveStoredValue(CART_KEY, JSON.stringify(next));
  } };
}

function subscribePaymentClock(listener: () => void) {
  const timer = window.setInterval(listener, 1000);
  document.addEventListener("visibilitychange", listener);
  return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", listener); };
}

export function usePendingOrder() {
  const raw = useStoredValue(PENDING_ORDER_KEY);
  const session = useMemo(() => {
    try { return readSavedOrder(JSON.parse(raw)); } catch { return null; }
  }, [raw]);
  // The snapshot is a stable boolean, so time checks do not re-render the order
  // builder each second. It changes only when the saved session expires.
  const active = useSyncExternalStore(subscribePaymentClock, () => !session?.expires_at || Date.parse(session.expires_at) > Date.now(), () => false);
  const resumeUrl = active ? session?.authorization_url ?? null : null;
  return { session, resumeUrl };
}
