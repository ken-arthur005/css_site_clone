"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { hasSeenHomeIntro, markHomeIntroSeen } from "@/lib/home-intro";
import type { SiteInfo } from "@/types/site";
import { HeroIdentityCard } from "./hero-identity-card";
import { HeroTechField } from "./hero-tech-field";
import { HomeHeroTyping } from "./home-typing";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type IntroMode = "full" | "returning" | null;

export function HomeHero({ site }: { site: SiteInfo }) {
  const heroRef = useRef<HTMLElement>(null);
  const [introMode, setIntroMode] = useState<IntroMode>(() => (
    typeof window === "undefined" || !hasSeenHomeIntro() ? null : "returning"
  ));
  const [introComplete, setIntroComplete] = useState(false);
  const [typeCard, setTypeCard] = useState(false);

  useEffect(() => {
    if (introMode) {
      return;
    }

    // The opening is a brief visual beat, never a gate on fonts or icons.
    const frame = window.requestAnimationFrame(() => {
      setIntroMode(hasSeenHomeIntro() || window.scrollY > 0 ? "returning" : "full");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [introMode]);

  useGSAP((_context, contextSafe) => {
    if (!contextSafe) return;
    const hero = heroRef.current;

    if (!hero || !introMode) {
      return;
    }

    const loader = hero.querySelector<HTMLElement>(".home-intro");
    const loaderPanel = hero.querySelector<HTMLElement>(".home-intro__panel");
    const iconEntries = Array.from(hero.querySelectorAll<HTMLElement>(".hero-tech-field__entry"));
    const mobileIconEntries = iconEntries.filter((entry) => entry.closest("[data-mobile]")?.getAttribute("data-mobile") === "true");
    const identityEntry = hero.querySelector<HTMLElement>(".home-hero__identity-entry");
    const title = hero.querySelector<HTMLElement>(".home-hero__title");

    if (!title || !identityEntry) {
      return;
    }

    const stagedIcons = window.matchMedia("(max-width: 47.99rem)").matches
      ? mobileIconEntries
      : iconEntries;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    gsap.set(stagedIcons, { autoAlpha: 0, scale: 0.88, x: 0, y: 0, rotate: 0 });
    gsap.set(identityEntry, { autoAlpha: 0, x: 26, y: 18 });

    let settled = false;
    const media = gsap.matchMedia();
    const settleHero = contextSafe(() => {
      if (settled) return;
      settled = true;
      setIntroComplete(true);
      if (introMode === "full") {
        markHomeIntroSeen();
      }

      // Create the exit only after the entrance has stopped writing transforms.
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.timeline({
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom 58%",
            scrub: 0.15,
            invalidateOnRefresh: true,
          },
        })
          .to(title, { y: -30, scale: 0.97, autoAlpha: 0.48, ease: "none" }, 0)
          .to(stagedIcons, { y: (index) => (index % 2 ? -24 : 22), autoAlpha: 0.32, ease: "none" }, 0)
          .to(identityEntry, { y: 22, autoAlpha: 0.26, ease: "none" }, 0);
      });
    });

    const entrance = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: settleHero });

    if (introMode === "full" && loader && loaderPanel) {
      entrance
        .to(loaderPanel, { xPercent: -108, duration: reduceMotion ? 0 : 0.3, ease: "power4.inOut" }, 0)
        .set(loader, { autoAlpha: 0, pointerEvents: "none" });
    } else if (loader) {
      gsap.set(loader, { autoAlpha: 0, pointerEvents: "none" });
    }

    entrance
      .to(stagedIcons, { autoAlpha: 1, scale: 1, x: 0, y: 0, rotate: 0, duration: reduceMotion ? 0 : 0.32, stagger: reduceMotion ? 0 : 0.018 }, reduceMotion ? 0 : 0.12)
      .to(identityEntry, { autoAlpha: 1, x: 0, y: 0, duration: reduceMotion ? 0 : 0.24 }, reduceMotion ? 0 : 0.1)
      .call(() => setTypeCard(introMode === "full" && !reduceMotion), [], 0.1);

    // Include card typing in the beat without sequencing it after the headline.
    if (introMode === "full" && !reduceMotion) entrance.to({}, { duration: 0.8 }, 0.1);

    const finishEntrance = contextSafe(() => {
      if (!settled) entrance.progress(1).pause();
    });
    const handleScroll = () => {
      if (hero.getBoundingClientRect().top < -8) finishEntrance();
    };
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => {
      if (motionPreference.matches) finishEntrance();
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    motionPreference.addEventListener("change", handleMotionChange);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      motionPreference.removeEventListener("change", handleMotionChange);
      media.revert();
    };
  }, { scope: heroRef, dependencies: [introMode], revertOnUpdate: true });

  return (
    <section ref={heroRef} className="home-hero" aria-labelledby="home-title">
      <div aria-hidden="true" className="home-intro">
        <div className="home-intro__panel">
          <div className="home-intro__content">
            <div className="home-intro__lockup">
              <Image alt="" className="home-intro__logo" height={200} priority src="/css_logo-nobg.png" width={365} />
              <p>Computer Science Society</p>
            </div>
          </div>
        </div>
      </div>
      <HeroTechField />

      <div className="page-shell home-hero__inner">
        <HomeHeroTyping enabled={Boolean(introMode)} />
        <div className="home-hero__identity-entry">
          <HeroIdentityCard site={site} typeOnReveal={typeCard} settled={introComplete} />
        </div>
      </div>
    </section>
  );
}
