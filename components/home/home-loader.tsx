"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSmoothScroll } from "@/components/providers/smooth-scroll-provider";
import { SceneErrorBoundary } from "@/components/three/scene-error-boundary";
import { hasSeenHomeIntro, markHomeIntroSeen } from "@/lib/home-intro";
import { HomeResourceGate, prepareHomepageAssets, warmBackgroundRoutes } from "@/lib/loading/home-assets";
import type { HomeLoadingPlan } from "@/types/loading";
import { LoaderLogo } from "./loader-logo";

gsap.registerPlugin(useGSAP);

const ResourceWarmup = dynamic(
  () => import("./home-resource-warmup").then((module) => module.HomeResourceWarmup),
  { ssr: false },
);

type Props = { plan: HomeLoadingPlan; onReveal: (firstVisit: boolean) => void };

export function HomeLoader({ plan, onReveal }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"full" | "returning" | null>(null);
  const [finished, setFinished] = useState(false);
  const { setScrollLocked } = useSmoothScroll();
  const router = useRouter();
  const gate = useMemo(() => new HomeResourceGate(plan.resources.map(({ src }) => src)), [plan]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMode(hasSeenHomeIntro() || window.scrollY > 0 ? "returning" : "full");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!finished) return;
    const controller = new AbortController();
    // Yield immediately when the visitor chooses a destination, before unmount.
    const onNavigation = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (link && link.origin === window.location.origin && link.pathname !== window.location.pathname) controller.abort();
    };
    document.addEventListener("click", onNavigation, true);
    void warmBackgroundRoutes(plan.background, (href) => router.prefetch(href), controller.signal);
    return () => {
      controller.abort();
      document.removeEventListener("click", onNavigation, true);
    };
  }, [finished, plan.background, router]);

  useGSAP((_context, contextSafe) => {
    const root = rootRef.current;
    if (!root || !mode || !contextSafe) return;
    if (mode === "returning") {
      gsap.set(root, { autoAlpha: 0, pointerEvents: "none" });
      onReveal(false);
      setFinished(true);
      return;
    }

    const panel = root.querySelector<HTMLElement>(".home-intro__panel")!;
    const accent = root.querySelector<HTMLElement>(".home-intro__accent")!;
    const stage = root.querySelector<HTMLElement>(".home-intro__stage")!;
    const mark = root.querySelector<HTMLElement>(".home-intro__mark")!;
    const cursor = root.querySelector<HTMLElement>(".home-intro__cursor")!;
    const cursorArrow = root.querySelector<HTMLElement>(".home-intro__cursor-arrow")!;
    const clickRing = root.querySelector<HTMLElement>(".home-intro__click")!;
    const status = root.querySelector<HTMLElement>(".home-intro__status-text")!;
    const joke = root.querySelector<HTMLElement>(".home-intro__joke")!;
    const outlines = Array.from(root.querySelectorAll<SVGPathElement>(".home-intro__outline path"));
    const solid = root.querySelector<SVGImageElement>(".home-intro__solid")!;
    const controller = new AbortController();
    let disposed = false;
    let ready = false;
    let drawn = false;
    let exiting = false;
    let chasing = false;
    let step = 0;
    let jokeIndex = 0;
    let chase: gsap.core.Timeline | undefined;
    let pursue = () => {};
    let jokeTimer: gsap.core.Tween | undefined;
    let rangeX = 0;
    let rangeY = 0;
    let cursorMaxX = 0;
    let cursorMaxY = 0;
    root.dataset.managed = "true";
    root.dataset.phase = "drawing";
    gsap.set(root, { autoAlpha: 1, pointerEvents: "auto" });
    gsap.set(mark, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
    gsap.set(cursor, { autoAlpha: 0 });
    const measure = contextSafe(() => {
      rangeX = Math.max(0, (stage.clientWidth - mark.offsetWidth) / 2 - 30);
      rangeY = Math.max(0, (stage.clientHeight - mark.offsetHeight) / 2 - 28);
      const captionWidth = cursor.querySelector<HTMLElement>(".home-intro__cursor-caption")!.offsetWidth;
      cursorMaxX = stage.clientWidth / 2 - Math.max(cursor.offsetWidth, captionWidth) - 8;
      cursorMaxY = stage.clientHeight / 2 - cursor.offsetHeight - 8;
      if (chasing && !exiting) {
        chase?.kill();
        gsap.set(mark, {
          x: gsap.utils.clamp(-rangeX, rangeX, Number(gsap.getProperty(mark, "x"))),
          y: gsap.utils.clamp(-rangeY, rangeY, Number(gsap.getProperty(mark, "y"))),
        });
        gsap.set(cursor, {
          x: cursorX(Number(gsap.getProperty(cursor, "x"))),
          y: cursorY(Number(gsap.getProperty(cursor, "y"))),
        });
        pursue();
      }
    });
    const cursorX = (x: number) => gsap.utils.clamp(-stage.clientWidth / 2 + 8, cursorMaxX, x);
    const cursorY = (y: number) => gsap.utils.clamp(-stage.clientHeight / 2 + 8, cursorMaxY, y);
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(stage);
    resize.observe(mark);
    resize.observe(cursor.querySelector(".home-intro__cursor-caption")!);

    const main = root.closest("main");
    const previousBusy = main?.getAttribute("aria-busy");
    const background = Array.from(document.querySelectorAll<HTMLElement>("main > :not(.home-intro), .site-footer"))
      .map((element) => ({ element, inert: element.inert }));
    background.forEach(({ element }) => { element.inert = true; });
    main?.setAttribute("aria-busy", "true");
    setScrollLocked(true, "home-intro");
    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      background.forEach(({ element, inert }) => { element.inert = inert; });
      if (previousBusy === null || previousBusy === undefined) main?.removeAttribute("aria-busy");
      else main?.setAttribute("aria-busy", previousBusy);
      setScrollLocked(false, "home-intro");
    };

    const reveal = contextSafe(() => {
      root.dataset.phase = "revealing";
      status.textContent = "You're in.";
      jokeTimer?.kill();
      gsap.timeline({ onComplete: () => {
        markHomeIntroSeen();
        unlock();
        controller.abort();
        setFinished(true);
      } })
        .to(".home-intro__meta, .home-intro__bottom, .home-intro__stage", { opacity: 0, duration: 0.18 })
        .call(() => onReveal(true), [], 0.16)
        .to(panel, { xPercent: -118, skewX: -10, duration: 0.64, ease: "power3.inOut" }, 0.12)
        .to(accent, { xPercent: -118, skewX: -10, duration: 0.64, ease: "power3.inOut" }, 0.22)
        .set(root, { autoAlpha: 0, pointerEvents: "none" });
    });

    const finish = contextSafe(() => {
      if (!drawn || exiting || disposed) return;
      exiting = true;
      chase?.kill();
      jokeTimer?.kill();
      if (!chasing) { reveal(); return; }
      root.dataset.phase = "catching";
      status.textContent = "Got you.";
      gsap.timeline({ onComplete: reveal })
        .to(mark, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.3, ease: "power3.out" }, 0)
        .to(cursor, { x: () => cursorX(mark.offsetWidth * 0.22), y: () => cursorY(0), duration: 0.42, ease: "power2.inOut" }, 0.08)
        .to(cursorArrow, { scale: 0.84, duration: 0.09 }, 0.5)
        .to(mark, { scale: 0.94, duration: 0.09 }, 0.5)
        .fromTo(clickRing, { opacity: 0.8, scale: 0.35 }, { opacity: 0, scale: 2.2, duration: 0.34, ease: "power2.out" }, 0.5)
        .to(cursorArrow, { scale: 1, duration: 0.14 }, 0.59)
        .to(mark, { scale: 1, duration: 0.18, ease: "power3.out" }, 0.59);
    });

    // Pursuit targets the logo's old position just as it darts away. Each step
    // is scoped and interruptible; there is no mouse listener or React RAF loop.
    const dodgePoints = [[0.72, -0.6], [-0.78, 0.25], [0.42, 0.72], [-0.25, -0.72], [0.78, 0.15], [-0.65, -0.3]];
    pursue = contextSafe(() => {
      if (exiting || disposed) return;
      const oldX = Number(gsap.getProperty(mark, "x"));
      const oldY = Number(gsap.getProperty(mark, "y"));
      const [x, y] = dodgePoints[step % dodgePoints.length];
      step++;
      chase = gsap.timeline({ onComplete: pursue })
        .to(cursor, { x: cursorX(oldX + mark.offsetWidth * 0.18), y: cursorY(oldY), duration: 0.66, ease: "power2.inOut" }, 0.06)
        .to(mark, { x: x * rangeX, y: y * rangeY, rotation: step % 2 ? -5 : 5, duration: 0.4, ease: "power3.out" }, 0.27)
        .to(cursorArrow, { rotation: step % 2 ? -9 : 7, duration: 0.2 }, 0.57)
        .to(cursorArrow, { rotation: 0, duration: 0.2 }, 0.85)
        .to(mark, { rotation: 0, duration: 0.22 }, 0.8);
    });

    const changeJoke = contextSafe(() => {
      if (exiting || disposed || plan.jokes.length < 2) return;
      gsap.timeline()
        .to(joke, { y: -8, opacity: 0, duration: 0.2 })
        .call(() => { jokeIndex = (jokeIndex + 1) % plan.jokes.length; joke.textContent = plan.jokes[jokeIndex]; })
        .set(joke, { y: 8 })
        .to(joke, { y: 0, opacity: 1, duration: 0.3 });
      jokeTimer = gsap.delayedCall(3.8, changeJoke);
    });
    jokeTimer = gsap.delayedCall(3.8, changeJoke);

    const drawingComplete = contextSafe(() => {
      drawn = true;
      if (ready) { finish(); return; }
      chasing = true;
      root.dataset.phase = "chasing";
      status.textContent = "A little game of catch.";
      gsap.set(cursor, { x: cursorX(-rangeX * 0.7), y: cursorY(rangeY * 0.8) });
      gsap.to(cursor, { autoAlpha: 1, duration: 0.18 });
      pursue();
    });
    gsap.timeline({ onComplete: drawingComplete })
      .to(outlines, { attr: { "stroke-dashoffset": 0 }, duration: 1.65, stagger: 0.12, ease: "power1.inOut" }, 0.1)
      .to(solid, { opacity: 1, duration: 0.42, ease: "power2.inOut" }, 2.15)
      .to(".home-intro__outline", { opacity: 0, duration: 0.3 }, 2.25);

    void prepareHomepageAssets(plan, gate, controller.signal).then((outcome) => {
      if (disposed || outcome.reason === "aborted") return;
      root.dataset.loadResult = outcome.reason;
      root.dataset.pendingAssets = String(outcome.pending.length);
      root.dataset.failedAssets = String(outcome.failed.length);
      ready = true;
      finish();
    });

    return () => {
      disposed = true;
      controller.abort();
      resize.disconnect();
      chase?.kill();
      jokeTimer?.kill();
      unlock();
      delete root.dataset.managed;
    };
  }, { scope: rootRef, dependencies: [mode, gate, onReveal, plan, setScrollLocked], revertOnUpdate: true });

  return (
    <>
      {!finished && (
        <div className="home-intro" ref={rootRef} data-phase="drawing" aria-label="Loading the CSS KNUST homepage">
          <div aria-hidden="true" className="home-intro__accent" />
          <div className="home-intro__panel">
            <div className="home-intro__meta">
              <p className="home-intro__identity">Computer Science<br />Society<span>KNUST / GH</span></p>
              <p className="home-intro__status" role="status"><span aria-hidden="true" /><span className="home-intro__status-text">Drawing the mark.</span></p>
            </div>
            <div className="home-intro__stage" aria-hidden="true">
              <span className="home-intro__registration home-intro__registration--start" />
              <span className="home-intro__registration home-intro__registration--end" />
              <div className="home-intro__mark"><LoaderLogo /></div>
              <div className="home-intro__cursor">
                <span className="home-intro__click" />
                <svg className="home-intro__cursor-arrow" viewBox="0 0 32 40" fill="none"><path d="M3 2v29l7.6-7.4 6.4 13.2 5.4-2.7-6.3-12.8H27L3 2Z" fill="currentColor" stroke="var(--background)" strokeWidth="2" strokeLinejoin="round" /></svg>
                <span className="home-intro__cursor-caption">catch(css)</span>
              </div>
            </div>
            <div className="home-intro__bottom" data-content-status="placeholder">
              <p className="home-intro__joke-label">While you wait<span aria-hidden="true"> / </span></p>
              <p className="home-intro__joke" aria-hidden="true">{plan.jokes[0]}</p>
              <span className="home-intro__bottom-note">A few bytes. A little banter.</span>
            </div>
          </div>
        </div>
      )}
      {mode === "full" && !finished && (
        <SceneErrorBoundary onFailure={() => plan.resources.forEach(({ src }) => gate.settle(src, "failed"))}>
          <ResourceWarmup resources={plan.resources} onSettled={gate.settle} />
        </SceneErrorBoundary>
      )}
    </>
  );
}
