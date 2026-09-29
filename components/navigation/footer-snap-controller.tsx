"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type RefObject } from "react";
import { useSmoothScroll } from "@/components/providers/smooth-scroll-provider";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function FooterSnapController({ footerRef }: { footerRef: RefObject<HTMLElement | null> }) {
  const { scrollToElement } = useSmoothScroll();
  const armedRef = useRef(true);

  useGSAP(() => {
    const media = gsap.matchMedia();

    media.add("(min-width: 48rem) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const footer = footerRef.current;
      if (!footer) return;

      const arrival = ScrollTrigger.create({
        trigger: footer,
        start: "top 82%",
        end: "top top",
        onEnter: (trigger) => {
          if (trigger.direction <= 0 || !armedRef.current) return;

          armedRef.current = false;
          scrollToElement(footer);
        },
        onLeaveBack: () => { armedRef.current = true; },
      });

      requestAnimationFrame(() => ScrollTrigger.refresh());
      return () => arrival.kill();
    });

    return () => media.revert();
  }, { dependencies: [scrollToElement], revertOnUpdate: true, scope: footerRef });

  return null;
}
