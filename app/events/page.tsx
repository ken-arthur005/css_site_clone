import Image from "next/image";
import { TransitionLink } from "@/components/transitions/transition-link";
import { deriveEventLifecycle, getEvents } from "@/lib/content/events";
import { eventStatus, formatEventDate } from "@/lib/event-presentation";
import { getPageMetadata } from "@/lib/seo";
import type { HomeEvent } from "@/types/event";
import "./events.css";

export const revalidate = 3600;

export async function generateMetadata() {
  return getPageMetadata({
    title: "Events | CSS KNUST",
    description: "Explore upcoming events and past gatherings from the Computer Science Society at KNUST, with event dates and registration updates.",
    path: "/events",
    image: { src: "/event1.jpg", alt: "CSS students gathered at a society event" },
  });
}

function EventEntry({ event, lifecycle }: HomeEvent) {
  const image = event.heroImage ?? event.flyer;
  return (
    <article className={`events-entry${image ? "" : " events-entry--text"}`}>
      {image && <div className="events-entry__image"><Image src={image.src} alt={image.alt} fill sizes="(max-width: 700px) 92vw, 40vw" /></div>}
      <div className="events-entry__body">
        <div className="events-entry__meta"><time dateTime={event.start.dateTime}>{formatEventDate(event)}</time><span>{eventStatus(event, lifecycle)}</span></div>
        <h3><TransitionLink href={`/events/${event.slug}`} transitionLabel={event.title}>{event.title}<span aria-hidden="true"> ↗</span></TransitionLink></h3>
        <p>{event.summary}</p>
        {event.location && <p className="events-entry__location">{event.location}</p>}
        {lifecycle === "concluded" && event.recap && <p>{event.recap.summary}</p>}
        <TransitionLink className="events-text-link" href={`/events/${event.slug}`} transitionLabel={event.title} aria-label={`View event: ${event.title}`}>View event <span aria-hidden="true">/&gt;</span></TransitionLink>
      </div>
    </article>
  );
}

export default async function EventsPage() {
  const referenceDate = new Date();
  const snapshot = (await getEvents()).filter((event) => event.contentStatus === "verified")
    .map((event) => ({ event, lifecycle: deriveEventLifecycle(event, referenceDate) }));
  const upcoming = snapshot.filter(({ lifecycle }) => lifecycle !== "concluded");
  const past = snapshot.filter(({ lifecycle }) => lifecycle === "concluded").reverse();

  return (
    <main className="events-page page-shell">
      <header className="events-opening">
        <p className="eyebrow">Computer Science Society / KNUST</p>
        <h1>Events<span>.</span></h1>
        <div className="events-opening__bottom"><p>Meet, learn, and move the computing community forward.</p><nav aria-label="Event sections"><a href="#upcoming">Upcoming <span aria-hidden="true">↓</span></a>{past.length > 0 && <a href="#past-events">Past events <span aria-hidden="true">↓</span></a>}</nav></div>
      </header>
      <section id="upcoming" className="events-section" aria-labelledby="upcoming-title" tabIndex={-1}>
        <div className="events-section__heading"><p className="eyebrow">01 / On the calendar</p><h2 id="upcoming-title">Current & upcoming</h2></div>
        {upcoming.length ? upcoming.map((entry) => <EventEntry key={entry.event.id} {...entry} />) : <p className="events-empty">No upcoming events are listed.{past.length > 0 ? " Explore past gatherings below." : ""}</p>}
      </section>
      {past.length > 0 && <section id="past-events" className="events-section" aria-labelledby="past-title" tabIndex={-1}><div className="events-section__heading"><p className="eyebrow">02 / Previously at CSS</p><h2 id="past-title">Past events</h2></div>{past.map((entry) => <EventEntry key={entry.event.id} {...entry} />)}</section>}
    </main>
  );
}
