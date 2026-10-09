"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useNavigationState } from "@/components/providers/navigation-state-provider";
import { useRouteTransition } from "@/components/transitions/route-transition-provider";

const MOBILE_AUTOPLAY = "(width < 64rem) and (prefers-reduced-motion: no-preference)";
const SPEED = 22; // CSS pixels per second: leave time to read each event.
const IDLE_DELAY = 3000;

export function useEventRailAutoplay(
  rootRef: RefObject<HTMLElement | null>,
  railRef: RefObject<HTMLDivElement | null>,
  count: number,
) {
  const [paused, setPaused] = useState(false);
  const { isMenuActive } = useNavigationState();
  const { isTransitioning } = useRouteTransition();
  const blockedRef = useRef(false);
  const playbackRef = useRef(() => {});

  useEffect(() => {
    blockedRef.current = paused || isMenuActive || isTransitioning;
    playbackRef.current();
  }, [paused, isMenuActive, isTransitioning]);

  useEffect(() => {
    const root = rootRef.current;
    const rail = railRef.current;
    const track = rail?.querySelector<HTMLElement>(".home-events__track");
    const cards = Array.from(track?.querySelectorAll<HTMLElement>("[data-rail-item]") ?? []);
    if (!root || !rail || !track || count < 2 || cards.length !== count) return;

    const media = window.matchMedia(MOBILE_AUTOPLAY);
    let visible = false;
    let pointerDown = false;
    let interacting = false;
    let running = false;
    let frame = 0;
    let resumeTimer = 0;
    let lastTime = 0;
    let position = rail.scrollLeft;
    let first = 0;
    let stride = 0;

    const measure = () => {
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      stride = cards[0].getBoundingClientRect().width + gap;
      position = rail.scrollLeft;
    };
    const stop = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      running = false;
      delete rail.dataset.autoMoving;
    };
    const tick = (time: number) => {
      // Keep fractional movement even on browsers that round scrollLeft.
      // Capping elapsed time prevents jumps after a stalled frame.
      if (lastTime) position += Math.min(time - lastTime, 50) * SPEED / 1000;
      lastTime = time;
      if (position >= stride) {
        const steps = Math.floor(position / stride);
        first = (first + steps) % count;
        // Recycle only fully offscreen cards. CSS order preserves the original
        // document/keyboard order, and every event keeps its real working link.
        // No cloned cards or second presentation are needed for the loop.
        cards.forEach((card, index) => { card.style.order = String((index - first + count) % count); });
        position -= steps * stride;
      }
      rail.scrollLeft = position;
      frame = window.requestAnimationFrame(tick);
    };
    const sync = () => {
      const active = document.activeElement;
      // A pointer tap can focus a tabindex=-1 card while simply reading it.
      // Only actionable links and keyboard-visible focus hold playback longer
      // than the idle delay; tapping/swiping the card itself must still resume.
      const focused = active instanceof HTMLElement && rail.contains(active)
        && (active.matches("a, button") || active.matches(":focus-visible"));
      const canPlay = media.matches && visible && !document.hidden && !blockedRef.current
        && !pointerDown && !interacting && !focused && stride > 0 && rail.scrollWidth > rail.clientWidth;
      if (!canPlay) { stop(); return; }
      if (running) return;
      running = true;
      rail.dataset.autoMoving = "true";
      position = rail.scrollLeft;
      frame = window.requestAnimationFrame(tick);
    };
    playbackRef.current = sync;

    const idle = () => {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        interacting = false;
        sync();
      }, IDLE_DELAY);
    };
    const isRailInteraction = (event: Event) => event.target instanceof Element
      && Boolean(event.target.closest(".home-events__rail, .home-event-navigation"));
    const interrupt = (event: Event) => {
      if (!media.matches || !isRailInteraction(event)) return;
      interacting = true;
      stop();
      idle();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!media.matches || !isRailInteraction(event)) return;
      pointerDown = true;
      interrupt(event);
    };
    const onPointerUp = () => {
      if (!pointerDown) return;
      pointerDown = false;
      idle();
    };
    const onManualScroll = () => {
      // Include native swipe momentum and control-button smooth scrolling in
      // the idle window, rather than restarting in the middle of a gesture.
      if (!running && interacting) idle();
    };
    const onFocusOut = () => {
      interacting = true;
      stop();
      idle();
    };
    const onMediaChange = () => {
      stop();
      if (!media.matches) {
        cards.forEach((card) => card.style.removeProperty("order"));
        first = 0;
        rail.scrollLeft = 0;
      }
      measure();
      sync();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
      sync();
    }, { threshold: [0, 0.15] });
    const resizeObserver = new ResizeObserver(() => { measure(); sync(); });
    resizeObserver.observe(rail);
    resizeObserver.observe(cards[0]);
    observer.observe(rail);
    root.addEventListener("pointerdown", onPointerDown, true);
    root.addEventListener("click", interrupt, true);
    root.addEventListener("keydown", interrupt, true);
    root.addEventListener("wheel", interrupt, { capture: true, passive: true });
    rail.addEventListener("focusin", sync);
    rail.addEventListener("focusout", onFocusOut);
    rail.addEventListener("scroll", onManualScroll, { passive: true });
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);
    media.addEventListener("change", onMediaChange);
    document.addEventListener("visibilitychange", sync);
    measure();
    sync();

    return () => {
      stop();
      window.clearTimeout(resumeTimer);
      observer.disconnect();
      resizeObserver.disconnect();
      root.removeEventListener("pointerdown", onPointerDown, true);
      root.removeEventListener("click", interrupt, true);
      root.removeEventListener("keydown", interrupt, true);
      root.removeEventListener("wheel", interrupt, true);
      rail.removeEventListener("focusin", sync);
      rail.removeEventListener("focusout", onFocusOut);
      rail.removeEventListener("scroll", onManualScroll);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
      media.removeEventListener("change", onMediaChange);
      document.removeEventListener("visibilitychange", sync);
      cards.forEach((card) => card.style.removeProperty("order"));
      playbackRef.current = () => {};
    };
  }, [count, railRef, rootRef]);

  return { paused, togglePlayback: () => setPaused((value) => !value) };
}
