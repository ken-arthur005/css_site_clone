import { events } from "@/content/events";
import type { Event, EventLifecycle } from "@/types/event";

export function deriveEventLifecycle(event: Event, referenceDate = new Date()): EventLifecycle {
  const start = new Date(event.start.dateTime);
  const end = event.end ? new Date(event.end.dateTime) : start;

  if (referenceDate < start) {
    return "upcoming";
  }

  if (referenceDate <= end) {
    return "happening";
  }

  return "concluded";
}

export async function getEvents(): Promise<readonly Event[]> {
  return [...events].sort(
    (first, second) =>
      new Date(first.start.dateTime).getTime() - new Date(second.start.dateTime).getTime(),
  );
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
