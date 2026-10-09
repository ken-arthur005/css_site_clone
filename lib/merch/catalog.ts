import type { CheckoutCatalog, MerchStoreContent, TeeLine } from "@/types/merch-store";
import { validateLine } from "@/lib/merch/order";

// Creative content and stored selections retain their stable local IDs. Only
// commerce data changes when the service's catalog changes.
export function withCatalogPricing(content: MerchStoreContent, catalog: CheckoutCatalog | null): MerchStoreContent {
  return {
    ...content,
    products: content.products.map((product) => {
      const price = catalog?.products[product.id]?.price;
      return price != null ? { ...product, priceMinor: Math.round(Number(price) * 100) } : product;
    }),
    discount: catalog?.discount ?? { enabled: false, minimumQuantity: 2, percent: 0 },
  };
}

export function selectionIssue(line: TeeLine, content: MerchStoreContent, catalog: CheckoutCatalog | null): string | null {
  if (!validateLine(line, content)) return "This selection is no longer available. Edit or remove it to continue.";
  if (!catalog) return null; // Offline drafts stay editable; checkout requires a live catalog.
  const live = catalog.products[line.productId];
  if (!live || !live.in_stock || live.price === null || live.stock_quantity === 0) return "This tee is currently unavailable.";
  if (!live.sizes.some((size) => size.value === line.size && size.available)) return `Size ${line.size} is currently unavailable.`;
  const colourway = content.products.find(({ id }) => id === line.productId)?.colourways.find(({ id }) => id === line.colourwayId);
  const value = colourway?.apiValue;
  if (value ? !live.colorways.some((option) => option.value === value && option.available) : live.colorways.length > 0) return "This colourway is currently unavailable.";
  if (live.unavailable_combinations.some((option) => option.size === line.size && option.colorway === (value ?? ""))) return "This size and colourway combination is currently unavailable.";
  return null;
}

export function stockIssue(lines: TeeLine[], content: MerchStoreContent, catalog: CheckoutCatalog | null): string | null {
  if (!catalog) return null;
  for (const product of content.products) {
    const count = lines.filter((line) => line.productId === product.id).reduce((sum, line) => sum + line.quantity, 0);
    const stock = catalog.products[product.id]?.stock_quantity;
    if (count && stock != null && count > stock) return `Only ${stock} ${product.name}${stock === 1 ? "" : "s"} remain. Reduce your quantities to continue.`;
  }
  return null;
}
