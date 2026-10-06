"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import {
  getAvailableBaseColors,
  getValidPrintColors,
  resolveMerchVariant,
  selectVariantForBase,
} from "@/lib/content/merch";
import type { MerchProduct } from "@/types/merch";

const HomeMerchViewer = dynamic(
  () => import("@/components/merch/merch-shirt-viewer").then(({ MerchShirtViewer: Viewer }) => Viewer),
  { ssr: false },
);

export function HomeMerchSelector({ product }: { product: MerchProduct }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [viewerNear, setViewerNear] = useState(false);
  const baseColors = getAvailableBaseColors(product);
  const firstBase = baseColors[0];
  const [selectedBaseId, setSelectedBaseId] = useState(firstBase?.id ?? "");
  const [selectedPrintId, setSelectedPrintId] = useState(
    firstBase ? selectVariantForBase(product, firstBase.id)?.printColor.id ?? "" : "",
  );
  const printColors = getValidPrintColors(product, selectedBaseId);
  const selectedPrint = printColors.find((color) => color.id === selectedPrintId) ?? printColors[0];
  const selectedVariant = resolveMerchVariant(product, selectedBaseId, selectedPrint?.id ?? "") ??
    selectVariantForBase(product, selectedBaseId, selectedPrintId);
  const textureSources = useMemo(() => product.variants.map((variant) => variant.texture.src), [product.variants]);
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setViewerNear(true);
      observer.disconnect();
    }, { rootMargin: "100% 0px" });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const selectBase = (baseColorId: string) => {
    const variant = selectVariantForBase(product, baseColorId, selectedPrintId);
    setSelectedBaseId(baseColorId);
    setSelectedPrintId(variant?.printColor.id ?? "");
  };

  return (
    <div
      className="home-merch-stage"
      ref={rootRef}
      data-accent-id={selectedPrint?.id}
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

      <div className="home-merch-stage__product">
        <p className="eyebrow">Featured garment</p>
        <h3>{product.name}</h3>
      </div>

      {selectedVariant && (
        <div
          aria-label={`Interactive 3D preview: ${selectedVariant.baseColor.name} CSS tshirt with ${selectedVariant.printColor.name} print. Drag to rotate.`}
          className="home-merch-stage__viewer"
          data-ready={viewerReady}
          role="img"
        >
          <Image
            alt=""
            className="home-merch-stage__viewer-fallback"
            fill
            priority={false}
            sizes="(max-width: 767px) 100vw, 80vw"
            src={selectedVariant.fallbackImage.src}
          />
          {product.model && viewerNear && (
            <HomeMerchViewer
              model={product.model}
              onFailure={() => setViewerReady(false)}
              onReady={() => setViewerReady(true)}
              textureSources={textureSources}
              variant={selectedVariant}
            />
          )}
        </div>
      )}

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
        <TransitionLink className="button button-primary angular-cut" href="/merch/shop" transitionLabel="SHOP">
          Start your order <span aria-hidden="true">↗</span>
        </TransitionLink>
      </div>
    </div>
  );
}
