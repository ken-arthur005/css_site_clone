"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigationState } from "@/components/providers/navigation-state-provider";
import type { AboutPhoto as Photo } from "@/types/about";
import { AboutPhoto } from "./about-photo";

export function AboutChampionSlideshow({ photos }: { photos: readonly Photo[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(new Set<number>());
  const activeRef = useRef(0);
  const menuRef = useRef(false);
  const syncRef = useRef<(() => void) | null>(null);
  const [active, setActive] = useState(0);
  const [near, setNear] = useState(false);
  const { isMenuActive } = useNavigationState();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || photos.length < 2) return;
    let visible = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
      if (!visible || document.hidden || menuRef.current) return;
      timer = setInterval(() => {
        const next = (activeRef.current + 1) % photos.length;
        // Keep the current image until the next image has decoded (or produced
        // its descriptive fallback), rather than crossfading into a blank frame.
        if (!readyRef.current.has(next)) return;
        activeRef.current = next;
        setActive(next);
      }, 3000);
    };
    syncRef.current = sync;
    const loading = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setNear(true);
    }, { rootMargin: "400px" });
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    loading.observe(root);
    visibility.observe(root);
    document.addEventListener("visibilitychange", sync);
    return () => {
      if (timer) clearInterval(timer);
      syncRef.current = null;
      loading.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [photos]);

  useEffect(() => {
    menuRef.current = isMenuActive;
    syncRef.current?.();
  }, [isMenuActive]);

  return (
    <div className="about-champion-slideshow" ref={rootRef} role="group" aria-label="CSS Games celebrations">
      {photos.map((photo, index) => (near || index === 0) && (
        <div className="about-champion-slideshow__slide" key={photo.src} data-active={active === index} aria-hidden={active !== index}>
          <AboutPhoto photo={photo} hoverZoom={false} onReady={() => readyRef.current.add(index)} />
        </div>
      ))}
    </div>
  );
}
