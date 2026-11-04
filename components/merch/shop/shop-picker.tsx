"use client";

import { fromPriceMinor, money, productIsOpen } from "@/lib/merch/order";
import { EMPTY_STATS, mostPopular, proofLine, type MerchStats } from "@/lib/merch/stats";
import type { CheckoutCatalog, MerchStoreContent, ProductGroup, ProductId, ShopProduct } from "@/types/merch-store";
import { MerchImage } from "../merch-image";
import { productThumb } from "./shop-preview";

const GROUPS: { id: ProductGroup; name: string }[] = [
  { id: "tees", name: "Tees" },
  { id: "polos", name: "Polo" },
  { id: "bundles", name: "Bundles" },
];

export function productStatus(product: ShopProduct, content: MerchStoreContent, catalog: CheckoutCatalog | null): { open: boolean; text: string } {
  if (!productIsOpen(product, new Date(), content)) return { open: false, text: "This edition has ended." };
  const live = catalog?.products[product.id];
  if (catalog && (!live || !live.in_stock || live.availability !== "available")) return { open: false, text: "Currently unavailable" };
  const price = money(fromPriceMinor(product, content, catalog));
  if (product.kind === "bundle") return { open: true, text: `${catalog ? "" : "Estimate "}${price} for ${product.pieces?.length ?? 0} pieces` };
  return { open: true, text: `${catalog ? "From" : "Estimate"} ${price}` };
}

export function ShopPicker({ content, catalog, selected, disabled, onChoose, stats = EMPTY_STATS }: {
  content: MerchStoreContent; catalog: CheckoutCatalog | null; selected: ProductId; disabled: boolean; onChoose: (id: ProductId) => void; stats?: MerchStats;
}) {
  const popular = mostPopular(content.products.filter((product) => product.kind === "bundle").map((product) => product.id), stats);
  return <fieldset className="merch-designs" disabled={disabled}><legend>Choose {disabled && <small>Cancel this edit to switch items</small>}</legend>
    {GROUPS.map((group) => {
      const products = content.products.filter((product) => product.group === group.id);
      if (!products.length) return null;
      return <div className="merch-pick-group" key={group.id}>
        <p className="merch-label">{group.name}</p>
        <div className="merch-pick-products">{products.map((product) => {
          const status = productStatus(product, content, catalog);
          const thumb = productThumb(content, product.id);
          const proof = status.open ? proofLine(product.id, stats) : "";
          const badge = product.badge ?? (product.id === popular ? "Most popular" : null);
          return <button key={product.id} type="button" className="merch-pick-product" aria-pressed={selected === product.id} disabled={!status.open} onClick={() => onChoose(product.id)}>
            <span className="merch-pick-product__image">{thumb && <MerchImage src={thumb} alt="" sizes="64px" />}{product.kind === "bundle" && <span className="merch-pick-product__count" aria-hidden="true">×{product.pieces?.length}</span>}</span>
            <span><strong>{product.name}{badge && <em className="merch-pick-product__badge">{badge}</em>}</strong><small>{status.text}</small>{proof && <small className="merch-pick-product__proof">{proof}</small>}</span>
            <span aria-hidden="true">{selected === product.id ? "✓" : "↗"}</span>
          </button>;
        })}</div>
      </div>;
    })}
  </fieldset>;
}
