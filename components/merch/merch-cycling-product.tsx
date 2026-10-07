"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigationState } from "@/components/providers/navigation-state-provider";
import { money } from "@/lib/merch/order";
import type { TeeProduct } from "@/types/merch-store";
import { MerchImage } from "./merch-image";
import { MerchOrderLink } from "./merch-showcase";

export function MerchCyclingProduct({ product }: { product: TeeProduct }) {
  const root = useRef<HTMLElement>(null);
  const held = useRef(false);
  const [index, setIndex] = useState(0);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [paused, setPaused] = useState(false);
  const { isMenuActive } = useNavigationState();
  const colourway = product.colourways[index];

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const nearby = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNear(true); nearby.disconnect(); } }, { rootMargin: "100% 0px" });
    const viewport = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .05 });
    nearby.observe(element); viewport.observe(element);
    return () => { nearby.disconnect(); viewport.disconnect(); };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer); timer = undefined;
      if (!visible || hovered || focused || pressed || paused || isMenuActive || document.hidden) return;
      timer = setInterval(() => {
        // Pointer/focus events freeze the selected colourway synchronously, before
        // effects can clean up the timer. A tap always orders what was displayed.
        if (!held.current) setIndex((current) => (current + 1) % product.colourways.length);
      }, 1000);
    };
    sync(); document.addEventListener("visibilitychange", sync);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", sync); };
  }, [visible, hovered, focused, pressed, paused, isMenuActive, product.colourways.length]);

  return <article className="merch-product merch-cycle" ref={root} data-colourway={colourway.id} data-cycling={visible && !hovered && !focused && !pressed && !paused && !isMenuActive}
    onPointerEnter={(event) => { if (event.pointerType !== "touch") { held.current = true; setHovered(true); } }}
    onPointerLeave={() => { held.current = false; setHovered(false); setPressed(false); }}
    onPointerDown={() => { held.current = true; setPressed(true); }}
    onPointerCancel={() => { held.current = false; setPressed(false); }}
    onClickCapture={() => { held.current = false; setPressed(false); }}
    onFocusCapture={() => { held.current = true; setFocused(true); }}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { held.current = false; setFocused(false); } }}>
    <div className="merch-cycle__frame">
      <MerchOrderLink product={product.id} colourwayId={colourway.id} className="merch-product__image" ariaLabel={`Choose ${product.name} in ${colourway.name}`}>
        <span className="merch-label merch-product__tag">Six colourways</span>
        {product.colourways.map((item, at) => (near || at === 0) && <span className="merch-cycle__slide" key={item.id} data-active={at === index} aria-hidden={at !== index}>
          <MerchImage src={item.front} alt={`${product.name}: ${item.name}, ${item.base} fabric with ${item.print} print`} />
        </span>)}
        <span className="merch-product__arrow" aria-hidden="true">↗</span>
      </MerchOrderLink>
      <div className="merch-cycle__controls">
        <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused} aria-label={paused ? "Resume automatic colourway preview" : "Pause automatic colourway preview"} title="Cycling also pauses while you hover or focus this card.">{paused ? "Play" : "Pause"} <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span></button>
        <span className="merch-label">{String(index + 1).padStart(2, "0")} / {String(product.colourways.length).padStart(2, "0")} · {colourway.name}</span>
      </div>
    </div>
    <div className="merch-product__meta"><div><h3><MerchOrderLink product={product.id} colourwayId={colourway.id}>{product.name}</MerchOrderLink></h3><p>{product.description}</p></div><p>From <strong>{money(product.priceMinor)}</strong></p></div>
  </article>;
}
