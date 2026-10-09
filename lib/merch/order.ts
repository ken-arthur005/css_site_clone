import type { ApiOrderItem, Buyer, MerchQuote, MerchStoreContent, MerchTotals, SavedMerchOrder, TeeLine, TeeProduct } from "@/types/merch-store";

export const CART_KEY = "cssknust.merch.cart.v1";
export const PENDING_ORDER_KEY = "cssknust.merch.pending.v1";
export const ORDER_HISTORY_KEY = "cssknust.merch.orders.v1";
export const LAST_RECEIPT_KEY = "cssknust.merch.receipt.v1";

export function orderPhase(status: string): "paid" | "pending" | "closed" | "unknown" {
  const value = status.toUpperCase();
  if (["PAID", "COLLECTED"].includes(value)) return "paid";
  if (["PENDING", "PENDING_PAYMENT", "AWAITING_PAYMENT", "CREATED", "UNPAID"].includes(value)) return "pending";
  if (["FAILED", "EXPIRED", "CANCELLED", "CANCELED"].includes(value)) return "closed";
  return "unknown";
}

export function paymentHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "paystack.com" || url.hostname.endsWith(".paystack.com")) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function readSavedOrder(value: unknown): SavedMerchOrder | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as Record<string, unknown>;
  if (typeof saved.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.id)) return null;
  return { id: saved.id.toLowerCase(), lines: Array.isArray(saved.lines) ? saved.lines : [], authorization_url: paymentHref(saved.authorization_url),
    expires_at: typeof saved.expires_at === "string" ? saved.expires_at : null, quote: readMerchQuote(saved.quote),
    ownsCart: saved.ownsCart !== false, reconciled: saved.reconciled === true,
    ...(typeof saved.status === "string" ? { status: saved.status } : {}) };
}

export function snapshotReduced(previous: TeeLine[], next: TeeLine[], snapshot: TeeLine[]): boolean {
  return snapshot.some((line) => {
    const before = previous.find((item) => lineKey(item) === lineKey(line))?.quantity ?? 0;
    const after = next.find((item) => lineKey(item) === lineKey(line))?.quantity ?? 0;
    return after < Math.min(before, line.quantity);
  });
}

export function reconcileOrderCart(cart: TeeLine[], saved: SavedMerchOrder, status: string, content: MerchStoreContent): TeeLine[] {
  return orderPhase(status) === "paid" && saved.ownsCart && !saved.reconciled ? subtractPurchasedLines(cart, normalizeStoredLines(saved.lines, content)) : cart;
}

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
  return product.priceMinor;
}

export function calculateTotals(lines: TeeLine[], content: MerchStoreContent): MerchTotals {
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalMinor = lines.reduce((sum, line) => sum + unitPrice(line, content) * line.quantity, 0);
  const discountMinor = content.discount.enabled && quantity >= content.discount.minimumQuantity ? Math.round(subtotalMinor * content.discount.percent / 100) : 0;
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

export function readMerchQuote(value: unknown): MerchQuote | null {
  if (!value || typeof value !== "object") return null;
  const quote = value as MerchQuote;
  const fields = [quote.subtotal, quote.discount_amount, quote.discount_percent, quote.fee, quote.total];
  if (!fields.every((field) => typeof field === "string" && /^\d+(\.\d{1,2})?$/.test(field) && Number.isSafeInteger(Math.round(Number(field) * 100)))) return null;
  const minor = (field: string) => Math.round(Number(field) * 100);
  if (minor(quote.discount_amount) > minor(quote.subtotal) || minor(quote.discount_percent) > 10000 || minor(quote.subtotal) - minor(quote.discount_amount) + minor(quote.fee) !== minor(quote.total)) return null;
  return { subtotal: quote.subtotal, discount_amount: quote.discount_amount, discount_percent: quote.discount_percent, fee: quote.fee, total: quote.total };
}

export function receiptOptions(item: ApiOrderItem, content: MerchStoreContent): string {
  // Old receipts used note-based local IDs; new receipts have dedicated fields.
  const legacy = Object.fromEntries((item.note ?? "").split(";").filter((part) => part.includes("=")).map((part) => part.split("=")));
  const size = item.size || legacy.size;
  const value = item.colorway || legacy.colourway;
  const colourway = value ? content.products.flatMap((product) => product.colourways).find((cw) => cw.apiValue === value || cw.id === value) : undefined;
  return [colourway?.name ?? value, size ? `Size ${size}` : null].filter(Boolean).join(" · ") || item.note || "";
}

export function receiptProduct(item: ApiOrderItem, content: MerchStoreContent) {
  const product = content.products.find((product) => product.apiId === item.product || product.apiNames.some((name) => name.toLowerCase() === item.product_name?.toLowerCase()));
  if (!product) return null;
  const legacy = Object.fromEntries((item.note ?? "").split(";").filter((part) => part.includes("=")).map((part) => part.split("=")));
  const value = item.colorway || legacy.colourway;
  const colourway = product.colourways.find((cw) => cw.apiValue === value || cw.id === value) ?? (product.colourways.length === 1 ? product.colourways[0] : null);
  return { product, colourway };
}

export function makeOrderRequest(buyer: Buyer, lines: TeeLine[], ids: Partial<Record<TeeLine["productId"], number>>, content: MerchStoreContent) {
  return {
    buyer_name: buyer.name.trim(), buyer_phone: buyer.phone.trim(), buyer_email: buyer.email.trim(),
    items: lines.map((line) => {
      const product = ids[line.productId];
      if (!product || !Number.isInteger(product)) throw new Error("This tee is not connected to the ordering service yet.");
      const colourway = content.products.find(({ id }) => id === line.productId)?.colourways.find(({ id }) => id === line.colourwayId);
      if (!colourway) throw new Error("Choose a valid colourway.");
      return { product, quantity: line.quantity, size: line.size, ...(colourway.apiValue ? { colorway: colourway.apiValue } : {}) };
    }),
  };
}
