"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { SceneErrorBoundary } from "@/components/three/scene-error-boundary";
import { useNavigationState } from "@/components/providers/navigation-state-provider";
import { HOME_DESKTOP_MOTION } from "@/lib/animations/home-media";
import type { HomeAboutContent } from "@/types/home";
import { HomeSocietyHeading } from "./home-typing";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function createIndependentScrollTrigger(config: ScrollTrigger.StaticVars) {
  let trigger!: ScrollTrigger;
  const create = () => { trigger = ScrollTrigger.create(config); };
  // A global refresh can invoke one scene's callbacks inside another scene's
  // GSAP context. Keep these triggers independent and kill them explicitly.
  const context = gsap.context();
  if (context) context.ignore(create);
  else create();
  return trigger;
}

const AboutModelScene = dynamic(
  () => import("./about-model-scene").then(({ AboutModelScene: Scene }) => Scene),
  { ssr: false, loading: () => <AboutModelFallback /> },
);

function AboutModelFallback() {
  return (
    <div className="home-about__canvas-fallback">
      <Image alt="CSS KNUST logo" height={192} src="/css_logo.svg" width={370} />
    </div>
  );
}

export function HomeAboutExperience({ content }: { content: HomeAboutContent }) {
  const { communityPhotos, careerPaths, headingLines } = content;
  const { isMenuActive } = useNavigationState();
  const rootRef = useRef<HTMLElement>(null);
  const clockTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const scrollTriggersRef = useRef<ScrollTrigger[]>([]);
  const sceneSuspendedRef = useRef(false);
  const clockShouldPlayRef = useRef(false);
  const progressRef = useRef(0);
  const settleProgressRef = useRef(0);
  const pathsDockRef = useRef(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [sceneActive, setSceneActive] = useState(false);
  const [aboutActive, setAboutActive] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const onSceneFailure = useCallback(() => setSceneFailed(true), []);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let near = false;
    const update = () => setSceneActive(near && media.matches && !document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        update();

        if (!entry.isIntersecting) {
          root.dataset.pathsActive = "false";
          gsap.set(root.querySelector(".home-about__paths-overlay"), { autoAlpha: 0 });
        }
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(root);
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useGSAP(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const community = root.querySelector<HTMLElement>(".home-about__chapter--community");
    const communityStage = root.querySelector<HTMLElement>(".home-about__community-stage");
    const communityHeading = communityStage?.querySelector<HTMLElement>("h2");
    const collage = communityStage?.querySelector<HTMLElement>(".home-about__collage");
    const modelLayer = root.querySelector<HTMLElement>(".home-about__model-layer");
    const pathsStage = root.querySelector<HTMLElement>(".home-about__paths-stage");
    const pathsOverlay = root.querySelector<HTMLElement>(".home-about__paths-overlay");
    const clock = root.querySelector<HTMLElement>(".home-about__compass-clock");
    const cardEntries = cardRefs.current
      .map((card) => ({ card, entry: card?.querySelector<HTMLElement>(".home-about__collage-card-inner") }))
      .filter((item): item is { card: HTMLDivElement; entry: HTMLElement } => item.card !== null && item.entry !== null);

    if (!community || !communityStage || !communityHeading || !collage || !modelLayer || !pathsStage || !pathsOverlay || !clock) {
      return;
    }

    const media = gsap.matchMedia();
    const setAboutState = (active: boolean) => {
      root.dataset.active = String(active);
      setAboutActive(active);
      document.documentElement.classList.toggle("about-model-active", active);
    };

    // The short community burst also runs on touch devices. Only the subsequent
    // career compass retains its desktop-only choreography.
    media.add({ motion: "(prefers-reduced-motion: no-preference)", mobile: "(width < 48rem)" }, (context) => {
      if (!context.conditions?.motion) return;
      root.dataset.communityMotion = "true";
      const columns = context.conditions.mobile ? 3 : 6;
      const activeCards = cardEntries.slice(0, context.conditions.mobile ? 18 : 24);
      const entries = activeCards.map(({ entry }) => entry);

      const collapsedOffset = (index: number) => {
        const card = activeCards[index].card;
        return {
          x: collage.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2),
          y: collage.clientHeight / 2 - (card.offsetTop + card.offsetHeight / 2),
        };
      };
      gsap.set(collage, { autoAlpha: 0 });
      gsap.set(modelLayer, { autoAlpha: 0 });
      gsap.set(entries, {
        autoAlpha: 0,
        scale: 0.06,
        x: (index) => collapsedOffset(index).x,
        y: (index) => collapsedOffset(index).y,
      });

      settleProgressRef.current = 0;
      pathsDockRef.current = 0;
      progressRef.current = 0;
      let headingFinished = false;
      const communityTimeline = gsap.timeline();
      const communityTrigger = createIndependentScrollTrigger({
        id: "home-community-burst",
        animation: communityTimeline,
        trigger: communityStage,
        start: "top top",
        end: () => `+=${communityStage.offsetHeight * 0.9}`,
        pin: true,
        pinSpacing: true,
        scrub: 0.12,
        invalidateOnRefresh: true,
        onEnter: () => setAboutState(true),
        onEnterBack: () => setAboutState(true),
        onLeave: () => {
          if (!window.matchMedia(HOME_DESKTOP_MOTION).matches) setAboutState(false);
        },
        onLeaveBack: () => setAboutState(false),
        onUpdate: (self) => {
          if (self.progress > 0.04 && !headingFinished) {
            headingFinished = true;
            communityHeading.dispatchEvent(new Event("home:typing-finish"));
          }
        },
      });

      communityTimeline
        .fromTo(communityHeading, { autoAlpha: 1, scale: 1, y: 0 }, { autoAlpha: 0, scale: 0.95, y: -24, duration: 0.15, ease: "none" }, 0.04)
        .fromTo(modelLayer, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1, ease: "none" }, 0.14)
        .fromTo(progressRef, { current: 0 }, { current: 1, duration: 0.18, ease: "none" }, 0.12)
        .fromTo(settleProgressRef, { current: 0 }, { current: 1, duration: 0.18, ease: "none" }, 0.12)
        .set(collage, { autoAlpha: 1 }, 0.28)
        .fromTo(entries, {
          autoAlpha: 0, scale: 0.06,
          x: (index) => collapsedOffset(index).x,
          y: (index) => collapsedOffset(index).y,
        }, {
          autoAlpha: 1, scale: 1, x: 0, y: 0, duration: 0.28, ease: "power3.out",
          immediateRender: false,
          stagger: { amount: 0.2, grid: [activeCards.length / columns, columns], from: "center" },
        }, 0.28)
        // Leave a short complete-wall beat; no mandatory timed hold.
        .to({}, { duration: 0.24 }, 0.76);

      scrollTriggersRef.current.push(communityTrigger);
      setAboutState(communityTrigger.isActive);

      return () => {
        communityTrigger.kill();
        scrollTriggersRef.current = scrollTriggersRef.current.filter((trigger) => trigger !== communityTrigger);
        setAboutState(false);
        delete root.dataset.communityMotion;
        [communityHeading, collage, modelLayer, ...entries].forEach((element) => {
          ["transform", "translate", "rotate", "scale", "opacity", "visibility"].forEach((property) => element.style.removeProperty(property));
        });
      };
    });

    media.add(HOME_DESKTOP_MOTION, () => {
      root.dataset.compassEnabled = "true";
      const setPathsVisible = (visible: boolean) => {
        root.dataset.pathsActive = String(visible);
        gsap.set(pathsOverlay, { autoAlpha: visible ? 1 : 0 });
      };

      pathsDockRef.current = 0;
      setPathsVisible(false);

      const clockTimeline = gsap.timeline({ paused: true, repeat: -1 });
      clockTimelineRef.current = clockTimeline;
      const setClockRunning = (running: boolean) => {
        clockShouldPlayRef.current = running;
        if (running && !sceneSuspendedRef.current) clockTimeline.play();
        else clockTimeline.pause();
      };
      const step = 360 / careerPaths.length;
      careerPaths.forEach(() => {
        clockTimeline
          .to(clock, { rotation: `+=${step}`, duration: 0.65, ease: "power2.inOut", transformOrigin: "50% 50%" })
          .to({}, { duration: 1.45 });
      });

      const travelTrigger = createIndependentScrollTrigger({
        trigger: pathsStage,
        start: "top bottom",
        end: "top top",
        scrub: 0.3,
        invalidateOnRefresh: true,
        onEnter: () => setAboutState(true),
        onEnterBack: () => setAboutState(true),
        onUpdate: (self) => {
          // Reserve the final part of the journey for the pinned compass scene.
          pathsDockRef.current = self.progress * 0.72;
          gsap.set(pathsOverlay, {
            autoAlpha: gsap.utils.clamp(0, 1, (self.progress - 0.48) / 0.52),
          });
        },
        onLeaveBack: () => {
          pathsDockRef.current = 0;
          gsap.set(pathsOverlay, { autoAlpha: 0 });
        },
      });

      const pathsTrigger = createIndependentScrollTrigger({
        trigger: pathsStage,
        start: "top top",
        end: "+=80%",
        pin: true,
        pinSpacing: true,
        scrub: 0.3,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          pathsDockRef.current = 0.72 + self.progress * 0.28;
        },
        onEnter: () => {
          setPathsVisible(true);
          setClockRunning(true);
          setAboutState(true);
        },
        onEnterBack: () => {
          setPathsVisible(true);
          setClockRunning(true);
          setAboutState(true);
        },
        onLeave: () => {
          setPathsVisible(false);
          setClockRunning(false);
          setAboutState(false);
        },
        onLeaveBack: () => {
          // Hand back to the bridge at its completed position when scrolling up.
          pathsDockRef.current = 0.72;
          setPathsVisible(true);
          setClockRunning(false);
          clockTimeline.pause(0);
        },
      });

      scrollTriggersRef.current.push(travelTrigger, pathsTrigger);

      return () => {
        travelTrigger.kill();
        pathsTrigger.kill();
        clockTimelineRef.current = null;
        clockShouldPlayRef.current = false;
        scrollTriggersRef.current = scrollTriggersRef.current.filter((trigger) => trigger !== travelTrigger && trigger !== pathsTrigger);
        pathsDockRef.current = 0;
        setPathsVisible(false);
        setAboutState(false);
        // Independent triggers revert their timelines when killed, which can
        // write the desktop start state after matchMedia has restored styles.
        // Release those inline properties so the native layout owns them again.
        [pathsOverlay, clock].forEach((element) => {
          ["transform", "translate", "rotate", "scale", "opacity", "visibility"].forEach((property) => {
            element.style.removeProperty(property);
          });
        });
        delete root.dataset.compassEnabled;
        delete root.dataset.pathsActive;
      };
    });

    let disposed = false;
    void document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
    return () => {
      disposed = true;
      media.revert();
      clockTimelineRef.current = null;
      clockShouldPlayRef.current = false;
      scrollTriggersRef.current = [];
      gsap.set(pathsOverlay, { clearProps: "opacity,visibility" });
      delete root.dataset.compassEnabled;
      delete root.dataset.pathsActive;
      document.documentElement.classList.remove("about-model-active");
    };
  }, { scope: rootRef });

  useEffect(() => {
    sceneSuspendedRef.current = isMenuActive;
    if (!isMenuActive) return;

    // Pause only this section's work; the navigation timeline must keep running.
    const root = rootRef.current;
    const clock = clockTimelineRef.current;
    clock?.pause();
    const scrubs = scrollTriggersRef.current
      .map((trigger) => trigger.getTween())
      .filter((tween): tween is gsap.core.Tween => Boolean(tween) && !tween.paused());
    scrubs.forEach((tween) => tween.pause());

    return () => {
      if (!root?.isConnected) return;
      scrubs.forEach((tween) => tween.resume());
      if (clockShouldPlayRef.current) clockTimelineRef.current?.resume();
    };
  }, [isMenuActive]);

  return (
    <section className="home-about" data-active={aboutActive} ref={rootRef} aria-label="About CSS">
      <div aria-hidden="true" className="home-about__model-layer">
        <SceneErrorBoundary fallback={<AboutModelFallback />} onFailure={onSceneFailure}>
          <Suspense fallback={<AboutModelFallback />}>
            {sceneFailed ? <AboutModelFallback /> : sceneActive && (
              <AboutModelScene active={aboutActive} progressRef={progressRef} settleProgressRef={settleProgressRef} pathsDockRef={pathsDockRef} onFailure={onSceneFailure} />
            )}
          </Suspense>
        </SceneErrorBoundary>
      </div>
      <section className="home-about__chapter home-about__chapter--community">
        <div className="home-about__community-stage">
          <HomeSocietyHeading lines={headingLines} />
          <div aria-hidden="true" className="home-about__collage">
            {communityPhotos.map((image, index) => (
              <div className="home-about__collage-card" key={image.id} ref={(element) => { cardRefs.current[index] = element; }}>
                <div className="home-about__collage-card-inner">
                  <Image alt="" fill sizes="(max-width: 47.99rem) 33vw, 17vw" src={image.src} style={{ objectPosition: image.position }} onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                </div>
              </div>
            ))}
            <Image alt="" className="home-about__community-mark" height={192} sizes="(max-width: 47.99rem) 56vw, 32vw" src="/css_logo.svg" width={370} />
          </div>
        </div>
      </section>
      <section className="home-about__chapter home-about__chapter--paths" aria-labelledby="home-career-paths-heading">
        <div className="home-about__paths-stage">
          <div className="home-about__paths-content">
            <h2 id="home-career-paths-heading">choose your path</h2>
            <Image alt="" className="home-about__paths-mark" height={192} sizes="192px" src="/css_logo.svg" width={370} />
            <ul className="home-about__paths-list" role="list">
              {careerPaths.map((path) => <li key={path}>{path}</li>)}
            </ul>
          </div>
        </div>
      </section>
      <div aria-hidden="true" className="home-about__paths-overlay">
        <h2>choose your path</h2>
        <div className="home-about__compass">
          <div className="home-about__compass-clock">
            <svg className="home-about__compass-ring" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="none" r="42" />
              {careerPaths.map((path, index) => (
                <line key={path} x1="50" x2="50" y1="5" y2="10" transform={`rotate(${(index * 360) / careerPaths.length} 50 50)`} />
              ))}
            </svg>
          </div>
          {careerPaths.map((path, index) => (
            <span className="home-about__compass-label" key={path} style={{ "--compass-angle": `${(index * 360) / careerPaths.length - 90}deg` } as CSSProperties}>
              {path}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
