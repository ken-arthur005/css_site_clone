"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useRef, type CSSProperties } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import { deriveEventLifecycle } from "@/lib/content/events";
import type { Event } from "@/types/event";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function formatEventDate(event: Event) {
  return new Intl.DateTimeFormat("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: event.start.timeZone,
  }).format(new Date(event.start.dateTime));
}

function eventStatus(event: Event) {
  const lifecycle = deriveEventLifecycle(event);
  if (lifecycle === "concluded") return "Concluded";
  if (!event.registration.required) return lifecycle === "happening" ? "Happening now" : "Upcoming";
  if (event.registration.status === "open") return "Registration open";
  if (event.registration.status === "closed") return "Registration closed";
  return "Registration pending";
}

export function HomeEvents({ events }: { events: readonly Event[] }) {
  const rootRef = useRef<HTMLElement>(null);

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
    const track = root.querySelector<HTMLElement>(".home-events__track");
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".home-event-card"));
    const outro = root.querySelector<HTMLElement>(".home-events__outro");
    const allEvents = root.querySelector<HTMLElement>(".home-events__all");

    if (!stage || !hero || !heading || !description || !slices.length || !cards.length || !track || !outro || !allEvents) {
      return;
    }

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const compact = window.matchMedia("(max-width: 47.99rem)").matches;
      gsap.set(hero, { scale: compact ? 0.76 : 0.7, transformOrigin: "center center" });
      gsap.set([heading, description], { autoAlpha: 0, y: 32 });
      gsap.set(slices, { scaleX: 0, transformOrigin: "left center", visibility: "hidden" });
      gsap.set(track, { x: () => window.innerWidth, visibility: "hidden" });

      const cardStep = () => cards[0].getBoundingClientRect().width + Number.parseFloat(getComputedStyle(track).gap);
      const ctaCenteredTrackPosition = () => {
        const cardWidth = cards[0].getBoundingClientRect().width;
        return -cardStep() * 3 + (cardWidth - allEvents.getBoundingClientRect().width) / 2;
      };
      const syncOutroToCta = () => {
        const bounds = allEvents.getBoundingClientRect();
        gsap.set(outro, { xPercent: ((bounds.left + bounds.width / 2) / window.innerWidth) * 100 });
      };

      gsap.set(outro, { visibility: "hidden", xPercent: 100 });

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top bottom",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      timeline
        .to(hero, { scale: 1, duration: 1.5 })
        .to([heading, description], { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.05 })
        .to(description, { autoAlpha: 0, y: -115, duration: 0.3 }, "+=0.45")
        .to(heading, { autoAlpha: 0, scale: 0.46, y: -115, duration: 0.4 }, "<")
        .addLabel("slices", "+=0.05")
        .set(slices, { visibility: "visible" }, "slices")
        .to(slices, { scaleX: 1, duration: 0.68, stagger: 0.1 }, "slices")
        .set(track, { visibility: "visible" }, "slices+=0.5")
        .to(track, { x: 0, duration: 0.58 }, "slices+=0.5")
        .to(track, { x: () => -cardStep(), duration: 0.82 }, "+=0.1")
        .to(track, { x: () => -cardStep() * 2, duration: 0.82 }, "+=0.1")
        .addLabel("outro", "+=0.1")
        .set(outro, { visibility: "visible", onComplete: syncOutroToCta }, "outro")
        .to(track, {
          x: ctaCenteredTrackPosition,
          duration: 0.82,
          onUpdate: syncOutroToCta,
        }, "outro")
        .to(track, {
          x: () => ctaCenteredTrackPosition() - window.innerWidth / 2,
          duration: 0.95,
          onUpdate: syncOutroToCta,
        });
    });

    return () => media.revert();
  }, { scope: rootRef, dependencies: [events.length], revertOnUpdate: true });

  return (
    <section className="home-events" aria-labelledby="events-title" ref={rootRef}>
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
          <p className="editorial-type home-events__description">Meet, learn, and move the computing community forward.</p>
        </div>

        <div aria-hidden="true" className="home-events__slices">
          {Array.from({ length: 5 }, (_, index) => (
            <span className="home-events__slice" key={index} style={{ "--slice-position": `${index * 25}%` } as CSSProperties} />
          ))}
        </div>

        <div className="home-events__rail" aria-label="Selected events">
          <div className="home-events__track">
            {events.map((event) => (
              <article className="home-event-card angular-cut" key={event.id}>
                {event.heroImage && (
                  <div className="home-event-card__image">
                    <Image alt={event.heroImage.alt} fill sizes="(max-width: 767px) 82vw, 54vw" src={event.heroImage.src} />
                  </div>
                )}
                <div className="home-event-card__content">
                  <p className="eyebrow">CSS KNUST event</p>
                  <p className="home-event-card__date">{formatEventDate(event)}</p>
                  <h3>{event.title}</h3>
                  <p>{event.summary}</p>
                </div>
                <div className="home-event-card__footer">
                  <span className="eyebrow">{eventStatus(event)}</span>
                  <TransitionLink href={`/events/${event.slug}`} transitionLabel="EVENT DETAIL">
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

        <section className="home-events__outro" aria-label="Programming quote">
          <div className="page-shell home-events__outro-inner">
            <figure>
              <blockquote>Everybody in this country should learn how to program a computer, because it teaches you how to think.</blockquote>
              <figcaption>Steve Jobs</figcaption>
            </figure>
          </div>
        </section>
      </div>
    </section>
  );
}
