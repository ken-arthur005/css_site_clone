"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { MerchImage } from "./merch-image";
import { MerchOrderLink, useMerchColourway } from "./merch-showcase";
import type { MerchStoreContent } from "@/types/merch-store";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function MerchTour({ story }: { story: MerchStoreContent["story"] }) {
  const { colourway } = useMerchColourway();
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(min-width: 1024px) and (min-height: 650px) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const element = root.current;
      if (!element) return;
      element.dataset.motion = "true";
      const steps = Array.from(element.querySelectorAll<HTMLElement>(".merch-tour__step"));
      const progress = element.querySelector(".merch-tour__progress span");
      const setProgress = progress ? gsap.quickSetter(progress, "scaleX") : null;
      const count = element.querySelector(".merch-tour__count b");
      const front = element.querySelector(".merch-tour__front");
      const back = element.querySelector(".merch-tour__back");
      const setStep = (index: number) => {
        steps.forEach((step, at) => {
          step.dataset.active = String(at === index);
          // Prevent focus jumping into a hidden CTA in the pinned composition.
          step.inert = at !== index;
        });
        if (count) count.textContent = String(index + 1).padStart(2, "0");
      };
      setStep(0);
      const timeline = gsap.timeline({ defaults: { ease: "power2.inOut" }, scrollTrigger: {
        trigger: element, pin: ".merch-tour__pin", start: "top top+=72", end: "+=2400", scrub: .55, invalidateOnRefresh: true,
        onUpdate: (self) => { setStep(Math.min(4, Math.floor(self.progress * 5))); setProgress?.(self.progress); },
      } });
      timeline.to(".merch-tour__zoom", { scale: 1, duration: .6 })
        .to(".merch-tour__zoom", { scale: 2.4, xPercent: 26, yPercent: 30, duration: .8 })
        .to(".merch-tour__zoom", { scale: 2.4, duration: .6 })
        .to(".merch-tour__zoom", { scale: 1.9, xPercent: -28, yPercent: 20, duration: .6 })
        .to(".merch-tour__zoom", { yPercent: -30, duration: 1 })
        .to(".merch-tour__zoom", { scale: 1, xPercent: 0, yPercent: 0, duration: .6 })
        .to(front, { rotationY: -180, opacity: 0, duration: .5 })
        .fromTo(back, { rotationY: 180, opacity: 0 }, { rotationY: 0, opacity: 1, duration: .5 }, "<")
        .to(".merch-tour__zoom", { scale: 1.7, yPercent: 15, duration: .8 })
        .to(".merch-tour__zoom", { yPercent: -12, duration: .7 })
        .to(".merch-tour__zoom", { scale: 1, xPercent: 0, yPercent: 0, duration: .8 });
      return () => { delete element.dataset.motion; steps.forEach((step) => { step.inert = false; delete step.dataset.active; }); };
    });
    return () => media.revert();
  }, { scope: root });
  return <section className="merch-tour" id="shirt-story" ref={root} aria-label="Tour of the CSS Tee design">
    <div className="merch-tour__pin">
      <div className="merch-tour__copy">
        <p className="merch-label merch-tour__count"><b>01</b> / 05 <span>Object inspection</span></p>
        <ol className="merch-tour__steps">{story.map((step, index) => <li className="merch-tour__step" key={step.title}>
          <span className="merch-tour__mobile-number merch-label">{String(index + 1).padStart(2, "0")} / 05</span>
          <h2>{step.title}</h2><p>{step.description}</p>
          {index === story.length - 1 && <MerchOrderLink className="merch-button">Make it yours <span aria-hidden="true">↗</span></MerchOrderLink>}
        </li>)}</ol>
      </div>
      <div className="merch-tour__stage" data-merch-bot-anchor="tour">
        <div className="merch-tour__zoom">
          <div className="merch-tour__front"><MerchImage src={colourway.front} alt={`${colourway.name} CSS Tee, front artwork`} /></div>
          <div className="merch-tour__back"><MerchImage src={colourway.back} alt={`${colourway.name} CSS Tee, back artwork`} /></div>
        </div>
        <p className="merch-tour__caption merch-label">{colourway.name} / {colourway.base} + {colourway.print}</p>
      </div>
      <div className="merch-tour__progress" aria-hidden="true"><span /></div>
    </div>
  </section>;
}
