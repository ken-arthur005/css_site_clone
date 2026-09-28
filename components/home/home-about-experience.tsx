"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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

export function HomeAboutExperience() {
  const rootRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const settleProgressRef = useRef(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [sceneActive, setSceneActive] = useState(false);
  const [aboutActive, setAboutActive] = useState(false);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setSceneActive(entry.isIntersecting),
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

    const statement = root.querySelector<HTMLElement>(".home-about__chapter--statement");
    const community = root.querySelector<HTMLElement>(".home-about__chapter--community");
    const communityStage = root.querySelector<HTMLElement>(".home-about__community-stage");
    const communityHeading = communityStage?.querySelector<HTMLElement>("h2");
    const cardEntries = cardRefs.current
      .map((card) => ({ card, entry: card?.querySelector<HTMLElement>(".home-about__collage-card-inner") }))
      .filter((item): item is { card: HTMLDivElement; entry: HTMLElement } => item.card !== null && item.entry !== null);

    if (!statement || !community || !communityStage || !communityHeading) {
      return;
    }

    const setAboutState = (active: boolean) => {
      root.dataset.active = String(active);
      setAboutActive(active);
      document.documentElement.classList.toggle("about-model-active", active);
    };

    const handoffTrigger = ScrollTrigger.create({
      trigger: statement,
      start: "top top",
      end: "+=70%",
      pin: true,
      pinSpacing: true,
      scrub: 0.35,
      invalidateOnRefresh: true,
      onEnter: () => setAboutState(true),
      onEnterBack: () => setAboutState(true),
      onLeaveBack: () => setAboutState(false),
      onUpdate: (self) => {
        progressRef.current = self.progress;
      },
    });

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
    const headingText = "this is us";
    const typingState = { progress: 0 };
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
        onLeave: () => setAboutState(false),
      },
    });

    communityTimeline
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
      handoffTrigger.kill();
      communityTimeline.scrollTrigger?.kill();
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
        {sceneActive && <AboutModelScene progressRef={progressRef} settleProgressRef={settleProgressRef} />}
      </div>
      <section className="home-about__chapter home-about__chapter--statement">
          <h2>A society shaped by computing.</h2>
      </section>
      <section className="home-about__chapter home-about__chapter--community">
        <div className="home-about__community-stage">
          <h2 aria-label="this is us">this is us</h2>
        </div>
      </section>
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
