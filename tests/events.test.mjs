import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

// Node's native TypeScript support needs the same @/ alias as Next.js.
// Run: node --experimental-strip-types --test tests/events.test.mjs
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { deriveEventLifecycle, getEvents, getHomeEventSelection, selectHomeEvents } = await import("@/lib/content/events");
const [original] = await getEvents();
const referenceDate = new Date("2026-10-19T12:00:00Z");

function event(id, start, overrides = {}) {
  return {
    ...original,
    id,
    slug: id,
    featured: false,
    start: { dateTime: start, timeZone: "Africa/Accra" },
    end: undefined,
    ...overrides,
  };
}

test("missing end times stay current through the event day, with an exclusive next-midnight boundary", () => {
  const fixture = event("date-only", "2026-10-19T00:00:00Z");
  for (const [date, expected] of [
    ["2026-10-18T23:59:59.999Z", "upcoming"],
    ["2026-10-19T00:00:00Z", "happening"],
    ["2026-10-19T12:00:00Z", "happening"],
    ["2026-10-19T23:59:59.999Z", "happening"],
    ["2026-10-20T00:00:00Z", "concluded"],
  ]) {
    assert.equal(deriveEventLifecycle(fixture, new Date(date)), expected, date);
  }
});

test("a timed start is respected without treating an unspecified end as an instantaneous event", () => {
  const fixture = event("timed", "2026-10-19T18:00:00Z");
  assert.equal(deriveEventLifecycle(fixture, referenceDate), "upcoming");
  assert.equal(deriveEventLifecycle(fixture, new Date("2026-10-19T18:00:01Z")), "happening");
  assert.equal(deriveEventLifecycle(fixture, new Date("2026-10-20T00:00:00Z")), "concluded");
});

test("calendar-day fallback handles month/year rollover and the Accra date of offset timestamps", () => {
  const yearEnd = event("year-end", "2026-12-31T23:00:00Z");
  assert.equal(deriveEventLifecycle(yearEnd, new Date("2026-12-31T23:59:59Z")), "happening");
  assert.equal(deriveEventLifecycle(yearEnd, new Date("2027-01-01T00:00:00Z")), "concluded");
  const offset = event("offset", "2026-10-20T00:30:00+02:00");
  assert.equal(deriveEventLifecycle(offset, new Date("2026-10-19T23:00:00Z")), "happening");
  assert.equal(deriveEventLifecycle(offset, new Date("2026-10-20T00:00:00Z")), "concluded");
});

test("an explicit end overrides the fallback, including multi-day events", () => {
  const fixture = event("multi-day", "2026-10-19T10:00:00Z", {
    end: { dateTime: "2026-10-21T14:00:00Z", timeZone: "Africa/Accra" },
  });
  assert.equal(deriveEventLifecycle(fixture, new Date("2026-10-20T12:00:00Z")), "happening");
  assert.equal(deriveEventLifecycle(fixture, new Date("2026-10-21T13:59:59.999Z")), "happening");
  assert.equal(deriveEventLifecycle(fixture, new Date("2026-10-21T14:00:00Z")), "concluded");
  const short = { ...fixture, end: { dateTime: "2026-10-19T11:00:00Z", timeZone: "Africa/Accra" } };
  assert.equal(deriveEventLifecycle(short, referenceDate), "concluded");
});

test("current/upcoming selection prefers featured events, excludes featured past events, deduplicates, and caps at three", () => {
  const featured = event("featured", "2026-11-04T00:00:00Z", { featured: true });
  const source = [
    event("old-featured", "2026-10-01T00:00:00Z", { featured: true }),
    event("later", "2026-10-22T00:00:00Z"),
    featured,
    event("soon", "2026-10-20T00:00:00Z"),
    event("today", "2026-10-19T00:00:00Z"),
    featured,
  ];
  const unchanged = [...source];
  const selection = selectHomeEvents(source, referenceDate);
  assert.equal(selection.mode, "current-upcoming");
  assert.equal(selection.referenceDate, referenceDate.toISOString());
  assert.deepEqual(selection.events.map(({ event }) => event.id), ["featured", "today", "soon"]);
  assert.deepEqual(selection.events.map(({ lifecycle }) => lifecycle), ["upcoming", "happening", "upcoming"]);
  assert.deepEqual(source, unchanged, "selection must not reorder the source");
});

test("happening-only content remains current instead of triggering the past-event fallback", () => {
  const selection = selectHomeEvents([event("today", "2026-10-19T00:00:00Z")], referenceDate);
  assert.equal(selection.mode, "current-upcoming");
  assert.equal(selection.events[0].lifecycle, "happening");
});

test("recent highlights are explicit, newest first, and limited to three", () => {
  const source = [
    event("oldest", "2026-10-01T00:00:00Z", { featured: true }),
    event("recent", "2026-10-18T00:00:00Z"),
    event("older", "2026-10-10T00:00:00Z"),
    event("newest", "2026-10-19T00:00:00Z"),
  ];
  const selection = selectHomeEvents(source, new Date("2026-10-20T00:00:00Z"));
  assert.equal(selection.mode, "recent-highlights");
  assert.deepEqual(selection.events.map(({ event }) => event.id), ["newest", "recent", "older"]);
  assert.ok(selection.events.every(({ lifecycle }) => lifecycle === "concluded"));
});

test("empty content and equal-date ordering are deterministic", () => {
  assert.deepEqual(selectHomeEvents([], referenceDate), {
    mode: "empty", referenceDate: referenceDate.toISOString(), events: [],
  });
  const a = event("a", "2026-10-22T00:00:00Z");
  const b = event("b", "2026-10-22T00:00:00Z");
  assert.deepEqual(selectHomeEvents([a, b], referenceDate), selectHomeEvents([b, a], referenceDate));
});

test("the content retrieval boundary uses the requested snapshot for both selection and badges", async () => {
  const source = await getEvents();
  const afterAllEvents = new Date(Math.max(...source.map((event) => Date.parse(event.end?.dateTime ?? event.start.dateTime))) + 2 * 86400000);
  const selection = await getHomeEventSelection(afterAllEvents);
  assert.equal(selection.mode, "recent-highlights");
  assert.equal(selection.referenceDate, afterAllEvents.toISOString());
  assert.equal(selection.events.length, Math.min(3, source.length));
  assert.ok(selection.events.every(({ lifecycle }) => lifecycle === "concluded"));
});
