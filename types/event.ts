import type { ContentAsset, ContentStatus } from "./content";

export type EventDateTime = {
  dateTime: string;
  timeZone: "Africa/Accra";
};

export type EventLifecycle = "upcoming" | "happening" | "concluded";

export type EventRegistration =
  | { required: false }
  | { required: true; status: "upcoming" | "closed" }
  | { required: true; status: "open"; url: string };

export type EventSpeaker = {
  name: string;
  title?: string;
  organization?: string;
  image?: ContentAsset;
};

export type EventSponsor = {
  name: string;
  logo?: ContentAsset;
  url?: string;
};

export type EventRecap = {
  summary: string;
  url?: string;
};

export type Event = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  contentStatus: ContentStatus;
  start: EventDateTime;
  end?: EventDateTime;
  location?: string;
  flyer?: ContentAsset;
  heroImage?: ContentAsset;
  featured: boolean;
  registration: EventRegistration;
  speakers?: EventSpeaker[];
  sponsors?: EventSponsor[];
  gallery?: ContentAsset[];
  recap?: EventRecap;
};

// A server-rendered snapshot: selection and badges share the same clock.
export type HomeEvent = {
  event: Event;
  lifecycle: EventLifecycle;
};

export type HomeEventSelection = {
  mode: "current-upcoming" | "recent-highlights" | "empty";
  referenceDate: string;
  events: readonly HomeEvent[];
};
