"use client";

import { useCallback, useEffect, useState } from "react";
import type { MerchStoreContent } from "@/types/merch-store";
import type { PrintRun, QueuePiece } from "@/types/admin";
import { adminApi, downloadCsv, today, when } from "./admin-api";
import { pieceText } from "./order-detail";

export function PrintingTab({ content }: { content: MerchStoreContent }) {
  const [queue, setQueue] = useState<QueuePiece[]>([]);
  const [runs, setRuns] = useState<PrintRun[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [nextN, setNextN] = useState(20);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [pieces, batches] = await Promise.all([adminApi<QueuePiece[]>("print-queue/"), adminApi<PrintRun[]>("print-runs/")]);
      setQueue(pieces); setRuns(batches);
      setSelected((current) => current.filter((id) => pieces.some((piece) => piece.id === id)));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Printing couldn’t be loaded."); }
  }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  async function run(work: () => Promise<string>) {
    setBusy(true); setError(""); setMessage("");
    try { setMessage(await work()); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "That didn’t work."); }
    finally { setBusy(false); }
  }

  const send = () => run(async () => {
    const batch = await adminApi<PrintRun>("print-runs/", { method: "POST", body: { pieces: selected, name } });
    setSelected([]); setName("");
    return `Sent ${batch.pieces} piece(s) to the printer as “${batch.name}”.`;
  });
  const back = (batch: PrintRun) => run(async () => {
    const result = await adminApi<{ ready: string[] }>(`print-runs/${batch.id}/back/`, { method: "POST" });
    return `“${batch.name}” is back. ${result.ready.length} order(s) are now ready and have been texted.`;
  });
  const remove = (batch: PrintRun) => {
    if (!confirm(`Delete “${batch.name}”? Its pieces go back to the queue.`)) return;
    void run(async () => { await adminApi(`print-runs/${batch.id}/`, { method: "DELETE" }); return `Deleted “${batch.name}”.`; });
  };

  const toggle = (id: number) => setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const units = queue.filter((piece) => selected.includes(piece.id)).reduce((sum, piece) => sum + piece.quantity, 0);

  return <div className="admin-stack">
    <section className="admin-card">
      <h3>To print <span className="admin-count">{queue.length}</span></h3>
      <p className="admin-muted">Paid pieces not yet sent to the printer, first paid first.</p>
      <div className="admin-toolbar">
        <label className="admin-inline">Next <input type="number" min={1} max={500} value={nextN} onChange={(event) => setNextN(Math.max(1, Number(event.target.value) || 1))} /> pieces</label>
        <button type="button" className="admin-button admin-button--ghost" onClick={() => setSelected(queue.slice(0, nextN).map((piece) => piece.id))}>Select</button>
        <button type="button" className="admin-button admin-button--ghost" onClick={() => setSelected([])}>Clear</button>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Batch name (optional)" maxLength={80} aria-label="Batch name" />
        <button type="button" className="admin-button" disabled={busy || !selected.length} onClick={() => void send()}>Send {selected.length || ""} to printer{units ? ` (${units} units)` : ""}</button>
        <button type="button" className="admin-button admin-button--ghost" disabled={!queue.length} onClick={() => downloadCsv(`css-print-queue-${today()}.csv`, ["Order", "Buyer", "Paid", "Piece", "Options", "Qty"], queue.map((piece) => [piece.order_code, piece.buyer_name, when(piece.paid_at), piece.label, pieceText(piece, content), piece.quantity]))}>Export queue</button>
      </div>
      <table className="admin-table">
        <thead><tr><th aria-label="Select" /><th>Order</th><th>Piece</th><th>Options</th><th className="admin-num">Qty</th><th>Paid</th></tr></thead>
        <tbody>{queue.map((piece) => <tr key={piece.id} data-selected={selected.includes(piece.id) || undefined} onClick={() => toggle(piece.id)}>
          <td><input type="checkbox" checked={selected.includes(piece.id)} onChange={() => toggle(piece.id)} onClick={(event) => event.stopPropagation()} aria-label={`Select ${piece.label} for ${piece.order_code}`} /></td>
          <td>{piece.order_code}<small>{piece.buyer_name}</small></td><td>{piece.label}</td><td>{pieceText(piece, content)}</td><td className="admin-num">{piece.quantity}</td><td>{when(piece.paid_at)}</td>
        </tr>)}</tbody>
      </table>
      {queue.length === 0 && <p className="admin-empty">Nothing waiting to print.</p>}
    </section>

    <section className="admin-card">
      <h3>Batches</h3>
      <table className="admin-table">
        <thead><tr><th>Batch</th><th>Sent</th><th className="admin-num">Pieces</th><th className="admin-num">Units</th><th>Back</th><th aria-label="Actions" /></tr></thead>
        <tbody>{runs.map((batch) => <tr key={batch.id}>
          <td>{batch.name}<small>{batch.created_by}</small></td><td>{when(batch.created_at)}</td><td className="admin-num">{batch.pieces}</td><td className="admin-num">{batch.units ?? 0}</td>
          <td>{batch.back_at ? when(batch.back_at) : "At the printer"}</td>
          <td className="admin-row-actions">{!batch.back_at && <><button type="button" className="admin-button" disabled={busy} onClick={() => void back(batch)}>Mark back</button><button type="button" className="admin-link" disabled={busy} onClick={() => remove(batch)}>Delete</button></>}</td>
        </tr>)}</tbody>
      </table>
      {runs.length === 0 && <p className="admin-empty">No batches yet.</p>}
    </section>
    <p className="admin-ok" role="status">{message}</p>
    <p className="admin-error" role="alert">{error}</p>
  </div>;
}
