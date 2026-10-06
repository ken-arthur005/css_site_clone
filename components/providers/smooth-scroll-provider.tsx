"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

type ScrollOptions = { offset?: number; immediate?: boolean };

type SmoothScrollContextValue = {
  setScrollLocked: (locked: boolean) => void;
  scrollToElement: (element: HTMLElement, options?: ScrollOptions) => void;
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

  const scrollToElement = useCallback((element: HTMLElement, options: ScrollOptions = {}) => {
    const lenis = lenisRef.current;
    const immediate = options.immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (lenis) {
      // Lenis 1.3 already subtracts CSS scroll-margin for element targets.
      // An explicit offset uses an absolute coordinate to avoid applying both.
      const target = options.offset === undefined ? element : window.scrollY + element.getBoundingClientRect().top + options.offset;
      lenis.scrollTo(target, {
        immediate,
        duration: 0.9,
        easing: (progress) => 1 - (1 - progress) ** 4,
      });
      return;
    }

    if (options.offset !== undefined) {
      window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top + options.offset, behavior: immediate ? "instant" : "smooth" });
    } else {
      element.scrollIntoView({ behavior: immediate ? "instant" : "smooth", block: "start" });
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
    <SmoothScrollContext.Provider value={{ scrollToElement, setScrollLocked }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
