"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import Typed from "typed.js";
import { useNavigationState } from "@/components/providers/navigation-state-provider";

gsap.registerPlugin(useGSAP);

const heroWords = ["THINK", "BUILD", "BECOME"];
const heroMarkup = heroWords.map((word) => `<span class="home-hero__title-line">${word}</span>`).join("");

export function HomeHeroTyping({ enabled }: { enabled: boolean }) {
  const { isMenuActive } = useNavigationState();
  const rootRef = useRef<HTMLHeadingElement>(null);
  const visualRef = useRef<HTMLSpanElement>(null);
  const blockedRef = useRef(false);
  const syncPlaybackRef = useRef(() => {});
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    blockedRef.current = paused || isMenuActive;
    syncPlaybackRef.current();
  }, [paused, isMenuActive]);

  useGSAP(() => {
    const root = rootRef.current;
    const visual = visualRef.current;
    if (!root || !visual || !enabled) return;

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      let visible = root.getBoundingClientRect().bottom > 0;
      visual.innerHTML = "";
      root.dataset.typingEnabled = "true";
      const typed = new Typed(visual, {
        strings: [heroMarkup],
        typeSpeed: 65,
        backSpeed: 25,
        backDelay: 2200,
        startDelay: 120,
        smartBackspace: false,
        loop: true,
        showCursor: false,
        autoInsertCss: false,
        contentType: "html",
      });
      const sync = () => {
        if (visible && !blockedRef.current && !document.hidden) typed.start();
        else typed.stop();
      };
      syncPlaybackRef.current = sync;
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      }, { threshold: 0.1 });
      observer.observe(root);
      document.addEventListener("visibilitychange", sync);
      sync();
      return () => {
        observer.disconnect();
        document.removeEventListener("visibilitychange", sync);
        syncPlaybackRef.current = () => {};
        typed.destroy();
        visual.innerHTML = heroMarkup;
        delete root.dataset.typingEnabled;
      };
    });
    return () => media.revert();
  }, { scope: rootRef, dependencies: [enabled], revertOnUpdate: true });

  return <div className="home-hero__headline">
    <h1 aria-label="Think. Build. Become." className="home-hero__title" id="home-title" ref={rootRef}>
      <span className="home-typing__source" aria-hidden="true">
        {heroWords.map((word) => <span className="home-hero__title-line" key={word}>{word}</span>)}
      </span>
      <span className="home-typing__visual" aria-hidden="true" ref={visualRef} dangerouslySetInnerHTML={{ __html: heroMarkup }} />
    </h1>
    <button className="home-hero__typing-control" type="button" aria-controls="home-title" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
      <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span> {paused ? "Resume typing" : "Pause typing"}
    </button>
  </div>;
}

function headingMarkup(lines: readonly string[]) {
  return lines.map((line) => `<span>${line.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</span>`).join("");
}

export function HomeSocietyHeading({ lines }: { lines: readonly string[] }) {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const visualRef = useRef<HTMLSpanElement>(null);
  const { isMenuActive } = useNavigationState();
  const typedRef = useRef<Typed | null>(null);
  const menuRef = useRef(false);
  const markup = headingMarkup(lines);

  useEffect(() => {
    menuRef.current = isMenuActive;
    if (isMenuActive) typedRef.current?.stop();
    else typedRef.current?.start();
  }, [isMenuActive]);

  useGSAP(() => {
    const root = rootRef.current;
    const visual = visualRef.current;
    if (!root || !visual) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      let finished = false;
      let started = false;
      visual.innerHTML = "";
      const finish = () => {
        finished = true;
        typedRef.current?.destroy();
        typedRef.current = null;
        visual.innerHTML = markup;
        root.dataset.typing = "complete";
      };
      root.dataset.typing = "waiting";
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting || started || finished) return;
        started = true;
        root.dataset.typing = "typing";
        typedRef.current = new Typed(visual, {
          strings: [markup], typeSpeed: 24, showCursor: false,
          autoInsertCss: false, contentType: "html",
          onComplete: () => { root.dataset.typing = "complete"; },
        });
        if (menuRef.current) typedRef.current.stop();
        observer.disconnect();
      }, { threshold: 0.35 });
      observer.observe(root);
      // Fast scrolling should reveal the scene, not wait for a typing timer.
      root.addEventListener("home:typing-finish", finish, { once: true });
      return () => {
        observer.disconnect();
        root.removeEventListener("home:typing-finish", finish);
        typedRef.current?.destroy();
        typedRef.current = null;
        visual.innerHTML = markup;
        delete root.dataset.typing;
      };
    });
    return () => media.revert();
  }, { scope: rootRef, dependencies: [markup], revertOnUpdate: true });

  return <h2 className="home-about__society-heading" aria-label={lines.join(" ")} ref={rootRef}>
    <span className="home-typing__source" aria-hidden="true">{lines.map((line) => <span key={line}>{line}</span>)}</span>
    <span className="home-typing__visual" aria-hidden="true" ref={visualRef} dangerouslySetInnerHTML={{ __html: markup }} />
  </h2>;
}
