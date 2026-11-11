import type { StaffOrder } from "@/types/admin";

export type Buyer = { name: string; phone: string; email: string; hall: string };
export type ExecDetails = { person_name: string; committee: string; role: string };
export type PieceField = "size" | "colorway" | "back" | "fit" | "back_name";

/** What staff changed, as the backend expects it: only the fields that differ. */
export function editChanges(order: StaffOrder, buyer: Buyer, pieces: Record<number, Partial<Record<PieceField, string>>>, execs: Record<number, ExecDetails>, original: Record<number, ExecDetails>) {
  const out: { buyer?: Partial<Buyer>; pieces?: Record<string, Partial<Record<PieceField, string>>>; items?: Record<string, Partial<ExecDetails>> } = {};
  const now: Buyer = { name: order.buyer_name, phone: order.buyer_phone, email: order.buyer_email ?? "", hall: order.hall ?? "" };
  const buyerDiff = Object.fromEntries(Object.entries(buyer).filter(([key, value]) => value.trim() !== (now[key as keyof Buyer] ?? "").trim()));
  if (Object.keys(buyerDiff).length) out.buyer = buyerDiff;
  const all = order.items.flatMap((item) => item.pieces);
  const pieceDiff: Record<string, Partial<Record<PieceField, string>>> = {};
  for (const [id, values] of Object.entries(pieces)) {
    const piece = all.find((p) => p.id === Number(id));
    if (!piece) continue;
    const diff = Object.fromEntries(Object.entries(values).filter(([key, value]) => (value ?? "").trim() !== piece[key as PieceField]));
    if (Object.keys(diff).length) pieceDiff[id] = diff;
  }
  if (Object.keys(pieceDiff).length) out.pieces = pieceDiff;
  const itemDiff: Record<string, Partial<ExecDetails>> = {};
  for (const [id, values] of Object.entries(execs)) {
    const before = original[Number(id)];
    if (!before) continue;
    const diff = Object.fromEntries(Object.entries(values).filter(([key, value]) => value.trim() !== before[key as keyof ExecDetails]));
    if (Object.keys(diff).length) itemDiff[id] = diff;
  }
  if (Object.keys(itemDiff).length) out.items = itemDiff;
  return out;
}
