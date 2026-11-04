"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BulkOptions, BulkPreview, BulkResult, NotificationRow, PrintRun } from "@/types/admin";
import { adminApi, can, downloadCsv, today, when, type Page, type StaffUser } from "./admin-api";

/** Starting points for the usual messages; staff edit them before sending. */
export const TEMPLATES: { name: string; audience: string; text: string }[] = [
  { name: "Pickup is open", audience: "owed", text: "CSS Merch: Hi {name}, your order {code} is ready. {pickup} Bring your student ID and scan the QR at the desk." },
  { name: "Part of your order is ready", audience: "ready_now", text: "CSS Merch: Hi {name}, {ready} from order {code} is ready to collect. {pickup}" },
  { name: "Your batch is printing", audience: "in_run", text: "CSS Merch: Hi {name}, your order {code} is being printed. We'll text you when it's ready." },
  { name: "Cash reminder", audience: "cash_due", text: "CSS Merch: Hi {name}, order {code}: {paid} {pickup}" },
  { name: "Still to collect", audience: "owed", text: "CSS Merch: Hi {name}, you still have {owed} to collect from order {code}. {pickup}" },
];

const newBatch = () => Math.random().toString(36).slice(2, 12);

function BulkTexts() {
  const [options, setOptions] = useState<BulkOptions | null>(null);
  const [runs, setRuns] = useState<PrintRun[]>([]);
  const [audience, setAudience] = useState("owed");
  const [group, setGroup] = useState("");
  const [run, setRun] = useState("");
  const [template, setTemplate] = useState(TEMPLATES[0].text);
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [progress, setProgress] = useState<{ sent: number; failed: number; left: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // One batch id per message: a retry or double click never texts anyone twice.
  const batch = useRef(newBatch());

  useEffect(() => {
    adminApi<BulkOptions>("sms/bulk/").then(setOptions).catch((failure) => setError(failure.message));
    adminApi<PrintRun[]>("print-runs/").then(setRuns).catch(() => {});
  }, []);

  const body = useCallback(() => ({ audience, template, group, run: audience === "in_run" && run ? Number(run) : null }), [audience, template, group, run]);
  const changed = () => { setPreview(null); setProgress(null); batch.current = newBatch(); };

  async function check() {
    setBusy(true); setError("");
    try { setPreview(await adminApi<BulkPreview>("sms/bulk/", { method: "POST", body: { ...body(), preview: true } })); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t preview."); }
    finally { setBusy(false); }
  }

  async function send() {
    if (!preview || !confirm(`Text ${preview.count} ${preview.count === 1 ? "person" : "people"}? About ${preview.total_parts} SMS parts.`)) return;
    setBusy(true); setError("");
    let total = { sent: 0, failed: 0, left: preview.count };
    try {
      for (let round = 0; round < 200; round++) {
        const result = await adminApi<BulkResult>("sms/bulk/", { method: "POST", body: { ...body(), batch: batch.current } });
        total = { sent: total.sent + result.sent, failed: total.failed + result.failed, left: result.left };
        setProgress(total);
        if (!result.left || (!result.sent && !result.failed && !result.skipped)) break;
      }
    } catch (failure) { setError(`${failure instanceof Error ? failure.message : "Sending stopped."} Press Send again to carry on: nobody gets it twice.`); }
    finally { setBusy(false); }
  }

  const placeholders = options ? Object.entries(options.placeholders) : [];
  return <section className="admin-card">
    <h3>Text a group of buyers</h3>
    {options && !options.enabled && <p className="admin-flag admin-flag--bad">Texts are switched off on the server (SMS_ENABLED). You can preview, but not send.</p>}
    <div className="admin-toolbar">
      <select value={audience} onChange={(event) => { setAudience(event.target.value); changed(); }} aria-label="Who">{options?.audiences.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
      <select value={group} onChange={(event) => { setGroup(event.target.value); changed(); }} aria-label="Group"><option value="">Everyone</option><option value="public">Everyone else</option><option value="exec">Executives</option></select>
      {audience === "in_run" && <select value={run} onChange={(event) => { setRun(event.target.value); changed(); }} aria-label="Print batch"><option value="">Pick a print batch</option>{runs.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>}
    </div>
    <div className="admin-actions">{TEMPLATES.map((t) => <button key={t.name} type="button" className="admin-button admin-button--ghost" onClick={() => { setTemplate(t.text); setAudience(t.audience); changed(); }}>{t.name}</button>)}</div>
    <label className="admin-form">Message<textarea rows={4} maxLength={options?.max_template ?? 480} value={template} onChange={(event) => { setTemplate(event.target.value); changed(); }} /></label>
    <p className="admin-muted">{template.length}/{options?.max_template ?? 480}. Fill-ins: {placeholders.map(([key, help], index) => <span key={key}>{index ? ", " : ""}<code title={help}>{`{${key}}`}</code></span>)}. Plain letters only: a cedi sign or emoji makes each text cost three times as much, so they’re removed.</p>
    <div className="admin-actions">
      <button type="button" className="admin-button admin-button--ghost" disabled={busy || !template.trim()} onClick={() => void check()}>Preview</button>
      <button type="button" className="admin-button" disabled={busy || !preview?.count || !options?.enabled || (progress?.left === 0)} onClick={() => void send()}>{busy && progress ? `Sending… ${progress.sent} sent` : "Send"}</button>
    </div>
    {preview && <div className="admin-stack">
      <div className="admin-totals"><div><span>People</span><strong>{preview.count}</strong></div><div><span>SMS parts each</span><strong>{preview.parts}{preview.max_parts > preview.parts ? `–${preview.max_parts}` : ""}</strong></div><div><span>SMS parts in all</span><strong>{preview.total_parts}</strong></div></div>
      {preview.sample && <p className="admin-flag">{preview.sample}<small className="admin-muted"> ({preview.chars} characters)</small></p>}
      {preview.count > 0 && <details><summary className="admin-link">Who gets it ({preview.count})</summary>
        <table className="admin-table"><thead><tr><th>Name</th><th>Phone</th><th>Order</th><th>Still to collect</th><th>Text</th></tr></thead>
          <tbody>{preview.people.map((p) => <tr key={p.code}><td>{p.name}<small>{p.group}</small></td><td><a href={`tel:${p.phone}`}>{p.phone}</a></td><td>{p.code}</td><td>{p.owed}</td><td><small>{p.text}</small></td></tr>)}</tbody></table>
        <button type="button" className="admin-button admin-button--ghost" onClick={() => downloadCsv(`css-texts-${today()}.csv`, ["Name", "Phone", "Order", "Group", "Still to collect", "Text"], preview.people.map((p) => [p.name, p.phone, p.code, p.group, p.owed, p.text]))}>Download list (CSV)</button>
      </details>}
    </div>}
    {progress && <p className={progress.failed ? "admin-error" : "admin-ok"} role="status">{progress.left ? `Sent ${progress.sent} so far; ${progress.left} left.` : `Done: ${progress.sent} sent${progress.failed ? `, ${progress.failed} failed (see the log below)` : ""}.`}</p>}
    <p className="admin-error" role="alert">{error}</p>
  </section>;
}

function MessageLog() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [failedOnly, setFailedOnly] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    adminApi<Page<NotificationRow>>(`notifications/?page_size=100${failedOnly ? "&ok=0" : ""}`).then((page) => { setRows(page.results); setError(""); }).catch((failure) => setError(failure.message));
  }, [failedOnly]);
  useEffect(() => { queueMicrotask(load); }, [load]);
  return <section className="admin-card">
    <h3>Message log</h3>
    <p className="admin-muted">Every text, email and push notification the shop tried to send, newest first.</p>
    <div className="admin-toolbar"><label className="admin-inline"><input type="checkbox" checked={failedOnly} onChange={(event) => setFailedOnly(event.target.checked)} /> Failed only</label><button type="button" className="admin-button admin-button--ghost" onClick={load}>Refresh</button></div>
    <table className="admin-table"><thead><tr><th>When</th><th>Order</th><th>What</th><th>To</th><th>Result</th></tr></thead>
      <tbody>{rows.length ? rows.map((r) => <tr key={r.id}><td>{when(r.created_at)}</td><td>{r.order ?? "—"}</td><td>{r.channel} · {r.kind}</td><td>{r.recipient}</td><td>{r.ok ? "Sent" : <span className="admin-error">{r.info || "Failed"}</span>}</td></tr>) : <tr><td colSpan={5} className="admin-muted">Nothing here.</td></tr>}</tbody></table>
    <p className="admin-error" role="alert">{error}</p>
  </section>;
}

export function TextsTab({ user }: { user: StaffUser }) {
  return <div className="admin-stack">
    {can(user, "sales.bulk_sms_order") && <BulkTexts />}
    {can(user, "sales.view_notificationlog") && <MessageLog />}
  </div>;
}
