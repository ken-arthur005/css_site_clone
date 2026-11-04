"use client";

import { useEffect, useState } from "react";
import type { MerchStoreContent } from "@/types/merch-store";
import type { CountRow } from "@/types/admin";
import { adminApi, downloadCsv, today } from "./admin-api";
import { pieceText } from "./order-detail";

type Matrix = { key: string; product: string; design: string; bySize: Record<string, number>; total: number };

export function CountsTab({ content }: { content: MerchStoreContent }) {
  const [scope, setScope] = useState<"all" | "paid">("all");
  const [rows, setRows] = useState<CountRow[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    adminApi<CountRow[]>(`counts/${scope === "paid" ? "?status=paid" : ""}`).then((data) => { if (!cancelled) setRows(data); }).catch((failure) => setError(failure.message));
    return () => { cancelled = true; };
  }, [scope]);

  const sizes = content.sizes.map(({ id }) => id as string);
  const matrix = new Map<string, Matrix>();
  for (const row of rows ?? []) {
    const design = pieceText({ ...row, fit: "", back_name: "", size: "" }, content) || "—";
    const key = `${row.product_name}|${design}`;
    const entry = matrix.get(key) ?? { key, product: row.product_name, design, bySize: {}, total: 0 };
    const size = row.size || "One size";
    entry.bySize[size] = (entry.bySize[size] ?? 0) + row.units;
    entry.total += row.units;
    matrix.set(key, entry);
  }
  const lines = [...matrix.values()];
  const extraSizes = [...new Set(lines.flatMap((line) => Object.keys(line.bySize)))].filter((size) => !sizes.includes(size));
  const columns = [...sizes, ...extraSizes];
  const byProduct = new Map<string, number>();
  lines.forEach((line) => byProduct.set(line.product, (byProduct.get(line.product) ?? 0) + line.total));

  return <div className="admin-stack admin-printable">
    <div className="admin-toolbar admin-no-print">
      <select aria-label="Which orders" value={scope} onChange={(event) => setScope(event.target.value as "all" | "paid")}><option value="all">Paid and collected</option><option value="paid">Paid, not yet collected</option></select>
      <button type="button" className="admin-button admin-button--ghost" disabled={!lines.length} onClick={() => downloadCsv(`css-counts-${today()}.csv`, ["Product", "Design", ...columns, "Total"], lines.map((line) => [line.product, line.design, ...columns.map((size) => line.bySize[size] ?? 0), line.total]))}>Export CSV</button>
      <button type="button" className="admin-button admin-button--ghost" disabled={!lines.length} onClick={() => window.print()}>Print sheet</button>
    </div>
    <p className="admin-error" role="alert">{error}</p>
    <div className="admin-totals">{[...byProduct].map(([product, total]) => <div key={product}><strong>{total}</strong><span>{product}</span></div>)}</div>
    <h3 className="admin-print-only">CSS merch counts · {scope === "paid" ? "paid, not collected" : "paid and collected"} · {today()}</h3>
    <table className="admin-table admin-table--matrix">
      <thead><tr><th>Product</th><th>Design</th>{columns.map((size) => <th key={size} className="admin-num">{size}</th>)}<th className="admin-num">Total</th></tr></thead>
      <tbody>{lines.map((line) => <tr key={line.key}><td>{line.product}</td><td>{line.design}</td>{columns.map((size) => <td key={size} className="admin-num">{line.bySize[size] || ""}</td>)}<td className="admin-num"><strong>{line.total}</strong></td></tr>)}</tbody>
    </table>
    {rows && !lines.length && <p className="admin-empty">No pieces to count yet.</p>}
  </div>;
}
