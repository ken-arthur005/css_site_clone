"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
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
  const [introProgress, setIntroProgress] = useState(0);
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
      const tasks = [document.fonts?.ready ?? Promise.resolve(), ...images.map(waitForImage)];
      let complete = 0;
      const ready = Promise.all(tasks.map((task) => task.then(() => {
        complete += 1;
        setIntroProgress(Math.round((complete / tasks.length) * 100));
      }))).then(() => undefined);
      const failSafeReady = new Promise<void>((resolve) => {
        failSafe = window.setTimeout(resolve, 1500);
      });

      await Promise.race([ready, failSafeReady]);
      window.clearTimeout(failSafe);

      if (!cancelled) {
        setIntroProgress(100);
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
    const titleLines = Array.from(hero.querySelectorAll<HTMLElement>(".home-hero__title-line"));
    const typedText = titleLines.map((line) => line.querySelector<HTMLElement>(".home-hero__typed-text"));
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

    if (introMode === "full" && !reduceMotion) {
      typedText.forEach((text) => {
        if (text) text.textContent = "";
      });
    }

    gsap.set(titleLines, { autoAlpha: introMode === "full" && !reduceMotion ? 0 : 1, yPercent: introMode === "full" && !reduceMotion ? 14 : 0 });
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

    if (introMode === "full" && loader && loaderPanel) {
      entrance
        .to(loaderPanel, { xPercent: -108, duration: 0.68, ease: "power4.inOut" }, "+=0.12")
        .set(loader, { autoAlpha: 0, pointerEvents: "none" });
    }

    if (introMode === "full" && !reduceMotion) {
      titleLines.forEach((line, index) => {
        const text = typedText[index];
        const word = line.dataset.word ?? "";
        const typing = { progress: 0 };

        entrance
          .to(line, { autoAlpha: 1, yPercent: 0, duration: 0.18 }, index === 0 ? "<0.06" : "+=0.12")
          .to(typing, {
            progress: word.length,
            duration: Math.max(0.28, word.length * 0.085),
            ease: "none",
            onUpdate: () => {
              if (text) text.textContent = word.slice(0, Math.floor(typing.progress));
            },
          });
      });
    } else {
      entrance.to(titleLines, { autoAlpha: 1, yPercent: 0, duration: reduceMotion ? 0 : 0.34, stagger: 0.055 }, introMode === "full" ? "<0.06" : 0);
    }

    entrance
      .to(stagedIcons, { autoAlpha: 1, scale: 1, x: 0, y: 0, rotate: 0, duration: reduceMotion ? 0 : 0.68, ease: "back.out(1.7)", stagger: reduceMotion ? 0 : 0.045 }, "+=0.04")
      .to(identityEntry, { autoAlpha: 1, x: 0, y: 0, duration: reduceMotion ? 0 : 0.42 }, "<0.16");

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
            <p className="home-intro__progress">{introProgress}%</p>
            <div className="home-intro__lockup">
              <Image alt="" className="home-intro__logo" height={200} priority src="/css_logo-nobg.png" width={365} />
              <p>Computer Science Society</p>
            </div>
          </div>
        </div>
      </div>
      <HomeAssetPreloader active={introComplete} />
      <HeroTechField />

      <div className="page-shell home-hero__inner">
        <h1 aria-label="Think. Build. Become." className="home-hero__title" id="home-title">
          <span className="home-hero__title-line" data-word="THINK"><span aria-hidden="true" className="home-hero__typed-text">THINK</span></span>
          <span className="home-hero__title-line" data-word="BUILD"><span aria-hidden="true" className="home-hero__typed-text">BUILD</span></span>
          <span className="home-hero__title-line" data-word="BECOME"><span aria-hidden="true" className="home-hero__typed-text">BECOME</span></span>
        </h1>
        <div className="home-hero__identity-entry">
          <HeroIdentityCard site={site} typeOnReveal={typeCard} />
        </div>
      </div>
    </section>
  );
}
