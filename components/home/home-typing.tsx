"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import Typed from "typed.js";
import { useNavigationState } from "@/components/providers/navigation-state-provider";

gsap.registerPlugin(useGSAP);

const heroWords = ["THINK", "BUILD", "BECOME"];
const heroText = heroWords.join("\n");

export function HomeHeroTyping({ enabled }: { enabled: boolean }) {
  const { isMenuActive } = useNavigationState();
  const rootRef = useRef<HTMLHeadingElement>(null);
  const visualRef = useRef<HTMLSpanElement>(null);
  const prefixRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
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
    const prefix = prefixRef.current;
    const target = targetRef.current;
    if (!root || !visual || !prefix || !target || !enabled) return;

    let disposed = false;
    let startedAt = 0;
    let phase: "idle" | "typing" | "holding" = "idle";
    let typed: Typed | null = null;
    prefix.textContent = "";
    target.textContent = "";
    root.dataset.typingEnabled = "true";
    root.dataset.typing = "waiting";

    const erase = { count: heroText.length };
    const cycle = gsap.timeline({
      paused: true,
      onComplete: () => {
        cycle.pause(0);
        phase = "idle";
        sync();
      },
    });
    cycle.to({}, { duration: 2.2 })
      .fromTo(erase, { count: heroText.length }, {
        count: 0, duration: 0.42, ease: "none", immediateRender: false,
        onStart: () => { root.dataset.typing = "erasing"; },
        onUpdate: () => { prefix.textContent = heroText.slice(0, Math.floor(erase.count)); },
      });

    const finishTyping = () => {
      if (disposed) return;
      typed?.destroy();
      typed = null;
      prefix.textContent = heroText;
      target.textContent = "";
      phase = "holding";
      root.dataset.typing = "complete";
      root.dataset.typingDuration = String(Math.round(performance.now() - startedAt));
      cycle.play(0);
      sync();
    };
    const typeRemaining = () => {
      const remaining = heroText.slice((prefix.textContent ?? "").length);
      if (!remaining) { finishTyping(); return; }
      typed = new Typed(target, {
        strings: [remaining], typeSpeed: 90,
        startDelay: prefix.textContent ? 0 : 80,
        showCursor: false, autoInsertCss: false, contentType: "null",
        onComplete: finishTyping,
      });
    };

    const sync = () => {
      if (disposed) return;
      const bounds = root.getBoundingClientRect();
      const running = bounds.bottom > 0 && bounds.top < window.innerHeight && !blockedRef.current && !document.hidden;
      if (running) {
        if (phase === "idle") {
          phase = "typing";
          startedAt = performance.now();
          root.dataset.typing = "typing";
          prefix.textContent = "";
          typeRemaining();
        } else if (phase === "typing" && !typed) typeRemaining();
        else if (phase === "holding") cycle.resume();
      } else {
        cycle.pause();
        if (typed) {
          // Preserve the exact prefix and cancel Typed's sole timeout. Starting
          // a fresh tail on resume avoids stop/start races during initial delays
          // and the completed-word hold, including browser restoration.
          const printed = visual.textContent ?? "";
          typed.destroy();
          typed = null;
          prefix.textContent = printed;
        }
      }
    };
    syncPlaybackRef.current = sync;
    const observer = new IntersectionObserver(sync, { threshold: 0.1 });
    observer.observe(root);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("pageshow", sync);
    sync();
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("pageshow", sync);
      syncPlaybackRef.current = () => {};
      typed?.destroy();
      prefix.textContent = heroText;
      target.textContent = "";
      delete root.dataset.typingEnabled;
      delete root.dataset.typing;
      delete root.dataset.typingDuration;
    };
  }, { scope: rootRef, dependencies: [enabled], revertOnUpdate: true });

  return <div className="home-hero__headline">
    <h1 aria-label="Think. Build. Become." className="home-hero__title" id="home-title" ref={rootRef}>
      <span className="home-typing__source" aria-hidden="true">
        {heroWords.map((word) => <span className="home-hero__title-line" key={word}>{word}</span>)}
      </span>
      <span className="home-typing__visual" aria-hidden="true" ref={visualRef}><span ref={prefixRef}>{heroText}</span><span ref={targetRef} /></span>
    </h1>
    <button className="home-hero__typing-control" type="button" aria-controls="home-title" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
      <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span> {paused ? "Resume typing" : "Pause typing"}
    </button>
  </div>;
}

export function HomeSocietyHeading({ lines }: { lines: readonly string[] }) {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const revealRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const textRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const { isMenuActive } = useNavigationState();
  const blockedRef = useRef(false);
  const syncPlaybackRef = useRef(() => {});

  useEffect(() => {
    blockedRef.current = isMenuActive;
    syncPlaybackRef.current();
  }, [isMenuActive]);

  useGSAP(() => {
    const root = rootRef.current;
    const reveals = revealRefs.current.filter((element): element is HTMLSpanElement => element !== null);
    const texts = textRefs.current.filter((element): element is HTMLSpanElement => element !== null);
    if (!root || reveals.length !== lines.length || texts.length !== lines.length) return;
    let started = false;
    let finished = false;
    let completedLines = 0;
    const instances: Typed[] = [];
    texts.forEach((text) => { text.textContent = ""; });
    root.dataset.typing = "waiting";
    // The masks are stable DOM nodes; Typed only writes the nested text spans.
    // The scroll exit animates the heading, not these entrance transforms.
    const entrance = gsap.fromTo(reveals, { yPercent: 108, autoAlpha: 0 }, {
      yPercent: 0, autoAlpha: 1, duration: 0.72, stagger: 0.13,
      ease: "power3.out", paused: true,
    });
    const sync = () => {
      if (!started || finished) return;
      if (blockedRef.current || document.hidden) {
        entrance.pause();
        instances.forEach((typed) => typed.stop());
      } else {
        entrance.resume();
        instances.forEach((typed) => typed.start());
      }
    };
    syncPlaybackRef.current = sync;
    const finish = () => {
      finished = true;
      instances.forEach((typed) => typed.destroy());
      instances.length = 0;
      texts.forEach((text, index) => { text.textContent = lines[index]; });
      entrance.progress(1).pause();
      root.dataset.typing = "complete";
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started || finished) return;
      started = true;
      root.dataset.typing = "typing";
      entrance.play();
      texts.forEach((text, index) => {
        instances.push(new Typed(text, {
          strings: [lines[index]], typeSpeed: 30, startDelay: index * 140,
          showCursor: false, autoInsertCss: false, contentType: "null",
          onComplete: () => {
            completedLines += 1;
            if (completedLines === lines.length) root.dataset.typing = "complete";
          },
        }));
      });
      sync();
      observer.disconnect();
    }, { threshold: 0.55 });
    observer.observe(root);
    // This is dispatched only once the scroll exit has hidden the heading.
    // It cannot pop unfinished text into view during the entrance.
    root.addEventListener("home:typing-finish", finish, { once: true });
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      root.removeEventListener("home:typing-finish", finish);
      document.removeEventListener("visibilitychange", sync);
      syncPlaybackRef.current = () => {};
      instances.forEach((typed) => typed.destroy());
      texts.forEach((text, index) => { text.textContent = lines[index]; });
      delete root.dataset.typing;
    };
  }, { scope: rootRef, dependencies: [lines], revertOnUpdate: true });

  return <h2 className="home-about__society-heading" aria-label={lines.join(" ")} ref={rootRef}>
    {lines.map((line, index) => <span className="home-about__society-line" key={line}>
      <span className="home-typing__source" aria-hidden="true">{line}</span>
      <span className="home-about__society-reveal" aria-hidden="true" ref={(element) => { revealRefs.current[index] = element; }}>
        <span ref={(element) => { textRefs.current[index] = element; }}>{line}</span>
      </span>
    </span>)}
  </h2>;
}
