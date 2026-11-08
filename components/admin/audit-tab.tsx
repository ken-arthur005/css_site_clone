"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditData, MoneyCheck } from "@/types/admin";
import { adminApi, cedis, downloadCsv, today, when } from "./admin-api";

type Filters = { from: string; to: string; group: string };

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "good" | "bad" }) {
  return <div data-tone={tone}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}

const num = (value: string | null | undefined) => Number(value ?? 0);

function gap(check: MoneyCheck): { label: string; value: string; note: string; tone?: "good" | "bad" } {
  if (check.in_hand && check.short != null) {
    const short = num(check.short);
    if (Math.abs(short) < 0.005) return { label: "Short in hand", value: cedis(0), note: "What’s in hand matches.", tone: "good" };
    return short > 0
      ? { label: "Short in hand", value: cedis(short), note: `Should be ${cedis(check.should_have)}, you have ${cedis(check.in_hand.amount)}.`, tone: "bad" }
      : { label: "More in hand than expected", value: cedis(-short), note: `Should be ${cedis(check.should_have)}: a payment or expense not typed in?` };
  }
  if (check.unexplained == null) return { label: "Not accounted for", value: "…", note: "Needs Paystack’s figures." };
  const missing = num(check.unexplained);
  if (Math.abs(missing) < 0.005) return { label: "Not accounted for", value: cedis(0), note: "Everything is accounted for.", tone: "good" };
  if (missing < 0) return { label: "More than came in", value: cedis(-missing), note: "Check for a line typed twice.", tone: "bad" };
  return check.cash_lines.length
    ? { label: "Missing", value: cedis(missing), note: "Not explained by Paystack or the cash lines.", tone: "bad" }
    : { label: "Not accounted for yet", value: cedis(missing), note: "Add the total you have in hand on the Books tab." };
}

function MoneyCheckCard({ check, refresh, loading }: { check: MoneyCheck; refresh: () => void; loading: boolean }) {
  const ps = check.paystack && !("error" in check.paystack) ? check.paystack : null;
  const psError = check.paystack && "error" in check.paystack ? check.paystack.error : "";
  const g = gap(check);
  const row = (label: string, value: string | number | null | undefined, strong = false) => <tr><td>{strong ? <strong>{label}</strong> : label}</td><td className="admin-num">{strong ? <strong>{cedis(value)}</strong> : cedis(value)}</td></tr>;
  return <section className="admin-card">
    <h3>Money check</h3>
    <p className="admin-muted">All orders, all dates. Paystack’s money is read from your Paystack account (its balance and what it has paid out). Desk cash and printer payments are what was typed in on the Books tab.</p>
    <div className="admin-totals">
      <Stat label="Came in" value={cedis(check.came_in.total)} note="Cash + Paystack, after its cut" />
      <Stat label="With Paystack or paid out" value={ps ? cedis(check.paystack_held) : "…"} note={ps ? `Checked ${when(ps.checked_at)}` : psError || "Asking Paystack…"} />
      {ps && check.should_have != null && <Stat label="Should be in hand" value={cedis(check.should_have)} note="Payouts + desk cash − spent" />}
      <Stat {...g} />
      {ps && <Stat label="Paystack: not paid out yet" value={cedis(check.paystack_pending)} note="On its way, or Paystack’s fees" />}
      <Stat label="Paid to the printer" value={cedis(check.to_printer)} />
      <Stat label="Still to print" value={cedis(check.left_cost)} note="Paid pieces not sent yet" />
      <Stat label="Owed back to people" value={cedis(check.owed_back)} note="Payables not repaid" />
    </div>
    <div className="admin-actions"><button type="button" className="admin-button admin-button--ghost" disabled={loading} onClick={refresh}>{loading ? "Asking Paystack…" : "Refresh Paystack figures"}</button></div>
    <div className="admin-scroll"><table className="admin-table admin-table--matrix"><tbody>
      {row("Came in: cash at the desk", check.came_in.cash)}
      {row(`Came in: Paystack, after its cut${num(check.came_in.store_fees) ? ` (and ${cedis(check.came_in.store_fees)} it took from early orders)` : ""}`, check.came_in.paystack)}
      {row("Came in, total", check.came_in.total, true)}
      {ps && <>{row("Paystack: still in your balance", ps.balance)}{row("Paystack: paid out to your account", ps.paid_out)}{num(ps.on_the_way) > 0 && row("Paystack: payouts on the way", ps.on_the_way)}</>}
      {check.in_hand && check.should_have != null ? <>
        {row("Reached you: Paystack payouts + desk cash", check.reached)}
        {row("Spent: paid to the printer", check.to_printer)}
        {row("Spent: expenses paid from store money (or repaid)", check.store_spent)}
        {row("Should be in hand", check.should_have, true)}
        {row(`You have in hand (typed ${check.in_hand.day})`, check.in_hand.amount)}
      </> : <>
        {check.cash_lines.map((line, index) => <tr key={index}><td>Cash: {line.kind}{line.label ? `, ${line.label}` : ""}</td><td className="admin-num">{cedis(line.amount)}</td></tr>)}
        {row("Cash: not accounted for yet", check.cash_unaccounted)}
        {row("Spent: paid to the printer", check.to_printer)}
        {row("Spent: expenses paid from store money (or repaid)", check.store_spent)}
      </>}
    </tbody></table></div>
    <h4 className="admin-label">The printer</h4>
    <div className="admin-scroll"><table className="admin-table admin-table--matrix"><thead><tr><th>Piece</th><th className="admin-num">Sent</th><th className="admin-num">At piece prices</th><th className="admin-num">Still to print</th><th className="admin-num">At piece prices</th></tr></thead>
      <tbody>{check.printer.map((r) => <tr key={r.name}><td>{r.name}</td><td className="admin-num">{r.sent}</td><td className="admin-num">{cedis(r.sent_cost)}</td><td className="admin-num">{r.left}</td><td className="admin-num">{cedis(r.left_cost)}</td></tr>)}
        <tr><td><strong>At piece prices</strong></td><td /><td className="admin-num"><strong>{cedis(check.sent_cost)}</strong></td><td /><td className="admin-num"><strong>{cedis(check.left_cost)}</strong></td></tr>
        <tr><td><strong>Paid to the printer so far</strong></td><td /><td className="admin-num"><strong>{cedis(check.to_printer)}</strong></td><td /><td /></tr>
        <tr><td>Check: print cost of every piece sold, minus paid and still to print<small>Not zero: pieces from before the batches, or a printer payment not typed in.</small></td><td /><td className="admin-num">{cedis(check.printer_gap)}</td><td /><td /></tr>
      </tbody></table></div>
    <h4 className="admin-label">Cash taken by each person</h4>
    <p className="admin-muted">From the orders: cash received at the desk, by who took it. Check each person has handed it in.</p>
    <table className="admin-table admin-table--matrix"><thead><tr><th>Person</th><th className="admin-num">Cash orders</th><th className="admin-num">Cash taken</th></tr></thead>
      <tbody>{check.cash_by_person.length ? check.cash_by_person.map((r) => <tr key={r.person}><td>{r.person}</td><td className="admin-num">{r.orders}</td><td className="admin-num">{cedis(r.money)}</td></tr>) : <tr><td colSpan={3} className="admin-muted">No cash taken yet.</td></tr>}</tbody></table>
    {ps && ps.payouts.length > 0 && <details><summary className="admin-link">Latest Paystack payouts</summary>
      <table className="admin-table admin-table--matrix"><tbody>{ps.payouts.map((p, index) => <tr key={index}><td>{p.date ? when(p.date) : "—"}</td><td>{p.status}</td><td className="admin-num">{cedis(p.amount)}</td></tr>)}</tbody></table>
    </details>}
  </section>;
}

export function AuditTab() {
  const [filters, setFilters] = useState<Filters>({ from: "", to: "", group: "" });
  const [data, setData] = useState<AuditData | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (paystack: "" | "1" | "fresh") => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    if (paystack) params.set("paystack", paystack);
    try {
      const next = await adminApi<AuditData>(`audit/?${params}`);
      // The quick answer must never overwrite Paystack's figures once they're in.
      setData((current) => (!paystack && current?.check.paystack ? { ...next, check: { ...current.check } } : next));
      setError("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t work out the figures."); }
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      // The figures first, then Paystack's (a slower call).
      void load("").then(() => { if (!cancelled) { setAsking(true); void load("1").finally(() => setAsking(false)); } });
    });
    return () => { cancelled = true; };
  }, [load]);

  const refreshPaystack = () => { setAsking(true); void load("fresh").finally(() => setAsking(false)); };
  const p = data?.profit;

  function exportCsv() {
    if (!p) return;
    const rows: (string | number)[][] = [
      ["Audit", filters.from || "start", filters.to || today(), filters.group || "everyone"], [],
      ["Money received", p.money], ["Magazine fundraiser (not profit)", p.fundraiser ?? "0.00"], ["Print costs", p.print_cost], ["Paystack charges we paid", p.fees], ["Expenses", p.expenses], ["Profit", p.profit], [],
      ["Package / item", "Sold", "Money received", "Print cost", "Profit"], ...p.lines.map((l) => [l.name, l.sold, l.money, l.cost, l.profit]), [],
      ["Order", "Old ref", "Paid", "Group", "Buyer", "Payment", "Money received", "Print cost", "Paystack charge we paid", "Profit"],
      ...p.orders.map((o) => [o.code, o.legacy_ref ?? "", o.paid_day, o.group, o.buyer, o.payment, o.money, o.cost, o.fee, o.profit]),
    ];
    downloadCsv(`css-merch-audit-${today()}.csv`, ["CSS merch audit"], rows);
  }

  const profit = num(p?.profit);
  return <div className="admin-stack">
    <section className="admin-card">
      <h3>Profit</h3>
      <p className="admin-muted">Profit is on the pieces: what each sold for (after code discounts), minus its print cost, minus the Paystack charges the store paid and the expenses on the Books tab. Unpaid cash orders aren’t counted until they’re paid.</p>
      <div className="admin-toolbar">
        <select value={filters.group} onChange={(event) => setFilters({ ...filters, group: event.target.value })} aria-label="Who"><option value="">Everyone (all orders)</option><option value="public">Everyone else</option><option value="exec">Executives</option></select>
        <label className="admin-inline">From <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
        <label className="admin-inline">To <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
        <button type="button" className="admin-button admin-button--ghost" disabled={!p} onClick={exportCsv}>Download CSV</button>
      </div>
      {!p ? <p className="admin-muted">{error ? "" : "Working out the figures…"}</p> : <>
        <div className="admin-totals">
          <Stat label="Money received" value={cedis(p.money)} note={`${p.paid_orders} paid orders`} />
          {num(p.fundraiser) > 0 && <Stat label="Magazine fundraiser" value={cedis(p.fundraiser)} note="Goes to breast cancer care; not profit" />}
          <Stat label="Print costs" value={cedis(p.print_cost)} note="Every piece sold, at its print cost" />
          <Stat label="Paystack charges (we paid)" value={cedis(num(p.fees) + num(p.paystack_typed))} note={`${cedis(p.fees)} on ${p.fee_orders} early online orders${num(p.paystack_typed) ? ` + ${cedis(p.paystack_typed)} typed in` : ""}`} />
          <Stat label="Expenses" value={cedis(num(p.expenses) - num(p.paystack_typed))} note={`${p.expenses_count} typed in`} />
          <Stat label="Profit" value={cedis(profit)} note="On the pieces, after Paystack and expenses" tone={profit >= 0 ? "good" : "bad"} />
        </div>
        {p.due.orders > 0 && <p className="admin-flag">Not counted yet: {p.due.orders} cash order{p.due.orders === 1 ? "" : "s"} still to pay {cedis(p.due.money)} (another {cedis(p.due.profit)} profit once paid).</p>}
        <h4 className="admin-label">By package and item</h4>
        <div className="admin-scroll"><table className="admin-table admin-table--matrix"><thead><tr><th>Package / item</th><th className="admin-num">Sold</th><th className="admin-num">Money received</th><th className="admin-num">Print cost</th><th className="admin-num">Profit</th><th className="admin-num">Each</th></tr></thead>
          <tbody>{p.lines.length ? p.lines.map((l) => <tr key={l.name}><td>{l.name}</td><td className="admin-num">{l.sold}</td><td className="admin-num">{cedis(l.money)}</td><td className="admin-num">{cedis(l.cost)}</td><td className="admin-num">{cedis(l.profit)}</td><td className="admin-num">{cedis(l.profit_each)}</td></tr>) : <tr><td colSpan={6} className="admin-muted">No paid orders here.</td></tr>}</tbody></table></div>
        <h4 className="admin-label">Print costs by piece</h4>
        <table className="admin-table admin-table--matrix"><thead><tr><th>Piece</th><th className="admin-num">Pieces</th><th className="admin-num">Average each</th><th className="admin-num">Total</th></tr></thead>
          <tbody>{p.pieces.map((r) => <tr key={r.name}><td>{r.name}</td><td className="admin-num">{r.pieces}</td><td className="admin-num">{cedis(r.average)}</td><td className="admin-num">{cedis(r.cost)}</td></tr>)}</tbody></table>
        {p.expense_categories.length > 0 && <><h4 className="admin-label">Expenses by category</h4>
          <table className="admin-table admin-table--matrix"><tbody>{p.expense_categories.map((r) => <tr key={r.category}><td>{r.category}</td><td className="admin-num">{cedis(r.amount)}</td></tr>)}</tbody></table></>}
        <p className="admin-muted">Print costs come from each product’s “Print cost” in the Django admin; a piece keeps the cost it had when it went to the printer.</p>
      </>}
      <p className="admin-error" role="alert">{error}</p>
    </section>
    {data && <MoneyCheckCard check={data.check} refresh={refreshPaystack} loading={asking} />}
  </div>;
}
