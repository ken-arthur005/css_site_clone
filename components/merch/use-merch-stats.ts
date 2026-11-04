"use client";

import { useEffect, useState } from "react";
import { EMPTY_STATS, type MerchStats } from "@/lib/merch/stats";

const REFRESH_MS = 5 * 60 * 1000;

/** Real order counts, refreshed every five minutes while the page is visible. */
export function useMerchStats(): MerchStats {
  const [stats, setStats] = useState<MerchStats>(EMPTY_STATS);
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (document.hidden) return;
      fetch("/api/merch/stats").then((response) => response.json()).then((data: MerchStats) => { if (!cancelled && data && typeof data === "object") setStats(data); }).catch(() => {});
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);
  return stats;
}
