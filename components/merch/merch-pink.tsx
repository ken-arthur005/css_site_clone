"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useId, useRef, useState } from "react";
import { MerchImage } from "./merch-image";
import { MerchOrderLink } from "./merch-showcase";
import { MerchTyping } from "./merch-typing";

export function MerchPink({ facts, availableUntil }: { facts: string[]; availableUntil: string }) {
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const factsRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [fact, setFact] = useState(0);
  const ribbonId = useId().replace(/:/g, "");
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("keydown", close);
    factsRef.current?.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  useGSAP(() => {
    const path = root.current?.querySelector<SVGPathElement>(".merch-pink__ribbon path");
    if (!path) return;
    const length = path.getTotalLength();
    gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 2.2, ease: "power2.inOut", scrollTrigger: { trigger: root.current, start: "top 70%", once: true } });
    gsap.from(".merch-pink__shirt", { y: 55, rotation: -4, opacity: 0, stagger: .15, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 75%", once: true } });
  }, { scope: root });
  return <section className="merch-pink" id="pink-october" ref={root} aria-labelledby="pink-title">
    <div className="merch-pink__top">
      <div className="merch-pink__copy">
        <p className="merch-label">{"// limited edition · October 2026"}</p>
        <h2 id="pink-title"><MerchTyping>debugCancer<span>(cure)</span></MerchTyping></h2>
        <p className="merch-pink__lede">October is Breast Cancer Awareness Month. Wear the reminder: check on yourself, check on the people you love.</p>
        <div className="merch-pink__actions">
          <MerchOrderLink product="pink-october" availableUntil={availableUntil} className="merch-button">Choose Pink October <span aria-hidden="true">↗</span></MerchOrderLink>
          <button type="button" className="merch-text-button" ref={trigger} aria-expanded={open} aria-controls="merch-awareness-facts" onClick={() => setOpen(!open)}>Breast cancer awareness <span aria-hidden="true">{open ? "−" : "+"}</span></button>
        </div>
        <p className="merch-pink__deadline">Order through {new Date(`${availableUntil}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" })}.</p>
      </div>
      <div className="merch-pink__visual" data-merch-bot-anchor="pink">
        <svg viewBox="0 0 300 380" className="merch-pink__ribbon" aria-hidden="true"><defs><path id={ribbonId} d="M206 372 C180 340 160 320 112 262 C74 214 66 150 104 96 C128 62 172 62 196 96 C234 150 226 214 188 262 C140 320 120 340 94 372" /></defs><use href={`#${ribbonId}`} fill="none" stroke="currentColor" strokeWidth="8" opacity=".12" /><text dominantBaseline="central"><textPath href={`#${ribbonId}`}>{"01000001 01010111 01000001 01010010 01000101 01001110 01000101 01010011 01010011 ".repeat(5)}</textPath></text></svg>
        <div className="merch-pink__shirt merch-pink__shirt--front"><MerchImage src="/merch/pink/front.webp" alt="Pink October Tee, front with awareness ribbon and debugCancer(cure) artwork" /></div>
        <div className="merch-pink__shirt merch-pink__shirt--back"><MerchImage src="/merch/pink/back.webp" alt="Pink October Tee, back awareness artwork" /></div>
      </div>
    </div>
    <div id="merch-awareness-facts" className="merch-pink__facts" hidden={!open} ref={factsRef} tabIndex={-1}>
      <p className="merch-label">Awareness / {fact + 1} of {facts.length}</p><p aria-live="polite">{facts[fact]}</p>
      <button className="merch-text-button" type="button" onClick={() => setFact((value) => (value + 1) % facts.length)}>Next thought →</button>
      <button className="merch-text-button" type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Close ×</button>
    </div>
    <div className="merch-pink__awareness">
      <article><span className="merch-label">01 / Know yourself</span><h3>Notice changes.</h3><p>Get to know what is normal for you. A new lump, skin change or unusual nipple discharge deserves a conversation with a healthcare professional.</p></article>
      <article><span className="merch-label">02 / Make space</span><h3>Talk about it.</h3><p>Awareness belongs to everyone. Check in with the people you love, and encourage them to seek advice if something feels different.</p></article>
      <article><span className="merch-label">03 / Ask for help</span><h3>Get it checked.</h3><p>Don’t try to diagnose a change yourself. Speak to a qualified healthcare professional about your concerns and appropriate screening.</p></article>
    </div>
    <p className="merch-pink__note">General awareness information, not medical advice. A self-check does not replace professional assessment or screening.</p>
  </section>;
}
