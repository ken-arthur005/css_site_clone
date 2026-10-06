import type { Buyer, MerchStoreContent, MerchTotals, TeeLine, TeeProduct } from "@/types/merch-store";

export const CART_KEY = "cssknust.merch.cart.v1";
export const PENDING_ORDER_KEY = "cssknust.merch.pending.v1";

export function money(minor: number): string {
  return `GH₵${(minor / 100).toFixed(2)}`;
}

export function productIsOpen(product: TeeProduct, now = new Date()): boolean {
  return !product.availableUntil || now.getTime() < Date.parse(`${product.availableUntil}T23:59:59.999Z`) + 1;
}

export function lineKey(line: TeeLine): string {
  return `${line.productId}:${line.colourwayId}:${line.fit}:${line.size}`;
}

export function validLineOptions(value: unknown, content: MerchStoreContent): value is TeeLine {
  if (!value || typeof value !== "object") return false;
  const line = value as TeeLine;
  const product = content.products.find(({ id }) => id === line.productId);
  return !!product &&
    product.colourways.some(({ id }) => id === line.colourwayId) &&
    product.fits.some(({ id }) => id === line.fit) &&
    content.sizes.some(({ id }) => id === line.size) &&
    Number.isInteger(line.quantity) && line.quantity >= 1 && line.quantity <= content.maxQuantity;
}

export function validateLine(value: unknown, content: MerchStoreContent, now = new Date()): value is TeeLine {
  return validLineOptions(value, content) && productIsOpen(content.products.find(({ id }) => id === value.productId)!, now);
}

export function unitPrice(line: TeeLine, content: MerchStoreContent): number {
  const product = content.products.find(({ id }) => id === line.productId);
  const fit = product?.fits.find(({ id }) => id === line.fit);
  const size = content.sizes.find(({ id }) => id === line.size);
  if (!product || !fit || !size) throw new Error("Choose a valid tee, fit and size.");
  return product.priceMinor + fit.extraMinor + size.extraMinor;
}

export function calculateTotals(lines: TeeLine[], content: MerchStoreContent): MerchTotals {
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalMinor = lines.reduce((sum, line) => sum + unitPrice(line, content) * line.quantity, 0);
  const discountMinor = quantity >= content.discount.minimumQuantity ? Math.round(subtotalMinor * content.discount.percent / 100) : 0;
  return { quantity, subtotalMinor, discountMinor, totalMinor: subtotalMinor - discountMinor };
}

export function addLine(lines: TeeLine[], incoming: TeeLine, maxQuantity: number): TeeLine[] {
  const existing = lines.find((line) => lineKey(line) === lineKey(incoming));
  if (!existing) return [...lines, incoming];
  if (existing.quantity + incoming.quantity > maxQuantity) throw new Error(`You can add up to ${maxQuantity} of the same tee configuration.`);
  return lines.map((line) => line === existing ? { ...line, quantity: line.quantity + incoming.quantity } : line);
}

export function updateLine(lines: TeeLine[], originalKey: string, incoming: TeeLine, maxQuantity: number): TeeLine[] {
  if (!lines.some((line) => lineKey(line) === originalKey)) throw new Error("This tee has changed in your saved order. Please review it again.");
  const collision = lines.some((line) => lineKey(line) !== originalKey && lineKey(line) === lineKey(incoming));
  if (collision) return addLine(lines.filter((line) => lineKey(line) !== originalKey), incoming, maxQuantity);
  return lines.map((line) => lineKey(line) === originalKey ? incoming : line);
}

export function subtractPurchasedLines(cart: TeeLine[], purchased: TeeLine[]): TeeLine[] {
  const quantities = new Map<string, number>();
  purchased.forEach((line) => quantities.set(lineKey(line), (quantities.get(lineKey(line)) ?? 0) + line.quantity));
  return cart.flatMap((line) => {
    const remaining = line.quantity - (quantities.get(lineKey(line)) ?? 0);
    return remaining > 0 ? [{ ...line, quantity: remaining }] : [];
  });
}

export function serializeOptions(line: TeeLine): string {
  const note = `size=${line.size};fit=${line.fit};colourway=${line.colourwayId}`;
  if (note.length > 100) throw new Error("The selected options exceed the ordering service’s note limit.");
  return note;
}

export function makeOrderRequest(buyer: Buyer, lines: TeeLine[], ids: Partial<Record<TeeLine["productId"], number>>) {
  return {
    buyer_name: buyer.name.trim(), buyer_phone: buyer.phone.trim(), buyer_email: buyer.email.trim(),
    items: lines.map((line) => {
      const product = ids[line.productId];
      if (!product || !Number.isInteger(product)) throw new Error("This tee is not connected to the ordering service yet.");
      return { product, quantity: line.quantity, note: serializeOptions(line) };
    }),
  };
}
