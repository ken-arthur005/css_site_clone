import type { ApiMerchandise, ApiOrderItem, BackId, Buyer, CheckoutCatalog, FitId, MerchQuote, MerchStoreContent, MerchTotals, PieceChoice, ProductId, PromoCheck, SavedMerchOrder, ShopLine, ShopProduct, TeeColourway, TeeSize } from "@/types/merch-store";

export const CART_KEY = "cssknust.merch.cart.v1";
export const PENDING_ORDER_KEY = "cssknust.merch.pending.v1";
export const ORDER_HISTORY_KEY = "cssknust.merch.orders.v1";
export const LAST_RECEIPT_KEY = "cssknust.merch.receipt.v1";
export const PROMO_KEY = "cssknust.merch.promo.v1";

/** Same rule as the backend: up to 12 letters, digits, spaces and . - ! @ # & ' */
export const BACK_NAME_PATTERN = /^[A-Za-z0-9 .\-!@#&']{1,12}$/;
const MAX_LINES = 40;

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

export function money(minor: number): string {
  return `GH₵${(minor / 100).toFixed(2)}`;
}

export function minorOf(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function findProduct(content: MerchStoreContent, id: ProductId): ShopProduct | undefined {
  return content.products.find((product) => product.id === id);
}

function closesAt(availableUntil: string): number {
  return Date.parse(`${availableUntil}T23:59:59.999Z`) + 1;
}

export function productIsOpen(product: ShopProduct, now = new Date(), content?: MerchStoreContent): boolean {
  if (product.availableUntil && now.getTime() >= closesAt(product.availableUntil)) return false;
  if (product.kind === "bundle" && content) {
    return (product.pieces ?? []).every((piece) => { const part = findProduct(content, piece.productId); return !!part && productIsOpen(part, now); });
  }
  return true;
}

// ── Line identity & shape ─────────────────────────────────────────────────────

function sortedPieces(pieces: Record<string, PieceChoice> | undefined) {
  return Object.keys(pieces ?? {}).sort().map((slot) => [slot, pieces![slot].colourwayId ?? "", pieces![slot].size ?? ""]);
}

export function lineKey(line: ShopLine): string {
  return JSON.stringify([line.productId, line.colourwayId ?? "", line.size ?? "", line.back ?? "", line.fit ?? "", line.backName ?? "", sortedPieces(line.pieces)]);
}

function validSize(content: MerchStoreContent, size: unknown): size is TeeSize {
  return typeof size === "string" && content.sizes.some(({ id }) => id === size);
}

function colourwayOf(product: ShopProduct | undefined, id: string | undefined): TeeColourway | undefined {
  if (!product) return undefined;
  return product.colourways.find((cw) => cw.id === id) ?? (product.colourways.length === 1 ? product.colourways[0] : undefined);
}

/**
 * The canonical form of a stored or submitted line, or null if it is invalid.
 * Old tee-only carts migrate: a CSS Tee without a back gets the Spec Sheet in a
 * regular fit, and single-colourway items drop their colourway.
 */
export function normalizeLine(value: unknown, content: MerchStoreContent): ShopLine | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const product = typeof raw.productId === "string" ? findProduct(content, raw.productId) : undefined;
  const quantity = raw.quantity;
  if (!product || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > content.maxQuantity * MAX_LINES) return null;

  if (product.kind === "bundle") {
    const chosen = raw.pieces && typeof raw.pieces === "object" ? raw.pieces as Record<string, PieceChoice> : {};
    const pieces: Record<string, PieceChoice> = {};
    for (const piece of product.pieces ?? []) {
      const part = findProduct(content, piece.productId);
      const choice = chosen[piece.slot] ?? {};
      if (!part || !validSize(content, choice.size)) return null;
      const entry: PieceChoice = { size: choice.size };
      if (part.colourways.length > 1) {
        if (!part.colourways.some((cw) => cw.id === choice.colourwayId)) return null;
        entry.colourwayId = choice.colourwayId;
      }
      pieces[piece.slot] = entry;
    }
    return { productId: product.id, quantity, pieces };
  }

  if (!validSize(content, raw.size)) return null;
  const line: ShopLine = { productId: product.id, quantity, size: raw.size };
  if (product.colourways.length > 1) {
    if (typeof raw.colourwayId !== "string" || !product.colourways.some((cw) => cw.id === raw.colourwayId)) return null;
    line.colourwayId = raw.colourwayId;
  }
  if (product.kind === "tee") {
    const back = (raw.back ?? "spec-sheet") as BackId;
    const fit = (raw.fit ?? "regular") as FitId;
    if (!content.backs.some(({ id }) => id === back) || !content.fits.some(({ id }) => id === fit)) return null;
    line.back = back; line.fit = fit;
    const name = typeof raw.backName === "string" ? raw.backName.trim().toUpperCase() : "";
    if (name) {
      if (!BACK_NAME_PATTERN.test(name)) return null;
      line.backName = name;
    }
  }
  return line;
}

export function validLineOptions(value: unknown, content: MerchStoreContent): value is ShopLine {
  const line = normalizeLine(value, content);
  return !!line && lineKey(line) === lineKey(value as ShopLine);
}

/** Saved carts: drop invalid lines, migrate old ones and merge identical lines. */
export function normalizeStoredLines(value: unknown, content: MerchStoreContent): ShopLine[] {
  if (!Array.isArray(value)) return [];
  const result: ShopLine[] = [];
  for (const raw of value.slice(0, MAX_LINES)) {
    const line = normalizeLine(raw, content);
    if (!line) continue;
    const existing = result.find((other) => lineKey(other) === lineKey(line));
    if (existing) existing.quantity += line.quantity;
    else result.push(line);
  }
  return result;
}

export function validateLine(value: unknown, content: MerchStoreContent, now = new Date()): value is ShopLine {
  if (!validLineOptions(value, content) || value.quantity > content.maxQuantity) return false;
  return productIsOpen(findProduct(content, value.productId)!, now, content);
}

// ── Prices ────────────────────────────────────────────────────────────────────

function livePrice(record: ApiMerchandise | undefined): number | null {
  return minorOf(record?.price ?? null);
}

export function backPriceMinor(back: BackId, content: MerchStoreContent, catalog?: CheckoutCatalog | null, productId: ProductId = "css-tee"): number {
  const live = catalog?.products[productId]?.backs.find((option) => option.value === back);
  return live?.priceMinor ?? content.backs.find(({ id }) => id === back)?.priceMinor ?? 0;
}

export function fitExtraMinor(fit: FitId, content: MerchStoreContent, catalog?: CheckoutCatalog | null, productId: ProductId = "css-tee"): number {
  const live = catalog?.products[productId]?.fits.find((option) => option.value === fit);
  return live?.priceMinor ?? content.fits.find(({ id }) => id === fit)?.extraMinor ?? 0;
}

export function backNamePriceMinor(content: MerchStoreContent, catalog?: CheckoutCatalog | null, productId: ProductId = "css-tee"): number {
  return minorOf(catalog?.products[productId]?.back_name_price ?? null) ?? content.backNamePriceMinor;
}

/** Display estimate of one unit; the backend prices the order itself. */
export function unitPrice(line: ShopLine, content: MerchStoreContent, catalog?: CheckoutCatalog | null): number {
  const product = findProduct(content, line.productId);
  if (!product) throw new Error("Choose a valid product.");
  if (product.kind === "tee") {
    return backPriceMinor(line.back ?? "spec-sheet", content, catalog, product.id) + fitExtraMinor(line.fit ?? "regular", content, catalog, product.id) +
      (line.backName ? backNamePriceMinor(content, catalog, product.id) : 0);
  }
  return livePrice(catalog?.products[product.id]) ?? product.priceMinor;
}

/** The lowest price a product can be bought for, for "From GH₵…" labels. */
export function fromPriceMinor(product: ShopProduct, content: MerchStoreContent, catalog?: CheckoutCatalog | null): number {
  if (product.kind === "tee") return Math.min(...content.backs.map(({ id }) => backPriceMinor(id, content, catalog, product.id)));
  return livePrice(catalog?.products[product.id]) ?? product.priceMinor;
}

export function promoDiscountMinor(lines: ShopLine[], content: MerchStoreContent, catalog: CheckoutCatalog | null | undefined, promo: PromoCheck | null): number {
  if (!promo) return 0;
  const subtotal = lines.reduce((sum, line) => sum + unitPrice(line, content, catalog) * line.quantity, 0);
  if (promo.kind === "percent") return Math.round(subtotal * (promo.percent ?? 0) / 100);
  return lines.reduce((sum, line) => {
    const promoPrice = promo.bundlePricesMinor?.[line.productId];
    const unit = unitPrice(line, content, catalog);
    return promoPrice != null && promoPrice < unit ? sum + (unit - promoPrice) * line.quantity : sum;
  }, 0);
}

export function calculateTotals(lines: ShopLine[], content: MerchStoreContent, catalog?: CheckoutCatalog | null, promo: PromoCheck | null = null): MerchTotals {
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalMinor = lines.reduce((sum, line) => sum + unitPrice(line, content, catalog) * line.quantity, 0);
  const discountMinor = Math.min(subtotalMinor, promoDiscountMinor(lines, content, catalog, promo));
  return { quantity, subtotalMinor, discountMinor, totalMinor: subtotalMinor - discountMinor };
}

// ── Editing the cart ──────────────────────────────────────────────────────────

export function addLine(lines: ShopLine[], incoming: ShopLine, maxQuantity: number): ShopLine[] {
  if (!Number.isInteger(incoming.quantity) || incoming.quantity < 1 || incoming.quantity > maxQuantity) throw new Error(`Choose between 1 and ${maxQuantity} of each item.`);
  const existing = lines.find((line) => lineKey(line) === lineKey(incoming));
  if (!existing) {
    if (lines.length >= MAX_LINES) throw new Error(`Your order can contain up to ${MAX_LINES} different items.`);
    return [...lines, incoming];
  }
  if (existing.quantity + incoming.quantity > maxQuantity) throw new Error(`You can add up to ${maxQuantity} of the same item.`);
  return lines.map((line) => line === existing ? { ...line, quantity: line.quantity + incoming.quantity } : line);
}

export function updateLine(lines: ShopLine[], originalKey: string, incoming: ShopLine, maxQuantity: number): ShopLine[] {
  if (!Number.isInteger(incoming.quantity) || incoming.quantity < 1 || incoming.quantity > maxQuantity) throw new Error(`Choose between 1 and ${maxQuantity} of each item.`);
  if (!lines.some((line) => lineKey(line) === originalKey)) throw new Error("This item has changed in your saved order. Please review it again.");
  const collision = lines.some((line) => lineKey(line) !== originalKey && lineKey(line) === lineKey(incoming));
  if (collision) return addLine(lines.filter((line) => lineKey(line) !== originalKey), incoming, maxQuantity);
  return lines.map((line) => lineKey(line) === originalKey ? incoming : line);
}

export function subtractPurchasedLines(cart: ShopLine[], purchased: ShopLine[]): ShopLine[] {
  const quantities = new Map<string, number>();
  purchased.forEach((line) => quantities.set(lineKey(line), (quantities.get(lineKey(line)) ?? 0) + line.quantity));
  return cart.flatMap((line) => {
    const remaining = line.quantity - (quantities.get(lineKey(line)) ?? 0);
    return remaining > 0 ? [{ ...line, quantity: remaining }] : [];
  });
}

export function snapshotReduced(previous: ShopLine[], next: ShopLine[], snapshot: ShopLine[]): boolean {
  return snapshot.some((line) => {
    const before = previous.find((item) => lineKey(item) === lineKey(line))?.quantity ?? 0;
    const after = next.find((item) => lineKey(item) === lineKey(line))?.quantity ?? 0;
    return after < Math.min(before, line.quantity);
  });
}

export function reconcileOrderCart(cart: ShopLine[], saved: SavedMerchOrder, status: string, content: MerchStoreContent): ShopLine[] {
  return orderPhase(status) === "paid" && saved.ownsCart && !saved.reconciled ? subtractPurchasedLines(cart, normalizeStoredLines(saved.lines, content)) : cart;
}

export function readMerchQuote(value: unknown): MerchQuote | null {
  if (!value || typeof value !== "object") return null;
  const quote = value as MerchQuote;
  const fields = [quote.subtotal, quote.discount_amount, quote.discount_percent, quote.fee, quote.total];
  if (!fields.every((field) => typeof field === "string" && minorOf(field) !== null)) return null;
  const minor = (field: string) => minorOf(field)!;
  if (minor(quote.discount_amount) > minor(quote.subtotal) || minor(quote.discount_percent) > 10000 || minor(quote.subtotal) - minor(quote.discount_amount) + minor(quote.fee) !== minor(quote.total)) return null;
  return { subtotal: quote.subtotal, discount_amount: quote.discount_amount, discount_percent: quote.discount_percent, fee: quote.fee, total: quote.total };
}

// ── Describing lines (shelf, cart, review) ────────────────────────────────────

export type LineDescription = { title: string; details: string[]; label: string; image: string | null; images: string[] };

export function pieceColourway(content: MerchStoreContent, productId: ProductId, choice: PieceChoice | undefined): TeeColourway | undefined {
  return colourwayOf(findProduct(content, productId), choice?.colourwayId);
}

export function describeLine(line: ShopLine, content: MerchStoreContent): LineDescription {
  const product = findProduct(content, line.productId);
  if (!product) return { title: "Unavailable item", details: [], label: "Unavailable item", image: null, images: [] };
  if (product.kind === "bundle") {
    const parts = (product.pieces ?? []).map((piece) => {
      const choice = line.pieces?.[piece.slot];
      const cw = pieceColourway(content, piece.productId, choice);
      const colour = cw && findProduct(content, piece.productId)!.colourways.length > 1 ? `${cw.name}, ` : "";
      return { text: `${piece.label}: ${colour}size ${choice?.size ?? "?"}`, image: cw?.front ?? null };
    });
    return { title: product.name, details: parts.map(({ text }) => text), label: `${product.name} bundle`, image: parts[0]?.image ?? null, images: parts.flatMap(({ image }) => image ? [image] : []) };
  }
  const cw = colourwayOf(product, line.colourwayId);
  const details: string[] = [];
  if (product.colourways.length > 1 && cw) details.push(cw.name);
  if (product.kind === "tee") {
    details.push(`${content.backs.find(({ id }) => id === line.back)?.name ?? "Spec Sheet"} back`);
    if (line.fit && line.fit !== "regular") details.push(`${content.fits.find(({ id }) => id === line.fit)?.name ?? line.fit} fit`);
    if (line.backName) details.push(`Name: ${line.backName}`);
  }
  details.push(`Size ${line.size}`);
  return { title: product.name, details, label: [product.name, ...details].join(", "), image: cw?.front ?? null, images: cw ? [cw.front] : [] };
}

// ── Receipts ──────────────────────────────────────────────────────────────────

function apiColourway(content: MerchStoreContent, value: string | undefined) {
  return value ? content.products.flatMap((product) => product.colourways).find((cw) => cw.apiValue === value || cw.id === value) : undefined;
}

export function receiptOptions(item: ApiOrderItem, content: MerchStoreContent): string {
  if (item.pieces && item.pieces.length > 1) {
    return item.pieces.map((piece) => [piece.label, apiColourway(content, piece.colorway)?.name, piece.size && `size ${piece.size}`].filter(Boolean).join(" ")).join(" · ");
  }
  // Old receipts used note-based local IDs; new receipts have dedicated fields.
  const legacy = Object.fromEntries((item.note ?? "").split(";").filter((part) => part.includes("=")).map((part) => part.split("=")));
  const size = item.size || legacy.size;
  const value = item.colorway || legacy.colourway;
  const back = content.backs.find(({ id }) => id === item.back)?.name;
  const fit = item.fit && item.fit !== "regular" ? content.fits.find(({ id }) => id === item.fit)?.name ?? item.fit : null;
  return [apiColourway(content, value)?.name ?? value, back && `${back} back`, fit && `${fit} fit`, item.back_name && `Name: ${item.back_name}`, size ? `Size ${size}` : null].filter(Boolean).join(" · ") || item.note || "";
}

export function receiptProduct(item: ApiOrderItem, content: MerchStoreContent) {
  // Match on a real backend ID only: products without one (bundles, the Lacoste) must not match items without one.
  const product = content.products.find((product) => (product.apiId !== undefined && product.apiId === item.product) || product.apiNames.some((name) => name.toLowerCase() === item.product_name?.toLowerCase()));
  if (!product) return null;
  if (product.kind === "bundle") {
    const first = product.pieces?.[0];
    const piece = item.pieces?.find((entry) => entry.slot === first?.slot);
    const cw = first ? apiColourway(content, piece?.colorway) ?? colourwayOf(findProduct(content, first.productId), undefined) : undefined;
    return { product, colourway: cw ?? null };
  }
  const legacy = Object.fromEntries((item.note ?? "").split(";").filter((part) => part.includes("=")).map((part) => part.split("=")));
  const value = item.colorway || legacy.colourway;
  const colourway = product.colourways.find((cw) => cw.apiValue === value || cw.id === value) ?? (product.colourways.length === 1 ? product.colourways[0] : null);
  return { product, colourway };
}

// ── The backend order request ─────────────────────────────────────────────────

export function makeOrderRequest(buyer: Buyer, lines: ShopLine[], ids: Partial<Record<ProductId, number>>, content: MerchStoreContent, promoCode = "") {
  return {
    buyer_name: buyer.name.trim(), buyer_phone: buyer.phone.trim(), buyer_email: buyer.email.trim(),
    ...(promoCode.trim() ? { promo_code: promoCode.trim().toUpperCase() } : {}),
    items: lines.map((line) => {
      const product = findProduct(content, line.productId);
      const id = ids[line.productId];
      if (!product || !id || !Number.isInteger(id)) throw new Error("This item is not connected to the ordering service yet.");
      if (product.kind === "bundle") {
        const pieces: Record<string, { size: string; colorway?: string }> = {};
        for (const piece of product.pieces ?? []) {
          const choice = line.pieces?.[piece.slot];
          if (!choice?.size) throw new Error(`Choose a size for the ${piece.label}.`);
          const cw = pieceColourway(content, piece.productId, choice);
          pieces[piece.slot] = { size: choice.size, ...(cw?.apiValue ? { colorway: cw.apiValue } : {}) };
        }
        return { product: id, quantity: line.quantity, pieces };
      }
      const cw = colourwayOf(product, line.colourwayId);
      if (!cw) throw new Error("Choose a valid colourway.");
      return {
        product: id, quantity: line.quantity, size: line.size,
        ...(cw.apiValue ? { colorway: cw.apiValue } : {}),
        ...(product.kind === "tee" ? { back: line.back ?? "spec-sheet", fit: line.fit ?? "regular", ...(line.backName ? { back_name: line.backName } : {}) } : {}),
      };
    }),
  };
}
