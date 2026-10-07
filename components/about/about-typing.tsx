"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type ReactNode } from "react";

gsap.registerPlugin(useGSAP);

export function AboutTyping({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const visualRef = useRef<HTMLSpanElement>(null);
  const playedRef = useRef(false);

  useGSAP(() => {
    const root = rootRef.current;
    const visual = visualRef.current;
    if (!root || !visual || playedRef.current) return;
    // Keep the original formatted text in the sizing layer. Only the visual copy
    // changes, preserving kerning, italics, line breaks, and the full heading box.
    const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; letters: string[] }[] = [];
    while (walker.nextNode()) nodes.push({ node: walker.currentNode as Text, letters: Array.from(walker.currentNode.textContent ?? "") });
    const total = nodes.reduce((sum, { letters }) => sum + letters.length, 0);
    if (!total) return;
    let lastCount = -1;
    const render = (count: number) => {
      if (lastCount === count) return;
      lastCount = count;
      let remaining = count;
      for (const { node, letters } of nodes) {
        node.data = letters.slice(0, Math.max(0, remaining)).join("");
        remaining -= letters.length;
      }
    };
    render(0);
    root.dataset.typing = "waiting";
    const progress = { count: 0 };
    const tween = gsap.to(progress, {
      count: total, duration: Math.min(2, Math.max(0.95, total * 0.028)), ease: "none", paused: true,
      onUpdate: () => render(Math.floor(progress.count)),
      onComplete: () => { root.dataset.typing = "complete"; },
    });
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || playedRef.current) return;
      playedRef.current = true;
      root.dataset.typing = "typing";
      tween.play();
      observer.disconnect();
    }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });
    observer.observe(root);
    return () => {
      observer.disconnect();
      nodes.forEach(({ node, letters }) => { node.data = letters.join(""); });
      delete root.dataset.typing;
    };
  }, { scope: rootRef });

  return <span className="about-typing" ref={rootRef}>
    <span className="about-typing__source">{children}</span>
    <span className="about-typing__visual" ref={visualRef} aria-hidden="true">{children}</span>
  </span>;
}
