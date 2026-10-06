"use client";

import { useEffect, useId, useRef } from "react";
import { useNavigationState } from "@/components/providers/navigation-state-provider";

// The supplied print bot, rendered as one scoped SVG instead of global DOM scripts.
export function MerchBot({ className = "", doctor = false }: { className?: string; doctor?: boolean }) {
  const id = useId().replace(/:/g, "");
  const root = useRef<HTMLSpanElement>(null);
  const { isMenuActive } = useNavigationState();
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let visible = false;
    const update = () => { element.dataset.active = String(visible && !document.hidden); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  const fill = (name: string) => `url(#${id}-${name})`;
  return <span className={`merch-bot ${className}`} ref={root} data-doctor={doctor} data-menu-active={isMenuActive} aria-hidden="true">
    <svg viewBox="0 0 120 132">
      <defs>
        <radialGradient id={`${id}-shell`} cx=".36" cy=".26" r=".9"><stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#f1f3f8" /><stop offset="1" stopColor="#aab3c6" /></radialGradient>
        <radialGradient id={`${id}-body`} cx=".38" cy=".22" r=".95"><stop offset="0" stopColor="#fff" /><stop offset=".55" stopColor="#eceff6" /><stop offset="1" stopColor="#a7b0c3" /></radialGradient>
        <radialGradient id={`${id}-visor`} cx=".5" cy=".35" r=".75"><stop offset="0" stopColor="#1a1d26" /><stop offset="1" stopColor="#07080c" /></radialGradient>
        <linearGradient id={`${id}-dark`} x2="0" y2="1"><stop stopColor="#3a3f4d" /><stop offset="1" stopColor="#101218" /></linearGradient>
        <pattern id={`${id}-dots`} width="1.9" height="1.9" patternUnits="userSpaceOnUse"><circle cx=".95" cy=".95" r=".72" fill="var(--bot-ink, #658bea)" /></pattern>
        <mask id={`${id}-eyes`}><path d="M42.5 45 Q49 35 55.5 45 M64.5 45 Q71 35 77.5 45" fill="none" stroke="white" strokeWidth="5.6" strokeLinecap="round" /></mask>
      </defs>
      <ellipse cx="60" cy="127" rx="19" ry="3" fill="#7384a4" opacity=".18" />
      <g className="merch-bot__float">
        <ellipse cx="25" cy="95" rx="9" ry="16" transform="rotate(14 25 95)" fill={fill("body")} stroke="#aab2c4" strokeWidth=".7" />
        <ellipse cx="95" cy="95" rx="9" ry="16" transform="rotate(-14 95 95)" fill={fill("body")} stroke="#aab2c4" strokeWidth=".7" />
        <path d="M19 88 Q16 96 20 104 M101 88 Q104 96 100 104" fill="none" stroke="var(--bot-ink, #658bea)" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="52" y="68" width="16" height="8" rx="3" fill={fill("dark")} />
        <path d="M37 85 C37 74 83 74 83 85 C83 108 72 121 60 121 C48 121 37 108 37 85 Z" fill={fill("body")} stroke="#aab2c4" strokeWidth=".7" />
        <path d="M45 82 C51 78 69 78 75 82" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="60" cy="94" r="8.4" fill="#fff" /><circle cx="60" cy="94" r="5.6" fill="none" stroke="var(--bot-ink, #658bea)" strokeWidth="1.5" /><circle cx="60" cy="94" r="3.6" fill="var(--bot-ink, #658bea)" />
        <ellipse cx="60" cy="121" rx="7.4" ry="1.5" fill="var(--bot-ink, #658bea)" />
        <ellipse cx="22.5" cy="39" rx="6.5" ry="12" fill={fill("dark")} /><ellipse cx="97.5" cy="39" rx="6.5" ry="12" fill={fill("dark")} />
        <ellipse cx="60" cy="38" rx="37" ry="32" fill={fill("shell")} stroke="#aab2c4" strokeWidth=".7" />
        <path d="M30 20 C42 8 78 8 90 20" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="60" cy="42" rx="29" ry="21.5" fill="#2a2e38" /><ellipse cx="60" cy="42" rx="27.6" ry="20.2" fill={fill("visor")} />
        <path d="M74 25 C80 27 84 32 85 37" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".35" />
        <rect x="38" y="34" width="44" height="14" fill={fill("dots")} mask={fill("eyes")} />
        <g className="merch-bot__doctor">
          <path d="M26 18 C38 3 82 3 94 18" fill="none" stroke="#3b4256" strokeWidth="3" /><circle cx="60" cy="7" r="8.5" fill="#e3e7ef" stroke="#8a93a6" /><circle cx="58" cy="5" r="3.4" fill="#fff" />
          <path d="M46 78 C40 94 47 109 58 109 C68 109 74 101 72 92" fill="none" stroke="#3b4256" strokeWidth="2.4" /><circle cx="72" cy="90" r="4.6" fill="#c9ced8" stroke="#5d6680" />
        </g>
      </g>
    </svg>
  </span>;
}
