"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { useSmoothScroll } from "@/components/providers/smooth-scroll-provider";
import { TransitionLink } from "@/components/transitions/transition-link";
import { SnapRailControls } from "@/components/ui/snap-rail-controls";
import { HOME_DESKTOP_MOTION, HOME_NATIVE_LAYOUT } from "@/lib/animations/home-media";
import { useSnapRail } from "@/lib/animations/use-snap-rail";
import type { Event, EventLifecycle, HomeEventSelection } from "@/types/event";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function formatEventDate(event: Event) {
  return new Intl.DateTimeFormat("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: event.start.timeZone,
  }).format(new Date(event.start.dateTime));
}

function eventStatus(event: Event, lifecycle: EventLifecycle) {
  if (lifecycle === "concluded") return "Concluded";
  if (lifecycle === "happening") return event.end ? "Happening now" : "Today";
  if (!event.registration.required) return "Upcoming";
  if (event.registration.status === "open") return "Registration open";
  if (event.registration.status === "closed") return "Registration closed";
  return "Registration pending";
}

export function HomeEvents({ selection }: { selection: HomeEventSelection }) {
  const { events, mode } = selection;
  const rootRef = useRef<HTMLElement>(null);
  const { scrollToElement } = useSmoothScroll();
  const { railRef, index, scrollToIndex, onFocusCapture, onKeyDown } = useSnapRail(events.length);
  const railLabel = mode === "recent-highlights" ? "Recent highlights" : "Current and upcoming events";

  useEffect(() => {
    const root = rootRef.current;
    const railElement = root?.querySelector<HTMLElement>(".home-events__rail");
    if (!root || !railElement) return;

    const media = window.matchMedia(HOME_NATIVE_LAYOUT);
    let frame = 0;
    const revealNativeFocus = () => {
      frame = 0;
      const focused = document.activeElement;
      if (!media.matches || !(focused instanceof HTMLElement) || !railElement.contains(focused)) return;
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
  }, [events, scrollToElement]);

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
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".home-event-card"));
    const allEvents = root.querySelector<HTMLElement>(".home-events__all");

    if (!stage || !hero || !heading || !description || !slices.length || !cards.length || !railElement || !track || !allEvents) {
      return;
    }

    const media = gsap.matchMedia();
    media.add(HOME_DESKTOP_MOTION, (context) => {
      gsap.set(root, {
        attr: { "data-animated": "true" },
        "--events-scroll-height": `${180 + cards.length * 70}svh`,
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

      const centeredPosition = (element: HTMLElement) =>
        stage.clientWidth / 2 - element.offsetLeft - element.offsetWidth / 2;
      let revealFocusedItem = () => {
        // Timeline labels are populated after ScrollTrigger's initial refresh.
      };

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top bottom",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
          onRefresh: () => revealFocusedItem(),
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
        .to(track, {
          x: () => centeredPosition(allEvents),
          duration: 0.5,
        })
        .addLabel("all-events")
        .to({}, { duration: 0.2 });

      const items = [...cards, allEvents];
      revealFocusedItem = context.add("revealFocusedItem", () => {
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

      railElement.addEventListener("focusin", revealFocusedItem);
      let refreshFrame = 0;
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
      const observer = new ResizeObserver(refresh);
      items.forEach((item) => observer.observe(item));
      // Font/media changes in earlier homepage sections can move this trigger.
      if (root.parentElement) observer.observe(root.parentElement);
      refresh();

      return () => {
        cancelAnimationFrame(refreshFrame);
        observer.disconnect();
        railElement.removeEventListener("focusin", revealFocusedItem);
      };
    });

    return () => media.revert();
  }, { scope: rootRef, dependencies: [events, scrollToElement], revertOnUpdate: true });

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

        <div className="home-events__rail" aria-label={mode === "empty" ? "Events" : railLabel} data-lenis-prevent id="home-events-rail" onFocusCapture={onFocusCapture} onKeyDown={onKeyDown} ref={railRef} role="region">
          <div className="home-events__track">
            {events.map(({ event, lifecycle }) => (
              <article className="home-event-card angular-cut" data-rail-item key={event.id} tabIndex={-1}>
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
              </article>
            ))}
            <TransitionLink className="home-events__all button button-secondary angular-cut" href="/events" transitionLabel="EVENTS">
              View all events <span aria-hidden="true">/&gt;</span>
            </TransitionLink>
          </div>
        </div>

        <div className="home-rail-navigation page-shell home-event-navigation">
          <SnapRailControls count={events.length} index={index} label="event" onSelect={scrollToIndex} railId="home-events-rail" />
          <TransitionLink href="/events" transitionLabel="EVENTS">View all events <span aria-hidden="true">/&gt;</span></TransitionLink>
        </div>
      </div>
    </section>
  );
}
