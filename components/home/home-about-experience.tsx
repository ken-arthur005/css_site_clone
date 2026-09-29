"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const AboutModelScene = dynamic(
  () => import("./about-model-scene").then(({ AboutModelScene: Scene }) => Scene),
  { ssr: false },
);

const communityImages = [
  { src: "/this%20is%20css/REP%20YOUR%20JERSEY-9.jpg", alt: "CSS members at CSS Week", position: "north-west" },
  { src: "/this%20is%20css/WhatsApp%20Image%202026-09-28%20at%201.43.19%20PM.jpeg", alt: "CSS community moment", position: "north-east" },
  { src: "/this%20is%20css/REP%20YOUR%20JERSEY-5.jpg", alt: "CSS Week community", position: "south-west" },
  { src: "/this%20is%20css/WhatsApp%20Image%202026-09-28%20at%201.41.30%20PM.jpeg", alt: "CSS students together", position: "south-east" },
  { src: "/this%20is%20css/WhatsApp%20Image%202026-09-28%20at%201.41.30%20PM%20(1).jpeg", alt: "CSS community gathering", position: "east" },
];

const careerPaths = [
  "Cybersecurity",
  "Data Science",
  "UI/UX Design",
  "Software Engineering",
  "AI/ML Engineering",
  "Cloud Engineering",
  "DevOps",
];

export function HomeAboutExperience() {
  const rootRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const settleProgressRef = useRef(0);
  const pathsDockRef = useRef(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [sceneActive, setSceneActive] = useState(false);
  const [aboutActive, setAboutActive] = useState(false);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setSceneActive(entry.isIntersecting);

        if (!entry.isIntersecting) {
          root.dataset.pathsActive = "false";
          gsap.set(root.querySelector(".home-about__paths-overlay"), { autoAlpha: 0 });
        }
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useGSAP(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const community = root.querySelector<HTMLElement>(".home-about__chapter--community");
    const communityStage = root.querySelector<HTMLElement>(".home-about__community-stage");
    const communityHeading = communityStage?.querySelector<HTMLElement>("h2");
    const pathsStage = root.querySelector<HTMLElement>(".home-about__paths-stage");
    const pathsOverlay = root.querySelector<HTMLElement>(".home-about__paths-overlay");
    const clock = root.querySelector<HTMLElement>(".home-about__compass-clock");
    const cardEntries = cardRefs.current
      .map((card) => ({ card, entry: card?.querySelector<HTMLElement>(".home-about__collage-card-inner") }))
      .filter((item): item is { card: HTMLDivElement; entry: HTMLElement } => item.card !== null && item.entry !== null);

    if (!community || !communityStage || !communityHeading || !pathsStage || !pathsOverlay || !clock) {
      return;
    }

    const setAboutState = (active: boolean) => {
      root.dataset.active = String(active);
      setAboutActive(active);
      document.documentElement.classList.toggle("about-model-active", active);
    };

    const collapsedOffset = (index: number) => {
      const bounds = cardEntries[index].card.getBoundingClientRect();
      return {
        x: window.innerWidth / 2 - (bounds.left + bounds.width / 2),
        y: window.innerHeight / 2 - (bounds.top + bounds.height / 2),
      };
    };
    const entries = cardEntries.map(({ entry }) => entry);

    gsap.set(entries, {
      autoAlpha: 0,
      scale: 0.16,
      x: (index) => collapsedOffset(index).x,
      y: (index) => collapsedOffset(index).y,
      rotate: (index) => (index % 2 ? -12 : 12),
    });

    settleProgressRef.current = 0;
    pathsDockRef.current = 0;
    const headingText = "A society shaped by computing";
    const typingState = { progress: 0 };
    progressRef.current = 0;
    communityHeading.textContent = "";
    const communityTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: communityStage,
        start: "top top",
        end: "+=220%",
        pin: true,
        pinSpacing: true,
        scrub: 0.35,
        invalidateOnRefresh: true,
        onEnter: () => setAboutState(true),
        onEnterBack: () => setAboutState(true),
        // Keep the shared model alive after the collage pin ends so it can
        // travel into the paths scene instead of disappearing between stages.
        onLeaveBack: () => setAboutState(false),
      },
    });

    const setPathsVisible = (visible: boolean) => {
      root.dataset.pathsActive = String(visible);
      gsap.set(pathsOverlay, { autoAlpha: visible ? 1 : 0 });
    };

    setPathsVisible(false);

    const clockTimeline = gsap.timeline({ paused: true, repeat: -1 });
    const step = 360 / careerPaths.length;
    careerPaths.forEach(() => {
      clockTimeline
        .to(clock, { rotation: `+=${step}`, duration: 0.65, ease: "power2.inOut", transformOrigin: "50% 50%" })
        .to({}, { duration: 1.45 });
    });

    const travelTrigger = ScrollTrigger.create({
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

    const pathsTrigger = ScrollTrigger.create({
      trigger: pathsStage,
      start: "top top",
      end: "+=120%",
      pin: true,
      pinSpacing: true,
      scrub: 0.3,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        pathsDockRef.current = 0.72 + self.progress * 0.28;
      },
      onEnter: () => {
        setPathsVisible(true);
        clockTimeline.play();
        setAboutState(true);
      },
      onEnterBack: () => {
        setPathsVisible(true);
        clockTimeline.play();
        setAboutState(true);
      },
      onLeave: () => {
        setPathsVisible(false);
        clockTimeline.pause();
        setAboutState(false);
      },
      onLeaveBack: () => {
        // Hand back to the bridge at its completed position when scrolling up.
        pathsDockRef.current = 0.72;
        setPathsVisible(true);
        clockTimeline.pause(0);
      },
    });

    communityTimeline
      .to(progressRef, { current: 1, duration: 0.2, ease: "none" }, 0)
      .to(settleProgressRef, { current: 1, duration: 0.2, ease: "none" }, 0)
      .to(communityHeading, { autoAlpha: 1, xPercent: -50, y: 0, duration: 0.01, ease: "none" }, 0.2)
      .to(typingState, {
        progress: 1,
        duration: 0.27,
        ease: "none",
        onUpdate: () => {
          communityHeading.textContent = headingText.slice(0, Math.floor(typingState.progress * headingText.length));
        },
      }, 0.2)
      .to(entries, { autoAlpha: 1, scale: 1, x: 0, y: 0, rotate: 0, duration: 0.22, ease: "none", stagger: 0.035 }, 0.47)
      .to(settleProgressRef, { current: 1, duration: 0.15, ease: "none" }, 0.69)
      .to(entries, {
        autoAlpha: 0,
        scale: 0.16,
        x: (index) => collapsedOffset(index).x,
        y: (index) => collapsedOffset(index).y,
        rotate: (index) => (index % 2 ? -12 : 12),
        duration: 0.16,
        ease: "none",
        stagger: 0.035,
      }, 0.84);

    return () => {
      communityTimeline.scrollTrigger?.kill();
      travelTrigger.kill();
      pathsTrigger.kill();
      clockTimeline.kill();
      gsap.set(pathsOverlay, { clearProps: "opacity,visibility" });
      delete root.dataset.pathsActive;
      document.documentElement.classList.remove("about-model-active");
    };
  }, { scope: rootRef });

  useGSAP(() => {
    const root = rootRef.current;
    const cards = cardRefs.current.filter((card): card is HTMLDivElement => card !== null);

    if (!root || !cards.length) {
      return;
    }

    const media = gsap.matchMedia();
    media.add("(hover: hover) and (pointer: fine)", () => {
      const setters = cards.map((card) => ({
        x: gsap.quickTo(card, "x", { duration: 0.65, ease: "power3.out" }),
        y: gsap.quickTo(card, "y", { duration: 0.65, ease: "power3.out" }),
        scale: gsap.quickTo(card, "scale", { duration: 0.5, ease: "power3.out" }),
      }));
      let frame = 0;
      let pointerX = 0;
      let pointerY = 0;

      const updateCards = () => {
        frame = 0;
        cards.forEach((card, index) => {
          const bounds = card.getBoundingClientRect();
          const dx = bounds.left + bounds.width / 2 - pointerX;
          const dy = bounds.top + bounds.height / 2 - pointerY;
          const distance = Math.hypot(dx, dy);
          const influence = Math.max(0, 1 - distance / 240);
          const push = influence * 24;
          setters[index].x(distance ? (dx / distance) * push : 0);
          setters[index].y(distance ? (dy / distance) * push : 0);
          setters[index].scale(1 + influence * 0.07);
        });
      };

      const handlePointerMove = (event: PointerEvent) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (!frame) {
          frame = window.requestAnimationFrame(updateCards);
        }
      };

      const resetCards = () => {
        setters.forEach((setter) => {
          setter.x(0);
          setter.y(0);
          setter.scale(1);
        });
      };

      root.addEventListener("pointermove", handlePointerMove, { passive: true });
      root.addEventListener("pointerleave", resetCards, { passive: true });
      return () => {
        if (frame) {
          window.cancelAnimationFrame(frame);
        }
        root.removeEventListener("pointermove", handlePointerMove);
        root.removeEventListener("pointerleave", resetCards);
      };
    });

    return () => media.revert();
  }, { scope: rootRef });

  return (
    <section className="home-about" data-active={aboutActive} ref={rootRef} aria-label="About CSS">
      <div className="home-about__model-layer">
        {sceneActive && <AboutModelScene progressRef={progressRef} settleProgressRef={settleProgressRef} pathsDockRef={pathsDockRef} />}
      </div>
      <section className="home-about__chapter home-about__chapter--community">
        <div className="home-about__community-stage">
          <h2 aria-label="A society shaped by computing">A society shaped by computing</h2>
        </div>
      </section>
      <section className="home-about__chapter home-about__chapter--paths" aria-label="Computer science career paths">
        <div className="home-about__paths-stage" />
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
      <div aria-hidden="true" className="home-about__collage">
        {communityImages.map((image, index) => (
          <div className={`home-about__collage-card home-about__collage-card--${image.position}`} key={image.src} ref={(element) => { cardRefs.current[index] = element; }}>
            <div className="home-about__collage-card-inner">
              <Image alt="" fill sizes="(max-width: 47.99rem) 34vw, 16vw" src={image.src} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
