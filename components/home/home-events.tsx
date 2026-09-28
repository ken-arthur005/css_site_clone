import Image from "next/image";
import { TransitionLink } from "@/components/transitions/transition-link";
import { deriveEventLifecycle } from "@/lib/content/events";
import type { Event } from "@/types/event";

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
  return (
    <section className="home-events" aria-labelledby="events-title">
      <div className="page-shell">
        <div className="home-events__image-wrap angular-cut">
          <Image
            alt="CSS students gathered at a society event"
            className="home-events__image"
            fill
            priority={false}
            sizes="(max-width: 768px) 100vw, min(100vw - 7rem, 1280px)"
            src="/event1.jpg"
          />
          <p className="eyebrow home-events__image-label">CSS KNUST / Community</p>
        </div>

        <div className="home-events__intro">
          <div>
            <p className="eyebrow text-accent-strong">03 / Events</p>
            <h2 className="home-section-title" id="events-title">Make an appearance.</h2>
          </div>
          <p className="editorial-type">Selected development event records from the CSS KNUST calendar.</p>
        </div>
      </div>

      <div className="home-events__cut" aria-hidden="true" />
      <div className="home-events__rail page-shell" aria-label="Selected events">
        {events.map((event) => (
          <article className="home-event-card angular-cut" key={event.id}>
            <p className="eyebrow">{event.contentStatus === "placeholder" ? "Development listing" : "CSS KNUST event"}</p>
            <div>
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
    </section>
  );
}
