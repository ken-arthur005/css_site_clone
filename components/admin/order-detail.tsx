"use client";

import { useState } from "react";
import type { MerchStoreContent } from "@/types/merch-store";
import type { StaffOrder, StaffPiece } from "@/types/admin";
import { adminApi, can, cedis, when, type StaffUser } from "./admin-api";

export const STAGE_LABEL: Record<string, string> = { placed: "Awaiting payment", paid: "Paid", printing: "Printing", ready: "Ready", collected: "Collected", cancelled: "Cancelled" };

/** "Kernel Panic · Backbone back · Oversized · AMA · XL" from a piece's backend values. */
export function pieceText(piece: Pick<StaffPiece, "colorway" | "back" | "fit" | "back_name" | "size">, content: MerchStoreContent): string {
  const colour = piece.colorway ? content.products.flatMap((p) => p.colourways).find((cw) => cw.apiValue === piece.colorway)?.name ?? piece.colorway : "";
  const back = piece.back ? `${content.backs.find(({ id }) => id === piece.back)?.name ?? piece.back} back` : "";
  const fit = piece.fit && piece.fit !== "regular" ? content.fits.find(({ id }) => id === piece.fit)?.name ?? piece.fit : "";
  return [colour, back, fit, piece.back_name && `“${piece.back_name}”`, piece.size && `Size ${piece.size}`].filter(Boolean).join(" · ");
}

export function StageBadge({ stage }: { stage: string }) {
  return <span className="admin-badge" data-stage={stage}>{STAGE_LABEL[stage] ?? stage}</span>;
}

export function OrderDetail({ order, user, content, onChange, onClose }: {
  order: StaffOrder; user: StaffUser; content: MerchStoreContent; onChange: (order: StaffOrder) => void; onClose?: () => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [pickedUpBy, setPickedUpBy] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pieces = order.items.flatMap((item) => item.pieces.map((piece) => ({ ...piece, item })));
  const open = pieces.filter((piece) => !piece.handed_at);
  const handed = pieces.filter((piece) => piece.handed_at);
  const paid = order.status === "paid";
  const mayCollect = can(user, "sales.collect_order");
  const mayUndo = can(user, "sales.undo_handover_order");

  async function act(path: string, body: unknown, done: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await adminApi<StaffOrder>(`orders/${order.code}/${path}`, { method: "POST", body });
      onChange(next); setSelected([]); setMessage(done);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "That didn’t work."); }
    finally { setBusy(false); }
  }

  const toggle = (id: number) => setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const selectedOpen = selected.filter((id) => open.some((piece) => piece.id === id));
  const selectedHanded = selected.filter((id) => handed.some((piece) => piece.id === id));

  return <section className="admin-order" aria-labelledby={`order-${order.code}`}>
    <header className="admin-order__head">
      <div>
        <p className="admin-label">Order {order.legacy_ref ? `· was ${order.legacy_ref}` : ""}</p>
        <h3 id={`order-${order.code}`}>{order.code.slice(0, 3)} {order.code.slice(3)} <StageBadge stage={order.stage} /></h3>
        <p><strong>{order.buyer_name}</strong> · <a href={`tel:${order.buyer_phone}`}>{order.buyer_phone}</a>{order.buyer_email && <> · {order.buyer_email}</>}</p>
        <p className="admin-muted">{order.source === "IN_PERSON" ? "Desk sale" : "Online"} · {when(order.created_at)} · {cedis(order.total)}{order.promo_code && ` · code ${order.promo_code}`}</p>
        {order.checked_in_at && paid && <p className="admin-flag">In the pickup queue since {when(order.checked_in_at, false)}{order.serving_by && ` · ${order.serving_by} is serving`}</p>}
        {order.cancel_reason && <p className="admin-flag admin-flag--bad">Cancelled: {order.cancel_reason}</p>}
      </div>
      {onClose && <button type="button" className="admin-link" onClick={onClose}>Close ✕</button>}
    </header>

    <ul className="admin-pieces">{pieces.map((piece) => {
      const selectable = (paid && !piece.handed_at && mayCollect) || (!!piece.handed_at && mayUndo);
      return <li key={piece.id} data-handed={!!piece.handed_at || undefined}>
        <label>
          <input type="checkbox" disabled={!selectable || busy} checked={selected.includes(piece.id)} onChange={() => toggle(piece.id)} />
          <span>
            <strong>{piece.quantity > 1 ? `${piece.quantity}× ` : ""}{piece.item.pieces.length > 1 ? `${piece.item.product_name}: ${piece.label}` : piece.label}</strong>
            <small>{pieceText(piece, content)}</small>
            <small className="admin-muted">{piece.handed_at ? `Handed over ${when(piece.handed_at)} by ${piece.handed_by ?? "—"}${piece.handed_to ? ` to ${piece.handed_to}` : ""}` : piece.print_run ? `${piece.print_run.back_at ? "Printed" : "Printing"} · ${piece.print_run.name}` : "Not printed yet"}</small>
          </span>
        </label>
      </li>;
    })}</ul>

    {paid && mayCollect && <div className="admin-actions">
      <button type="button" className="admin-button" disabled={busy || !selectedOpen.length} onClick={() => void act("handover", { pieces: selectedOpen, picked_up_by: pickedUpBy }, `Handed over ${selectedOpen.length} piece(s).`)}>Hand over {selectedOpen.length || ""} selected</button>
      <button type="button" className="admin-button admin-button--ghost" disabled={busy || !open.length} onClick={() => setSelected(open.map((piece) => piece.id))}>Select all to collect</button>
      <label className="admin-inline">Collected by someone else? <input value={pickedUpBy} onChange={(event) => setPickedUpBy(event.target.value)} placeholder="Their name (check their ID)" maxLength={150} /></label>
    </div>}
    {paid && mayCollect && <div className="admin-actions">
      {order.checked_in_at
        ? <button type="button" className="admin-button admin-button--ghost" disabled={busy} onClick={() => void act("checkin", { undo: true }, "Taken off the queue.")}>Take off the queue</button>
        : <button type="button" className="admin-button admin-button--ghost" disabled={busy} onClick={() => void act("checkin", {}, "Added to the pickup queue.")}>Bring to the desk</button>}
      {order.serving_by === (user.name ?? user.username)
        ? <button type="button" className="admin-button admin-button--ghost" disabled={busy} onClick={() => void act("serve", { undo: true }, "Released.")}>Stop serving</button>
        : <button type="button" className="admin-button admin-button--ghost" disabled={busy || !!order.serving_by} onClick={() => void act("serve", {}, "You’re serving this buyer.")}>I’ll serve them</button>}
    </div>}
    {mayUndo && selectedHanded.length > 0 && <div className="admin-actions"><button type="button" className="admin-button admin-button--danger" disabled={busy} onClick={() => void act("handover", { pieces: selectedHanded, undo: true }, "Hand-over undone.")}>Undo hand-over of {selectedHanded.length}</button></div>}
    {can(user, "sales.cancel_order") && (order.status === "paid" || order.status === "pending") && <details className="admin-cancel"><summary>Cancel this order</summary>
      <div className="admin-actions"><input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Reason (required)" maxLength={200} /><button type="button" className="admin-button admin-button--danger" disabled={busy || !cancelReason.trim()} onClick={() => { if (confirm(`Cancel order ${order.code}? ${order.status === "paid" && order.source === "ONLINE" ? "Its payment will be flagged for a refund." : ""}`)) void act("cancel", { reason: cancelReason }, "Order cancelled."); }}>Cancel order</button></div>
    </details>}
    <p className="admin-ok" role="status">{message}</p>
    <p className="admin-error" role="alert">{error}</p>
  </section>;
}
