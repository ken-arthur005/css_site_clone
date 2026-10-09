"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CheckoutCatalog } from "@/types/merch-store";

export function useMerchCatalog() {
  const [catalog, setCatalog] = useState<CheckoutCatalog | null>(null);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    try {
      const response = await fetch("/api/merch/catalog", { signal: controller.signal, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "The ordering service is unavailable.");
      if (!controller.signal.aborted) { setCatalog(data); setError(""); }
    } catch (failure) {
      if (!controller.signal.aborted) { setCatalog(null); setError(failure instanceof Error ? failure.message : "The ordering service is unavailable."); }
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => { if (mounted) void refresh(); });
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => { mounted = false; request.current?.abort(); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("pageshow", onVisible); };
  }, [refresh]);
  return { catalog, error, refresh };
}
