import type { ApiMerchandise, CheckoutCatalog, MerchStoreContent, PieceChoice, ProductId, ShopLine, ShopProduct } from "@/types/merch-store";
import { findProduct, fromPriceMinor, validateLine } from "@/lib/merch/order";

// Creative content and stored selections keep their stable local IDs. Only
// commerce data changes when the service's catalogue changes.
export function withCatalogPricing(content: MerchStoreContent, catalog: CheckoutCatalog | null): MerchStoreContent {
  return { ...content, products: content.products.map((product) => ({ ...product, priceMinor: fromPriceMinor(product, content, catalog) })) };
}

function sellable(live: ApiMerchandise | undefined): live is ApiMerchandise {
  return !!live && live.in_stock && live.stock_quantity !== 0 && live.availability === "available" && (live.kind === "tee" || live.price !== null);
}

/** Why one garment (a whole simple item/tee, or one bundle piece) can't be ordered. */
function garmentIssue(part: ShopProduct, live: ApiMerchandise, choice: PieceChoice, what: string): string | null {
  if (live.sizes.length && !live.sizes.some((size) => size.value === choice.size && size.available)) return `Size ${choice.size} of the ${what} is currently unavailable.`;
  const cw = part.colourways.length > 1 ? part.colourways.find(({ id }) => id === choice.colourwayId) : undefined;
  if (part.colourways.length > 1) {
    if (!cw?.apiValue || !live.colorways.some((option) => option.value === cw.apiValue && option.available)) return `This ${what} colourway is currently unavailable.`;
    if (live.unavailable_combinations.some((combo) => combo.size === choice.size && combo.colorway === cw.apiValue)) return `Size ${choice.size} in ${cw.name} is currently unavailable.`;
  }
  return null;
}

export function selectionIssue(line: ShopLine, content: MerchStoreContent, catalog: CheckoutCatalog | null): string | null {
  if (!validateLine(line, content)) return "This selection is no longer available. Edit or remove it to continue.";
  if (!catalog) return null; // Offline drafts stay editable; checkout requires a live catalogue.
  const product = findProduct(content, line.productId)!;
  const live = catalog.products[product.id];
  if (!sellable(live)) return `The ${product.name} is currently unavailable.`;

  if (product.kind === "bundle") {
    const slots = new Set(live.components.map((component) => component.slot));
    if ((product.pieces ?? []).some((piece) => !slots.has(piece.slot)) || slots.size !== (product.pieces ?? []).length) return `The ${product.name} is being updated. Please try again shortly.`;
    for (const piece of product.pieces ?? []) {
      const part = findProduct(content, piece.productId)!;
      const component = live.components.find((entry) => entry.slot === piece.slot)!;
      const partLive = catalog.products[piece.productId];
      if (!partLive || partLive.id !== component.product || !partLive.in_stock) return `The ${piece.label} in this bundle is currently unavailable.`;
      if (piece.back && !partLive.backs.some((back) => back.value === piece.back && back.available)) return `The ${piece.label} back is currently unavailable.`;
      const issue = garmentIssue(part, partLive, line.pieces?.[piece.slot] ?? {}, piece.label);
      if (issue) return issue;
    }
    return null;
  }

  const issue = garmentIssue(product, live, { size: line.size, colourwayId: line.colourwayId }, product.name);
  if (issue) return issue;
  if (product.kind === "tee") {
    if (!live.backs.some((back) => back.value === line.back && back.available)) return "This back design is currently unavailable.";
    if (live.fits.length && !live.fits.some((fit) => fit.value === (line.fit ?? "regular") && fit.available)) return "This fit is currently unavailable.";
    if (line.backName && live.back_name_price === null) return "Names on the back aren’t available right now.";
  }
  return null;
}

/** Units of each product the cart uses, counting the pieces inside bundles. */
export function unitsByProduct(lines: ShopLine[], content: MerchStoreContent): Map<ProductId, number> {
  const units = new Map<ProductId, number>();
  const add = (id: ProductId, quantity: number) => units.set(id, (units.get(id) ?? 0) + quantity);
  for (const line of lines) {
    add(line.productId, line.quantity);
    for (const piece of findProduct(content, line.productId)?.pieces ?? []) add(piece.productId, line.quantity);
  }
  return units;
}

export function stockIssue(lines: ShopLine[], content: MerchStoreContent, catalog: CheckoutCatalog | null): string | null {
  if (!catalog) return null;
  for (const [id, count] of unitsByProduct(lines, content)) {
    const stock = catalog.products[id]?.stock_quantity;
    if (stock != null && count > stock) return `Only ${stock} ${findProduct(content, id)?.name ?? "item"}${stock === 1 ? "" : "s"} remain. Reduce your quantities to continue.`;
  }
  return null;
}

