"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { SceneErrorBoundary } from "@/components/three/scene-error-boundary";
import { useNavigationState } from "@/components/providers/navigation-state-provider";
import type { HomeAboutContent } from "@/types/home";
import { HomeSocietyHeading } from "./home-typing";
import { HomeCareerTerminal } from "./home-career-terminal";
import { useHomeAssetFallback } from "@/lib/loading/asset-fallback";

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
  const { communityPhotos, careerPaths, headingLines, terminal } = content;
  const { isMenuActive } = useNavigationState();
  const rootRef = useRef<HTMLElement>(null);
  const communityTriggerRef = useRef<ScrollTrigger | null>(null);
  const modelRevealedRef = useRef(false);
  const progressRef = useRef(0);
  const settleProgressRef = useRef(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [sceneActive, setSceneActive] = useState(false);
  const [aboutActive, setAboutActive] = useState(false);
  const [modelRevealed, setModelRevealed] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const modelFallback = useHomeAssetFallback("/CSS%20Logo%203d.glb");
  const onSceneFailure = useCallback(() => setSceneFailed(true), []);

  useEffect(() => {
    const stage = rootRef.current?.querySelector<HTMLElement>(".home-about__community-stage");
    if (!stage) {
      return;
    }

    let near = false;
    const update = () => setSceneActive(near && !document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        update();
      },
      { rootMargin: "100% 0px" },
    );
    // Keep both the loader and rendering activity scoped to the photo wall.
    const visibleObserver = new IntersectionObserver(([entry]) => {
      setAboutActive(entry.isIntersecting && entry.intersectionRatio >= 0.05);
    }, { threshold: 0.05 });
    observer.observe(stage);
    visibleObserver.observe(stage);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      visibleObserver.disconnect();
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
    const cardEntries = cardRefs.current
      .map((card) => ({ card, entry: card?.querySelector<HTMLElement>(".home-about__collage-card-inner") }))
      .filter((item): item is { card: HTMLDivElement; entry: HTMLElement } => item.card !== null && item.entry !== null);

    if (!community || !communityStage || !communityHeading || !collage || !modelLayer) {
      return;
    }

    const media = gsap.matchMedia();
    // Only viewport width changes the composition. The owner requested the full
    // sequence regardless of the operating system's motion preference.
    media.add({ wide: "(width >= 48rem)", mobile: "(width < 48rem)" }, (context) => {
      root.dataset.communityMotion = "true";
      const mobile = Boolean(context.conditions?.mobile);
      const columns = mobile ? 3 : 6;
      const activeCards = cardEntries.slice(0, mobile ? 18 : 24);
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
        xPercent: 0,
        yPercent: 0,
        x: (index) => collapsedOffset(index).x,
        y: (index) => collapsedOffset(index).y,
      });

      settleProgressRef.current = 0;
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
        onUpdate: (self) => {
          const revealed = self.progress > 0.12;
          if (modelRevealedRef.current !== revealed) {
            modelRevealedRef.current = revealed;
            setModelRevealed(revealed);
          }
        },
      });

      communityTimeline
        .fromTo(communityHeading, { autoAlpha: 1, scale: 1, y: 0 }, { autoAlpha: 0, scale: 0.95, y: -24, duration: 0.16, ease: "none" }, 0.06)
        .fromTo(modelLayer, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1, ease: "none" }, 0.14)
        .fromTo(progressRef, { current: 0 }, { current: 1, duration: 0.18, ease: "none" }, 0.12)
        .fromTo(settleProgressRef, { current: 0 }, { current: 1, duration: 0.18, ease: "none" }, 0.12)
        .set(collage, { autoAlpha: 1 }, 0.28)
        .fromTo(entries, {
          autoAlpha: 0, scale: 0.06, xPercent: 0, yPercent: 0,
          x: (index) => collapsedOffset(index).x,
          y: (index) => collapsedOffset(index).y,
        }, {
          // GSAP can infer -50% when a collapsed pixel offset equals half a
          // tile. Explicit percentages prevent that offset surviving at rest.
          autoAlpha: 1, scale: 1, x: 0, y: 0, xPercent: 0, yPercent: 0, duration: 0.28, ease: "power3.out",
          immediateRender: false,
          stagger: { amount: 0.2, grid: [activeCards.length / columns, columns], from: "center" },
        }, 0.28)
        // Leave a short complete-wall beat; no mandatory timed hold.
        .to({}, { duration: 0.24 }, 0.76);

      communityTimeline.eventCallback("onUpdate", () => {
        // Numeric scrub can lag behind the scroll target. Finish typing only
        // after the rendered exit, not when the raw scroll progress jumps ahead.
        if (communityTimeline.time() > 0.24 && !headingFinished) {
          headingFinished = true;
          communityHeading.dispatchEvent(new Event("home:typing-finish"));
        }
      });

      communityTriggerRef.current = communityTrigger;

      return () => {
        communityTrigger.kill();
        communityTriggerRef.current = null;
        modelRevealedRef.current = false;
        setModelRevealed(false);
        delete root.dataset.communityMotion;
        [communityHeading, collage, modelLayer, ...entries].forEach((element) => {
          ["transform", "translate", "rotate", "scale", "opacity", "visibility"].forEach((property) => element.style.removeProperty(property));
        });
      };
    });

    let disposed = false;
    void document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
    return () => {
      disposed = true;
      media.revert();
      communityTriggerRef.current = null;
    };
  }, { scope: rootRef });

  useEffect(() => {
    if (!isMenuActive) return;

    // Pause only this section's work; the navigation timeline must keep running.
    const root = rootRef.current;
    const scrub = communityTriggerRef.current?.getTween();
    const wasPlaying = scrub && !scrub.paused();
    if (wasPlaying) scrub.pause();

    return () => {
      if (!root?.isConnected) return;
      if (wasPlaying) scrub.resume();
    };
  }, [isMenuActive]);

  return (
    <section className="home-about" data-scene-mounted={sceneActive || sceneFailed} data-model-playing={aboutActive && modelRevealed && !isMenuActive && sceneActive} ref={rootRef} aria-label="About CSS">
      <section className="home-about__chapter home-about__chapter--community">
        <div className="home-about__community-stage">
          <HomeSocietyHeading lines={headingLines} />
          <div aria-hidden="true" className="home-about__model-layer">
            <SceneErrorBoundary fallback={<AboutModelFallback />} onFailure={onSceneFailure}>
              <Suspense fallback={<AboutModelFallback />}>
                {sceneFailed || modelFallback ? <AboutModelFallback /> : sceneActive && (
                  <AboutModelScene active={aboutActive && modelRevealed} progressRef={progressRef} settleProgressRef={settleProgressRef} onFailure={onSceneFailure} />
                )}
              </Suspense>
            </SceneErrorBoundary>
          </div>
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
      <HomeCareerTerminal paths={careerPaths} terminal={terminal} />
    </section>
  );
}
