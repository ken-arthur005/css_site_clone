"use client";

import type { CSSProperties } from "react";
import { findProduct, pieceColourway } from "@/lib/merch/order";
import type { MerchStoreContent, ShopLine, TeeColourway } from "@/types/merch-store";
import { MerchImage } from "../merch-image";

export type PreviewSide = "front" | "back";

/** One garment image, framed at the image's own aspect ratio so overlays line up. */
function Garment({ colourway, side, back, name, alt, sizes }: {
  colourway: TeeColourway; side: PreviewSide; back?: string; name?: string; alt: string; sizes: string;
}) {
  const src = side === "front" ? colourway.front : (back && colourway.backs?.[back as keyof NonNullable<TeeColourway["backs"]>]) || colourway.back;
  return <span className="merch-garment">
    <MerchImage src={src} alt={alt} sizes={sizes} />
    {side === "back" && name && <span className="merch-garment__name" style={{ "--name-ink": colourway.printValue } as CSSProperties} aria-hidden="true">{name}</span>}
  </span>;
}

export function ShopPreview({ content, line, side }: { content: MerchStoreContent; line: ShopLine; side: PreviewSide }) {
  const product = findProduct(content, line.productId);
  if (!product) return null;

  if (product.kind === "bundle") {
    const pieces = product.pieces ?? [];
    return <span className="merch-garment-set" data-count={pieces.length}>{pieces.map((piece) => {
      const cw = pieceColourway(content, piece.productId, line.pieces?.[piece.slot]);
      if (!cw) return null;
      return <Garment key={piece.slot} colourway={cw} side={side} back={piece.back} alt={`${piece.label}, ${cw.name}, ${side}`} sizes="(max-width: 767px) 45vw, 22vw" />;
    })}</span>;
  }

  const cw = product.colourways.find(({ id }) => id === line.colourwayId) ?? product.colourways[0];
  const back = product.kind === "tee" ? content.backs.find(({ id }) => id === line.back) : undefined;
  const alt = [product.name, product.colourways.length > 1 ? cw.name : null, back && side === "back" ? `${back.name} back` : side, line.backName && side === "back" ? `with ${line.backName} on the back` : null].filter(Boolean).join(", ");
  return <Garment colourway={cw} side={side} back={line.back} name={product.kind === "tee" ? line.backName : undefined} alt={alt} sizes="(max-width: 767px) 90vw, 45vw" />;
}

/** Small thumbnail for pickers and shelves: a bundle shows its first piece. */
export function productThumb(content: MerchStoreContent, productId: string): string | null {
  const product = findProduct(content, productId);
  if (!product) return null;
  if (product.kind === "bundle") {
    const first = product.pieces?.[0];
    return first ? findProduct(content, first.productId)?.colourways[0]?.front ?? null : null;
  }
  return product.colourways[0]?.front ?? null;
}
