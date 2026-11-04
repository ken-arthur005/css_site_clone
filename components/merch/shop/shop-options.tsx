"use client";

import { backNamePriceMinor, backPriceMinor, BACK_NAME_PATTERN, findProduct, fitExtraMinor, money } from "@/lib/merch/order";
import { listedSizes, sellableColourways } from "@/lib/merch/draft";
import type { BackId, CheckoutCatalog, FitId, MerchStoreContent, PieceChoice, ProductId, ShopLine, ShopProduct, TeeSize } from "@/types/merch-store";
import { MerchImage } from "../merch-image";
import { Quantity } from "../merch-quantity";

type OptionsProps = {
  content: MerchStoreContent;
  catalog: CheckoutCatalog | null;
  draft: ShopLine;
  onChange: (next: ShopLine) => void;
};

function ColourwayPicker({ product, catalog, value, label = "Colourway", onChange }: {
  product: ShopProduct; catalog: CheckoutCatalog | null; value: string | undefined; label?: string; onChange: (id: string) => void;
}) {
  if (product.colourways.length < 2) return null;
  const sellable = new Set(sellableColourways(product, catalog).map(({ id }) => id));
  const chosen = product.colourways.find(({ id }) => id === value);
  return <fieldset><legend>{label} <small>{chosen?.name}</small></legend><div className="merch-options__colourways">{product.colourways.map((cw) =>
    <button key={cw.id} type="button" aria-pressed={value === cw.id} disabled={!sellable.has(cw.id)} aria-label={`${cw.name}, ${cw.base} fabric with ${cw.print} print${sellable.has(cw.id) ? "" : ", unavailable"}`} onClick={() => onChange(cw.id)}>
      <span><MerchImage src={cw.front} alt="" sizes="120px" /></span><span>{cw.name}</span>
    </button>)}</div></fieldset>;
}

function SizePicker({ productId, content, catalog, value, colourwayId, label = "Size", onChange }: {
  productId: ProductId; content: MerchStoreContent; catalog: CheckoutCatalog | null; value: TeeSize | undefined; colourwayId?: string; label?: string; onChange: (size: TeeSize) => void;
}) {
  const live = catalog?.products[productId];
  const apiValue = findProduct(content, productId)?.colourways.find(({ id }) => id === colourwayId)?.apiValue;
  const unavailable = (size: TeeSize) => !!live && (!live.sizes.some((option) => option.value === size && option.available) ||
    (!!apiValue && live.unavailable_combinations.some((combo) => combo.size === size && combo.colorway === apiValue)));
  return <fieldset><legend>{label}</legend><div className="merch-options__buttons">{listedSizes(productId, content, catalog).map((size) =>
    <button type="button" key={size.id} aria-pressed={value === size.id} disabled={unavailable(size.id)} aria-label={`Size ${size.id}${unavailable(size.id) ? ", unavailable" : ""}`} onClick={() => onChange(size.id)}>{size.id}</button>)}</div></fieldset>;
}

function TeeOptions({ content, catalog, draft, onChange, product }: OptionsProps & { product: ShopProduct }) {
  const live = catalog?.products[product.id];
  const namePrice = backNamePriceMinor(content, catalog, product.id);
  const namesOffered = !catalog || live?.back_name_price != null;
  const nameInvalid = !!draft.backName && !BACK_NAME_PATTERN.test(draft.backName);
  return <>
    <ColourwayPicker product={product} catalog={catalog} value={draft.colourwayId} onChange={(colourwayId) => onChange({ ...draft, colourwayId })} />
    <fieldset><legend>Back design</legend><div className="merch-options__choices">{content.backs.map((back) => {
      const off = !!live && !live.backs.some((option) => option.value === back.id && option.available);
      return <button key={back.id} type="button" aria-pressed={draft.back === back.id} disabled={off} onClick={() => onChange({ ...draft, back: back.id as BackId })}>
        <strong>{back.name}</strong><small>{back.description}</small><b>{money(backPriceMinor(back.id, content, catalog, product.id))}</b>
      </button>;
    })}</div></fieldset>
    <fieldset><legend>Fit</legend><div className="merch-options__buttons">{content.fits.map((fit) => {
      const extra = fitExtraMinor(fit.id, content, catalog, product.id);
      const off = !!live && live.fits.length > 0 && !live.fits.some((option) => option.value === fit.id && option.available);
      return <button key={fit.id} type="button" aria-pressed={(draft.fit ?? "regular") === fit.id} disabled={off} onClick={() => onChange({ ...draft, fit: fit.id as FitId })}>{fit.name}{extra > 0 && <small> +{money(extra)}</small>}</button>;
    })}</div></fieldset>
    <SizePicker productId={product.id} content={content} catalog={catalog} value={draft.size} colourwayId={draft.colourwayId} onChange={(size) => onChange({ ...draft, size })} />
    {namesOffered && <label className="merch-name-field">
      <span>Name on the back <small>Optional · up to 12 characters · +{money(namePrice)}</small></span>
      <input value={draft.backName ?? ""} maxLength={12} autoComplete="off" spellCheck={false} aria-invalid={nameInvalid || undefined} aria-describedby="merch-name-help"
        onChange={(event) => onChange({ ...draft, backName: event.target.value.toUpperCase().replace(/\s+/g, " ").trimStart() || undefined })} placeholder="e.g. KOFI" />
      <small id="merch-name-help">{nameInvalid ? "Use letters, numbers, spaces and . - ! @ # & ' only." : "Printed across the top of the back. Flip the preview to see it."}</small>
    </label>}
  </>;
}

function BundleOptions({ content, catalog, draft, onChange, product }: OptionsProps & { product: ShopProduct }) {
  const setPiece = (slot: string, choice: PieceChoice) => onChange({ ...draft, pieces: { ...draft.pieces, [slot]: { ...draft.pieces?.[slot], ...choice } } });
  return <>{(product.pieces ?? []).map((piece, index) => {
    const part = findProduct(content, piece.productId)!;
    const choice = draft.pieces?.[piece.slot] ?? {};
    const back = content.backs.find(({ id }) => id === piece.back);
    return <fieldset className="merch-piece" key={piece.slot}>
      <legend><span className="merch-label">Piece {index + 1}</span> {piece.label}{back && <small> · {back.name} back</small>}</legend>
      <ColourwayPicker product={part} catalog={catalog} value={choice.colourwayId} label="Colourway" onChange={(colourwayId) => setPiece(piece.slot, { colourwayId })} />
      <SizePicker productId={part.id} content={content} catalog={catalog} value={choice.size} colourwayId={choice.colourwayId} label="Size" onChange={(size) => setPiece(piece.slot, { size })} />
    </fieldset>;
  })}</>;
}

export function ShopOptions(props: OptionsProps & { maxQuantity: number }) {
  const { content, catalog, draft, onChange, maxQuantity } = props;
  const product = findProduct(content, draft.productId)!;
  return <div className="merch-options">
    {product.kind === "tee" && <TeeOptions {...props} product={product} />}
    {product.kind === "bundle" && <BundleOptions {...props} product={product} />}
    {product.kind === "simple" && <>
      <ColourwayPicker product={product} catalog={catalog} value={draft.colourwayId} onChange={(colourwayId) => onChange({ ...draft, colourwayId })} />
      <SizePicker productId={product.id} content={content} catalog={catalog} value={draft.size} colourwayId={draft.colourwayId} onChange={(size) => onChange({ ...draft, size })} />
    </>}
    <fieldset><legend>Quantity</legend><Quantity quantity={draft.quantity} max={maxQuantity} label={`${product.name} quantity`} onChange={(quantity) => onChange({ ...draft, quantity })} /></fieldset>
  </div>;
}
