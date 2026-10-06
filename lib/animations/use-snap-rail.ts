"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { HOME_NATIVE_LAYOUT } from "./home-media";

export function useSnapRail(count: number) {
  const railRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const scrollToIndex = useCallback((next: number, focus = false, immediate = false) => {
    const rail = railRef.current;
    if (!rail || !count || !window.matchMedia(HOME_NATIVE_LAYOUT).matches) return;
    const clamped = Math.max(0, Math.min(count - 1, next));
    const item = rail.querySelectorAll<HTMLElement>("[data-rail-item]")[clamped];
    if (!item) return;
    const inset = Number.parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0;
    const left = rail.scrollLeft + item.getBoundingClientRect().left - rail.getBoundingClientRect().left - inset;
    if (focus) item.focus({ preventScroll: true });
    rail.scrollTo({ left, behavior: focus || immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    setIndex(clamped);
  }, [count]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let frame = 0;
    const media = window.matchMedia(HOME_NATIVE_LAYOUT);
    const sync = () => {
      frame = 0;
      if (!media.matches) return;
      const inset = Number.parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0;
      const edge = rail.getBoundingClientRect().left + inset;
      const items = Array.from(rail.querySelectorAll<HTMLElement>("[data-rail-item]"));
      let closest = 0;
      let distance = Infinity;
      items.forEach((item, itemIndex) => {
        const delta = Math.abs(item.getBoundingClientRect().left - edge);
        if (delta < distance) {
          closest = itemIndex;
          distance = delta;
        }
      });
      setIndex(closest);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(sync);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(rail);
    rail.addEventListener("scroll", schedule, { passive: true });
    media.addEventListener("change", schedule);
    schedule();
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      rail.removeEventListener("scroll", schedule);
      media.removeEventListener("change", schedule);
    };
  }, [count]);

  const onFocusCapture = (event: FocusEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    const item = event.target.closest<HTMLElement>("[data-rail-item]");
    if (!rail || !item) return;
    const next = Array.from(rail.querySelectorAll("[data-rail-item]")).indexOf(item);
    if (next >= 0) scrollToIndex(next, false, true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!window.matchMedia(HOME_NATIVE_LAYOUT).matches) return;
    const next = event.key === "ArrowRight" ? index + 1
      : event.key === "ArrowLeft" ? index - 1
      : event.key === "Home" ? 0
      : event.key === "End" ? count - 1 : undefined;
    if (next === undefined) return;
    event.preventDefault();
    scrollToIndex(next, true);
  };

  return { railRef, index, scrollToIndex, onFocusCapture, onKeyDown };
}
