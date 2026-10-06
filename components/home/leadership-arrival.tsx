"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";
import { HOME_DESKTOP_MOTION } from "@/lib/animations/home-media";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const title = "The people moving CSS forward.";

export function LeadershipArrival({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const root = rootRef.current;
    const section = root?.closest<HTMLElement>(".home-executives");
    const cards = root?.querySelectorAll<HTMLElement>(".home-executive-card");
    const allLink = root?.querySelector<HTMLElement>(".home-executive-gallery__all");
    const characters = root?.querySelectorAll<HTMLElement>(".leadership-arrival__character");
    if (!root || !section || !cards?.length || !characters?.length) return;

    const media = gsap.matchMedia();
    media.add(HOME_DESKTOP_MOTION, () => {
      const galleryItems = [...cards, ...(allLink ? [allLink] : [])];
      gsap.set(galleryItems, { autoAlpha: 0, y: 28 });
      gsap.set(characters, { opacity: 0 });

      const timeline = gsap.timeline({ paused: true })
        .to(characters, {
          opacity: 1,
          duration: 0,
          stagger: 0.65 / characters.length,
        })
        .to(cards, { autoAlpha: 1, y: 0, duration: 0.32, ease: "power3.out", stagger: 0.035 }, 0.12);

      if (allLink) {
        timeline.to(allLink, { autoAlpha: 1, y: 0, duration: 0.32, ease: "power3.out" }, "<0.24");
      }

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top 22%",
        onEnter: () => timeline.play(),
        onLeaveBack: () => timeline.reverse(),
      });

      return () => {
        trigger.kill();
        timeline.kill();
      };
    });

    return () => media.revert();
  }, { scope: rootRef });

  return (
    <div className="page-shell home-executives__content" ref={rootRef}>
      <div className="home-section-heading leadership-arrival">
        <div>
          <p className="eyebrow text-accent-strong">02 / Leadership</p>
          <h2 className="home-section-title" id="executives-title">
            <span className="sr-only">{title}</span>
            <span aria-hidden="true">
              {title.split(" ").map((word, wordIndex) => (
                <span key={wordIndex}>
                  {wordIndex > 0 && " "}
                  <span className="leadership-arrival__word">
                    {[...word].map((character, characterIndex) => (
                      <span className="leadership-arrival__character" key={characterIndex}>{character}</span>
                    ))}
                  </span>
                </span>
              ))}
            </span>
          </h2>
        </div>
        <p className="home-section-heading__note">Meet the 2026 / 27 administration.</p>
      </div>
      {children}
    </div>
  );
}
