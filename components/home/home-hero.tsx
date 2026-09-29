"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { hasSeenHomeIntro, markHomeIntroSeen } from "@/lib/home-intro";
import type { SiteInfo } from "@/types/site";
import { HomeAssetPreloader } from "./home-asset-preloader";
import { HeroIdentityCard } from "./hero-identity-card";
import { HeroTechField } from "./hero-tech-field";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type IntroMode = "full" | "returning" | null;

const introBootScript = `(() => {
  try {
    document.documentElement.dataset.homeIntro = sessionStorage.getItem("css-home-intro-seen") === "true" ? "seen" : "new";
  } catch {
    document.documentElement.dataset.homeIntro = "seen";
  }
})();`;

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

    const hero = heroRef.current;
    let cancelled = false;
    let failSafe = 0;

    const waitForImage = (image: HTMLImageElement) => {
      if (image.complete) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    };

    const waitForCriticalHero = async () => {
      const images = Array.from(hero?.querySelectorAll<HTMLImageElement>("img") ?? []);
      const fonts = document.fonts?.ready ?? Promise.resolve();
      const ready = Promise.all([fonts, ...images.map(waitForImage)]).then(() => undefined);
      const failSafeReady = new Promise<void>((resolve) => {
        failSafe = window.setTimeout(resolve, 1500);
      });

      await Promise.race([ready, failSafeReady]);
      window.clearTimeout(failSafe);

      if (!cancelled) {
        setIntroMode("full");
      }
    };

    void waitForCriticalHero();
    return () => {
      cancelled = true;
      window.clearTimeout(failSafe);
    };
  }, [introMode]);

  useEffect(() => {
    if (introMode !== "full" || introComplete) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [introComplete, introMode]);

  useGSAP(() => {
    const hero = heroRef.current;

    if (!hero || !introMode) {
      return;
    }

    const loader = hero.querySelector<HTMLElement>(".home-intro");
    const loaderPanel = hero.querySelector<HTMLElement>(".home-intro__panel");
    const loaderRule = hero.querySelector<HTMLElement>(".home-intro__rule-fill");
    const titleLines = Array.from(hero.querySelectorAll<HTMLElement>(":scope .home-hero__title > span"));
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

    gsap.set(titleLines, { yPercent: 112, rotate: 1.5 });
    gsap.set(stagedIcons, { autoAlpha: 0, scale: 0.88, x: (index) => (index % 2 ? -18 : 16), y: (index) => (index % 3 - 1) * 15, rotate: (index) => (index % 2 ? -7 : 6) });
    gsap.set(identityEntry, { autoAlpha: 0, x: 26, y: 18 });

    const exitTimeline = gsap.timeline({
      paused: true,
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom 58%",
        scrub: window.matchMedia("(max-width: 47.99rem)").matches ? 0.15 : 0.35,
        invalidateOnRefresh: true,
      },
    });

    exitTimeline
      .to(title, { y: -30, scale: 0.97, autoAlpha: 0.48, ease: "none" }, 0)
      .to(stagedIcons, { y: (index) => (index % 2 ? -24 : 22), autoAlpha: 0.32, ease: "none", stagger: 0.01 }, 0)
      .to(identityEntry, { y: 22, autoAlpha: 0.26, ease: "none" }, 0);
    exitTimeline.scrollTrigger?.disable();

    const enableExit = () => {
      exitTimeline.scrollTrigger?.enable();
      ScrollTrigger.refresh();
    };

    const settleHero = () => {
      setIntroComplete(true);
      setTypeCard(true);
      if (introMode === "full") {
        markHomeIntroSeen();
      }
      enableExit();
    };

    const entrance = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: settleHero });

    if (introMode === "full" && loader && loaderPanel && loaderRule) {
      entrance
        .fromTo(loaderRule, { scaleX: 0 }, { scaleX: 1, duration: 0.42, ease: "power2.inOut" })
        .to(loaderPanel, { xPercent: -112, duration: 0.58, ease: "power4.inOut" }, "+=0.08")
        .set(loader, { autoAlpha: 0, pointerEvents: "none" });
    }

    entrance
      .to(titleLines, { yPercent: 0, rotate: 0, duration: introMode === "full" ? 0.54 : 0.34, stagger: introMode === "full" ? 0.1 : 0.055 }, introMode === "full" ? "<0.08" : 0)
      .to(stagedIcons, { autoAlpha: 1, scale: 1, x: 0, y: 0, rotate: 0, duration: introMode === "full" ? 0.5 : 0.32, stagger: introMode === "full" ? 0.035 : 0.02 }, "<0.05")
      .to(identityEntry, { autoAlpha: 1, x: 0, y: 0, duration: introMode === "full" ? 0.42 : 0.28 }, "<0.12");

    return () => {
      exitTimeline.scrollTrigger?.kill();
    };
  }, { scope: heroRef, dependencies: [introMode], revertOnUpdate: true });

  return (
    <section ref={heroRef} className="home-hero" aria-labelledby="home-title">
      <script dangerouslySetInnerHTML={{ __html: introBootScript }} />
      <div aria-hidden="true" className="home-intro">
        <div className="home-intro__panel">
          <div className="home-intro__content">
            <div className="home-intro__rule"><span className="home-intro__rule-fill" /></div>
          </div>
        </div>
      </div>
      <HomeAssetPreloader active={introComplete} />
      <HeroTechField />

      <div className="page-shell home-hero__inner">
        <h1 className="home-hero__title" id="home-title">
          <span>THINK.</span>
          <span>BUILD.</span>
          <span>BECOME<span className="home-hero__title-period">.</span></span>
        </h1>
        <div className="home-hero__identity-entry">
          <HeroIdentityCard site={site} typeOnReveal={typeCard} />
        </div>
      </div>
    </section>
  );
}
