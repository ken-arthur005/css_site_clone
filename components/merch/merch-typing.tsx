"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type ReactNode } from "react";
import { getMerchStackHeight, MERCH_TYPE_EVENT } from "@/lib/animations/merch-layout";

gsap.registerPlugin(useGSAP);

export function MerchTyping({ children, duration = 1, tourStep = false }: {
  children: ReactNode; duration?: number; tourStep?: boolean;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const visual = useRef<HTMLSpanElement>(null);
  const played = useRef(false);
  useGSAP(() => {
    const element = root.current, copy = visual.current;
    if (!element || !copy) return;
    if (played.current) return;
    const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; letters: string[] }[] = [];
    while (walker.nextNode()) nodes.push({ node: walker.currentNode as Text, letters: Array.from(walker.currentNode.textContent ?? "") });
    const total = nodes.reduce((sum, { letters }) => sum + letters.length, 0);
    if (!total) return;
    const caret = document.createElement("i");
    caret.className = "merch-typing__caret";
    caret.setAttribute("aria-hidden", "true");
    let lastCount = -1;
    const render = (count: number) => {
      if (lastCount === count) return;
      lastCount = count;
      let remaining = count;
      let current = nodes[0].node;
      for (const { node, letters } of nodes) {
        const length = Math.min(letters.length, Math.max(0, remaining));
        node.data = letters.slice(0, length).join("");
        if (remaining > 0) current = node;
        remaining -= letters.length;
      }
      current.after(caret);
    };
    render(0);
    element.dataset.typing = "waiting";
    const progress = { count: 0 };
    // Create the paused tween inside the scoped GSAP context. Observers/events
    // only play it; no untracked timelines or React updates per character.
    const tween = gsap.to(progress, { count: total, duration, ease: "none", paused: true,
      onUpdate: () => render(Math.floor(progress.count)),
      onComplete: () => { caret.remove(); element.dataset.typing = "complete"; },
    });
    const start = () => {
      if (played.current || element.closest("[inert]")) return;
      const step = element.closest<HTMLElement>(".merch-tour__step");
      if (tourStep && step?.closest(".merch-tour[data-motion=true]") && step.dataset.active !== "true") return;
      played.current = true;
      element.dataset.typing = "typing";
      tween.play();
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) start();
    }, { threshold: .2, rootMargin: `-${getMerchStackHeight()}px 0px -10% 0px` });
    observer.observe(element);
    if (tourStep) element.addEventListener(MERCH_TYPE_EVENT, start);
    return () => {
      observer.disconnect(); element.removeEventListener(MERCH_TYPE_EVENT, start);
      caret.remove(); nodes.forEach(({ node, letters }) => { node.data = letters.join(""); });
      delete element.dataset.typing;
    };
  }, { scope: root });
  return <span className="merch-typing" ref={root}>
    <span className="merch-typing__source">{children}</span>
    <span className="merch-typing__visual" ref={visual} aria-hidden="true">{children}</span>
  </span>;
}
