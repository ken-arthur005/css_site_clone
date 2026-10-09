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
  return `${line.productId}:${line.colourwayId}:${line.size}`;
}

export function validLineOptions(value: unknown, content: MerchStoreContent): value is TeeLine {
  if (!value || typeof value !== "object") return false;
  const line = value as TeeLine;
  const product = content.products.find(({ id }) => id === line.productId);
  return !!product &&
    product.colourways.some(({ id }) => id === line.colourwayId) &&
    content.sizes.some(({ id }) => id === line.size) &&
    Number.isInteger(line.quantity) && line.quantity >= 1 && line.quantity <= content.maxQuantity * 40;
}

// Preserve legacy drafts while removing the obsolete fit field. If formerly
// distinct fit entries merge above the limit, retain every unit so the buyer
// can explicitly reduce the quantity rather than silently losing selections.
export function normalizeStoredLines(value: unknown, content: MerchStoreContent): TeeLine[] {
  if (!Array.isArray(value)) return [];
  const result: TeeLine[] = [];
  for (const raw of value.slice(0, 40)) {
    if (!validLineOptions(raw, content)) continue;
    const line: TeeLine = { productId: raw.productId, colourwayId: raw.colourwayId, size: raw.size, quantity: raw.quantity };
    const existing = result.find((other) => lineKey(other) === lineKey(line));
    if (existing) existing.quantity += line.quantity;
    else result.push(line);
  }
  return result;
}

export function validateLine(value: unknown, content: MerchStoreContent, now = new Date()): value is TeeLine {
  return validLineOptions(value, content) && value.quantity <= content.maxQuantity && productIsOpen(content.products.find(({ id }) => id === value.productId)!, now);
}

export function unitPrice(line: TeeLine, content: MerchStoreContent): number {
  const product = content.products.find(({ id }) => id === line.productId);
  const size = content.sizes.find(({ id }) => id === line.size);
  if (!product || !size) throw new Error("Choose a valid tee and size.");
  return product.priceMinor + size.extraMinor;
}

export function calculateTotals(lines: TeeLine[], content: MerchStoreContent): MerchTotals {
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalMinor = lines.reduce((sum, line) => sum + unitPrice(line, content) * line.quantity, 0);
  const discountMinor = quantity >= content.discount.minimumQuantity ? Math.round(subtotalMinor * content.discount.percent / 100) : 0;
  return { quantity, subtotalMinor, discountMinor, totalMinor: subtotalMinor - discountMinor };
}

export function addLine(lines: TeeLine[], incoming: TeeLine, maxQuantity: number): TeeLine[] {
  if (!Number.isInteger(incoming.quantity) || incoming.quantity < 1 || incoming.quantity > maxQuantity) throw new Error(`Choose between 1 and ${maxQuantity} tees per configuration.`);
  const existing = lines.find((line) => lineKey(line) === lineKey(incoming));
  if (!existing) {
    if (lines.length >= 40) throw new Error("Your order can contain up to 40 different configurations.");
    return [...lines, incoming];
  }
  if (existing.quantity + incoming.quantity > maxQuantity) throw new Error(`You can add up to ${maxQuantity} of the same tee configuration.`);
  return lines.map((line) => line === existing ? { ...line, quantity: line.quantity + incoming.quantity } : line);
}

export function updateLine(lines: TeeLine[], originalKey: string, incoming: TeeLine, maxQuantity: number): TeeLine[] {
  if (!Number.isInteger(incoming.quantity) || incoming.quantity < 1 || incoming.quantity > maxQuantity) throw new Error(`Choose between 1 and ${maxQuantity} tees per configuration.`);
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
  const note = `size=${line.size};colourway=${line.colourwayId}`;
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
