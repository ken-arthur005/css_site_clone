"use client";

import { useRef } from "react";
import { describeLine, lineKey, money, unitPrice } from "@/lib/merch/order";
import { selectionIssue } from "@/lib/merch/catalog";
import type { CheckoutCatalog, MerchStoreContent, ShopLine as TeeLine } from "@/types/merch-store";
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
      <p><strong>{quantity} {quantity === 1 ? "item" : "items"}</strong><span>{lines.length} {lines.length === 1 ? "selection" : "selections"}</span></p>
    </div>
    {lines.length === 0 ? <div className="merch-order-shelf__empty"><span aria-hidden="true">＋</span><div><h3>Your shelf is empty.</h3><p>Choose an item and its options above, then add it here.</p></div></div> : <>
      <p className="merch-order-shelf__hint">Different options get their own spot. Identical items share a quantity.</p>
      <div className="merch-order-shelf__rack">{lines.map((line, index) => {
        const info = describeLine(line, content);
        const key = lineKey(line);
        const active = editingKey === key;
        const pulse = feedback?.key === key ? feedback : null;
        const label = info.label;
        const issue = selectionIssue(line, content, catalog);
        return <article className="merch-shelf-item" key={key} data-editing={active || undefined} aria-label={label}>
          <div className="merch-shelf-item__stage">
            <span className="merch-shelf-item__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div className={`merch-shelf-item__arrival${pulse ? " is-arriving" : ""}`} key={`arrival-${pulse?.sequence ?? "rest"}`}>
              <div className="merch-shelf-item__shirt" data-count={info.images.length > 1 ? info.images.length : undefined}>{info.images.map((src, piece) => <span key={piece}><MerchImage src={src} alt={piece === 0 ? `${info.title}, front` : ""} sizes="(max-width: 767px) 112px, 220px" /></span>)}</div>
            </div>
            {line.size && <span className="merch-shelf-item__size">Size <strong>{line.size}</strong></span>}
            {active && <span className="merch-shelf-item__state">Editing ↑</span>}
            {pulse && !active && <span key={`feedback-${pulse.sequence}`} className="merch-shelf-item__state merch-shelf-item__state--feedback" aria-hidden="true">{pulse.action} ✓</span>}
          </div>
          <div className="merch-shelf-item__details">
            <h3>{info.title}</h3>{info.details.map((detail) => <p key={detail} className="merch-shelf-item__colours">{detail}</p>)}
            <div className="merch-shelf-item__quantity"><Quantity quantity={line.quantity} max={content.maxQuantity} label={`${label} quantity`} disabled={disabled || active} onChange={(quantity) => onQuantity(line, quantity)} /><strong>{money(unitPrice(line, content, catalog) * line.quantity)}</strong></div>
            <div className="merch-shelf-item__actions"><button type="button" disabled={disabled || !!editingKey} aria-label={`Edit ${label}`} onClick={() => onEdit(line)}>Edit options</button><button data-shelf-remove type="button" disabled={disabled} aria-label={`Remove ${label}`} onClick={() => remove(line, index)}>Remove</button></div>
            {issue && <p className="merch-form-error">{issue} Edit or remove this selection.</p>}
            {line.quantity > content.maxQuantity && <p className="merch-form-error">Choose up to {content.maxQuantity} of this configuration. Reduce the quantity to continue.</p>}
          </div>
        </article>;
      })}</div>
    </>}
  </section>;
}
