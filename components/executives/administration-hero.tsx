"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

export function AdministrationHero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      // Full text is already in the document; the visual letters alone are animated.
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .from(".administration-hero__logo", { opacity: 0, y: 20, scale: 0.94, duration: 0.65 }, 0.15)
        .from(".administration-hero__letter", { opacity: 0, duration: 0.01, stagger: 0.055 }, ">0.08")
        .from(".administration-hero__context", { opacity: 0, y: 8, duration: 0.35 }, "<0.3");
    });
    return () => media.revert();
  }, { scope: root });

  return (
    <section className="administration-hero" ref={root} aria-labelledby="administration-title">
      <Image className="administration-hero__photo" src="/cos_landscape.jpeg" alt="" fill sizes="100vw" priority />
      <div className="administration-hero__overlay" />
      <div className="administration-hero__inner">
        <div className="administration-hero__title">
          <Image className="administration-hero__logo" src="/CSS267.png" width={727} height={269} alt="" sizes="(max-width: 600px) 300px, 440px" priority />
          <h1 id="administration-title">
            <span className="sr-only">CSS KNUST 2026/27 Administration</span>
            <span className="administration-hero__word" aria-hidden="true">
              {Array.from("Administration").map((letter, index) => <span className="administration-hero__letter" key={index}>{letter}</span>)}
            </span>
          </h1>
        </div>
        <p className="administration-hero__context">Computer Science Society <span aria-hidden="true">/</span> KNUST</p>
      </div>
    </section>
  );
}
