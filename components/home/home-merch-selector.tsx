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

  const selectBase = (baseColorId: string) => {
    const variant = selectVariantForBase(product, baseColorId, selectedPrintId);
    setSelectedBaseId(baseColorId);
    setSelectedPrintId(variant?.printColor.id ?? "");
  };

  return (
    <div className="home-merch-selector">
      <div>
        <p className="eyebrow">Base colour</p>
        <div className="home-merch-selector__options">
          {baseColors.map((color) => (
            <button
              aria-pressed={selectedBaseId === color.id}
              className="home-merch-selector__swatch"
              key={color.id}
              onClick={() => selectBase(color.id)}
              style={{ "--swatch": color.value } as CSSProperties}
              type="button"
            >
              <span aria-hidden="true" />
              {color.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="eyebrow">Print colour</p>
        <div className="home-merch-selector__options">
          {printColors.map((color) => (
            <button
              aria-pressed={selectedPrintId === color.id}
              className="home-merch-selector__swatch"
              key={color.id}
              onClick={() => setSelectedPrintId(color.id)}
              style={{ "--swatch": color.value } as CSSProperties}
              type="button"
            >
              <span aria-hidden="true" />
              {color.name}
            </button>
          ))}
        </div>
      </div>
      {product.price.contentStatus === "verified" ? (
        <p className="home-merch-selector__price">
          {new Intl.NumberFormat("en-GH", {
            style: "currency",
            currency: product.price.currency,
          }).format(product.price.amount)}
        </p>
      ) : (
        <p className="home-merch-selector__price eyebrow">Price pending verification</p>
      )}
      <TransitionLink className="button button-primary angular-cut" href="/merch" transitionLabel="MERCH">
        Explore merch <span aria-hidden="true">/&gt;</span>
      </TransitionLink>
    </div>
  );
}
