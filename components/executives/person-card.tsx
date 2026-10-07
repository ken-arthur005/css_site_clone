"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import type { CommitteeMember } from "@/types/committee";

export function PersonCard({ member }: { member: CommitteeMember }) {
  const [expanded, setExpanded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const hasDetails = Boolean(member.quote || member.preferredName);
  const detailsLabel = member.quote ? "Quote" : "Nickname";
  const detailsId = `${member.id}-details`;
  const initials = member.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("");
  const style = { "--portrait-position": member.portraitPosition ?? "50% 35%" } as CSSProperties;

  return (
    <article className="person-card" data-expanded={expanded} data-portrait-fit={member.portraitFit ?? "cover"} style={style}
      onPointerEnter={(event) => { if (event.pointerType === "mouse" && hasDetails) setExpanded(true); }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        if (!event.currentTarget.contains(document.activeElement) || !document.activeElement?.matches(":focus-visible")) setExpanded(false);
      }}>
      {member.portrait && !imageFailed ? (
        <Image className="person-card__portrait" src={member.portrait.src} alt={`Portrait of ${member.name}`} fill
          sizes="(min-width: 1100px) 25vw, (min-width: 600px) 50vw, 100vw" onError={() => setImageFailed(true)} />
      ) : (
        <div className="person-card__fallback"><span aria-hidden="true">{initials}</span><p>Portrait unavailable</p></div>
      )}
      <div className="person-card__shade" aria-hidden="true" />
      <div className="person-card__body">
        <h3 className="person-card__name">{member.name}</h3>
        <p className="person-card__role">{member.role}</p>
        {hasDetails && (
          <div className="person-card__details" id={detailsId}>
            <div className="person-card__details-inner">
              {member.quote && <blockquote className="person-card__quote"><p>{member.quote}</p></blockquote>}
              {member.preferredName && <p className="person-card__nickname"><span className="sr-only">Preferred name: </span>{member.preferredName}</p>}
            </div>
          </div>
        )}
      </div>
      {hasDetails && (
        <button className="person-card__toggle" type="button" aria-controls={detailsId} aria-expanded={expanded}
          aria-label={`${expanded ? "Hide" : "Show"} ${member.quote ? "favourite quote" : "nickname"}${member.quote && member.preferredName ? " and nickname" : ""} for ${member.name}`}
          onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setExpanded(true); }}
          onBlur={() => setExpanded(false)} onClick={() => setExpanded((value) => !value)}>
          <span>{expanded ? "Close" : detailsLabel}</span><span aria-hidden="true">{expanded ? "−" : "+"}</span>
        </button>
      )}
    </article>
  );
}
