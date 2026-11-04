"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import qrcode from "qrcode-generator";
import type { MerchStoreContent } from "@/types/merch-store";
import type { StaffOrder } from "@/types/admin";
import { adminApi, can, when, type Page, type StaffUser } from "./admin-api";
import { OrderDetail, StageBadge } from "./order-detail";
import { itemsSummary } from "./orders-tab";

type DeskCode = { code: string; day: string; path: string };

function qrDataUrl(text: string): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createDataURL(8, 2);
}

export function PickupTab({ user, content }: { user: StaffUser; content: MerchStoreContent }) {
  const [desk, setDesk] = useState<DeskCode | null>(null);
  const [queue, setQueue] = useState<StaffOrder[]>([]);
  const [open, setOpen] = useState<StaffOrder | null>(null);
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<StaffOrder[] | null>(null);
  const [error, setError] = useState("");
  const [showQr, setShowQr] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      const data = await adminApi<Page<StaffOrder>>("orders/?checked_in=true&page_size=200");
      setQueue([...data.results].sort((a, b) => Date.parse(a.checked_in_at ?? "") - Date.parse(b.checked_in_at ?? "")));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The queue couldn’t be loaded."); }
  }, []);

  useEffect(() => {
    void adminApi<DeskCode>("pickup-code/").then(setDesk).catch((failure) => setError(failure.message));
    queueMicrotask(() => void loadQueue());
    const timer = window.setInterval(() => { if (!document.hidden) void loadQueue(); }, 5000);
    return () => window.clearInterval(timer);
  }, [loadQueue]);

  const deskUrl = desk ? new URL(desk.path, location.origin).href : "";
  const qr = useMemo(() => deskUrl ? qrDataUrl(deskUrl) : "", [deskUrl]);

  async function rotate() {
    if (!confirm("Make a new desk code? The printed QR stops working; buyers must scan the new one.")) return;
    try { setDesk(await adminApi<DeskCode>("pickup-code/", { method: "POST" })); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t make a new code."); }
  }

  async function find(event: FormEvent) {
    event.preventDefault();
    if (!search.trim()) return;
    try { setFound((await adminApi<Page<StaffOrder>>(`orders/?status=paid&q=${encodeURIComponent(search.trim())}`)).results); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Search failed."); }
  }

  function update(order: StaffOrder) {
    setOpen(order.status === "paid" || order.id === open?.id ? order : null);
    void loadQueue();
    setFound((current) => current?.map((row) => row.id === order.id ? order : row) ?? null);
  }

  return <div className="admin-split" data-open={!!open || undefined}>
    <div>
      <section className="admin-card admin-desk">
        <div>
          <p className="admin-label">Today’s desk QR · {desk?.day}</p>
          <p>Buyers scan this to join the queue. It changes every day.</p>
          <p className="admin-code">{desk?.code ?? "…"}</p>
          <div className="admin-actions">
            <button type="button" className="admin-button" disabled={!qr} onClick={() => setShowQr(true)}>Show full screen</button>
            <button type="button" className="admin-button admin-button--ghost" disabled={!qr} onClick={() => window.print()}>Print desk sign</button>
            {can(user, "sales.change_shopsettings") && <button type="button" className="admin-button admin-button--ghost" onClick={() => void rotate()}>New code</button>}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
        {qr && <img className="admin-qr" src={qr} alt={`QR code for ${deskUrl}`} />}
      </section>

      <section className="admin-card">
        <h3>Waiting <span className="admin-count">{queue.length}</span></h3>
        {queue.length === 0 ? <p className="admin-empty">Nobody is waiting.</p> : <ol className="admin-queue">{queue.map((order, index) => <li key={order.id}>
          <button type="button" data-selected={open?.id === order.id || undefined} onClick={() => setOpen(order)}>
            <span className="admin-queue__n">{index + 1}</span>
            <span><strong>{order.buyer_name}</strong><small>{order.code} · {itemsSummary(order)}</small></span>
            <span><StageBadge stage={order.stage} /><small>{order.serving_by ? `${order.serving_by} serving` : `since ${when(order.checked_in_at, false)}`}</small></span>
          </button>
        </li>)}</ol>}
      </section>

      <section className="admin-card">
        <h3>Find a buyer</h3>
        <form className="admin-toolbar" onSubmit={find}><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone, pickup code or CSS- ref" aria-label="Find a buyer" /><button className="admin-button" type="submit">Find</button></form>
        {found && (found.length ? <ul className="admin-queue">{found.map((order) => <li key={order.id}><button type="button" onClick={() => setOpen(order)}><span /><span><strong>{order.buyer_name}</strong><small>{order.code} · {itemsSummary(order)}</small></span><span><StageBadge stage={order.stage} /></span></button></li>)}</ul> : <p className="admin-empty">No paid orders match.</p>)}
      </section>
      <p className="admin-error" role="alert">{error}</p>
    </div>
    {open && <aside className="admin-split__side"><OrderDetail key={open.id} order={open} user={user} content={content} onChange={update} onClose={() => setOpen(null)} /></aside>}
    {showQr && qr && <div className="admin-qr-full" role="dialog" aria-modal="true" aria-label="Desk QR code" onClick={() => setShowQr(false)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
      <img src={qr} alt={`QR code for ${deskUrl}`} />
      <p>Scan to join the pickup queue · {desk?.code}</p>
      <button type="button" className="admin-button" onClick={() => setShowQr(false)}>Close</button>
    </div>}
    {qr && <div className="admin-print-sign" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
      <img src={qr} alt="" /><h2>CSS merch pickup</h2><p>Scan with your phone camera to join the queue.</p><p>{desk?.day}</p>
    </div>}
  </div>;
}
