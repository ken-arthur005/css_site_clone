"use client";

import Image from "next/image";
import { useState } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import type { Executive } from "@/types/executive";

export function HomeExecutiveGallery({ executives }: { executives: readonly Executive[] }) {
  const [activeId, setActiveId] = useState<string | undefined>(executives[0]?.id);

  return (
    <div className="home-executive-gallery" role="list">
      {executives.map((executive) => {
        const isActive = executive.id === activeId;

        return (
          <article
            aria-label={`${executive.name}, ${executive.role}`}
            className="home-executive-card"
            data-active={isActive}
            key={executive.id}
            onFocus={() => setActiveId(executive.id)}
            onMouseEnter={() => setActiveId(executive.id)}
            role="listitem"
            tabIndex={0}
          >
            <span aria-hidden="true" className="home-executive-card__admin-mark" />
            <div className="home-executive-card__identity">
              <span className="home-executive-card__number eyebrow">0{executive.order}</span>
              <strong>{executive.name}</strong>
            </div>
            <div className="home-executive-card__copy">
                <span className="eyebrow">{executive.role}</span>
                {executive.quote && <em>{executive.quote}</em>}
            </div>
            <div className="home-executive-card__portrait" aria-hidden={!executive.portrait}>
              {executive.portrait ? (
                <Image
                  alt={executive.portrait.alt}
                  fill
                  sizes="(max-width: 767px) 100vw, 58vw"
                  src={executive.portrait.src}
                />
              ) : (
                <div className="home-executive-card__pending">
                  <Image alt="" height={192} src="/css_logo.svg" width={370} />
                  <span className="eyebrow">Portrait pending</span>
                </div>
              )}
            </div>
          </article>
        );
      })}
      <TransitionLink
        className="home-executive-gallery__all"
        href="/executives"
        onFocus={() => setActiveId(undefined)}
        onMouseEnter={() => setActiveId(undefined)}
        transitionLabel="EXECUTIVES"
      >
        <span className="eyebrow">2026 / 27</span>
        <strong>View all<br />executives</strong>
        <span className="home-executive-gallery__all-arrow" aria-hidden="true">/&gt;</span>
      </TransitionLink>
    </div>
  );
}
