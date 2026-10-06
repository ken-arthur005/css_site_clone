"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function FooterArrival({ footerRef }: { footerRef: RefObject<HTMLElement | null> }) {
  useGSAP(() => {
    const media = gsap.matchMedia();

    media.add("(min-width: 48rem) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const footer = footerRef.current;
      if (!footer) return;

      const sections = footer.querySelectorAll(".site-footer__mark, .site-footer__explore, .site-footer__base");
      const arrival = gsap.from(sections, {
        opacity: 0,
        y: 18,
        duration: 0.35,
        stagger: 0.045,
        ease: "power3.out",
        scrollTrigger: {
          trigger: footer,
          start: "top 90%",
          once: true,
        },
      });

      // Keyboard focus may arrive before the scroll reveal. Never leave a
      // focused footer link transparent while waiting for the entrance.
      const revealForFocus = () => { arrival.progress(1); };
      footer.addEventListener("focusin", revealForFocus);
      return () => footer.removeEventListener("focusin", revealForFocus);
    });

    return () => media.revert();
  }, { scope: footerRef });

  return null;
}
