"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type RefObject } from "react";
import { useNavigationState } from "@/components/providers/navigation-state-provider";
import { MerchBot } from "./merch-bot";
import { getMerchStackHeight } from "@/lib/animations/merch-layout";

// One print bot follows the showcase. Work is scheduled only on scroll/resize,
// instead of importing the source's perpetual layout-reading animation loop.
export function MerchBotGuide({ rootRef, ink }: { rootRef: RefObject<HTMLDivElement | null>; ink: string }) {
  const bot = useRef<HTMLDivElement>(null);
  const { isMenuActive } = useNavigationState();
  useGSAP(() => {
    const element = bot.current;
    // A child island can hydrate before the parent's ref is attached. Its own
    // mounted DOM already identifies the same scoped showcase container.
    const root = rootRef.current ?? element?.closest<HTMLDivElement>(".merch-showcase");
    if (!element || !root) return;
    const moveX = gsap.quickTo(element, "x", { duration: .35, ease: "power3.out" });
    const moveY = gsap.quickTo(element, "y", { duration: .35, ease: "power3.out" });
    const anchors = Array.from(root.querySelectorAll<HTMLElement>("[data-merch-bot-anchor]"));
    let frame = 0;
    function update() {
      frame = 0;
      const bounds = root!.getBoundingClientRect();
      element!.style.visibility = bounds.bottom > 100 && bounds.top < innerHeight && !document.hidden ? "visible" : "hidden";
      let x = innerWidth - 72, y = innerHeight - 110;
      let doctor = false;
      for (const anchor of anchors) {
        const section = anchor.closest("section")?.getBoundingClientRect();
        if (section && section.top < innerHeight * .55 && section.bottom > innerHeight * .45) {
          const box = anchor.getBoundingClientRect();
          x = box.right - 60; y = box.top + 8;
          doctor = anchor.dataset.merchBotAnchor === "pink";
          break;
        }
      }
      x = Math.max(8, Math.min(innerWidth - 72, x));
      y = Math.max(getMerchStackHeight() + 8, Math.min(innerHeight - 105, y));
      element!.dataset.doctor = String(doctor);
      element!.style.setProperty("--bot-ink", doctor ? "#c23f86" : ink);
      moveX(x); moveY(y);
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update(); gsap.set(element, { opacity: 1 });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); document.removeEventListener("visibilitychange", schedule); };
  }, { scope: rootRef, dependencies: [ink], revertOnUpdate: true });
  return <div className="merch-bot-guide" ref={bot} data-hidden={isMenuActive} aria-hidden="true"><MerchBot /></div>;
}
