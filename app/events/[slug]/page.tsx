import Image from "next/image";
import { notFound } from "next/navigation";
import { TransitionLink } from "@/components/transitions/transition-link";
import { deriveEventLifecycle, getEventBySlug } from "@/lib/content/events";
import { eventStatus, formatEventDate } from "@/lib/event-presentation";
import { getPageMetadata } from "@/lib/seo";
import "../events.css";

export const revalidate = 3600;

async function getPublicEvent(slug: string) {
  const event = await getEventBySlug(slug);
  if (!event || event.contentStatus !== "verified") notFound();
  return event;
}

export async function generateMetadata({ params }: PageProps<"/events/[slug]">) {
  const event = await getPublicEvent((await params).slug);
  return getPageMetadata({
    title: `${event.title} | CSS KNUST Events`, description: event.summary,
    path: `/events/${event.slug}`, image: event.heroImage ?? event.flyer, index: false,
  });
}

export default async function EventDetailPage({ params }: PageProps<"/events/[slug]">) {
  const event = await getPublicEvent((await params).slug);
  const lifecycle = deriveEventLifecycle(event);
  const image = event.heroImage ?? event.flyer;
  return (
    <main className="events-page event-detail page-shell">
      <TransitionLink className="events-text-link" href="/events" transitionLabel="Events"><span aria-hidden="true">←</span> All events</TransitionLink>
      <header className="events-opening">
        <p className="eyebrow">CSS KNUST / {eventStatus(event, lifecycle)}</p>
        <h1>{event.title}<span>.</span></h1>
        <div className="events-opening__bottom"><time dateTime={event.start.dateTime}>{formatEventDate(event)}</time>{event.location && <p>{event.location}</p>}</div>
      </header>
      <div className="event-detail__story">
        {image && <div className="event-detail__image"><Image src={image.src} alt={image.alt} fill sizes="(max-width: 700px) 92vw, 55vw" /></div>}
        <div className="event-detail__copy">
          <h2>About the event</h2><p>{event.description}</p>
          {lifecycle !== "concluded" && event.registration.required && <section aria-labelledby="registration-title"><h2 id="registration-title">Registration</h2>{event.registration.status === "open" ? <a className="events-text-link" href={event.registration.url}>Register for {event.title} <span aria-hidden="true">↗</span></a> : <p>{event.registration.status === "closed" ? "Registration is closed." : "Registration details have not been published yet."}</p>}</section>}
          {event.recap && <section aria-labelledby="recap-title"><h2 id="recap-title">Event recap</h2><p>{event.recap.summary}</p>{event.recap.url && <a className="events-text-link" href={event.recap.url}>Read the recap <span aria-hidden="true">↗</span></a>}</section>}
        </div>
      </div>
    </main>
  );
}
