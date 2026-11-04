"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { MerchStoreContent } from "@/types/merch-store";
import type { StaffOrder } from "@/types/admin";
import { adminApi, allPages, cedis, downloadCsv, today, when, type Page, type StaffUser } from "./admin-api";
import { OrderDetail, pieceText, StageBadge } from "./order-detail";

type Filters = { q: string; status: string; stage: string; checkedIn: boolean };

function query(filters: Filters, page = 1): string {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.checkedIn) params.set("checked_in", "true");
  return `orders/?${params}`;
}

export function itemsSummary(order: StaffOrder): string {
  return order.items.map((item) => `${item.quantity}× ${item.product_name}`).join(", ");
}

export function OrdersTab({ user, content }: { user: StaffUser; content: MerchStoreContent }) {
  const [filters, setFilters] = useState<Filters>({ q: "", status: "", stage: "", checkedIn: false });
  const [draft, setDraft] = useState(filters.q);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<StaffOrder> | null>(null);
  const [open, setOpen] = useState<StaffOrder | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try { setData(await adminApi<Page<StaffOrder>>(query(filters, page))); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Orders couldn’t be loaded."); }
  }, [filters, page]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  function search(event: FormEvent) { event.preventDefault(); setPage(1); setFilters({ ...filters, q: draft }); }
  function update(order: StaffOrder) {
    setOpen(order);
    setData((current) => current && { ...current, results: current.results.map((row) => row.id === order.id ? order : row) });
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const rows = await allPages<StaffOrder>(query(filters).replace(/\?page=1&?/, "?"));
      downloadCsv(`css-orders-${today()}.csv`,
        ["Order", "Old ref", "Placed", "Status", "Stage", "Buyer", "Phone", "Email", "Source", "Item", "Piece", "Options", "Qty", "Line total", "Order total", "Code", "Handed over", "Handed by"],
        rows.flatMap((order) => order.items.flatMap((item) => item.pieces.map((piece) => [
          order.code, order.legacy_ref, when(order.created_at), order.status, order.stage, order.buyer_name, order.buyer_phone, order.buyer_email, order.source,
          item.product_name, piece.label, pieceText(piece, content), piece.quantity, item.line_total, order.total, order.promo_code, piece.handed_at ? when(piece.handed_at) : "", piece.handed_by,
        ]))));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Export failed."); }
    finally { setExporting(false); }
  }

  const pages = data ? Math.max(1, Math.ceil(data.count / 50)) : 1;
  return <div className="admin-split" data-open={!!open || undefined}>
    <div>
      <form className="admin-toolbar" onSubmit={search}>
        <input type="search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Name, phone, 7-digit code or CSS- ref" aria-label="Search orders" />
        <select aria-label="Status" value={filters.status} onChange={(event) => { setPage(1); setFilters({ ...filters, status: event.target.value }); }}>
          <option value="">Any status</option><option value="paid">Paid</option><option value="collected">Collected</option><option value="pending">Awaiting payment</option><option value="cancelled">Cancelled</option>
        </select>
        <select aria-label="Stage" value={filters.stage} onChange={(event) => { setPage(1); setFilters({ ...filters, stage: event.target.value }); }}>
          <option value="">Any stage</option><option value="paid">Not printing yet</option><option value="printing">Printing</option><option value="ready">Ready</option>
        </select>
        <label className="admin-inline"><input type="checkbox" checked={filters.checkedIn} onChange={(event) => { setPage(1); setFilters({ ...filters, checkedIn: event.target.checked }); }} /> In the queue</label>
        <button className="admin-button" type="submit">Search</button>
        <button className="admin-button admin-button--ghost" type="button" disabled={exporting} onClick={() => void exportCsv()}>{exporting ? "Exporting…" : "Export CSV"}</button>
      </form>
      <p className="admin-error" role="alert">{error}</p>
      {data && <p className="admin-muted">{data.count} order{data.count === 1 ? "" : "s"}</p>}
      <table className="admin-table">
        <thead><tr><th>Code</th><th>Buyer</th><th>Items</th><th>Stage</th><th className="admin-num">Total</th><th>Placed</th></tr></thead>
        <tbody>{data?.results.map((order) => <tr key={order.id} data-selected={open?.id === order.id || undefined} onClick={() => setOpen(order)}>
          <td><button type="button" className="admin-link" onClick={() => setOpen(order)}>{order.code}</button></td>
          <td>{order.buyer_name}<small>{order.buyer_phone}</small></td>
          <td>{itemsSummary(order)}</td>
          <td><StageBadge stage={order.stage} />{order.checked_in_at && order.status === "paid" && <small>In queue</small>}</td>
          <td className="admin-num">{cedis(order.total)}</td>
          <td>{when(order.created_at)}</td>
        </tr>)}</tbody>
      </table>
      {data && data.results.length === 0 && <p className="admin-empty">No orders match.</p>}
      {pages > 1 && <div className="admin-pager"><button type="button" className="admin-button admin-button--ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Newer</button><span>Page {page} of {pages}</span><button type="button" className="admin-button admin-button--ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Older →</button></div>}
    </div>
    {open && <aside className="admin-split__side"><OrderDetail key={open.id} order={open} user={user} content={content} onChange={update} onClose={() => setOpen(null)} /></aside>}
  </div>;
}
