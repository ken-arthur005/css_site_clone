"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActivityRow } from "@/types/admin";
import { adminApi, allPages, downloadCsv, today, when, type Page } from "./admin-api";

const KINDS: Record<string, string> = { sale: "Desk sales", check_in: "Check-ins", serve: "Serving", handover: "Hand-overs", handover_undo: "Hand-overs undone", stage: "Stages", print_sent: "Sent to printer", print_back: "Back from printer", cancel: "Cancellations", settings: "Settings", import: "Imports", expense: "Expenses" };

export function ActivityTab() {
  const [day, setDay] = useState(today());
  const [kind, setKind] = useState("");
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const path = `activity/?day=${day}${kind ? `&kind=${kind}` : ""}`;

  const load = useCallback(async () => {
    try { const data = await adminApi<Page<ActivityRow>>(`${path}&page_size=200`); setRows(data.results); setCount(data.count); setError(""); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Activity couldn’t be loaded."); }
  }, [path]);
  useEffect(() => {
    queueMicrotask(() => void load());
    if (day !== today()) return;
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 10000);
    return () => window.clearInterval(timer);
  }, [load, day]);

  const people = new Map<string, number>();
  rows.forEach((row) => people.set(row.actor_name || "System", (people.get(row.actor_name || "System") ?? 0) + 1));

  return <div className="admin-stack">
    <div className="admin-toolbar">
      <input type="date" value={day} max={today()} onChange={(event) => setDay(event.target.value || today())} aria-label="Day" />
      <select aria-label="Kind" value={kind} onChange={(event) => setKind(event.target.value)}><option value="">Everything</option>{Object.entries(KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <button type="button" className="admin-button admin-button--ghost" disabled={!count} onClick={async () => { const all = await allPages<ActivityRow>(path); downloadCsv(`css-activity-${day}.csv`, ["Time", "Who", "Kind", "Order", "What"], all.map((row) => [when(row.at), row.actor_name, KINDS[row.kind] ?? row.kind, row.order, row.text])); }}>Export CSV</button>
      {day === today() && <span className="admin-muted">Updates every 10 seconds</span>}
    </div>
    <p className="admin-error" role="alert">{error}</p>
    <div className="admin-totals">{[...people].map(([person, total]) => <div key={person}><strong>{total}</strong><span>{person}</span></div>)}</div>
    <table className="admin-table">
      <thead><tr><th>Time</th><th>Who</th><th>What</th><th>Order</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id}><td>{when(row.at, false)}</td><td>{row.actor_name || "System"}</td><td>{row.text}<small>{KINDS[row.kind] ?? row.kind}</small></td><td>{row.order ?? ""}</td></tr>)}</tbody>
    </table>
    {!rows.length && <p className="admin-empty">Nothing recorded for this day.</p>}
    {count > rows.length && <p className="admin-muted">Showing the latest {rows.length} of {count}. Export for everything.</p>}
  </div>;
}
