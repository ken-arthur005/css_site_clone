"use client";

import Image from "next/image";
import { useState } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import type { Executive } from "@/types/executive";

export function HomeExecutiveGallery({ executives }: { executives: readonly Executive[] }) {
  const [activeId, setActiveId] = useState(executives[0]?.id);

  return (
    <div className="home-executive-gallery" role="list">
      {executives.map((executive) => {
        const isActive = executive.id === activeId;

        return (
          <article className="home-executive-card" data-active={isActive} key={executive.id} role="listitem">
            <button
              aria-pressed={isActive}
              className="home-executive-card__trigger"
              onClick={() => setActiveId(executive.id)}
              type="button"
            >
              <span className="home-executive-card__number eyebrow">0{executive.order}</span>
              <span className="home-executive-card__copy">
                <span className="eyebrow">{executive.role}</span>
                <strong>{executive.name}</strong>
                {executive.quote && <em>{executive.quote}</em>}
              </span>
            </button>
            {isActive && (
              <TransitionLink className="home-executive-card__link" href="/executives" transitionLabel="EXECUTIVES">
                Meet the team <span aria-hidden="true">/&gt;</span>
              </TransitionLink>
            )}
            <div className="home-executive-card__portrait" aria-hidden={!executive.portrait}>
              {executive.portrait ? (
                <Image
                  alt={executive.portrait.alt}
                  fill
                  sizes="(max-width: 767px) 75vw, 44vw"
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
      <TransitionLink className="home-executive-gallery__all button button-secondary angular-cut" href="/executives" transitionLabel="EXECUTIVES">
        View all executives <span aria-hidden="true">/&gt;</span>
      </TransitionLink>
    </div>
  );
}
