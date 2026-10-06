"use client";

import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useId, useRef, useState } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import { SnapRailControls } from "@/components/ui/snap-rail-controls";
import { useSnapRail } from "@/lib/animations/use-snap-rail";
import { HOME_DESKTOP_MOTION } from "@/lib/animations/home-media";
import type { Executive } from "@/types/executive";

gsap.registerPlugin(useGSAP);

export function HomeExecutiveGallery({ executives }: { executives: readonly Executive[] }) {
  const [activeId, setActiveId] = useState<string | undefined>(executives[0]?.id);
  const railId = useId();
  const { railRef, index, scrollToIndex, onFocusCapture, onKeyDown } = useSnapRail(executives.length);
  const selectPanelRef = useRef<((id: string | undefined) => void) | null>(null);

  useGSAP(() => {
    const rail = railRef.current;
    if (!rail) return;
    const panels = Array.from(rail.querySelectorAll<HTMLElement>(".home-executive-card, .home-executive-gallery__all"));
    if (!panels.length) return;

    const media = gsap.matchMedia();
    media.add(HOME_DESKTOP_MOTION, (context) => {
      let selected = panels.findIndex((panel) => panel.dataset.active === "true");
      let width = 0;
      let collapsedWidths: number[] = [];
      let expandedWidths: number[] = [];
      let frame = 0;
      const animation = gsap.timeline({
        paused: true,
        defaults: { duration: 0.5, ease: "power3.out" },
        onComplete: () => panels.forEach((panel) => panel.style.removeProperty("will-change")),
      });

      const placePanels = (animate: boolean) => {
        animation.pause().clear();
        // Reuse one owned timeline rather than accumulating killed tweens in
        // the context on every hover. Cleanup explicitly releases these styles.
        context.ignore(() => {
          let x = 0;
          panels.forEach((panel, panelIndex) => {
            const panelWidth = panelIndex === selected ? expandedWidths[panelIndex] : collapsedWidths[panelIndex];
            const target = { x, clipPath: `inset(0px ${expandedWidths[panelIndex] - panelWidth}px 0px 0px)` };
            if (animate) {
              panel.style.willChange = "transform, clip-path";
              animation.to(panel, target, 0);
            } else {
              panel.style.removeProperty("will-change");
              gsap.set(panel, target);
            }
            x += panelWidth;
          });
        });
        if (animate) animation.play(0);
      };

      const measure = () => {
        frame = 0;
        const nextWidth = rail.clientWidth;
        if (!nextWidth || nextWidth === width) return;
        width = nextWidth;
        // Preserve the original flex proportions, including the link's larger
        // padding. Its collapsed column still has room for the year label.
        const extras = panels.map((panel) => {
          const style = getComputedStyle(panel);
          return [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth]
            .reduce((total, value) => total + (Number.parseFloat(value) || 0), 0);
        });
        const unit = (width - extras.reduce((total, extra) => total + extra, 0)) / (panels.length + 6.5);
        collapsedWidths = extras.map((extra) => unit + extra);
        expandedWidths = extras.map((extra) => unit * 7.5 + extra);
        // All panels keep their expanded geometry. Only their translation and
        // crop animate, so text and portrait dimensions never change per frame.
        rail.style.setProperty("--executive-expanded-width", `${expandedWidths[0]}px`);
        rail.style.setProperty("--executive-collapsed-width", `${collapsedWidths[0]}px`);
        rail.style.setProperty("--executive-all-expanded-width", `${expandedWidths[panels.length - 1]}px`);
        rail.dataset.motionReady = "true";
        placePanels(false);
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(measure);
      };
      selectPanelRef.current = (id) => {
        const next = id === undefined ? panels.length - 1 : executives.findIndex((executive) => executive.id === id);
        if (next < 0 || next === selected) return;
        selected = next;
        placePanels(true);
      };
      const observer = new ResizeObserver(schedule);
      observer.observe(rail);
      measure();

      return () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        animation.kill();
        selectPanelRef.current = null;
        delete rail.dataset.motionReady;
        rail.style.removeProperty("--executive-expanded-width");
        rail.style.removeProperty("--executive-collapsed-width");
        rail.style.removeProperty("--executive-all-expanded-width");
        gsap.set(panels, { clearProps: "transform,clipPath,willChange" });
      };
    });

    return () => media.revert();
  }, { scope: railRef, dependencies: [executives], revertOnUpdate: true });

  useGSAP(() => {
    selectPanelRef.current?.(activeId);
  }, { scope: railRef, dependencies: [activeId] });

  return (
    <>
    <div className="home-executive-gallery" id={railId} ref={railRef} role="list" aria-label="CSS executives" onFocusCapture={onFocusCapture} onKeyDown={onKeyDown} data-lenis-prevent>
      {executives.map((executive) => {
        const isActive = executive.id === activeId;

        return (
          <article
            aria-label={`${executive.name}, ${executive.role}`}
            className="home-executive-card"
            data-active={isActive}
            data-rail-item
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
                   sizes="(max-width: 1023px) 82vw, (pointer: coarse) 28rem, 58vw"
                  src={executive.portrait.src}
                />
              ) : (
                <div className="home-executive-card__pending">
                  <Image alt="" height={192} src="/css_logo.svg" width={370} />
                  <span className="eyebrow">Portrait pending</span>
                </div>
              )}
            </div>
            {executive.portrait && (
              <div aria-hidden="true" className="home-executive-card__portrait home-executive-card__portrait--soft">
                <Image alt="" fill sizes="(max-width: 1023px) 82vw, 10vw" src={executive.portrait.src} />
              </div>
            )}
          </article>
        );
      })}
      <TransitionLink
        className="home-executive-gallery__all"
        data-active={activeId === undefined}
        href="/executives"
        onFocus={() => setActiveId(undefined)}
        onMouseEnter={() => setActiveId(undefined)}
        transitionLabel="EXECUTIVES"
      >
        <span className="eyebrow">2026 / 27</span>
        <strong>View all executives</strong>
        <span className="home-executive-gallery__all-arrow" aria-hidden="true">/&gt;</span>
      </TransitionLink>
    </div>
    <div className="home-rail-navigation home-executive-navigation">
      <SnapRailControls label="executive" railId={railId} index={index} count={executives.length} onSelect={scrollToIndex} />
      <TransitionLink href="/executives" transitionLabel="EXECUTIVES">View all executives <span aria-hidden="true">/&gt;</span></TransitionLink>
    </div>
    </>
  );
}
