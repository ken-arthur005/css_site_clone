"use client";

import { useMemo, useState, type FormEvent } from "react";
import { addLine, calculateTotals, describeLine, findProduct, lineKey, makeOrderRequest, money, normalizeLine, unitPrice } from "@/lib/merch/order";
import { selectionIssue, withCatalogPricing } from "@/lib/merch/catalog";
import { defaultDraft } from "@/lib/merch/draft";
import type { MerchStoreContent, ProductId, ShopLine } from "@/types/merch-store";
import type { StaffOrder } from "@/types/admin";
import { ShopOptions } from "../merch/shop/shop-options";
import { ShopPicker } from "../merch/shop/shop-picker";
import { useMerchCatalog } from "../merch/use-merch-catalog";
import { adminApi, cedis } from "./admin-api";

/** The desk point of sale: same products and options as the website, paid in cash. */
export function SaleTab({ content: localContent }: { content: MerchStoreContent }) {
  const { catalog, error: catalogError, refresh } = useMerchCatalog();
  const content = useMemo(() => withCatalogPricing(localContent, catalog), [localContent, catalog]);
  const [draft, setDraft] = useState<ShopLine>(() => defaultDraft(content.products[0], content, null));
  const [lines, setLines] = useState<ShopLine[]>([]);
  const [buyer, setBuyer] = useState({ name: "", phone: "", email: "" });
  const [promo, setPromo] = useState("");
  const [handedOver, setHandedOver] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<StaffOrder[]>([]);

  const normalized = normalizeLine(draft, content);
  const issue = normalized ? selectionIssue(normalized, content, catalog) : "Choose a size for every piece.";
  const totals = calculateTotals(lines, content, catalog);

  function choose(id: ProductId) { setDraft(defaultDraft(findProduct(content, id)!, content, catalog, draft)); setError(""); }
  function add() {
    if (!normalized || issue) { setError(issue ?? "Check the options."); return; }
    try { setLines(addLine(lines, normalized, content.maxQuantity)); setDraft({ ...normalized, quantity: 1 }); setError(""); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t add that."); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!catalog || !lines.length) return;
    setBusy(true); setError("");
    try {
      const ids = Object.fromEntries(Object.entries(catalog.products).map(([id, record]) => [id, record?.id]));
      const request = makeOrderRequest(buyer, lines, ids, content, promo);
      const order = await adminApi<StaffOrder>("sales/", { method: "POST", body: { buyer_name: request.buyer_name, buyer_phone: request.buyer_phone, buyer_email: request.buyer_email, promo_code: request.promo_code ?? "", handed_over: handedOver, items: request.items } });
      setDone([order, ...done]); setLines([]); setBuyer({ name: "", phone: "", email: "" }); setPromo("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The sale couldn’t be recorded."); }
    finally { setBusy(false); }
  }

  return <div className="admin-sale">
    <section className="admin-card">
      <h3>Add items</h3>
      {catalogError && <p className="admin-error">{catalogError} <button type="button" className="admin-link" onClick={() => void refresh()}>Retry</button></p>}
      <ShopPicker content={content} catalog={catalog} selected={draft.productId} disabled={false} onChoose={choose} />
      <ShopOptions content={content} catalog={catalog} draft={draft} maxQuantity={content.maxQuantity} onChange={(next) => { setDraft(next); setError(""); }} />
      <div className="admin-actions"><button type="button" className="admin-button" disabled={!!issue} onClick={add}>Add {normalized ? money(unitPrice(normalized, content, catalog) * normalized.quantity) : ""}</button>{issue && normalized && <span className="admin-muted">{issue}</span>}</div>
    </section>

    <section className="admin-card">
      <h3>This sale</h3>
      {lines.length === 0 ? <p className="admin-empty">Nothing added yet.</p> : <ul className="admin-sale__lines">{lines.map((line) => {
        const info = describeLine(line, content);
        return <li key={lineKey(line)}><span><strong>{line.quantity}× {info.title}</strong><small>{info.details.join(" · ")}</small></span><span>{money(unitPrice(line, content, catalog) * line.quantity)}</span><button type="button" className="admin-link" onClick={() => setLines(lines.filter((other) => lineKey(other) !== lineKey(line)))}>Remove</button></li>;
      })}</ul>}
      <form onSubmit={submit} className="admin-form">
        <label>Buyer name<input required maxLength={150} value={buyer.name} onChange={(event) => setBuyer({ ...buyer, name: event.target.value })} /></label>
        <label>Phone<input required type="tel" maxLength={20} pattern={String.raw`\+?[0-9\s\(\)\-]{9,20}`} value={buyer.phone} onChange={(event) => setBuyer({ ...buyer, phone: event.target.value })} placeholder="024 000 0000" /></label>
        <label>Email <small>optional</small><input type="email" maxLength={254} value={buyer.email} onChange={(event) => setBuyer({ ...buyer, email: event.target.value })} /></label>
        <label>Code <small>optional, e.g. the bundle code</small><input maxLength={32} value={promo} onChange={(event) => setPromo(event.target.value.toUpperCase())} /></label>
        <label className="admin-inline"><input type="checkbox" checked={handedOver} onChange={(event) => setHandedOver(event.target.checked)} /> Handed over now</label>
        <p className="admin-total">Cash to collect <strong>{money(totals.totalMinor)}</strong>{promo && <small>before any code saving</small>}</p>
        <button type="submit" className="admin-button" disabled={busy || !lines.length || !catalog}>{busy ? "Recording…" : "Record cash sale"}</button>
      </form>
      <p className="admin-error" role="alert">{error}</p>
      {done.length > 0 && <div className="admin-done"><p className="admin-label">Recorded this session</p><ul>{done.map((order) => <li key={order.id}><strong>{order.code}</strong> · {order.buyer_name} · {cedis(order.total)} · {order.status === "collected" ? "handed over" : "to collect"}</li>)}</ul></div>}
    </section>
  </div>;
}
