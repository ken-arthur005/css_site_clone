import { events } from "@/content/events";
import type { Event, EventLifecycle, HomeEventSelection } from "@/types/event";

export function deriveEventLifecycle(event: Event, referenceDate = new Date()): EventLifecycle {
  const start = new Date(event.start.dateTime);
  // Africa/Accra is UTC+00:00, and is the only supported event timezone.
  // Without an end time, keep the event current through its calendar day.
  // This is a display policy, not a claim about the actual event duration.
  const end = event.end
    ? new Date(event.end.dateTime).getTime()
    : Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 1);

  if (referenceDate < start) {
    return "upcoming";
  }

  if (referenceDate.getTime() < end) {
    return "happening";
  }

  return "concluded";
}

function compareStart(first: Event, second: Event) {
  return Date.parse(first.start.dateTime) - Date.parse(second.start.dateTime)
    || first.id.localeCompare(second.id);
}

export function selectHomeEvents(source: readonly Event[], referenceDate = new Date()): HomeEventSelection {
  const snapshot = [...new Map(source.map((event) => [event.id, event])).values()]
    .map((event) => ({ event, lifecycle: deriveEventLifecycle(event, referenceDate) }));
  const current = snapshot
    .filter(({ lifecycle }) => lifecycle !== "concluded")
    .sort((first, second) =>
      Number(second.event.featured) - Number(first.event.featured)
      || compareStart(first.event, second.event),
    );
  const highlights = snapshot
    .filter(({ lifecycle }) => lifecycle === "concluded")
    .sort((first, second) => compareStart(second.event, first.event));

  return {
    mode: current.length ? "current-upcoming" : highlights.length ? "recent-highlights" : "empty",
    referenceDate: referenceDate.toISOString(),
    events: (current.length ? current : highlights).slice(0, 3),
  };
}

export async function getHomeEventSelection(referenceDate = new Date()): Promise<HomeEventSelection> {
  return selectHomeEvents(await getEvents(), referenceDate);
}

export async function getEvents(): Promise<readonly Event[]> {
  return [...events].sort(compareStart);
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  return events.find((event) => event.slug === slug) ?? null;
}

export async function getFeaturedEvents(): Promise<readonly Event[]> {
  return (await getEvents()).filter((event) => event.featured);
}

export async function getUpcomingEvents(referenceDate = new Date()): Promise<readonly Event[]> {
  return (await getEvents()).filter(
    (event) => deriveEventLifecycle(event, referenceDate) === "upcoming",
  );
}

export async function getPastEvents(referenceDate = new Date()): Promise<readonly Event[]> {
  return (await getEvents()).filter(
    (event) => deriveEventLifecycle(event, referenceDate) === "concluded",
  );
}
