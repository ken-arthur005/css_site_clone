"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSmoothScroll } from "@/components/providers/smooth-scroll-provider";
import { getRouteLabel } from "@/lib/animations/route-label";
import { getHashTarget, HISTORY_ENTRY_KEY, readScrollPositions, saveScrollPositions, type ScrollPosition } from "@/lib/navigation-scroll";

gsap.registerPlugin(useGSAP);

const ROUTE_WAIT_LIMIT = 4000;
type TransitionContextValue = { navigate: (href: string, label?: string) => void; isTransitioning: boolean };
type Coordinator = { navigate: (href: string, label?: string) => void; commit: (pathname: string) => void };
type Transaction = {
  id: number;
  href: string;
  pathname: string;
  label: string;
  committed: boolean;
  stamped: boolean;
  finishing: boolean;
  context: gsap.Context | null;
  origin: HTMLElement | null;
  restorePosition?: ScrollPosition;
};

const TransitionContext = createContext<TransitionContextValue | null>(null);

export function useRouteTransition() {
  const context = useContext(TransitionContext);
  if (!context) throw new Error("useRouteTransition must be used within RouteTransitionProvider");
  return context;
}

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setScrollLocked, scrollToPosition, scrollToElement } = useSmoothScroll();
  const scrollToElementRef = useRef(scrollToElement);
  useEffect(() => { scrollToElementRef.current = scrollToElement; }, [scrollToElement]);
  const rootRef = useRef<HTMLDivElement>(null);
  const announcementRef = useRef<HTMLParagraphElement>(null);
  const coordinatorRef = useRef<Coordinator | null>(null);
  const pathnameRef = useRef(pathname);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [notice, setNotice] = useState("");
  const navigate = useCallback((href: string, label?: string) => coordinatorRef.current?.navigate(href, label), []);
  const value = useMemo(() => ({ navigate, isTransitioning }), [navigate, isTransitioning]);

  useGSAP((parentContext) => {
    const root = rootRef.current;
    if (!root) return;
    const panel = root.querySelector<HTMLElement>(".route-transition__panel")!;
    const shade = root.querySelector<HTMLElement>(".route-transition__shade")!;
    const lockup = root.querySelector<HTMLElement>(".route-transition__lockup")!;
    const mark = root.querySelector<HTMLElement>(".route-transition__mark")!;
    const pulse = root.querySelector<HTMLElement>(".route-transition__pulse")!;
    const title = root.querySelector<HTMLElement>(".route-transition__label")!;
    const titleWindow = root.querySelector<HTMLElement>(".route-transition__label-window")!;
    const hint = root.querySelector<HTMLElement>(".route-transition__hint")!;
    let active: Transaction | null = null;
    let lateDestination: Transaction | null = null;
    let sequence = 0;
    let disposed = false;
    let waitTimer = 0;
    let hintTimer = 0;
    let focusFrame = 0;
    let fitFrame = 0;
    let positionFrame = 0;
    let initialPositionPending = true;
    let restoreFocus: (() => void) | undefined;
    const positions = readScrollPositions();
    const entryKey = () => {
      const state = window.history.state ?? {};
      const stored = state[HISTORY_ENTRY_KEY] as { id: string; href: string } | undefined;
      if (stored?.href === window.location.href) return stored.id;
      const id = typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      const entry = { id, href: window.location.href };
      // Preserve the router's state and identify this entry without adding a
      // history item. The href also distinguishes query/hash-only entries.
      window.history.replaceState({ ...state, [HISTORY_ENTRY_KEY]: entry }, "");
      return entry.id;
    };
    let currentEntry = entryKey();
    const position = () => ({ x: window.scrollX, y: window.scrollY });
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const initialPosition = navigation?.type === "back_forward" ? positions.get(currentEntry) : undefined;
    if (!initialPosition) positions.set(currentEntry, position());
    const capturePosition = () => {
      // Opening the menu changes scrollbar geometry. Save the browsing position,
      // not any scroll anchoring caused by a navigation lock.
      if (active || initialPositionPending || document.documentElement.dataset.scrollLocked === "true" || window.location.pathname !== pathnameRef.current) return;
      currentEntry = entryKey();
      positions.set(currentEntry, position());
    };
    const followDestination = (restorePosition?: ScrollPosition) => {
      if (restorePosition) scrollToPosition(restorePosition);
      else {
        const target = getHashTarget();
        if (target) {
          // An anchor may point into a collapsed About chapter.
          const details = target.closest("details");
          if (details) details.open = true;
          scrollToElementRef.current(target, { immediate: true, force: true });
        } else scrollToPosition({ x: 0, y: 0 });
      }
      currentEntry = entryKey();
      positions.set(currentEntry, position());
    };
    const schedulePosition = (restorePosition?: ScrollPosition) => {
      cancelAnimationFrame(positionFrame);
      positionFrame = requestAnimationFrame(() => {
        positionFrame = requestAnimationFrame(() => {
          positionFrame = 0;
          if (!disposed && !active) followDestination(restorePosition);
        });
      });
    };
    const applyInitialPosition = () => {
      positionFrame = 0;
      if (disposed || !initialPositionPending) return;
      initialPositionPending = false;
      followDestination(initialPosition);
    };
    // Layout effects create the initial pins before this frame. Fonts can then
    // change their geometry; align once more, unless the visitor has interacted.
    if (!initialPosition) scrollToPosition({ x: 0, y: 0 });
    void document.fonts.ready.then(() => {
      if (disposed || !initialPositionPending) return;
      positionFrame = requestAnimationFrame(() => {
        positionFrame = requestAnimationFrame(applyInitialPosition);
      });
    });
    const recordInteraction = () => {
      initialPositionPending = false;
      cancelAnimationFrame(positionFrame);
      positionFrame = 0;
    };
    const persistPositions = () => { capturePosition(); saveScrollPositions(positions); };
    const onVisibilityChange = () => { if (document.visibilityState === "hidden") persistPositions(); };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) schedulePosition(positions.get(entryKey()));
    };

    const phase = (name: string) => { root.dataset.phase = name; };
    const announce = (message: string) => { if (announcementRef.current) announcementRef.current.textContent = message; };
    const clearWait = () => { window.clearTimeout(waitTimer); window.clearTimeout(hintTimer); };
    const fitTitle = () => {
      fitFrame = 0;
      title.style.fontSize = "";
      const available = titleWindow.clientWidth;
      if (!available || !title.textContent) return;
      const size = Number.parseFloat(getComputedStyle(title).fontSize);
      if (title.scrollWidth > available) title.style.fontSize = `${size * (available - 4) / title.scrollWidth}px`;
      root.dataset.smallTitle = String(Number.parseFloat(getComputedStyle(title).fontSize) < 24);
    };
    const scheduleFit = () => { if (!fitFrame) fitFrame = requestAnimationFrame(fitTitle); };
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(titleWindow);
    void document.fonts.ready.then(() => { if (!disposed) scheduleFit(); });

    const focusDestination = (id: number) => {
      cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(() => {
        if (disposed || active || id !== sequence || document.documentElement.dataset.scrollLocked === "true") return;
        const main = document.querySelector<HTMLElement>("main");
        const target = getHashTarget() ?? main?.querySelector<HTMLElement>("h1") ?? main;
        if (!target || target.closest("[inert]")) return;
        restoreFocus?.();
        const previous = target.getAttribute("tabindex");
        target.tabIndex = -1;
        const restore = () => {
          target.removeEventListener("blur", restore);
          if (previous === null) target.removeAttribute("tabindex");
          else target.setAttribute("tabindex", previous);
        };
        restoreFocus = restore;
        target.addEventListener("blur", restore, { once: true });
        target.focus({ preventScroll: true });
      });
    };

    const finish = (transaction: Transaction) => {
      if (disposed || active !== transaction) return;
      clearWait();
      transaction.context?.kill(false);
      // Reassert after destination effects/old pin teardown, before uncovering
      // the page. Failed navigation must leave the source position untouched.
      if (transaction.committed) followDestination(transaction.restorePosition);
      root.style.opacity = "0";
      root.style.visibility = "hidden";
      root.style.pointerEvents = "none";
      phase("idle");
      active = null;
      setScrollLocked(false, "route-transition");
      setIsTransitioning(false);
      if (transaction.committed) {
        // Releasing overflow/inert can resize pinned layouts and anchor the
        // document. Settle the same intent after that commit, unless interrupted.
        schedulePosition(transaction.restorePosition);
        lateDestination = null;
        setNotice("");
        announce(`${transaction.label} opened.`);
        focusDestination(transaction.id);
      } else {
        const origin = transaction.origin;
        if (origin?.isConnected && !origin.closest("[inert]") && getComputedStyle(origin).visibility === "visible") origin.focus({ preventScroll: true });
      }
    };

    const leave = (transaction: Transaction, recover = false) => {
      if (disposed || active !== transaction || transaction.finishing) return;
      transaction.finishing = true;
      clearWait();
      if (recover) {
        lateDestination = transaction;
        hint.textContent = "Opening in the background.";
        announce("");
        setNotice(`Opening ${transaction.label} is taking longer. You can keep browsing.`);
      }
      transaction.context?.add(() => {
        phase(recover ? "recovering" : "clicking");
        const exit = gsap.timeline({ onComplete: () => finish(transaction) });
        if (!recover) {
          exit
            .fromTo(pulse, { autoAlpha: 0.9, scale: 0.45 }, { autoAlpha: 0, scale: 1.8, duration: 0.22, ease: "power2.out" }, 0)
            .to(mark, { scale: 0.975, duration: 0.065, ease: "power2.in" }, 0)
            .to(mark, { scale: 1, duration: 0.1, ease: "power3.out" }, 0.065);
        }
        const release = recover ? 0 : 0.12;
        exit
          .call(() => {
            if (transaction.committed) followDestination(transaction.restorePosition);
            phase("revealing");
          }, [], release)
          .to(lockup, { y: -12, duration: 0.36, ease: "power2.in" }, release)
          .to(panel, { xPercent: -112, duration: 0.42, ease: "power3.inOut" }, release)
          .to(shade, { autoAlpha: 0, duration: 0.18 }, release + 0.12);
      });
    };
    const maybeLeave = () => {
      if (active?.committed && active.stamped && !active.finishing) leave(active);
    };
    const cancel = () => {
      clearWait();
      active?.context?.kill(false);
      active = null;
      root.style.visibility = "hidden";
      root.style.opacity = "0";
      root.style.pointerEvents = "none";
      setScrollLocked(false, "route-transition");
      setIsTransitioning(false);
      phase("idle");
    };

    const begin = (href: string, supplied?: string, history = false, committed = false) => {
      if (disposed || (active && !history)) return;
      const destination = new URL(href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (!history && !committed && destination.pathname === pathnameRef.current) return;
      if (active) cancel();
      if (!history) capturePosition();
      recordInteraction();
      saveScrollPositions(positions);
      clearWait();
      cancelAnimationFrame(focusFrame);
      restoreFocus?.();
      restoreFocus = undefined;
      lateDestination = null;
      setNotice("");
      const transaction: Transaction = {
        id: ++sequence, href, pathname: destination.pathname,
        label: getRouteLabel(destination.pathname, supplied),
        committed, stamped: false, finishing: false, context: null,
        origin: document.activeElement instanceof HTMLElement ? document.activeElement : null,
        restorePosition: history ? positions.get(entryKey()) : undefined,
      };
      active = transaction;
      title.textContent = transaction.label;
      hint.textContent = "Opening your next chapter.";
      root.dataset.destination = transaction.pathname;
      root.dataset.navigation = history ? "history" : "link";
      root.dataset.result = "pending";
      phase("covering");
      setScrollLocked(true, "route-transition");
      setIsTransitioning(true);
      fitTitle();
      announce(`Opening ${transaction.label}.`);

      // Every navigation owns a scoped context. Completed contexts are cleared
      // instead of accumulating timelines in the persistent provider.
      parentContext.ignore(() => {
        transaction.context = gsap.context(() => {
          gsap.set(root, { autoAlpha: 1, pointerEvents: "auto" });
          // Normalize the stylesheet's initial percentage transform before
          // GSAP owns it; otherwise its computed pixel offset is added twice.
          gsap.set(panel, { x: 0, y: 0, xPercent: 112 });
          gsap.set(shade, { autoAlpha: 0 });
          gsap.set(lockup, { y: 0, opacity: 1 });
          gsap.set(mark, { autoAlpha: 0, y: -22, scale: 1.07 });
          gsap.set(title, { autoAlpha: 0, yPercent: 115 });
          gsap.set(pulse, { autoAlpha: 0, x: 0, y: 0, xPercent: -50, yPercent: -50, scale: 0.45 });
          gsap.timeline({ onComplete: () => {
            if (disposed || active !== transaction) return;
            transaction.stamped = true;
            phase("holding");
            maybeLeave();
          } })
            .to(shade, { autoAlpha: 0.12, duration: 0.18 }, 0)
            .to(panel, { xPercent: 0, duration: 0.28, ease: "power3.inOut" }, 0)
            .call(() => {
              if (disposed || active !== transaction) return;
              phase("stamping");
              if (!history && !committed) {
                // The coordinator, not Next's DOM visibility heuristic, owns
                // the destination position beneath this transition.
                try { router.push(transaction.href, { scroll: false }); }
                catch { root.dataset.result = "error"; leave(transaction, true); }
              }
            }, [], 0.28)
            .to(mark, { autoAlpha: 1, y: 0, scale: 1, duration: 0.12, ease: "power3.in" }, 0.18)
            .to(mark, { scaleX: 1.025, scaleY: 0.955, duration: 0.045, ease: "power2.out" }, 0.30)
            .to(mark, { scaleX: 1, scaleY: 1, duration: 0.085, ease: "power3.out" }, 0.345)
            .to(title, { autoAlpha: 1, yPercent: 0, duration: 0.22, ease: "power3.out" }, 0.21);
        }, root);
      });
      if (!committed) {
        hintTimer = window.setTimeout(() => {
          if (active === transaction && !transaction.committed) hint.textContent = "Taking a moment. Still opening…";
        }, 1200);
        waitTimer = window.setTimeout(() => {
          if (active !== transaction || transaction.committed) return;
          root.dataset.result = "timeout";
          leave(transaction, true);
        }, ROUTE_WAIT_LIMIT);
      }
    };

    const commit = (nextPathname: string) => {
      if (disposed) return;
      currentEntry = entryKey();
      setNotice("");
      if (active) {
        // A server redirect is still the same navigation transaction.
        if (active.pathname !== nextPathname) {
          active.pathname = nextPathname;
          active.label = getRouteLabel(nextPathname);
          title.textContent = active.label;
          root.dataset.destination = nextPathname;
          fitTitle();
        }
        active.committed = true;
        root.dataset.result = "committed";
        clearWait();
        maybeLeave();
      } else if (lateDestination) {
        schedulePosition(lateDestination.restorePosition);
        lateDestination = null;
        announce(`${getRouteLabel(nextPathname)} opened.`);
        focusDestination(sequence);
      } else {
        // Replacements not initiated by a TransitionLink receive the same
        // treatment after commit, without pushing another history entry.
        begin(window.location.href, undefined, false, true);
        root.dataset.result = "committed";
      }
    };
    const onPopState = () => {
      recordInteraction();
      if (window.location.pathname === pathnameRef.current) {
        if (active) cancel();
        currentEntry = entryKey();
        // Same-page query/hash history has no route commit to trigger finish.
        schedulePosition(positions.get(currentEntry));
        return;
      }
      begin(`${window.location.pathname}${window.location.search}${window.location.hash}`, undefined, true);
    };
    const onHashChange = () => {
      if (active || positionFrame) return;
      recordInteraction();
      schedulePosition(positions.get(entryKey()));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!active) return;
      if (event.key === "Tab") event.preventDefault();
      if (event.key === "Escape" && active.stamped && !active.committed) {
        event.preventDefault();
        root.dataset.result = "released";
        leave(active, true);
      }
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("scroll", capturePosition, { passive: true });
    window.addEventListener("pagehide", persistPositions);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("wheel", recordInteraction, { passive: true });
    window.addEventListener("touchstart", recordInteraction, { passive: true });
    window.addEventListener("pointerdown", recordInteraction, { passive: true });
    window.addEventListener("keydown", recordInteraction);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("keydown", onKeyDown, true);
    const coordinator = { navigate: (href: string, label?: string) => begin(href, label), commit };
    coordinatorRef.current = coordinator;

    return () => {
      disposed = true;
      clearWait();
      active?.context?.revert();
      active = null;
      observer.disconnect();
      cancelAnimationFrame(fitFrame);
      cancelAnimationFrame(focusFrame);
      cancelAnimationFrame(positionFrame);
      restoreFocus?.();
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("scroll", capturePosition);
      window.removeEventListener("pagehide", persistPositions);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("wheel", recordInteraction);
      window.removeEventListener("touchstart", recordInteraction);
      window.removeEventListener("pointerdown", recordInteraction);
      window.removeEventListener("keydown", recordInteraction);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("keydown", onKeyDown, true);
      setScrollLocked(false, "route-transition");
      if (coordinatorRef.current === coordinator) coordinatorRef.current = null;
    };
  }, { scope: rootRef, dependencies: [router, setScrollLocked, scrollToPosition], revertOnUpdate: true });

  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    coordinatorRef.current?.commit(pathname);
  }, [pathname]);

  return (
    <TransitionContext.Provider value={value}>
      {children}
      <p className="sr-only" role="status" ref={announcementRef} />
      {notice && <div className="route-transition__notice" role="status"><p>{notice}</p><button type="button" aria-label="Dismiss navigation message" onClick={() => setNotice("")}>×</button></div>}
      <div aria-hidden="true" className="route-transition" data-phase="idle" ref={rootRef}>
        <div className="route-transition__shade" />
        <div className="route-transition__panel">
          <div className="route-transition__inner">
            <div className="route-transition__meta"><span>CSS / KNUST</span><span>Computer Science Society</span></div>
            <div className="route-transition__lockup">
              <div className="route-transition__stamp">
                <Image alt="" className="route-transition__mark" src="/css_logo.svg" width={370} height={192} priority />
                <span className="route-transition__pulse" />
              </div>
              <div className="route-transition__label-window"><span className="route-transition__label" /></div>
            </div>
            <div className="route-transition__footer"><span className="route-transition__hint">Opening your next chapter.</span><span>/&gt;</span></div>
          </div>
        </div>
      </div>
    </TransitionContext.Provider>
  );
}
