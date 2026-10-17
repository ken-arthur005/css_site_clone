import type { Event, EventLifecycle } from "@/types/event";

export function formatEventDate(event: Event) {
  return new Intl.DateTimeFormat("en-GH", {
    day: "2-digit", month: "short", year: "numeric", timeZone: event.start.timeZone,
  }).format(new Date(event.start.dateTime));
}

export function eventStatus(event: Event, lifecycle: EventLifecycle) {
  if (lifecycle === "concluded") return "Concluded";
  if (lifecycle === "happening") return event.end ? "Happening now" : "Today";
  if (!event.registration.required) return "Upcoming";
  if (event.registration.status === "open") return "Registration open";
  if (event.registration.status === "closed") return "Registration closed";
  return "Registration pending";
}
