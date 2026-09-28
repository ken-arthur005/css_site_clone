import type { Event } from "@/types/event";

// Development-only event records. Dates, locations, copy, and registration details need approval.
export const events = [
  {
    id: "event-css-build-night-2026",
    slug: "css-build-night",
    title: "CSS Build Night",
    summary: "An evening placeholder event for making and sharing student projects.",
    description:
      "Development-only copy to exercise a featured upcoming event without presenting unverified plans as public information.",
    contentStatus: "placeholder",
    start: { dateTime: "2026-10-24T15:00:00+00:00", timeZone: "Africa/Accra" },
    end: { dateTime: "2026-10-24T19:00:00+00:00", timeZone: "Africa/Accra" },
    featured: true,
    registration: { required: true, status: "upcoming" },
  },
  {
    id: "event-signals-student-tech-forum-2026",
    slug: "signals-student-tech-forum",
    title: "Signals: Student Tech Forum",
    summary: "A placeholder forum record with optional speakers but no registration link.",
    description:
      "Development-only copy demonstrating an upcoming event that can render speakers when approved information exists.",
    contentStatus: "placeholder",
    start: { dateTime: "2026-11-14T10:00:00+00:00", timeZone: "Africa/Accra" },
    featured: false,
    registration: { required: true, status: "upcoming" },
    speakers: [
      {
        name: "Nana Osei",
        title: "Guest speaker placeholder",
      },
    ],
  },
  {
    id: "event-code-and-community-2026",
    slug: "code-and-community",
    title: "Code & Community",
    summary: "A concluded placeholder event with a recap and no optional event media.",
    description:
      "Development-only copy demonstrating a completed event whose optional sections are independently present or omitted.",
    contentStatus: "placeholder",
    start: { dateTime: "2026-08-15T11:00:00+00:00", timeZone: "Africa/Accra" },
    featured: false,
    registration: { required: false },
    recap: {
      summary: "Placeholder recap content pending approved event material.",
    },
  },
] satisfies readonly Event[];
