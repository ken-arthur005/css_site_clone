"use client";

import { useEffect, useState } from "react";
import type { SiteInfo } from "@/types/site";

export function HeroIdentityCard({ site, typeOnReveal, settled }: { site: SiteInfo; typeOnReveal: boolean; settled: boolean }) {
  const getCompleteLines = () => [
    "Institutional identity",
    "CSS / KNUST",
    site.name,
    site.institution,
    site.college,
    site.location,
  ];
  const [completeLines] = useState(getCompleteLines);
  const [visibleLines, setVisibleLines] = useState(getCompleteLines);

  useEffect(() => {
    if (!typeOnReveal || settled) {
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const characterCount = completeLines.reduce((total, line) => total + line.length, 0);

    const typeFrame = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 800);
      let remaining = Math.floor(characterCount * progress);
      setVisibleLines(completeLines.map((line) => {
        const visible = line.slice(0, Math.max(0, remaining));
        remaining -= line.length;
        return visible;
      }));
      if (progress < 1) frame = window.requestAnimationFrame(typeFrame);
    };

    frame = window.requestAnimationFrame(typeFrame);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [completeLines, settled, typeOnReveal]);

  const lines = typeOnReveal && !settled ? visibleLines : completeLines;
  const accessibleSummary = `${site.name}. ${site.institution}. ${site.college}. ${site.location}.`;

  return (
    <aside className="home-hero__identity angular-cut" aria-label={accessibleSummary}>
      <span className="sr-only">{accessibleSummary}</span>
      <div aria-hidden="true" className="home-hero__identity-typed">
        <div className="home-hero__identity-topline">
          <p className="eyebrow"><span>{lines[0]}</span></p>
          <span>{lines[1]}</span>
        </div>
        <p className="home-hero__identity-name"><span>{lines[2]}</span></p>
        <div className="home-hero__identity-details">
          <p><span>{lines[3]}</span></p>
          <p><span>{lines[4]}</span></p>
          <p><span>{lines[5]}</span></p>
        </div>
      </div>
    </aside>
  );
}
