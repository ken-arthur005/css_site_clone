"use client";

import { useSmoothScroll } from "@/components/providers/smooth-scroll-provider";

type SectionLink = { id: string; name: string };

export function CommitteeNavigation({ sections }: { sections: readonly SectionLink[] }) {
  const { scrollToElement } = useSmoothScroll();

  return (
    <nav className="committee-navigation" aria-label="Jump to a committee or the executive team">
      {sections.map((section) => (
        <a href={`#${section.id}`} key={section.id} onClick={(event) => {
          if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          const target = document.getElementById(section.id);
          if (!target) return;
          event.preventDefault();
          if (window.location.hash !== `#${section.id}`) window.history.pushState(null, "", `#${section.id}`);
          // Focus moves with the destination so keyboard users can enter its cards.
          target.focus({ preventScroll: true });
          scrollToElement(target);
        }}>
          {section.name}
        </a>
      ))}
    </nav>
  );
}
