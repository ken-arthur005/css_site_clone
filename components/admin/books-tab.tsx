"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { AccountedEntry, Expense, PromoCode } from "@/types/admin";
import { adminApi, can, cedis, downloadCsv, today, when, type Page, type StaffUser } from "./admin-api";

const EXPENSE_CATEGORIES: Record<string, string> = { printing_extras: "Printing extras", transport: "Transport", packaging: "Packaging", paystack: "Paystack charges", momo: "MoMo / transfer charges", other: "Other" };
const ACCOUNTED_KINDS: Record<string, string> = { total_in_hand: "Total in hand now (cash + MoMo + bank)", paid_printer: "Paid to the printer", cash_on_hand: "Cash on hand", cash_to_bank: "Cash put in the bank", cash_to_momo: "Cash put on a MoMo wallet", other: "Other" };

function useList<T>(path: string, enabled: boolean) {
  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!enabled) return;
    try { setRows((await adminApi<Page<T>>(`${path}?page_size=200`)).results); setError(""); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t load."); }
  }, [path, enabled]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  return { rows, error, setError, load };
}

function Expenses({ user }: { user: StaffUser }) {
  const list = useList<Expense>("expenses/", true);
  const [form, setForm] = useState({ day: today(), category: "other", amount: "", note: "", paid_by: "" });
  async function add(event: FormEvent) {
    event.preventDefault();
    try { await adminApi("expenses/", { method: "POST", body: form }); setForm({ ...form, amount: "", note: "", paid_by: "" }); await list.load(); }
    catch (failure) { list.setError(failure instanceof Error ? failure.message : "Couldn’t add."); }
  }
  async function patch(row: Expense, body: unknown) { try { await adminApi(`expenses/${row.id}/`, { method: "PATCH", body }); await list.load(); } catch (failure) { list.setError(failure instanceof Error ? failure.message : "Couldn’t update."); } }
  async function remove(row: Expense) { if (!confirm("Delete this expense?")) return; try { await adminApi(`expenses/${row.id}/`, { method: "DELETE" }); await list.load(); } catch (failure) { list.setError(failure instanceof Error ? failure.message : "Couldn’t delete."); } }
  const total = list.rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const owed = list.rows.filter((row) => row.paid_by && !row.reimbursed_at).reduce((sum, row) => sum + Number(row.amount), 0);
  return <section className="admin-card">
    <h3>Expenses <span className="admin-count">{cedis(total)}</span></h3>
    {owed > 0 && <p className="admin-flag">{cedis(owed)} is owed back to people who paid out of pocket.</p>}
    {can(user, "sales.add_expense") && <form className="admin-toolbar" onSubmit={add}>
      <input type="date" required value={form.day} onChange={(event) => setForm({ ...form, day: event.target.value })} aria-label="Day" />
      <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} aria-label="Category">{Object.entries(EXPENSE_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input required inputMode="decimal" pattern={String.raw`\d+(\.\d{1,2})?`} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="Amount GH₵" aria-label="Amount" />
      <input value={form.note} maxLength={200} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="What for" aria-label="Note" />
      <input value={form.paid_by} maxLength={150} onChange={(event) => setForm({ ...form, paid_by: event.target.value })} placeholder="Paid by (if owed back)" aria-label="Paid by" />
      <button type="submit" className="admin-button">Add</button>
    </form>}
    <table className="admin-table"><thead><tr><th>Day</th><th>Category</th><th>Note</th><th className="admin-num">Amount</th><th>Owed to</th><th aria-label="Actions" /></tr></thead>
      <tbody>{list.rows.map((row) => <tr key={row.id}><td>{row.day}</td><td>{EXPENSE_CATEGORIES[row.category] ?? row.category}</td><td>{row.note}<small>{row.created_by}</small></td><td className="admin-num">{cedis(row.amount)}</td>
        <td>{row.paid_by ? <>{row.paid_by}<small>{row.reimbursed_at ? `Repaid ${when(row.reimbursed_at)}` : "Not repaid yet"}</small></> : "—"}</td>
        <td className="admin-row-actions">{row.paid_by && can(user, "sales.change_expense") && <button type="button" className="admin-link" onClick={() => void patch(row, { reimbursed: !row.reimbursed_at })}>{row.reimbursed_at ? "Mark not repaid" : "Mark repaid"}</button>}{can(user, "sales.delete_expense") && <button type="button" className="admin-link" onClick={() => void remove(row)}>Delete</button>}</td></tr>)}</tbody></table>
    <div className="admin-actions"><button type="button" className="admin-button admin-button--ghost" disabled={!list.rows.length} onClick={() => downloadCsv(`css-expenses-${today()}.csv`, ["Day", "Category", "Note", "Amount", "Paid by", "Repaid"], list.rows.map((row) => [row.day, EXPENSE_CATEGORIES[row.category] ?? row.category, row.note, row.amount, row.paid_by, row.reimbursed_at ? when(row.reimbursed_at) : ""]))}>Export CSV</button></div>
    <p className="admin-error" role="alert">{list.error}</p>
  </section>;
}

function Accounted({ user }: { user: StaffUser }) {
  const list = useList<AccountedEntry>("accounted/", true);
  const [form, setForm] = useState({ day: today(), kind: "total_in_hand", label: "", amount: "" });
  async function add(event: FormEvent) {
    event.preventDefault();
    try { await adminApi("accounted/", { method: "POST", body: { ...form, label: form.label || ACCOUNTED_KINDS[form.kind] } }); setForm({ ...form, label: "", amount: "" }); await list.load(); }
    catch (failure) { list.setError(failure instanceof Error ? failure.message : "Couldn’t add."); }
  }
  async function remove(row: AccountedEntry) { if (!confirm("Delete this entry?")) return; try { await adminApi(`accounted/${row.id}/`, { method: "DELETE" }); await list.load(); } catch (failure) { list.setError(failure instanceof Error ? failure.message : "Couldn’t delete."); } }
  return <section className="admin-card">
    <h3>Money accounted for</h3>
    <p className="admin-muted">Where the money is, or where it went. Compare with sales to spot anything missing.</p>
    {can(user, "sales.add_accountedentry") && <form className="admin-toolbar" onSubmit={add}>
      <input type="date" required value={form.day} onChange={(event) => setForm({ ...form, day: event.target.value })} aria-label="Day" />
      <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })} aria-label="Kind">{Object.entries(ACCOUNTED_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input value={form.label} maxLength={200} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="Details (optional)" aria-label="Details" />
      <input required inputMode="decimal" pattern={String.raw`\d+(\.\d{1,2})?`} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="Amount GH₵" aria-label="Amount" />
      <button type="submit" className="admin-button">Add</button>
    </form>}
    <table className="admin-table"><thead><tr><th>Day</th><th>Kind</th><th>Details</th><th className="admin-num">Amount</th><th aria-label="Actions" /></tr></thead>
      <tbody>{list.rows.map((row) => <tr key={row.id}><td>{row.day}</td><td>{ACCOUNTED_KINDS[row.kind] ?? row.kind}</td><td>{row.label}<small>{row.created_by}</small></td><td className="admin-num">{cedis(row.amount)}</td><td className="admin-row-actions">{can(user, "sales.delete_accountedentry") && <button type="button" className="admin-link" onClick={() => void remove(row)}>Delete</button>}</td></tr>)}</tbody></table>
    <p className="admin-error" role="alert">{list.error}</p>
  </section>;
}

function PromoCodes({ user }: { user: StaffUser }) {
  const list = useList<PromoCode>("promo-codes/", true);
  const [form, setForm] = useState({ code: "", kind: "BUNDLE", percent: "", note: "" });
  async function add(event: FormEvent) {
    event.preventDefault();
    try { await adminApi("promo-codes/", { method: "POST", body: { ...form, percent: form.kind === "PERCENT" ? form.percent : null } }); setForm({ code: "", kind: form.kind, percent: "", note: "" }); await list.load(); }
    catch (failure) { list.setError(failure instanceof Error ? failure.message : "Couldn’t add."); }
  }
  async function toggle(row: PromoCode) { try { await adminApi(`promo-codes/${row.id}/`, { method: "PATCH", body: { is_active: !row.is_active } }); await list.load(); } catch (failure) { list.setError(failure instanceof Error ? failure.message : "Couldn’t update."); } }
  return <section className="admin-card">
    <h3>Promo codes</h3>
    <p className="admin-muted">Bundle codes are reusable and lower bundles to their promo price. Percentage codes work once.</p>
    {can(user, "sales.add_promocode") && <form className="admin-toolbar" onSubmit={add}>
      <input required value={form.code} maxLength={32} pattern="[A-Za-z0-9-]{3,32}" onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="CODE" aria-label="Code" />
      <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })} aria-label="Kind"><option value="BUNDLE">Bundle price (reusable)</option><option value="PERCENT">Percentage off (single use)</option></select>
      {form.kind === "PERCENT" && <input required inputMode="numeric" value={form.percent} onChange={(event) => setForm({ ...form, percent: event.target.value })} placeholder="%" aria-label="Percent" />}
      <input value={form.note} maxLength={100} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Note (who it's for)" aria-label="Note" />
      <button type="submit" className="admin-button">Create</button>
    </form>}
    <table className="admin-table"><thead><tr><th>Code</th><th>Kind</th><th>Status</th><th>Note</th><th aria-label="Actions" /></tr></thead>
      <tbody>{list.rows.map((row) => <tr key={row.id}><td><strong>{row.code}</strong></td><td>{row.kind === "BUNDLE" ? "Bundle price" : `${Number(row.percent)}% once`}</td>
        <td>{!row.is_active ? "Switched off" : row.used_by ? `Used by ${row.used_by}` : "Active"}</td><td>{row.note}</td>
        <td className="admin-row-actions">{can(user, "sales.change_promocode") && <button type="button" className="admin-link" onClick={() => void toggle(row)}>{row.is_active ? "Switch off" : "Switch on"}</button>}</td></tr>)}</tbody></table>
    <p className="admin-error" role="alert">{list.error}</p>
  </section>;
}

export function BooksTab({ user }: { user: StaffUser }) {
  return <div className="admin-stack">
    {can(user, "sales.view_expense") && <Expenses user={user} />}
    {can(user, "sales.view_accountedentry") && <Accounted user={user} />}
    {can(user, "sales.view_promocode") && <PromoCodes user={user} />}
  </div>;
}
