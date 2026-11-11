"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { MerchStoreContent } from "@/types/merch-store";
import type { StaffOrder, StaffPiece } from "@/types/admin";
import { editChanges, type Buyer, type ExecDetails, type PieceField } from "@/lib/admin/order-edits";
import { adminApi, when } from "./admin-api";

type Choice = { value: string; label: string };
type EditorData = {
  sizes: Choice[]; colorways: Choice[]; backs: Choice[]; fits: Choice[]; roles: string[];
  items: { id: number; pieces: Record<string, PieceField[]>; exec: ExecDetails | null }[];
  history: { at: string; by: string; text: string }[];
};

const FIELD_LABEL: Record<PieceField, string> = { size: "Size", colorway: "Colourway", back: "Back design", fit: "Fit", back_name: "Name on the back" };
const ROLE_LABEL: Record<string, string> = { "Committee head": "Head", "Deputy committee head": "Deputy head", "Committee member": "Member" };

/** A change request: fix an order's buyer details and piece options. Prices never change. */
export function OrderEditor({ order, content, onSaved, onClose }: { order: StaffOrder; content: MerchStoreContent; onSaved: (order: StaffOrder) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<EditorData | null>(null);
  const [buyer, setBuyer] = useState<Buyer>({ name: order.buyer_name, phone: order.buyer_phone, email: order.buyer_email ?? "", hall: order.hall ?? "" });
  const [pieces, setPieces] = useState<Record<number, Partial<Record<PieceField, string>>>>({});
  const [execs, setExecs] = useState<Record<number, ExecDetails>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    dialog.current?.showModal();
    let cancelled = false;
    adminApi<EditorData>(`orders/${order.code}/edit/`).then((loaded) => {
      if (cancelled) return;
      setData(loaded);
      setExecs(Object.fromEntries(loaded.items.filter((item) => item.exec).map((item) => [item.id, { ...item.exec! }])));
    }).catch((failure) => { if (!cancelled) setError(failure instanceof Error ? failure.message : "The editor couldn’t be loaded."); });
    return () => { cancelled = true; };
  }, [order.code]);

  const original = Object.fromEntries((data?.items ?? []).filter((item) => item.exec).map((item) => [item.id, item.exec!]));
  const changes = editChanges(order, buyer, pieces, execs, original);
  const changed = Object.keys(changes).length > 0;
  const colourName = (choice: Choice) => content.products.flatMap((p) => p.colourways).find((cw) => cw.apiValue === choice.value)?.name ?? choice.label;
  const choicesFor = (field: PieceField): Choice[] => !data ? [] : field === "size" ? data.sizes : field === "colorway" ? data.colorways.map((c) => ({ ...c, label: colourName(c) })) : field === "back" ? data.backs : field === "fit" ? data.fits : [];
  const valueOf = (piece: StaffPiece, field: PieceField) => pieces[piece.id]?.[field] ?? piece[field];
  const setPiece = (piece: StaffPiece, field: PieceField, value: string) => setPieces((current) => ({ ...current, [piece.id]: { ...current[piece.id], [field]: value } }));

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!changed) return;
    const reprints = order.items.flatMap((item) => item.pieces).filter((piece) => piece.print_run && changes.pieces?.[String(piece.id)]);
    if (reprints.length && !confirm(`${reprints.map((piece) => `${piece.label} (batch “${piece.print_run!.name}”)`).join(", ")} ${reprints.length > 1 ? "were" : "was"} already printed. Changing ${reprints.length > 1 ? "them" : "it"} means a reprint. Go ahead?`)) return;
    setBusy(true); setError("");
    try {
      const next = await adminApi<StaffOrder>(`orders/${order.code}/edit/`, { method: "POST", body: { ...changes, confirm_printed: reprints.length > 0 } });
      onSaved(next);
      onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The changes couldn’t be saved."); }
    finally { setBusy(false); }
  }

  return <dialog ref={dialog} className="admin-editor" aria-labelledby={`edit-${order.code}`} onClose={onClose} onCancel={onClose}>
    <form className="admin-form" onSubmit={save}>
      <header className="admin-editor__head">
        <div><p className="admin-label">Change request</p><h3 id={`edit-${order.code}`}>Edit order {order.code.slice(0, 3)} {order.code.slice(3)}</h3></div>
        <button type="button" className="admin-link" onClick={onClose}>Close ✕</button>
      </header>

      <fieldset>
        <legend>Buyer</legend>
        <label>Full name<input required maxLength={150} value={buyer.name} onChange={(event) => setBuyer({ ...buyer, name: event.target.value })} /></label>
        <label>Phone<input required type="tel" maxLength={20} value={buyer.phone} onChange={(event) => setBuyer({ ...buyer, phone: event.target.value })} /></label>
        <label>Email <small>optional</small><input type="email" maxLength={254} value={buyer.email} onChange={(event) => setBuyer({ ...buyer, email: event.target.value })} /></label>
        <label>Hall <small>optional</small><input maxLength={100} value={buyer.hall} onChange={(event) => setBuyer({ ...buyer, hall: event.target.value })} /></label>
      </fieldset>

      {!data && !error && <p className="admin-muted">Loading the options…</p>}
      {data && order.items.map((item) => {
        const allowed = data.items.find((line) => line.id === item.id);
        const exec = execs[item.id];
        const editable = item.pieces.filter((piece) => (allowed?.pieces[String(piece.id)] ?? []).length > 0);
        if (!editable.length && !exec) return null;
        return <fieldset key={item.id}>
          <legend>{item.quantity > 1 ? `${item.quantity}× ` : ""}{item.product_name}</legend>
          {editable.map((piece) => {
            const fields = allowed?.pieces[String(piece.id)] ?? [];
            const locked = !!piece.handed_at;
            return <div key={piece.id} className="admin-editor__piece">
              {item.pieces.length > 1 && <p className="admin-editor__piece-name">{piece.label}</p>}
              {locked && <p className="admin-muted">Handed over {when(piece.handed_at)}: undo the hand-over to change it.</p>}
              {!locked && piece.print_run && <p className="admin-flag">Printed in batch “{piece.print_run.name}”: changing it means a reprint.</p>}
              <div className="admin-editor__fields">{fields.map((field) => field === "back_name"
                ? <label key={field}>{FIELD_LABEL[field]} <small>optional</small><input disabled={locked} maxLength={12} value={valueOf(piece, field)} onChange={(event) => setPiece(piece, field, event.target.value)} /></label>
                : <label key={field}>{FIELD_LABEL[field]}<select disabled={locked} value={valueOf(piece, field)} onChange={(event) => setPiece(piece, field, event.target.value)}>
                  {!choicesFor(field).some((choice) => choice.value === piece[field]) && <option value={piece[field]}>{piece[field] || "—"}</option>}
                  {choicesFor(field).map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                </select></label>)}</div>
            </div>;
          })}
          {exec && <div className="admin-editor__fields">
            <label>Name on the ID card<input required maxLength={32} value={exec.person_name} onChange={(event) => setExecs({ ...execs, [item.id]: { ...exec, person_name: event.target.value } })} /></label>
            <label>Committee<input required maxLength={32} value={exec.committee} onChange={(event) => setExecs({ ...execs, [item.id]: { ...exec, committee: event.target.value } })} /></label>
            <label>Role<select value={exec.role} onChange={(event) => setExecs({ ...execs, [item.id]: { ...exec, role: event.target.value } })}>
              {!data.roles.includes(exec.role) && <option value={exec.role}>{exec.role || "—"}</option>}
              {data.roles.map((role) => <option key={role} value={role}>{ROLE_LABEL[role] ?? role}</option>)}
            </select></label>
          </div>}
        </fieldset>;
      })}

      <p className="admin-muted">Prices don’t change when you edit. Every change is logged on the order.</p>
      <p className="admin-error" role="alert">{error}</p>
      <div className="admin-actions">
        <button type="submit" className="admin-button" disabled={busy || !changed}>{busy ? "Saving…" : "Save changes"}</button>
        <button type="button" className="admin-button admin-button--ghost" onClick={onClose}>Cancel</button>
      </div>

      {data && data.history.length > 0 && <div>
        <p className="admin-label">Changes so far</p>
        <ul className="admin-editor__history">{data.history.map((entry, index) => <li key={index}><small>{when(entry.at)} · {entry.by}</small> {entry.text.replace(/^Edited: /, "")}</li>)}</ul>
      </div>}
    </form>
  </dialog>;
}
