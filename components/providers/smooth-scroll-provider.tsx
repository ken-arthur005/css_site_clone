"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { ScrollPosition } from "@/lib/navigation-scroll";

gsap.registerPlugin(ScrollTrigger);
// Lenis needs elapsed clock time even after a slow frame, rather than GSAP's
// shortened animation clock, or the page can feel stuck catching up.
gsap.ticker.lagSmoothing(0);

type ScrollOptions = { offset?: number; immediate?: boolean; force?: boolean };

type SmoothScrollContextValue = {
  setScrollLocked: (locked: boolean, owner?: string) => void;
  isScrollLocked: boolean;
  scrollToElement: (element: HTMLElement, options?: ScrollOptions) => void;
  scrollToPosition: (position: ScrollPosition) => void;
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
  const pathname = usePathname();
  const isHome = pathname === "/";
  const fullMerchMotion = pathname === "/merch" || pathname.startsWith("/merch/");
  const lenisRef = useRef<Lenis | null>(null);
  const scrollLockedRef = useRef(false);
  const scrollLocksRef = useRef(new Set<string>());
  const [isScrollLocked, setIsScrollLocked] = useState(false);

  const setScrollLocked = useCallback((locked: boolean, owner = "default") => {
    if (locked) scrollLocksRef.current.add(owner);
    else scrollLocksRef.current.delete(owner);
    const active = scrollLocksRef.current.size > 0;
    scrollLockedRef.current = active;
    setIsScrollLocked(active);
    if (active) document.documentElement.dataset.scrollLocked = "true";
    else delete document.documentElement.dataset.scrollLocked;

    if (active) {
      lenisRef.current?.stop();
    } else {
      lenisRef.current?.start();
    }
  }, []);

  const scrollToPosition = useCallback(({ x, y }: ScrollPosition) => {
    // Use the real document dimensions after a route/pin change, even while
    // the transition owns a scroll lock. resize() also resets Lenis momentum.
    const lenis = lenisRef.current;
    window.scrollTo({ left: x, top: y, behavior: "instant" });
    if (lenis) {
      lenis.resize();
      lenis.scrollTo(y, { immediate: true, force: true });
    }
    ScrollTrigger.update();
  }, []);

  const scrollToElement = useCallback((element: HTMLElement, options: ScrollOptions = {}) => {
    const lenis = lenisRef.current;
    const immediate = options.immediate || (!fullMerchMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    if (lenis) {
      if (immediate) lenis.resize();
      // Lenis 1.3 already subtracts CSS scroll-margin for element targets.
      // An explicit offset uses an absolute coordinate to avoid applying both.
      const target = options.offset === undefined ? element : window.scrollY + element.getBoundingClientRect().top + options.offset;
      lenis.scrollTo(target, {
        immediate,
        force: options.force,
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
  }, [fullMerchMotion]);

  useEffect(() => {
    const media = window.matchMedia(
      fullMerchMotion ? "(hover: hover) and (pointer: fine)" : "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
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
        lerp: isHome ? 0.14 : 0.08,
        wheelMultiplier: isHome ? 1 : 0.9,
        respectReducedMotion: !fullMerchMotion,
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
        lenis.stop();
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
  }, [fullMerchMotion, isHome]);

  return (
    <SmoothScrollContext.Provider value={{ scrollToElement, scrollToPosition, setScrollLocked, isScrollLocked }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
