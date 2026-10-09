"use client";

import { useId, useRef, type CSSProperties } from "react";
import { lineKey } from "@/lib/merch/order";
import type { MerchStoreContent, TeeLine } from "@/types/merch-store";
import { MerchImage } from "./merch-image";

// A composition limit, rather than an order limit. Every configuration remains
// available through the selector and the itemised review beside it.
const DISPLAY_TEES = 8;

export function reviewLineId(line: TeeLine) {
  return `merch-review-${line.productId}-${line.colourwayId}-${line.size}`;
}

function displayUnits(lines: TeeLine[], selectedKey: string | null) {
  const priority = [...lines];
  const selectedIndex = priority.findIndex((line) => lineKey(line) === selectedKey);
  if (selectedIndex >= DISPLAY_TEES) priority.unshift(...priority.splice(selectedIndex, 1));
  const represented = priority.slice(0, DISPLAY_TEES);
  const units: { line: TeeLine; copy: number }[] = [];
  // First give each configuration a place, then distribute repeat units.
  for (let copy = 0; units.length < DISPLAY_TEES; copy++) {
    let added = false;
    for (const line of represented) {
      if (copy >= line.quantity) continue;
      units.push({ line, copy }); added = true;
      if (units.length === DISPLAY_TEES) break;
    }
    if (!added) break;
  }
  return units.sort((a, b) => represented.indexOf(a.line) - represented.indexOf(b.line) || a.copy - b.copy);
}

export function MerchReviewCart({ content, lines, selectedKey, onSelect, onBuild }: {
  content: MerchStoreContent;
  lines: TeeLine[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onBuild: () => void;
}) {
  const gradientId = useId().replaceAll(":", "");
  const picker = useRef<HTMLDetailsElement>(null);
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const units = displayUnits(lines, selectedKey);
  const remaining = quantity - units.length;
  const selected = lines.find((line) => lineKey(line) === selectedKey);
  const selectedProduct = selected && content.products.find(({ id }) => id === selected.productId);
  const selectedColourway = selectedProduct?.colourways.find(({ id }) => id === selected?.colourwayId);

  function select(key: string) {
    if (picker.current) picker.current.open = false;
    onSelect(key);
  }

  function showSelections() {
    if (!picker.current) return;
    picker.current.open = true;
    picker.current.querySelector("summary")?.focus({ preventScroll: true });
    picker.current.scrollIntoView({ block: "nearest", behavior: "instant" });
  }

  return <div className="merch-review-cart">
    <div className="merch-review-cart__stage" role="group" aria-label={`Your order cart: ${quantity} ${quantity === 1 ? "tee" : "tees"}`}>
      <div className="merch-review-cart__stage-label"><span className="merch-label">Your order / packed together</span><span>{String(quantity).padStart(2, "0")} <small>TEES</small></span></div>
      <div className="merch-review-cart__scene">
        <svg className="merch-review-cart__frame merch-review-cart__frame--back" viewBox="0 0 600 520" fill="none" aria-hidden="true">
          <defs><linearGradient id={`${gradientId}-metal`} x1="90" y1="120" x2="520" y2="410" gradientUnits="userSpaceOnUse"><stop stopColor="#d7e0e2" /><stop offset=".35" stopColor="#7b919c" /><stop offset=".6" stopColor="#c5d2d6" /><stop offset="1" stopColor="#607883" /></linearGradient></defs>
          <ellipse cx="320" cy="483" rx="215" ry="14" fill="#26445a" opacity=".08" />
          <path d="M114 170 160 143 544 158 500 191" fill="#dce6e9" fillOpacity=".48" stroke={`url(#${gradientId}-metal)`} strokeWidth="5" strokeLinejoin="round" />
          <path d="M114 170 81 98H39" stroke={`url(#${gradientId}-metal)`} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M39 98H76" stroke="#356bce" strokeWidth="12" strokeLinecap="round" />
          <path d="M158 335 147 387Q144 400 162 402L462 418M187 407V430M439 417V443" stroke={`url(#${gradientId}-metal)`} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M150 388 192 366 506 383 461 410" stroke="#b9c9ce" strokeWidth="4" strokeLinejoin="round" />
          <g stroke="#4b616d" strokeWidth="7"><circle cx="187" cy="453" r="22" fill="#e1e7e7" /><circle cx="440" cy="464" r="22" fill="#e1e7e7" /></g>
          <g fill="#96aab3" stroke="#f2f5f2" strokeWidth="3"><circle cx="187" cy="453" r="9" /><circle cx="440" cy="464" r="9" /></g>
        </svg>
        {units.map(({ line, copy }, index) => {
          const product = content.products.find(({ id }) => id === line.productId)!;
          const colourway = product.colourways.find(({ id }) => id === line.colourwayId)!;
          const key = lineKey(line);
          const twoRows = units.length > 4;
          const row = twoRows ? Math.floor(index / 4) : 0;
          const columns = twoRows ? Math.min(4, units.length - row * 4) : units.length;
          const column = twoRows ? index % 4 : index;
          const x = columns === 1 ? 49 : 28 + column * 43 / (columns - 1);
          const style = {
            "--shirt-x": `${x}%`, "--shirt-y": `${twoRows ? 12 + row * 14 : 18 + column % 2 * 5}%`,
            "--shirt-angle": `${(column - (columns - 1) / 2) * 7 + (copy % 2 ? 3 : 0)}deg`,
            "--shirt-layer": index + 2,
          } as CSSProperties;
          return <button className="merch-review-cart__tee" key={`${key}-${copy}`} style={style} type="button" aria-pressed={selectedKey === key} aria-controls={reviewLineId(line)} aria-label={`Show ${product.name}, ${colourway.name}, size ${line.size}, tee ${copy + 1} of ${line.quantity} in your order`} onClick={() => select(key)}>
            <span className="merch-review-cart__tee-image"><MerchImage src={colourway.front} alt="" sizes="(max-width: 767px) 35vw, 230px" /></span>
            <span className="merch-review-cart__size" aria-hidden="true">{line.size}</span>
          </button>;
        })}
        <svg className="merch-review-cart__frame merch-review-cart__frame--front" viewBox="0 0 600 520" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id={`${gradientId}-basket`} x1="300" y1="175" x2="300" y2="360" gradientUnits="userSpaceOnUse"><stop stopColor="#eaf0ed" stopOpacity=".1" /><stop offset="1" stopColor="#d8e4e4" stopOpacity=".88" /></linearGradient>
            <clipPath id={`${gradientId}-front-clip`}><path d="M114 170 500 191 456 360 158 335Z" /></clipPath>
            <clipPath id={`${gradientId}-side-clip`}><path d="M500 191 544 158 506 322 456 360Z" /></clipPath>
          </defs>
          <path d="M500 191 544 158 506 322 456 360Z" fill="#bacdd2" fillOpacity=".4" stroke="#7f99a3" strokeWidth="4" strokeLinejoin="round" />
          <g clipPath={`url(#${gradientId}-side-clip)`} stroke="#879fa8" strokeWidth="1.7">{Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${490 + i * 9} 145l-47 232`} />)}{Array.from({ length: 6 }, (_, i) => <path key={i} d={`M450 ${213 + i * 29}l100-72`} />)}</g>
          <path d="M114 170 500 191 456 360 158 335Z" fill={`url(#${gradientId}-basket)`} />
          <g clipPath={`url(#${gradientId}-front-clip)`} stroke="#819ba5" strokeOpacity=".65" strokeWidth="1.8">{Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${105 + i * 34} 157l-9 222`} />)}{Array.from({ length: 6 }, (_, i) => <path key={i} d={`M105 ${198 + i * 28}l400 22`} />)}</g>
          <path d="M114 170 500 191 456 360 158 335Z" stroke="#7b96a1" strokeWidth="5" strokeLinejoin="round" />
          <path d="M116 167 500 188M158 333 455 357" stroke="#edf2ef" strokeWidth="2" strokeLinecap="round" />
          <path d="M118 178 163 329M497 198 455 352" stroke="#c2d4d8" strokeWidth="2" />
        </svg>
        {quantity === 0 && <p className="merch-review-cart__empty">Your cart is empty.</p>}
      </div>
      {remaining > 0 && <button className="merch-review-cart__more" type="button" onClick={showSelections}>+{remaining} more {remaining === 1 ? "tee" : "tees"} <span aria-hidden="true">↗</span></button>}
    </div>
    <div className="merch-review-cart__caption"><strong>{quantity} {quantity === 1 ? "tee" : "tees"} in your order</strong><span>{lines.length} {lines.length === 1 ? "configuration" : "configurations"}</span></div>
    {quantity > 0 ? <>
      <p className="merch-review-cart__hint">Tap a shirt to find it in your order.</p>
      <p className="merch-review-cart__selection" role="status">{selected && selectedColourway ? <><strong>{selectedProduct!.name} · {selectedColourway.name}</strong><span>Size {selected.size} · Quantity {selected.quantity}</span></> : "Every shirt here is part of your saved order."}</p>
      <details className="merch-review-cart__picker" ref={picker}><summary>Find a selection <span>{lines.length}</span></summary><div>{lines.map((line) => {
        const product = content.products.find(({ id }) => id === line.productId)!;
        const colourway = product.colourways.find(({ id }) => id === line.colourwayId)!;
        const key = lineKey(line);
        return <button type="button" key={key} aria-pressed={selectedKey === key} aria-controls={reviewLineId(line)} onClick={() => select(key)}><span>{product.name} · {colourway.name}<small>Size {line.size}</small></span><strong>×{line.quantity}</strong></button>;
      })}</div></details>
    </> : <button className="merch-text-button" type="button" onClick={onBuild}>Choose your tees →</button>}
  </div>;
}
