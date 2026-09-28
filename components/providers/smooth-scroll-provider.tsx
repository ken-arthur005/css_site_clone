"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

type SmoothScrollContextValue = {
  setScrollLocked: (locked: boolean) => void;
};

const SmoothScrollContext = createContext<SmoothScrollContextValue | null>(null);

export function useSmoothScroll() {
  const context = useContext(SmoothScrollContext);

  if (!context) {
    throw new Error("useSmoothScroll must be used within SmoothScrollProvider");
  }

  return context;
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const scrollLockedRef = useRef(false);

  const setScrollLocked = useCallback((locked: boolean) => {
    scrollLockedRef.current = locked;

    if (locked) {
      lenisRef.current?.stop();
    } else {
      lenisRef.current?.start();
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let cleanup: (() => void) | undefined;

    const updateSmoothScrolling = () => {
      cleanup?.();
      cleanup = undefined;

      if (!media.matches) {
        return;
      }

      const lenis = new Lenis({
        autoRaf: false,
        lerp: 0.08,
        wheelMultiplier: 0.9,
      });
      const updateScrollTrigger = () => ScrollTrigger.update();
      const raf = (time: number) => lenis.raf(time * 1000);

      lenisRef.current = lenis;
      lenis.on("scroll", updateScrollTrigger);
      gsap.ticker.add(raf);
      ScrollTrigger.refresh();

      if (scrollLockedRef.current) {
        lenis.stop();
      }

      cleanup = () => {
        lenis.off("scroll", updateScrollTrigger);
        gsap.ticker.remove(raf);
        lenis.destroy();
        lenisRef.current = null;
        ScrollTrigger.refresh();
      };
    };

    updateSmoothScrolling();
    media.addEventListener("change", updateSmoothScrolling);

    return () => {
      media.removeEventListener("change", updateSmoothScrolling);
      cleanup?.();
    };
  }, []);

  return (
    <SmoothScrollContext.Provider value={{ setScrollLocked }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
