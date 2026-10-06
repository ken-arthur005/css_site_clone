"use client";

import dynamic from "next/dynamic";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import { MerchImage } from "./merch-image";
import { MerchOrderLink, useMerchColourway } from "./merch-showcase";
import type { MerchProduct } from "@/types/merch";
import type { TeeColourway } from "@/types/merch-store";

const ShirtViewer = dynamic(() => import("./merch-shirt-viewer").then((module) => module.MerchShirtViewer), { ssr: false });

export function MerchHero({ modelProduct, colourways }: { modelProduct: MerchProduct; colourways: TeeColourway[] }) {
  const { colourway, select } = useMerchColourway();
  const root = useRef<HTMLElement>(null);
  const [readyVariant, setReadyVariant] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<"3d" | "front" | "back">("3d");
  const variant = modelProduct.variants.find(({ id }) => id === colourway.modelVariantId) ?? modelProduct.variants[0];
  const textureSources = useMemo(() => modelProduct.variants.map(({ texture }) => texture.src), [modelProduct]);
  const onReady = useCallback(() => setReadyVariant(variant.id), [variant.id]);
  const onFailure = useCallback(() => { setFailed(true); setReadyVariant(null); }, []);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".merch-hero__title > span", { yPercent: 105, stagger: .1, duration: 1, ease: "power4.out" });
      gsap.from(".merch-hero__detail", { y: 18, opacity: 0, duration: .7, stagger: .08, delay: .2 });
    });
    return () => media.revert();
  }, { scope: root });

  return <section className="merch-hero" ref={root} aria-labelledby="merch-title" style={{ "--bot-ink": colourway.printValue } as CSSProperties}>
    <div className="merch-hero__copy">
      <p className="merch-label merch-hero__detail">Computer Science Society<br />KNUST · 2026 drop</p>
      <h1 className="merch-hero__title" id="merch-title"><span>Wear the</span><span>society<span className="merch-hero__period">.</span></span></h1>
      <p className="merch-hero__blurb merch-hero__detail">We make more than merch. Clothes that compile,<br className="merch-desktop-break" /> crash and still look good on you.</p>
      <div className="merch-colourways merch-hero__detail" role="group" aria-label="CSS Tee colourways">
        {colourways.map((item) => <button key={item.id} type="button" aria-pressed={item.id === colourway.id} aria-label={`${item.name}: ${item.base} fabric, ${item.print} print`} onClick={() => select(item.id)}>
          <MerchImage src={item.front} alt="" sizes="72px" />
        </button>)}
      </div>
      <p className="merch-hero__colourway merch-hero__detail">colourway: <strong>{colourway.name}</strong></p>
      <div className="merch-hero__detail"><MerchOrderLink className="merch-button">Start your order <span aria-hidden="true">↗</span></MerchOrderLink></div>
    </div>
    <div className="merch-hero__visual" data-merch-bot-anchor="hero">
      <div className="merch-hero__stage" data-ready={readyVariant === variant.id && view === "3d" && !failed}>
        <div className="merch-hero__fallback"><MerchImage src={view === "back" ? colourway.back : variant.fallbackImage.src} alt={`${colourway.base} CSS Tee with ${colourway.print} print, ${view === "back" ? "back" : "front"}`} priority /></div>
        {!failed && modelProduct.model && view === "3d" && <ShirtViewer model={modelProduct.model} variant={variant} textureSources={textureSources} onReady={onReady} onFailure={onFailure} />}
        <div className="merch-hero__scan" key={colourway.id} aria-hidden="true" />
      </div>
      <div className="merch-hero__view-controls" role="group" aria-label="Shirt view">
        {!failed && <button type="button" aria-pressed={view === "3d"} onClick={() => { if (view !== "3d") { setReadyVariant(null); setView("3d"); } }}>3D / drag to rotate</button>}
        <button type="button" aria-pressed={view === "front"} onClick={() => setView("front")}>Front</button>
        <button type="button" aria-pressed={view === "back"} onClick={() => setView("back")}>Back</button>
      </div>
      <span className="merch-hero__stamp" aria-hidden="true"><span>CSS · KNUST · MERCH</span><b>26/27</b></span>
    </div>
    <a className="merch-hero__scroll merch-label" href="#shirt-story">Scroll to inspect <span aria-hidden="true">↓</span></a>
  </section>;
}
