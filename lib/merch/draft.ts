import type { CheckoutCatalog, MerchStoreContent, PieceChoice, ProductId, ShopLine, ShopProduct, TeeSize } from "@/types/merch-store";
import { findProduct } from "@/lib/merch/order";

/** Colourways the live catalogue currently sells (all of them while it loads). */
export function sellableColourways(product: ShopProduct, catalog: CheckoutCatalog | null) {
  const live = catalog?.products[product.id];
  if (!catalog || product.colourways.length <= 1) return product.colourways;
  return product.colourways.filter((cw) => !!cw.apiValue && !!live?.colorways.some((option) => option.value === cw.apiValue && option.available));
}

/** Sizes the live catalogue lists for a product (all of them while it loads). */
export function listedSizes(productId: ProductId, content: MerchStoreContent, catalog: CheckoutCatalog | null) {
  const live = catalog?.products[productId];
  if (!catalog || !live?.sizes.length) return content.sizes;
  return content.sizes.filter((size) => live.sizes.some((option) => option.value === size.id));
}

function preferredSize(productId: ProductId, content: MerchStoreContent, catalog: CheckoutCatalog | null, wanted: TeeSize | undefined): TeeSize {
  const live = catalog?.products[productId];
  const sizes = listedSizes(productId, content, catalog).map(({ id }) => id);
  const available = (id: TeeSize) => !live || live.sizes.some((option) => option.value === id && option.available);
  return [wanted, "M" as TeeSize, ...sizes].find((size): size is TeeSize => !!size && sizes.includes(size) && available(size)) ?? sizes[0] ?? "M";
}

/**
 * A fresh draft for a product, keeping what still makes sense from the previous
 * draft (size, colourway) so switching products doesn't reset every choice.
 */
export function defaultDraft(product: ShopProduct, content: MerchStoreContent, catalog: CheckoutCatalog | null, previous?: Partial<ShopLine>, colourwayId?: string): ShopLine {
  if (product.kind === "bundle") {
    const pieces: Record<string, PieceChoice> = {};
    for (const piece of product.pieces ?? []) {
      const part = findProduct(content, piece.productId)!;
      const choice: PieceChoice = { size: preferredSize(part.id, content, catalog, previous?.pieces?.[piece.slot]?.size ?? previous?.size) };
      if (part.colourways.length > 1) {
        const options = sellableColourways(part, catalog);
        const keep = previous?.pieces?.[piece.slot]?.colourwayId ?? previous?.colourwayId ?? colourwayId;
        choice.colourwayId = (options.find((cw) => cw.id === keep) ?? options[0] ?? part.colourways[0]).id;
      }
      pieces[piece.slot] = choice;
    }
    return { productId: product.id, quantity: 1, pieces };
  }
  const line: ShopLine = { productId: product.id, quantity: 1, size: preferredSize(product.id, content, catalog, previous?.size) };
  if (product.colourways.length > 1) {
    const options = sellableColourways(product, catalog);
    const keep = colourwayId ?? previous?.colourwayId;
    line.colourwayId = (options.find((cw) => cw.id === keep) ?? options[0] ?? product.colourways[0]).id;
  }
  if (product.kind === "tee") { line.back = previous?.back ?? "spec-sheet"; line.fit = previous?.fit ?? "regular"; }
  return line;
}
