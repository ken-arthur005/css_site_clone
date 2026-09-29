import type { Event } from "@/types/event";

export const events = [
  {
    id: "event-freshers-orientation-2026",
    slug: "freshers-orientation",
    title: "Fresher's Orientation",
    summary: "A starting point for new CSS students to meet the society, understand the community, and find their place in computing.",
    description:
      "A first gathering for incoming Computer Science students to connect with the CSS community and get oriented for the year ahead.",
    contentStatus: "verified",
    start: { dateTime: "2026-10-19T00:00:00+00:00", timeZone: "Africa/Accra" },
    featured: true,
    registration: { required: true, status: "upcoming" },
    heroImage: { src: "/orientation.jpg", alt: "Students attending a CSS orientation session", contentStatus: "verified" },
  },
  {
    id: "event-alumni-homecoming-2026",
    slug: "alumni-homecoming",
    title: "Alumni Homecoming",
    summary: "An alumni and student gathering for shared stories, community, and the next chapter for Computer Science at KNUST.",
    description:
      "A homecoming moment that brings the Computer Science community together across generations.",
    contentStatus: "verified",
    start: { dateTime: "2026-11-02T00:00:00+00:00", timeZone: "Africa/Accra" },
    featured: false,
    registration: { required: true, status: "upcoming" },
    heroImage: { src: "/homecoming.jpg", alt: "Alumni Homecoming 2026 artwork", contentStatus: "verified" },
  },
  {
    id: "event-future-of-tech-seminar-2026",
    slug: "future-of-tech-seminar",
    title: "Future of Tech Seminar",
    summary: "A student-focused seminar on technology pathways, opportunity, and thoughtful preparation for the future of computing.",
    description:
      "A focused conversation on where technology is moving and how students can prepare to participate in it.",
    contentStatus: "verified",
    start: { dateTime: "2026-11-07T00:00:00+00:00", timeZone: "Africa/Accra" },
    featured: false,
    registration: { required: true, status: "upcoming" },
    heroImage: { src: "/future%20of%20tech.jpg", alt: "Future of Tech Seminar artwork", contentStatus: "verified" },
  },
] satisfies readonly Event[];
