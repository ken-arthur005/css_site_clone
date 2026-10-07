"use client";

import { useSyncExternalStore } from "react";

const fallbacks = new Set<string>();
const listeners = new Set<() => void>();
const key = (src: string) => decodeURI(src);

export function markHomeAssetFallback(src: string) {
  if (fallbacks.has(key(src))) return;
  fallbacks.add(key(src));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useHomeAssetFallback(src: string) {
  return useSyncExternalStore(subscribe, () => fallbacks.has(key(src)), () => false);
}
