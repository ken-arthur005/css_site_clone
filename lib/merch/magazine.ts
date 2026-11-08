import type { ApiOrder } from "@/types/merch-store";

/** Pink October magazine fundraiser: GH₵5 or more per copy, every cedi to the cause. */
export const MAGAZINE_MIN_MINOR = 500;
export const MAGAZINE_MAX_MINOR = 500000;
export const MAGAZINE_MAX_COPIES = 20;
export const MAGAZINE_AMOUNTS = [5, 10, 20, 50, 100];
export const MAGAZINE_REFS_KEY = "css-merch:magazine-refs";
export const MAGAZINE_DEVICE_KEY = "css-merch:magazine-device";

export type MagazineEdition = "female" | "male";
export type MagazineCopies = Record<MagazineEdition, number>;

export const MAGAZINE_EDITIONS: { id: MagazineEdition; slug: string; name: string; edition: string; cover: string }[] = [
  { id: "female", slug: "mag-female", name: "Code & Her", edition: "Female Edition", cover: "/merch/magazine/female-cover.webp" },
  { id: "male", slug: "mag-male", name: "Code & Him", edition: "Male Edition", cover: "/merch/magazine/male-cover.webp" },
];

export const isEdition = (value: unknown): value is MagazineEdition => value === "female" || value === "male";

/** "12.5" or 12.5 → 1250; null when it isn't a plain amount in cedis. */
export function cedisToMinor(value: unknown): number | null {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export const minorToCedis = (minor: number) => (minor / 100).toFixed(2);

export function magazineAmountIssue(minor: number | null): string | null {
  if (minor === null || minor < MAGAZINE_MIN_MINOR) return "The minimum is GH₵5 per magazine.";
  if (minor > MAGAZINE_MAX_MINOR) return "The most per magazine is GH₵5,000.";
  return null;
}

export function magazineTotals(copies: MagazineCopies, amountMinor: number) {
  const count = copies.female + copies.male;
  return { count, totalMinor: count * amountMinor, extraMinor: count * Math.max(0, amountMinor - MAGAZINE_MIN_MINOR) };
}

/** A copy count from the request, or null when it's out of range. */
export function copiesOf(value: unknown): MagazineCopies | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const out: MagazineCopies = { female: 0, male: 0 };
  for (const { id } of MAGAZINE_EDITIONS) {
    const n = raw[id] ?? 0;
    if (!Number.isSafeInteger(n) || Number(n) < 0 || Number(n) > MAGAZINE_MAX_COPIES) return null;
    out[id] = Number(n);
  }
  return out.female + out.male > 0 ? out : null;
}

/** The editions a receipt's order bought (empty for an order without a magazine). */
export function orderMagazines(order: Pick<ApiOrder, "items">): MagazineEdition[] {
  return [...new Set((order.items ?? []).map((item) => item.magazine_edition).filter(isEdition))];
}

/** The receipt UUID, the 7-digit order code or an old CSS-XXXXXXXX reference. */
export function isMagazineRef(value: string): boolean {
  const ref = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref) || /^\d{3}\s?\d{4}$/.test(ref) || /^CSS-[A-Z0-9]{8}$/i.test(ref);
}

export const isDeviceId = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9]{16,64}$/.test(value);

export type MagazineSession = {
  id: string;
  code: string;
  token: string;
  editions: { id: MagazineEdition; name: string; pages: number }[];
  watermark: string;
};

export function parseMagazineSession(value: unknown): MagazineSession | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.token !== "string" || !/^[A-Za-z0-9.-]{20,200}$/.test(raw.token) || typeof raw.watermark !== "string" || !Array.isArray(raw.editions)) return null;
  const editions = raw.editions.flatMap((entry) => {
    const e = entry as Record<string, unknown>;
    return isEdition(e?.id) && typeof e.name === "string" && Number.isSafeInteger(e.pages) && Number(e.pages) >= 0 && Number(e.pages) <= 99
      ? [{ id: e.id, name: e.name.slice(0, 40), pages: Number(e.pages) }] : [];
  });
  if (!editions.length) return null;
  return { id: raw.id, code: typeof raw.code === "string" ? raw.code.slice(0, 12) : "", token: raw.token, editions, watermark: raw.watermark.slice(0, 200) };
}

export type Fundraiser = { name: string; goalMinor: number; raisedMinor: number; copies: number; supporters: number };

export const EMPTY_FUNDRAISER: Fundraiser = { name: "Breast cancer fundraiser", goalMinor: 500000, raisedMinor: 0, copies: 0, supporters: 0 };

export function parseFundraiser(value: unknown): Fundraiser {
  if (!value || typeof value !== "object") return EMPTY_FUNDRAISER;
  const raw = value as Record<string, unknown>;
  const count = (n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0 ? Number(n) : 0;
  return {
    name: typeof raw.name === "string" && raw.name ? raw.name.slice(0, 80) : EMPTY_FUNDRAISER.name,
    goalMinor: cedisToMinor(raw.goal) || EMPTY_FUNDRAISER.goalMinor,
    raisedMinor: cedisToMinor(raw.raised) ?? 0,
    copies: count(raw.copies),
    supporters: count(raw.supporters),
  };
}
