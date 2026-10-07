"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useRef, useState } from "react";
import type { HomeLoadingPlan } from "@/types/loading";
import type { SiteInfo } from "@/types/site";
import { HeroIdentityCard } from "./hero-identity-card";
import { HeroTechField } from "./hero-tech-field";
import { HomeHeroTyping } from "./home-typing";
import { HomeLoader } from "./home-loader";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type IntroMode = "full" | "returning" | null;

export function HomeHero({ site, loadingPlan }: { site: SiteInfo; loadingPlan: HomeLoadingPlan }) {
  const heroRef = useRef<HTMLElement>(null);
  const [introMode, setIntroMode] = useState<IntroMode>(null);
  const [introComplete, setIntroComplete] = useState(false);
  const [typeCard, setTypeCard] = useState(false);
  const revealHero = useCallback((firstVisit: boolean) => {
    setIntroMode(firstVisit ? "full" : "returning");
  }, []);

  useGSAP((_context, contextSafe) => {
    if (!contextSafe) return;
    const hero = heroRef.current;

    if (!hero || !introMode) {
      return;
    }

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

    gsap.set(stagedIcons, { autoAlpha: 0, scale: 0.88, x: 0, y: 0, rotate: 0 });
    gsap.set(identityEntry, { autoAlpha: 0, x: 26, y: 18 });

    let settled = false;
    const settleHero = contextSafe(() => {
      if (settled) return;
      settled = true;
      setIntroComplete(true);

      // Create the exit only after the entrance has stopped writing transforms.
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

    const entrance = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: settleHero });

    entrance
      .to(stagedIcons, { autoAlpha: 1, scale: 1, x: 0, y: 0, rotate: 0, duration: 0.32, stagger: 0.018 }, 0.12)
      .to(identityEntry, { autoAlpha: 1, x: 0, y: 0, duration: 0.24 }, 0.1)
      .call(() => setTypeCard(introMode === "full"), [], 0.1);

    // Include card typing in the beat without sequencing it after the headline.
    if (introMode === "full") entrance.to({}, { duration: 0.8 }, 0.1);

    const finishEntrance = contextSafe(() => {
      if (!settled) entrance.progress(1).pause();
    });
    const handleScroll = () => {
      if (hero.getBoundingClientRect().top < -8) finishEntrance();
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, { scope: heroRef, dependencies: [introMode], revertOnUpdate: true });

  return (
    <>
      <HomeLoader plan={loadingPlan} onReveal={revealHero} />
      <section ref={heroRef} className="home-hero" aria-labelledby="home-title">
        <HeroTechField />

        <div className="page-shell home-hero__inner">
          <HomeHeroTyping enabled={Boolean(introMode)} />
          <div className="home-hero__identity-entry">
            <HeroIdentityCard site={site} typeOnReveal={typeCard} settled={introComplete} />
          </div>
        </div>
      </section>
    </>
  );
}
