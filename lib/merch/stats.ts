/** Real social proof for the shop, from paid orders only (never made up). */
export type MerchStats = { week: Record<string, number>; buyers: Record<string, number>; people: number };

export const EMPTY_STATS: MerchStats = { week: {}, buyers: {}, people: 0 };

/** The backend's stats (keyed by product slug), keeping only well-formed counts. */
export function parseStats(raw: unknown): MerchStats {
  const out: MerchStats = { week: {}, buyers: {}, people: 0 };
  if (!raw || typeof raw !== "object") return out;
  const data = raw as { products?: unknown; people?: unknown };
  const count = (value: unknown) => (Number.isSafeInteger(value) && (value as number) > 0 ? (value as number) : 0);
  if (Array.isArray(data.products)) {
    for (const row of data.products) {
      const slug = row && typeof row === "object" ? (row as { slug?: unknown }).slug : null;
      if (typeof slug !== "string" || !/^[a-z0-9-]{1,60}$/.test(slug)) continue;
      const week = count((row as { week?: unknown }).week);
      const buyers = count((row as { buyers?: unknown }).buyers);
      if (week) out.week[slug] = week;
      if (buyers) out.buyers[slug] = buyers;
    }
  }
  out.people = count(data.people);
  return out;
}

const WEEK_FROM = 5;
const BUYERS_FROM = 10;

/** "12 ordered this week" (from 5), else "34 people bought this" (from 10), else "". */
export function proofLine(id: string, stats: MerchStats): string {
  const week = stats.week[id] ?? 0;
  if (week >= WEEK_FROM) return `${week} ordered this week`;
  const buyers = stats.buyers[id] ?? 0;
  return buyers >= BUYERS_FROM ? `${buyers} people bought this` : "";
}

/** The bundle with the most buyers, once it has 10 and leads outright. */
export function mostPopular(ids: string[], stats: MerchStats): string | null {
  const ranked = ids.map((id) => [id, stats.buyers[id] ?? 0] as const).sort((a, b) => b[1] - a[1]);
  const [top, next] = ranked;
  return top && top[1] >= BUYERS_FROM && top[1] > (next?.[1] ?? 0) ? top[0] : null;
}
