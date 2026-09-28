"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type TransitionPhase = "idle" | "covering" | "leaving";

type TransitionContextValue = {
  navigate: (href: string, label?: string) => void;
  isTransitioning: boolean;
};

const TransitionContext = createContext<TransitionContextValue | null>(null);

export function useRouteTransition() {
  const context = useContext(TransitionContext);

  if (!context) {
    throw new Error("useRouteTransition must be used within RouteTransitionProvider");
  }

  return context;
}

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [label, setLabel] = useState("");
  const pathnameRef = useRef(pathname);
  const isProgrammaticNavigation = useRef(false);
  const releaseTimeout = useRef<number | null>(null);
  const failSafeTimeout = useRef<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (pathname === pathnameRef.current) {
      return;
    }

    pathnameRef.current = pathname;

    if (failSafeTimeout.current) {
      window.clearTimeout(failSafeTimeout.current);
      failSafeTimeout.current = null;
    }

    if (reducedMotion) {
      isProgrammaticNavigation.current = false;
      return;
    }

    // Back/Forward reaches the destination before React can intercept it.
    // A brief pass over the new route keeps that path visually coherent.
    if (!isProgrammaticNavigation.current) {
      setPhase("covering");
      releaseTimeout.current = window.setTimeout(() => setPhase("leaving"), 40);
    } else {
      setPhase("leaving");
      isProgrammaticNavigation.current = false;
    }
  }, [pathname, reducedMotion]);

  useEffect(() => {
    if (phase !== "leaving") {
      return;
    }

    releaseTimeout.current = window.setTimeout(() => setPhase("idle"), 260);
    return () => {
      if (releaseTimeout.current) {
        window.clearTimeout(releaseTimeout.current);
      }
    };
  }, [phase]);

  useEffect(
    () => () => {
      if (releaseTimeout.current) {
        window.clearTimeout(releaseTimeout.current);
      }
      if (failSafeTimeout.current) {
        window.clearTimeout(failSafeTimeout.current);
      }
    },
    [],
  );

  const navigate = (href: string, destinationLabel = "") => {
    if (isProgrammaticNavigation.current || href === pathname) {
      return;
    }

    if (reducedMotion) {
      router.push(href);
      return;
    }

    setLabel(destinationLabel);
    setPhase("covering");
    isProgrammaticNavigation.current = true;

    window.setTimeout(() => router.push(href), 190);

    // Never make a failed or slow navigation look like a loading screen.
    failSafeTimeout.current = window.setTimeout(() => {
      isProgrammaticNavigation.current = false;
      setPhase("leaving");
    }, 700);
  };

  return (
    <TransitionContext.Provider
      value={{ navigate, isTransitioning: phase !== "idle" }}
    >
      {children}
      <div
        aria-hidden="true"
        className="route-transition"
        data-phase={phase}
      >
        <div className="route-transition__panel">
          {label && <span className="route-transition__label">{label}</span>}
        </div>
      </div>
    </TransitionContext.Provider>
  );
}
