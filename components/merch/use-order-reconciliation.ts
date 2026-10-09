"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LAST_RECEIPT_KEY, orderPhase } from "@/lib/merch/order";
import type { ApiOrder, MerchStoreContent } from "@/types/merch-store";
import { currentSavedOrder, reconcileStoredOrder, usePendingOrder, useStoredValue } from "./use-merch-cart";

export function useOrderReconciliation(content: MerchStoreContent) {
  const { session, resumeUrl } = usePendingOrder();
  const lastReceipt = useStoredValue(LAST_RECEIPT_KEY);
  const [checked, setChecked] = useState<ApiOrder | null>(null);
  const mounted = useRef(false);
  const request = useRef<{ id: string; promise: Promise<ApiOrder | null>; controller: AbortController } | null>(null);
  const checkPreviousOrder = useCallback((): Promise<ApiOrder | null> => {
    const saved = currentSavedOrder();
    if (!saved) return Promise.resolve(null);
    if (request.current?.id === saved.id) return request.current.promise;
    const controller = new AbortController();
    const promise = (async () => {
      try {
        const response = await fetch(`/api/merch/orders/${encodeURIComponent(saved.id)}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) return null;
        const order: ApiOrder = await response.json();
        if (order.id.toLowerCase() !== saved.id) return null;
        if (mounted.current) setChecked(order);
        reconcileStoredOrder(order, content);
        return order;
      } catch { return null; }
      finally { if (request.current?.controller === controller) request.current = null; }
    })();
    request.current = { id: saved.id, promise, controller };
    return promise;
  }, [content]);

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let cancelled = false;
    const check = async () => {
      clearTimeout(timer);
      if (document.hidden) return;
      const order = await checkPreviousOrder();
      if (!cancelled && order && orderPhase(order.status) === "pending" && ++attempts < 12) timer = setTimeout(check, 5000);
    };
    const returnToShop = () => { attempts = 0; void check(); };
    queueMicrotask(() => { if (!cancelled) void check(); });
    window.addEventListener("pageshow", returnToShop);
    window.addEventListener("focus", returnToShop);
    document.addEventListener("visibilitychange", returnToShop);
    return () => { cancelled = true; mounted.current = false; clearTimeout(timer); request.current?.controller.abort(); request.current = null;
      window.removeEventListener("pageshow", returnToShop); window.removeEventListener("focus", returnToShop); document.removeEventListener("visibilitychange", returnToShop); };
  }, [checkPreviousOrder, session?.id]);

  const pending = checked && session && checked.id === session.id && orderPhase(checked.status) === "pending" ? checked : null;
  return { checkPreviousOrder, pending, resumeUrl: pending ? resumeUrl : null,
    lastReceipt: /^[0-9a-f-]{36}$/i.test(lastReceipt) ? lastReceipt : null };
}
