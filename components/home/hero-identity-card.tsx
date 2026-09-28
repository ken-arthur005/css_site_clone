"use client";

import { useEffect, useState } from "react";
import type { SiteInfo } from "@/types/site";

export function HeroIdentityCard({ site }: { site: SiteInfo }) {
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
    let lineIndex = 0;
    let characterIndex = 0;
    let timeout = 0;
    let frame = 0;

    const typeNextCharacter = () => {
      if (lineIndex >= completeLines.length) {
        return;
      }

      const activeLineIndex = lineIndex;
      const completeLine = completeLines[activeLineIndex];
      const nextLength = characterIndex + 1;
      setVisibleLines((currentLines) =>
        currentLines.map((line, index) =>
          index === activeLineIndex ? completeLine.slice(0, nextLength) : line,
        ),
      );

      if (nextLength >= completeLine.length) {
        lineIndex = activeLineIndex + 1;
        characterIndex = 0;
        timeout = window.setTimeout(typeNextCharacter, 80);
        return;
      }

      characterIndex = nextLength;
      timeout = window.setTimeout(typeNextCharacter, 13);
    };

    frame = window.requestAnimationFrame(() => {
      setVisibleLines(completeLines.map(() => ""));
      timeout = window.setTimeout(typeNextCharacter, 55);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [completeLines]);

  const accessibleSummary = `${site.name}. ${site.institution}. ${site.college}. ${site.location}.`;

  return (
    <aside className="home-hero__identity angular-cut" aria-label={accessibleSummary}>
      <span className="sr-only">{accessibleSummary}</span>
      <div aria-hidden="true" className="home-hero__identity-typed">
        <div className="home-hero__identity-topline">
          <p className="eyebrow"><span>{visibleLines[0]}</span></p>
          <span>{visibleLines[1]}</span>
        </div>
        <p className="home-hero__identity-name"><span>{visibleLines[2]}</span></p>
        <div className="home-hero__identity-details">
          <p><span>{visibleLines[3]}</span></p>
          <p><span>{visibleLines[4]}</span></p>
          <p><span>{visibleLines[5]}</span></p>
        </div>
      </div>
    </aside>
  );
}
