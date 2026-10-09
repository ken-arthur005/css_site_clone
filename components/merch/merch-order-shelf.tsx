"use client";

import { useRef } from "react";
import { lineKey, money, unitPrice } from "@/lib/merch/order";
import { selectionIssue } from "@/lib/merch/catalog";
import type { CheckoutCatalog, MerchStoreContent, TeeLine } from "@/types/merch-store";
import { MerchImage } from "./merch-image";
import { Quantity } from "./merch-quantity";

export type ShelfFeedback = { key: string; sequence: number; action: "Added" | "Updated" };

export function MerchOrderShelf({ content, catalog, lines, editingKey, feedback, disabled, onEdit, onRemove, onQuantity }: {
  content: MerchStoreContent;
  catalog: CheckoutCatalog | null;
  lines: TeeLine[];
  editingKey: string | null;
  feedback: ShelfFeedback | null;
  disabled: boolean;
  onEdit: (line: TeeLine) => void;
  onRemove: (line: TeeLine) => void;
  onQuantity: (line: TeeLine, quantity: number) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);

  function remove(line: TeeLine, index: number) {
    onRemove(line);
    requestAnimationFrame(() => {
      const remaining = root.current?.querySelectorAll<HTMLButtonElement>("[data-shelf-remove]");
      const next = remaining?.[Math.min(index, remaining.length - 1)];
      (next ?? root.current?.querySelector<HTMLHeadingElement>("h2"))?.focus({ preventScroll: true });
    });
  }

  return <section className="merch-order-shelf" id="merch-order-shelf" ref={root} aria-labelledby="merch-shelf-title">
    <div className="merch-order-shelf__heading">
      <div><p className="merch-label">Selected & saved on this device</p><h2 id="merch-shelf-title" tabIndex={-1}>Your order<span>.</span></h2></div>
      <p><strong>{quantity} {quantity === 1 ? "tee" : "tees"}</strong><span>{lines.length} {lines.length === 1 ? "configuration" : "configurations"}</span></p>
    </div>
    {lines.length === 0 ? <div className="merch-order-shelf__empty"><span aria-hidden="true">＋</span><div><h3>Your shelf is empty.</h3><p>Choose a design, colourway and size above, then add your tee here.</p></div></div> : <>
      <p className="merch-order-shelf__hint">Different sizes get their own spot. Identical tees share a quantity.</p>
      <div className="merch-order-shelf__rack">{lines.map((line, index) => {
        const product = content.products.find(({ id }) => id === line.productId)!;
        const colourway = product.colourways.find(({ id }) => id === line.colourwayId)!;
        const key = lineKey(line);
        const active = editingKey === key;
        const pulse = feedback?.key === key ? feedback : null;
        const label = `${product.name}, ${colourway.name}, size ${line.size}`;
        const issue = selectionIssue(line, content, catalog);
        return <article className="merch-shelf-item" key={key} data-editing={active || undefined} aria-label={label}>
          <div className="merch-shelf-item__stage">
            <span className="merch-shelf-item__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div className={`merch-shelf-item__arrival${pulse ? " is-arriving" : ""}`} key={`arrival-${pulse?.sequence ?? "rest"}`}>
              <div className="merch-shelf-item__shirt"><MerchImage src={colourway.front} alt={`${product.name}, ${colourway.name}, front`} sizes="(max-width: 767px) 112px, 220px" /></div>
            </div>
            <span className="merch-shelf-item__size">Size <strong>{line.size}</strong></span>
            {active && <span className="merch-shelf-item__state">Editing ↑</span>}
            {pulse && !active && <span key={`feedback-${pulse.sequence}`} className="merch-shelf-item__state merch-shelf-item__state--feedback" aria-hidden="true">{pulse.action} ✓</span>}
          </div>
          <div className="merch-shelf-item__details">
            <h3>{product.name}</h3><p>{colourway.name}</p><p className="merch-shelf-item__colours">{colourway.base} fabric / {colourway.print} print</p>
            <div className="merch-shelf-item__quantity"><Quantity quantity={line.quantity} max={content.maxQuantity} label={`${label} quantity`} disabled={disabled || active} onChange={(quantity) => onQuantity(line, quantity)} /><strong>{money(unitPrice(line, content) * line.quantity)}</strong></div>
            <div className="merch-shelf-item__actions"><button type="button" disabled={disabled || !!editingKey} aria-label={`Edit ${label}`} onClick={() => onEdit(line)}>Edit size / colour</button><button data-shelf-remove type="button" disabled={disabled} aria-label={`Remove ${label}`} onClick={() => remove(line, index)}>Remove</button></div>
            {issue && <p className="merch-form-error">{issue} Edit or remove this selection.</p>}
            {line.quantity > content.maxQuantity && <p className="merch-form-error">Choose up to {content.maxQuantity} of this configuration. Reduce the quantity to continue.</p>}
          </div>
        </article>;
      })}</div>
    </>}
  </section>;
}
