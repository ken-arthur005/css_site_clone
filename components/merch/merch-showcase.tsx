"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import type { TeeColourway, TeeId } from "@/types/merch-store";
import { MerchBotGuide } from "./merch-bot-guide";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const ColourwayContext = createContext<{ colourway: TeeColourway; select: (id: string) => void } | null>(null);
function subscribeClock(listener: () => void) {
  const timer = window.setInterval(listener, 60000);
  return () => window.clearInterval(timer);
}
export function useMerchColourway() {
  const context = useContext(ColourwayContext);
  if (!context) throw new Error("Merch colourways need the showcase provider.");
  return context;
}

export function MerchOrderLink({ children, product = "css-tee", colourwayId, className = "", availableUntil }: {
  children: ReactNode; product?: TeeId; colourwayId?: string; className?: string; availableUntil?: string;
}) {
  const context = useContext(ColourwayContext);
  const open = useSyncExternalStore(subscribeClock, () => !availableUntil || Date.now() < Date.parse(`${availableUntil}T23:59:59.999Z`) + 1, () => true);
  const cw = colourwayId ?? (product === "css-tee" ? context?.colourway.id : "pink-october");
  const query = new URLSearchParams({ product, ...(cw ? { cw } : {}) });
  if (!open) return <span className={`${className} merch-ended`} aria-disabled="true">{children}<span className="merch-label">Edition ended</span></span>;
  return <TransitionLink href={`/merch/shop?${query}`} className={className} transitionLabel="SHOP">{children}</TransitionLink>;
}

export function MerchShowcase({ colourways, children }: { colourways: TeeColourway[]; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState(colourways[0].id);
  useEffect(() => {
    const ambient = root.current?.querySelector<HTMLElement>(".merch-band > div");
    if (!ambient) return;
    let visible = false;
    const update = () => { ambient.style.animationPlayState = visible && !document.hidden ? "running" : "paused"; };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(ambient.parentElement!); document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      root.current?.querySelectorAll<HTMLElement>("[data-merch-reveal]").forEach((element) => {
        gsap.from(element, { y: 32, opacity: 0, duration: .8, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 94%", once: true } });
      });
    });
    let mounted = true;
    document.fonts.ready.then(() => { if (mounted) ScrollTrigger.refresh(); });
    return () => { mounted = false; media.revert(); };
  }, { scope: root });
  const colourway = colourways.find(({ id }) => id === selectedId) ?? colourways[0];
  return <ColourwayContext.Provider value={{ colourway, select: setSelectedId }}>
    <div className="merch-showcase" ref={root}>{children}<MerchBotGuide rootRef={root} ink={colourway.printValue} /></div>
  </ColourwayContext.Provider>;
}
