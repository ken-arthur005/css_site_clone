"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useNavigationState } from "@/components/providers/navigation-state-provider";
import type { HomeQuote } from "@/types/home";

gsap.registerPlugin(useGSAP);

export function HomeQuoteBridge({ author, quote, panel = false }: HomeQuote & { panel?: boolean }) {
  const rootRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLSpanElement>(null);
  const blockedRef = useRef(false);
  const playbackRef = useRef(() => {});
  const { isMenuActive } = useNavigationState();

  useEffect(() => {
    blockedRef.current = isMenuActive;
    playbackRef.current();
  }, [isMenuActive]);

  useGSAP(() => {
    const root = rootRef.current;
    const visual = visualRef.current;
    const figure = root?.querySelector("figure");
    const caption = root?.querySelector("figcaption");
    if (!root || !visual || !figure || !caption) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let started = false;
    let finished = false;
    let visible = false;
    let previousCount = -1;
    const progress = { count: 0 };
    visual.textContent = "";
    root.dataset.typing = "waiting";
    const timeline = gsap.timeline({ paused: true, onComplete: () => {
      finished = true;
      visual.textContent = quote;
      root.dataset.typing = "complete";
    } });
    timeline.fromTo(figure, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" })
      .to(progress, {
        count: quote.length, duration: Math.min(2.6, Math.max(0.9, quote.length * 0.022)), ease: "none",
        onUpdate: () => {
          const count = Math.floor(progress.count);
          if (count !== previousCount) { previousCount = count; visual.textContent = quote.slice(0, count); }
        },
      }, 0.08)
      .fromTo(caption, { opacity: 0 }, { opacity: 1, duration: 0.25 }, "-=0.18");

    const finish = () => { timeline.progress(1).pause(); };
    const sync = () => {
      if (preference.matches) { finish(); return; }
      if (finished) return;
      if (visible && !blockedRef.current && !document.hidden) {
        if (!started) { started = true; root.dataset.typing = "typing"; }
        timeline.resume();
      } else timeline.pause();
    };
    playbackRef.current = sync;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.45;
      sync();
    }, { threshold: [0, 0.45] });
    observer.observe(figure);
    preference.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      playbackRef.current = () => {};
      timeline.kill();
      visual.textContent = quote;
      delete root.dataset.typing;
    };
  }, { scope: rootRef, dependencies: [quote], revertOnUpdate: true });

  return <section className={`home-quote-bridge${panel ? " home-quote-bridge--panel" : ""}`} ref={rootRef}>
    <div className="page-shell home-quote-bridge__inner">
      <figure>
        <blockquote>
          <span className="home-quote-bridge__source">{quote}</span>
          <span className="home-quote-bridge__visual" aria-hidden="true" ref={visualRef}>{quote}</span>
        </blockquote>
        <figcaption>{author}</figcaption>
      </figure>
    </div>
  </section>;
}
