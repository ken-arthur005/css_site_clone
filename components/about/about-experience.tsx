"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";
import { useSmoothScroll } from "@/components/providers/smooth-scroll-provider";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function AboutExperience({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { scrollToElement } = useSmoothScroll();

  useGSAP((context, contextSafe) => {
    const root = rootRef.current;
    if (!root) return;
    const media = gsap.matchMedia();
    media.add({ desktop: "(min-width: 1000px) and (min-height: 650px) and (hover: hover) and (pointer: fine)", active: "all" }, ({ conditions }) => {
      const entrance = gsap.timeline({ defaults: { ease: "power4.out", duration: 1.1 } });
      entrance.from(".about-opening__line > span", { yPercent: 105, stagger: 0.12 })
        .from(".about-opening__photo > .about-photo", { scale: 1.06, opacity: 0, duration: 1.25 }, 0.25)
        .from(".about-opening__note", { y: 18, opacity: 0, duration: 0.7 }, 0.65);

      if (conditions?.desktop) {
        const opening = root.querySelector<HTMLElement>(".about-opening");
        const photo = root.querySelector<HTMLElement>(".about-opening__photo");
        if (opening && photo) {
          const portal = gsap.timeline({ scrollTrigger: { trigger: opening, start: () => `top top+=${anchorOffset() - 20}`, end: "+=85%", pin: true, scrub: 0.7, invalidateOnRefresh: true } });
          portal.to(photo, {
            x: () => opening.clientWidth / 2 - (photo.offsetLeft + photo.offsetWidth / 2),
            y: () => opening.clientHeight / 2 - (photo.offsetTop + photo.offsetHeight / 2),
            scale: () => Math.max(opening.clientWidth / photo.offsetWidth, opening.clientHeight / photo.offsetHeight) * 1.04,
            rotation: 0, duration: 1, ease: "power2.inOut",
          }, 0)
            .to(".about-opening__title", { yPercent: -35, opacity: 0, duration: 0.55 }, 0)
            .to(".about-opening__photo-index, .about-opening__photo .about-cross", { opacity: 0, duration: 0.25 }, 0)
            .to(photo, { "--cover-shade": 0.6, duration: 0.6 }, 0.3)
            .fromTo(".about-opening__arrival", { y: 35, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, 0.6);
        }
      }

      // Reveal position, not text visibility: the document stays readable during
      // a direct anchor jump, without JS, or if an animation is interrupted.
      root.querySelectorAll<HTMLElement>("[data-about-reveal]").forEach((element) => {
        gsap.from(element, { y: 34, duration: 0.85, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 94%", once: true } });
      });

      root.querySelectorAll<HTMLElement>("[data-about-parallax]").forEach((element) => {
        const image = element.querySelector("img");
        if (!image) return;
        gsap.fromTo(image, { yPercent: -5, scale: 1.12 }, { yPercent: 5, scale: 1.12, ease: "none", scrollTrigger: { trigger: element, start: "clamp(top bottom)", end: "clamp(bottom top)", scrub: 0.7 } });
      });

      const community = root.querySelector(".about-community");
      gsap.to(".about-community__word", { xPercent: -12, ease: "none", scrollTrigger: { trigger: community, start: "top bottom", end: "bottom top", scrub: 0.8 } });

      if (conditions?.desktop) {
        const stage = root.querySelector<HTMLElement>(".about-convergence");
        if (stage) {
          const timeline = gsap.timeline({ scrollTrigger: { trigger: stage, start: () => `top top+=${anchorOffset() - 16}`, end: "+=70%", pin: true, scrub: 0.6, invalidateOnRefresh: true } });
          timeline.fromTo(".about-convergence__cs", { xPercent: -12, rotate: -6 }, { xPercent: 0, rotate: 0, duration: 1, ease: "none" }, 0)
            .fromTo(".about-convergence__it", { xPercent: 12, rotate: 6 }, { xPercent: 0, rotate: 0, duration: 1, ease: "none" }, 0)
            .fromTo(".about-convergence__connection", { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "none" }, 0)
            .from(".about-convergence__shared", { y: 30, opacity: 0, duration: 0.35 }, 0.65);
        }
      }
    });

    let disposed = false;
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (!disposed) ScrollTrigger.refresh(); });
    };
    const followHash = (instant: boolean) => {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (!id) return;
      const target = document.getElementById(id);
      if (!target || (!root.contains(target) && target.id !== "about-top")) return;
      if (target instanceof HTMLDetailsElement) target.open = true;
      scrollToElement(target, { offset: -anchorOffset(), immediate: instant });
      target.focus({ preventScroll: true });
    };
    function anchorOffset() {
      const header = document.querySelector<HTMLElement>(".site-header");
      const chapters = root?.querySelector<HTMLElement>(".about-chapters__bar");
      return (header?.offsetHeight ?? 80) + (chapters?.offsetHeight ?? 54) + 20;
    }
    const click = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      if (!link || !root.contains(link) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const hash = link.getAttribute("href");
      if (!hash || !document.getElementById(hash.slice(1))) return;
      event.preventDefault();
      if (window.location.hash !== hash) history.pushState(null, "", hash);
      followHash(false);
    };
    root.addEventListener("click", click);
    // The app coordinator owns URL/history alignment after route and font
    // layout settles. This component only scrolls for an explicit chapter click.
    void document.fonts.ready.then(() => {
      if (disposed) return;
      refresh();
    });
    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(root);
    // Complete outstanding reveal tweens when focusing content below the fold.
    const focus = contextSafe?.((event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const reveal = event.target.closest("[data-about-reveal]");
      if (reveal) gsap.getTweensOf(reveal).forEach((tween) => tween.progress(1));
    });
    if (focus) root.addEventListener("focusin", focus);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      root.removeEventListener("click", click);
      if (focus) root.removeEventListener("focusin", focus);
      media.revert();
    };
  }, { scope: rootRef, dependencies: [scrollToElement], revertOnUpdate: true });

  return <div ref={rootRef} className="about-experience">{children}</div>;
}
