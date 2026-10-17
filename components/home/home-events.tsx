"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSmoothScroll } from "@/components/providers/smooth-scroll-provider";
import { TransitionLink } from "@/components/transitions/transition-link";
import { SnapRailControls } from "@/components/ui/snap-rail-controls";
import { HOME_DESKTOP_MOTION, HOME_NATIVE_LAYOUT } from "@/lib/animations/home-media";
import { useEventRailAutoplay } from "@/lib/animations/use-event-rail-autoplay";
import { useSnapRail } from "@/lib/animations/use-snap-rail";
import type { Event, EventLifecycle, HomeEventSelection } from "@/types/event";
import type { HomeQuote } from "@/types/home";
import { eventStatus, formatEventDate } from "@/lib/event-presentation";
import { HomeQuoteBridge } from "./home-quote-bridge";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function EventPreviewCard({ event, lifecycle }: { event: Event; lifecycle: EventLifecycle }) {
  return <article className="home-event-card angular-cut" data-rail-item tabIndex={-1}>
    {event.heroImage && (
      <div className="home-event-card__image">
        <Image alt={event.heroImage.alt} fill sizes="(max-width: 1023px) 82vw, (pointer: coarse) 28rem, 54vw" src={event.heroImage.src} />
      </div>
    )}
    <div className="home-event-card__content">
      <p className="eyebrow">CSS KNUST event</p>
      <p className="home-event-card__date">{formatEventDate(event)}</p>
      <h3>{event.title}</h3>
      <p>{event.summary}</p>
    </div>
    <div className="home-event-card__footer">
      <span className="eyebrow">{eventStatus(event, lifecycle)}</span>
      <TransitionLink aria-label={`View event: ${event.title}`} href={`/events/${event.slug}`} transitionLabel="EVENT DETAIL">
        View event <span aria-hidden="true">/&gt;</span>
      </TransitionLink>
    </div>
  </article>;
}

export function HomeEvents({ selection, exitQuote }: { selection: HomeEventSelection; exitQuote: HomeQuote }) {
  const { events, mode } = selection;
  const rootRef = useRef<HTMLElement>(null);
  const [panelFits, setPanelFits] = useState(true);
  const { scrollToElement } = useSmoothScroll();
  const { railRef, index, scrollToIndex, onFocusCapture, onKeyDown } = useSnapRail(events.length, !panelFits);
  const { paused, togglePlayback } = useEventRailAutoplay(rootRef, railRef, events.length);
  const railLabel = mode === "recent-highlights" ? "Recent highlights" : "Current and upcoming events";

  useEffect(() => {
    const quote = rootRef.current?.querySelector<HTMLElement>(".home-quote-bridge--panel");
    const figure = quote?.querySelector("figure");
    if (!quote || !figure) return;
    const measure = () => {
      const style = getComputedStyle(quote);
      const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const viewport = parseFloat(style.minHeight);
      // Enlarged text and short landscape views get complete natural flow,
      // rather than clipping a quotation inside a viewport-sized scene.
      setPanelFits(figure.offsetHeight + padding <= viewport);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(figure);
    observer.observe(quote);
    window.addEventListener("resize", measure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [exitQuote]);

  useEffect(() => {
    const root = rootRef.current;
    const railElement = root?.querySelector<HTMLElement>(".home-events__rail");
    if (!root || !railElement) return;

    const media = window.matchMedia(HOME_NATIVE_LAYOUT);
    let frame = 0;
    const revealNativeFocus = () => {
      frame = 0;
      const focused = document.activeElement;
      if ((panelFits && !media.matches) || !(focused instanceof HTMLElement) || !railElement.contains(focused)) return;
      const card = focused.closest<HTMLElement>(".home-event-card");
      if (!card) return;

      const inset = Number.parseFloat(getComputedStyle(railElement).scrollPaddingLeft) || 0;
      railElement.scrollTo({ left: card.offsetLeft - inset, behavior: "instant" });
      const bounds = focused.getBoundingClientRect();
      const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
      if (bounds.top < headerHeight || bounds.bottom > window.innerHeight) {
        scrollToElement(focused, { offset: -(window.innerHeight - bounds.height) / 2, immediate: true });
      }
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(revealNativeFocus);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(railElement);
    // A focused link may not emit focus again when the sticky layout collapses.
    media.addEventListener("change", schedule);
    schedule();
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener("change", schedule);
    };
  }, [events, scrollToElement, panelFits]);

  useGSAP(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const stage = root.querySelector<HTMLElement>(".home-events__stage");
    const hero = root.querySelector<HTMLElement>(".home-events__hero-media");
    const heading = root.querySelector<HTMLElement>(".home-events__heading");
    const description = root.querySelector<HTMLElement>(".home-events__description");
    const slices = Array.from(root.querySelectorAll<HTMLElement>(".home-events__slice"));
    const railElement = root.querySelector<HTMLElement>(".home-events__rail");
    const track = root.querySelector<HTMLElement>(".home-events__track");
    const cards = Array.from(track?.querySelectorAll<HTMLElement>(".home-event-card") ?? []);
    const allEvents = root.querySelector<HTMLElement>(".home-events__all");
    const panel = root.querySelector<HTMLElement>(".home-events__exit-panel");
    const lead = root.querySelector<HTMLElement>(".home-events__exit-lead");

    if (!stage || !hero || !heading || !description || !slices.length || !railElement || !track || !allEvents || !panel || !lead) {
      return;
    }

    const media = gsap.matchMedia();
    media.add(HOME_DESKTOP_MOTION, (context) => {
      if (!cards.length || !panelFits) return;
      gsap.set(root, {
        attr: { "data-animated": "true" },
        "--events-scroll-height": `${150 + cards.length * 55 + 75}svh`,
      });
      // Clipping cannot accumulate a native scroll offset when links receive focus.
      stage.scrollLeft = 0;
      railElement.scrollLeft = 0;
      gsap.set(hero, { scale: 0.7, transformOrigin: "center center" });
      // Opacity keeps the heading in the accessibility tree throughout the story.
      gsap.set([heading, description], { opacity: 0, y: 32 });
      gsap.set(slices, { scaleX: 0, transformOrigin: "left center", visibility: "hidden" });
      // Keep offstage links tabbable: focus seeks the same timeline used by scroll.
      gsap.set(track, { x: () => stage.clientWidth });
      gsap.set(lead, { x: 0, xPercent: 0 });

      const centeredPosition = (element: HTMLElement) =>
        stage.clientWidth / 2 - element.offsetLeft - element.offsetWidth / 2;
      const lastCard = cards[cards.length - 1];
      const moveLead = gsap.quickSetter(lead, "x", "px");
      let tailOffset = 0;
      let buttonOffset = 0;
      const syncLead = () => moveLead(Number(gsap.getProperty(track, "x")) + tailOffset);
      const measureTail = () => {
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        // Rects preserve fractional CSS pixels; offsetWidth/offsetLeft round
        // them and can introduce a different gap at the appended button.
        buttonOffset = lastCard.getBoundingClientRect().right - track.getBoundingClientRect().left + gap;
        tailOffset = buttonOffset + allEvents.getBoundingClientRect().width;
        syncLead();
      };
      measureTail();
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: syncLead,
        scrollTrigger: {
          id: "home-events-story",
          trigger: root,
          start: "top bottom",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
          onRefreshInit: measureTail,
          onRefresh: measureTail,
        },
      });

      timeline
        .to(hero, { scale: 1, duration: 0.6 })
        .to([heading, description], { opacity: 1, y: 0, duration: 0.2, stagger: 0.03 }, 0.2)
        .to(description, { opacity: 0, y: -80, duration: 0.2 }, "+=0.2")
        .to(heading, { opacity: 0, scale: 0.65, y: -80, duration: 0.25 }, "<")
        .addLabel("slices")
        .set(slices, { visibility: "visible" }, "slices")
        .to(slices, { scaleX: 1, duration: 0.4, stagger: 0.04 }, "slices")
        .to(track, { x: () => centeredPosition(cards[0]), duration: 0.35 }, "slices+=0.25")
        .addLabel("event-0");

      cards.slice(1).forEach((card, index) => {
        timeline
          .to(track, { x: () => centeredPosition(card), duration: 0.6 })
          .addLabel(`event-${index + 1}`);
      });

      timeline
        .addLabel("panel-entry")
        // One moving track owns the whole chain. The lead's position is derived
        // from it, so card→button spacing cannot drift during either direction.
        .to(track, { x: () => stage.clientWidth / 2 - allEvents.getBoundingClientRect().width / 2 - buttonOffset, duration: 0.3 })
        .addLabel("all-events")
        .to(track, { x: () => -tailOffset, duration: 0.55 })
        .addLabel("quote-arrived");

      const items = [...cards, allEvents];
      const revealFocusedItem = context.add("revealFocusedItem", () => {
        const focused = document.activeElement;
        if (!(focused instanceof HTMLElement)) return;
        const item = focused.closest<HTMLElement>(".home-event-card, .home-events__all");
        const index = item ? items.indexOf(item) : -1;
        const trigger = timeline.scrollTrigger;
        if (index < 0 || !trigger) return;

        const label = index === cards.length ? "all-events" : `event-${index}`;
        const progress = timeline.labels[label] / timeline.duration();
        const scroll = trigger.start + (trigger.end - trigger.start) * progress;
        const rootTop = window.scrollY + root.getBoundingClientRect().top;
        scrollToElement(root, { offset: scroll - rootTop, immediate: true });
        ScrollTrigger.update();
      }) as () => void;

      stage.addEventListener("focusin", revealFocusedItem);
      let refreshFrame = 0;
      let disposed = false;
      let sizes = "";
      const refresh = () => {
        // Refresh mutates pin geometry across the page. Coalesce size changes
        // outside ResizeObserver delivery to avoid re-entrant layout loops.
        if (!refreshFrame) {
          refreshFrame = requestAnimationFrame(() => {
            refreshFrame = 0;
            ScrollTrigger.refresh();
          });
        }
      };
      const observer = new ResizeObserver(() => {
        const next = [stage, ...items].map((item) => `${item.offsetWidth}:${item.offsetHeight}`).join(";");
        if (next === sizes) return;
        sizes = next;
        refresh();
      });
      items.forEach((item) => observer.observe(item));
      observer.observe(stage);
      void document.fonts.ready.then(() => { if (!disposed) refresh(); });
      refresh();

      return () => {
        disposed = true;
        cancelAnimationFrame(refreshFrame);
        observer.disconnect();
        stage.removeEventListener("focusin", revealFocusedItem);
        lead.style.removeProperty("transform");
      };
    });

    return () => media.revert();
  }, { scope: rootRef, dependencies: [events, scrollToElement, panelFits], revertOnUpdate: true });

  return (
    <section className="home-events" aria-labelledby="events-title" data-animated="false" data-mode={mode} ref={rootRef}>
      <div className="home-events__stage">
        <div className="home-events__hero-media angular-cut">
          <Image
            alt="CSS students gathered at a society event"
            className="home-events__image"
            fill
            priority={false}
            sizes="(max-width: 768px) 100vw, min(100vw - 7rem, 1280px)"
            src="/event1.jpg"
          />
        </div>

        <div className="home-events__intro page-shell">
          <h2 className="home-events__heading" id="events-title">Events</h2>
          <div className="home-events__description">
            {mode !== "empty" && <p className="eyebrow">{railLabel}</p>}
            <p className="editorial-type">{mode === "recent-highlights"
              ? "No upcoming events are listed. Explore recent highlights from the CSS community."
              : "Meet, learn, and move the computing community forward."}</p>
          </div>
        </div>

        <div aria-hidden="true" className="home-events__slices">
          {Array.from({ length: 5 }, (_, index) => (
            <span className="home-events__slice" key={index} style={{ "--slice-position": `${index * 25}%` } as CSSProperties} />
          ))}
        </div>

        <div className="home-events__rail" aria-label={mode === "empty" ? "Events" : railLabel} data-lenis-prevent-horizontal id="home-events-rail" onFocusCapture={onFocusCapture} onKeyDown={onKeyDown} ref={railRef} role="region">
          <div className="home-events__track">
            {events.map((item) => <EventPreviewCard {...item} key={item.event.id} />)}
          </div>
        </div>

        <div className="home-rail-navigation page-shell home-event-navigation">
          <SnapRailControls announceChanges={false} count={events.length} index={index} label="event" onSelect={scrollToIndex} railId="home-events-rail" />
          {events.length > 1 && <button aria-controls="home-events-rail" className="home-events__playback eyebrow" onClick={togglePlayback} type="button">
            <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span> {paused ? "Resume motion" : "Pause motion"}
          </button>}
        </div>

        <div className="home-events__exit">
          <div className="home-events__exit-stage">
            <div className="home-events__exit-lead">
              <TransitionLink className="home-events__all button button-secondary angular-cut" href="/events" transitionLabel="EVENTS">
                View all events <span aria-hidden="true">/&gt;</span>
              </TransitionLink>
              <div className="home-events__exit-panel">
                <HomeQuoteBridge {...exitQuote} panel />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
