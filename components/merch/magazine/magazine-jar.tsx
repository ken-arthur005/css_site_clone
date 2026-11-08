"use client";

import { useEffect, useMemo, useState } from "react";
import { money } from "@/lib/merch/order";
import { EMPTY_FUNDRAISER, type Fundraiser, parseFundraiser } from "@/lib/merch/magazine";

const ROWS = 10, COLS = 7, TOTAL = ROWS * COLS;
const SHADES = ["#e64980", "#d6336c", "#f06595", "#c2255c", "#f783ac"];
const SLOTS = Array.from({ length: TOTAL }, (_, i) => {
  const row = Math.floor(i / COLS), col = i % COLS;
  return { x: 44 + col * 22 + (row % 2 ? 11 : 0), y: 254 - row * 19, fill: SHADES[(i * 7) % SHADES.length], turn: ((i * 37) % 30) - 15 };
});
const JAR = "M48 70 Q30 80 30 110 L30 240 Q30 268 58 268 L162 268 Q190 268 190 240 L190 110 Q190 80 172 70 Z";

/** The jar fills with a heart per ~1.4% of the goal; counted from confirmed payments only. */
export function MagazineJar({ refreshKey = 0 }: { refreshKey?: number }) {
  const [jar, setJar] = useState<Fundraiser>(EMPTY_FUNDRAISER);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/merch/fundraiser", { cache: "no-store" });
        if (!cancelled && response.ok) { setJar(parseFundraiser(await response.json())); setLoaded(true); }
      } catch { /* the jar stays as it was */ }
    };
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 60000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [refreshKey]);

  const ratio = jar.goalMinor ? jar.raisedMinor / jar.goalMinor : 0;
  const hearts = useMemo(() => Math.min(TOTAL, Math.round(Math.max(0, ratio) * TOTAL)) || (ratio > 0 ? 1 : 0), [ratio]);
  const percent = Math.min(100, Math.floor(ratio * 100));

  return <aside className="merch-mag-jar" aria-labelledby="merch-mag-jar-title" aria-busy={!loaded}>
    <p className="merch-label" id="merch-mag-jar-title">{"// the jar, live"}</p>
    <svg viewBox="0 0 220 280" role="img" aria-label={`A jar filling with hearts: ${percent}% of the goal raised`}>
      <defs>
        <clipPath id="merch-mag-jar-clip"><path d={JAR} /></clipPath>
        <path id="merch-mag-heart" d="M0 -3 C -3 -9 -12 -8 -12 -1 C -12 5 -4 9 0 13 C 4 9 12 5 12 -1 C 12 -8 3 -9 0 -3 Z" />
      </defs>
      <path className="merch-mag-jar__glass" d={JAR} />
      <g clipPath="url(#merch-mag-jar-clip)">
        {SLOTS.slice(0, hearts).map((slot, i) => <g key={i} className="merch-mag-jar__heart" style={{ animationDelay: `${i * 40}ms` }}>
          <use href="#merch-mag-heart" x={slot.x} y={slot.y} fill={slot.fill} transform={`rotate(${slot.turn} ${slot.x} ${slot.y})`} />
        </g>)}
      </g>
      <rect className="merch-mag-jar__lid" x="52" y="40" width="116" height="26" rx="8" />
      <rect x="44" y="62" width="132" height="10" rx="5" fill="#8a1a42" />
      <path className="merch-mag-jar__shine" d="M46 120 L46 220" />
    </svg>
    <p className="merch-mag-jar__raised">{money(jar.raisedMinor)}</p>
    <p className="merch-mag-jar__goal">raised of <strong>{money(jar.goalMinor)}</strong></p>
    <div className="merch-mag-jar__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Progress to the goal"><i style={{ width: `${percent}%` }} /></div>
    <dl className="merch-mag-jar__stats">
      <div><dt>of the goal</dt><dd>{percent}%</dd></div>
      <div><dt>magazines</dt><dd>{jar.copies}</dd></div>
      <div><dt>{jar.supporters === 1 ? "supporter" : "supporters"}</dt><dd>{jar.supporters}</dd></div>
    </dl>
    <p className="merch-secure-note">Counted from confirmed payments only, updated every minute. Every cedi goes to breast cancer care.</p>
  </aside>;
}
