"use client";

import { useState, type CSSProperties } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import {
  getAvailableBaseColors,
  getValidPrintColors,
  selectVariantForBase,
} from "@/lib/content/merch";
import type { MerchProduct } from "@/types/merch";

export function HomeMerchSelector({ product }: { product: MerchProduct }) {
  const baseColors = getAvailableBaseColors(product);
  const firstBase = baseColors[0];
  const [selectedBaseId, setSelectedBaseId] = useState(firstBase?.id ?? "");
  const [selectedPrintId, setSelectedPrintId] = useState(
    firstBase ? selectVariantForBase(product, firstBase.id)?.printColor.id ?? "" : "",
  );
  const printColors = getValidPrintColors(product, selectedBaseId);
  const selectedPrint = printColors.find((color) => color.id === selectedPrintId) ?? printColors[0];

  const selectBase = (baseColorId: string) => {
    const variant = selectVariantForBase(product, baseColorId, selectedPrintId);
    setSelectedBaseId(baseColorId);
    setSelectedPrintId(variant?.printColor.id ?? "");
  };

  return (
    <div
      className="home-merch-stage"
      style={
        {
          "--merch-accent": selectedPrint?.value ?? "var(--accent)",
        } as CSSProperties
      }
    >
      <div aria-hidden="true" className="home-merch-stage__grid" />
      <div className="home-merch-stage__intro">
        <h2 id="merch-title">Wear CSS, <em>Be CSS</em></h2>
        <p>Welcome to the family</p>
      </div>

      <div aria-label="3D CSS tshirt viewer" className="home-merch-stage__viewer" role="img" />

      <div className="home-merch-stage__product">
        <p className="eyebrow">Featured garment</p>
        <h3>{product.name}</h3>
      </div>

      <div className="home-merch-stage__primary-picker">
        <p className="eyebrow">Pick a colour</p>
        <div className="home-merch-stage__swatches" role="group" aria-label="Primary colour">
          {baseColors.map((color) => (
            <button
              aria-label={`Primary colour: ${color.name}`}
              aria-pressed={selectedBaseId === color.id}
              className="home-merch-stage__swatch"
              key={color.id}
              onClick={() => selectBase(color.id)}
              style={{ "--swatch": color.value } as CSSProperties}
              type="button"
            >
              <span aria-hidden="true" />
              <span>{color.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="home-merch-stage__accent-picker">
        <p className="eyebrow">Accent colour</p>
        <div className="home-merch-stage__accent-options" role="group" aria-label="Accent colour">
          {printColors.map((color) => (
            <button
              aria-label={`Accent colour: ${color.name}`}
              aria-pressed={selectedPrintId === color.id}
              className="home-merch-stage__swatch"
              key={color.id}
              onClick={() => setSelectedPrintId(color.id)}
              style={{ "--swatch": color.value } as CSSProperties}
              type="button"
            >
              <span aria-hidden="true" />
              <span>{color.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="home-merch-stage__price">
        <p className="eyebrow">Price</p>
        {product.price.contentStatus === "verified" ? (
          <p>{new Intl.NumberFormat("en-GH", { style: "currency", currency: product.price.currency }).format(product.price.amount)}</p>
        ) : (
          <p>Price pending verification</p>
        )}
      </div>

      <div className="home-merch-stage__actions">
        <TransitionLink className="button button-secondary angular-cut" href="/merch" transitionLabel="MERCH">
          View more merch <span aria-hidden="true">/&gt;</span>
        </TransitionLink>
        <button className="button button-primary angular-cut" disabled type="button">
          Checkout coming soon
        </button>
      </div>
    </div>
  );
}
