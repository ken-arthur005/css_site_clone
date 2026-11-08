import { getMerchStore } from "@/lib/content/merch-store";
import { MAGAZINE_EDITIONS, type MagazineEdition } from "@/lib/merch/magazine";
import type { ApiComponent, ApiMerchandise, ApiMerchOption, ApiOrder, ApiOrderItem, ApiOrderPiece, ApiPricedOption, ChargeResult, ChargeStatus, CheckoutCatalog, MerchStoreContent, OrderStage, ProductKind, PromoCheck } from "@/types/merch-store";

export class MerchApiError extends Error {
  status: number;
  constructor(message: string, status = 502) { super(message); this.status = status; }
}

export function apiBase(): string {
  return (process.env.CSS_API_BASE_URL ?? "https://css-knust-api.onrender.com/api/v1/").replace(/\/?$/, "/");
}

export async function merchApi(path: string, init: RequestInit = {}): Promise<unknown> {
  try {
    const response = await fetch(new URL(path, apiBase()), {
      ...init, cache: "no-store", headers: { "Accept": "application/json", ...init.headers }, signal: AbortSignal.timeout(20000),
    });
    const data = await response.json();
    if (!response.ok) {
      const envelope = data?.error;
      // The backend's envelope puts validation details beside `error` (not inside it).
      const details = data?.details ?? envelope?.details;
      const detail = Array.isArray(details?.non_field_errors) ? details.non_field_errors[0] : null;
      const message = typeof detail === "string" ? detail : typeof envelope?.message === "string" ? envelope.message : "The ordering service couldn’t complete this request.";
      throw new MerchApiError(message, response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof MerchApiError) throw error;
    throw new MerchApiError("We couldn’t connect to checkout. Your order is saved — please try again.", 503);
  }
}

export function amountMinor(value: unknown): number {
  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value)) throw new MerchApiError("The ordering service returned an invalid price.");
  const [whole, fraction = ""] = value.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor)) throw new MerchApiError("The ordering service returned an invalid price.");
  return minor;
}

// ── Catalogue ─────────────────────────────────────────────────────────────────

function isOption(value: unknown): value is ApiMerchOption {
  if (!value || typeof value !== "object") return false;
  const option = value as ApiMerchOption;
  return typeof option.value === "string" && typeof option.label === "string" && typeof option.available === "boolean";
}

function pricedOptions(value: unknown, field: "price" | "extra"): ApiPricedOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!isOption(raw)) return [];
    try { return [{ value: raw.value, label: raw.label, available: raw.available, priceMinor: amountMinor((raw as unknown as Record<string, unknown>)[field]) }]; }
    catch { return []; }
  });
}

function components(value: unknown): ApiComponent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const c = raw as Record<string, unknown>;
    if (typeof c.slot !== "string" || typeof c.label !== "string" || !Number.isSafeInteger(c.product)) return [];
    const back = c.back_design && typeof c.back_design === "object" && typeof (c.back_design as Record<string, unknown>).value === "string" ? { value: String((c.back_design as Record<string, unknown>).value), label: String((c.back_design as Record<string, unknown>).label ?? "") } : null;
    return [{ slot: c.slot, label: c.label, product: Number(c.product), requires_size: c.requires_size === true, requires_colorway: c.requires_colorway === true, back_design: back }];
  });
}

/**
 * A validated product record. Fields an older backend doesn't send yet get safe
 * defaults (no backs, no pieces, simple kind), so deploy order doesn't matter.
 */
function parseMerchandise(value: unknown): ApiMerchandise | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  try { if (item.price !== null) amountMinor(item.price); } catch { return null; }
  const valid = Number.isSafeInteger(item.id) && Number(item.id) > 0 && typeof item.name === "string" && typeof item.in_stock === "boolean" &&
    (item.stock_quantity === null || (Number.isSafeInteger(item.stock_quantity) && Number(item.stock_quantity) >= 0)) &&
    Array.isArray(item.sizes) && item.sizes.every(isOption) && Array.isArray(item.colorways) && item.colorways.every(isOption) &&
    Array.isArray(item.unavailable_combinations) && item.unavailable_combinations.every((option) => option && typeof option.size === "string" && typeof option.colorway === "string");
  if (!valid) return null;
  const kind: ProductKind = item.kind === "tee" || item.kind === "bundle" ? item.kind : "simple";
  let backNamePrice: string | null = null;
  try { if (typeof item.back_name_price === "string") { amountMinor(item.back_name_price); backNamePrice = item.back_name_price; } } catch { backNamePrice = null; }
  return {
    id: Number(item.id), slug: typeof item.slug === "string" && item.slug ? item.slug : null, kind, name: String(item.name),
    price: item.price as string | null, in_stock: item.in_stock as boolean, stock_quantity: item.stock_quantity as number | null,
    availability: typeof item.availability === "string" ? item.availability : item.in_stock ? "available" : "unavailable",
    available_until: typeof item.available_until === "string" ? item.available_until : null,
    sizes: item.sizes as ApiMerchOption[], colorways: item.colorways as ApiMerchOption[],
    unavailable_combinations: item.unavailable_combinations as ApiMerchandise["unavailable_combinations"],
    backs: pricedOptions(item.backs, "price"), fits: pricedOptions(item.fits, "extra"), back_name_price: backNamePrice, components: components(item.components),
  };
}

async function getMerchandiseRecords(): Promise<ApiMerchandise[]> {
  const records: ApiMerchandise[] = [];
  // Follow pages on our configured origin only; never use arbitrary response URLs.
  for (let page = 1; page <= 20; page++) {
    const data = await merchApi(`merchandise/?page=${page}&page_size=50`) as { results?: unknown[]; next?: string | null } | null;
    if (!data || !Array.isArray(data.results)) throw new MerchApiError("The merchandise catalogue could not be read.");
    records.push(...data.results.map(parseMerchandise).filter((record): record is ApiMerchandise => record !== null));
    if (!data.next) return records;
  }
  throw new MerchApiError("The merchandise catalogue has too many pages to load.");
}

const legacyEnvIds: Record<string, string | undefined> = { "css-tee": process.env.CSS_MERCH_TEE_ID, "pink-october": process.env.CSS_MERCH_PINK_ID };

/** Live records by local product ID: matched by slug, else by the legacy numeric ID. */
export async function getCheckoutCatalog(content?: MerchStoreContent): Promise<CheckoutCatalog> {
  const store = content ?? await getMerchStore();
  const records = (await getMerchandiseRecords()).filter((item) => !/^test\b/i.test(item.name.trim()));
  const products: CheckoutCatalog["products"] = {};
  for (const product of store.products) {
    const bySlug = records.filter((item) => item.slug === product.id);
    if (bySlug.length === 1) { products[product.id] = bySlug[0]; continue; }
    const configured = legacyEnvIds[product.id] ? Number(legacyEnvIds[product.id]) : product.apiId;
    if (configured === undefined) continue;
    if (!Number.isSafeInteger(configured) || configured < 1) throw new MerchApiError(`${product.name} has an invalid backend product mapping.`);
    const byId = records.filter((item) => item.id === configured && item.slug === null);
    if (byId.length === 1) products[product.id] = byId[0];
  }
  return { products };
}

/** The fundraiser magazines' live records, by edition (missing until the catalogue is set up). */
export async function getMagazineProducts(): Promise<Partial<Record<MagazineEdition, ApiMerchandise>>> {
  const records = await getMerchandiseRecords();
  const found: Partial<Record<MagazineEdition, ApiMerchandise>> = {};
  for (const edition of MAGAZINE_EDITIONS) {
    const record = records.find((item) => item.slug === edition.slug);
    if (record) found[edition.id] = record;
  }
  return found;
}

export function parsePromo(value: unknown, catalog: CheckoutCatalog): PromoCheck {
  if (!value || typeof value !== "object") throw new MerchApiError("That code couldn’t be checked.");
  const raw = value as Record<string, unknown>;
  if (typeof raw.code !== "string") throw new MerchApiError("That code couldn’t be checked.");
  if (raw.kind === "percent") {
    const percent = Number(raw.percent);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) throw new MerchApiError("That code couldn’t be checked.");
    return { code: raw.code, kind: "percent", percent };
  }
  if (raw.kind !== "bundle" || !Array.isArray(raw.bundle_prices)) throw new MerchApiError("That code couldn’t be checked.");
  const bundlePricesMinor: PromoCheck["bundlePricesMinor"] = {};
  for (const entry of raw.bundle_prices as Record<string, unknown>[]) {
    const local = Object.entries(catalog.products).find(([, record]) => record?.id === entry?.product)?.[0];
    if (!local) continue;
    try { bundlePricesMinor[local] = amountMinor(entry.promo_price); } catch { /* skip malformed entries */ }
  }
  return { code: raw.code, kind: "bundle", bundlePricesMinor };
}

// ── Orders ────────────────────────────────────────────────────────────────────

const STAGES: OrderStage[] = ["placed", "paid", "printing", "ready", "collected", "cancelled"];
const optionalDate = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
const text = (value: unknown, max = 255) => typeof value === "string" ? value.slice(0, max) : undefined;

export function safeAccessCode(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(value) ? value : undefined;
}

export function parseOrder(value: unknown): ApiOrder {
  if (!value || typeof value !== "object") throw new MerchApiError("The order response could not be read.");
  const order = value as ApiOrder & Record<string, unknown>;
  if (typeof order.id !== "string" || !isOrderId(order.id) || typeof order.status !== "string") throw new MerchApiError("The order response could not be read.");
  const subtotal = amountMinor(order.subtotal), discount = amountMinor(order.discount_amount), fee = amountMinor(order.fee), total = amountMinor(order.total);
  if (discount > subtotal || subtotal - discount + fee !== total || amountMinor(order.discount_percent) > 10000) throw new MerchApiError("The service returned an inconsistent order total.");
  if (order.expires_at !== null && (typeof order.expires_at !== "string" || !Number.isFinite(Date.parse(order.expires_at)))) throw new MerchApiError("The service returned an invalid payment expiry.");
  const accessCode = safeAccessCode(order.access_code);
  // Explicit public fields only: buyer contact details and future private fields
  // are never forwarded, including fields nested within receipt items.
  return {
    id: order.id, status: order.status,
    ...(typeof order.payment === "string" ? { payment: order.payment } : {}),
    subtotal: order.subtotal, discount_amount: order.discount_amount, discount_percent: order.discount_percent,
    fee: order.fee, total: order.total, expires_at: order.expires_at,
    ...(typeof order.authorization_url === "string" ? { authorization_url: order.authorization_url } : {}),
    ...(accessCode ? { access_code: accessCode } : {}),
    pickup_code: ["PAID", "COLLECTED"].includes(order.status.toUpperCase()) && typeof order.pickup_code === "string" ? order.pickup_code : null,
    ...(Array.isArray(order.items) ? { items: order.items.map(publicOrderItem).filter((item): item is ApiOrderItem => item !== null) } : {}),
    ...(typeof order.created_at === "string" && Number.isFinite(Date.parse(order.created_at)) ? { created_at: order.created_at } : {}),
    ...(STAGES.includes(order.stage as OrderStage) ? { stage: order.stage as OrderStage } : {}),
    paid_at: optionalDate(order.paid_at), printing_at: optionalDate(order.printing_at), ready_at: optionalDate(order.ready_at),
    checked_in_at: optionalDate(order.checked_in_at), collected_at: optionalDate(order.collected_at),
  };
}

function publicPiece(value: unknown): ApiOrderPiece | null {
  if (!value || typeof value !== "object") return null;
  const piece = value as Record<string, unknown>;
  if (typeof piece.slot !== "string" || typeof piece.label !== "string") return null;
  return {
    slot: piece.slot.slice(0, 20), label: piece.label.slice(0, 255),
    ...(text(piece.size, 30) ? { size: text(piece.size, 30) } : {}),
    ...(text(piece.colorway, 30) ? { colorway: text(piece.colorway, 30) } : {}),
    ...(text(piece.back, 30) ? { back: text(piece.back, 30) } : {}),
    ...(text(piece.fit, 30) ? { fit: text(piece.fit, 30) } : {}),
    ...(text(piece.back_name, 12) ? { back_name: text(piece.back_name, 12) } : {}),
    ...(typeof piece.handed === "boolean" ? { handed: piece.handed } : {}),
  };
}

function publicOrderItem(value: unknown): ApiOrderItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (!Number.isSafeInteger(item.quantity) || Number(item.quantity) < 1) return null;
  const name = typeof item.product_name === "string" ? item.product_name : typeof item.name === "string" ? item.name : undefined;
  if (item.unit_price !== undefined) amountMinor(item.unit_price);
  if (item.line_total !== undefined) amountMinor(item.line_total);
  return {
    quantity: Number(item.quantity), ...(Number.isSafeInteger(item.product) ? { product: Number(item.product) } : {}),
    ...(name ? { product_name: name } : {}),
    ...(typeof item.size === "string" ? { size: item.size } : {}),
    ...(typeof item.colorway === "string" ? { colorway: item.colorway } : {}),
    ...(typeof item.back === "string" && item.back ? { back: item.back } : {}),
    ...(typeof item.fit === "string" && item.fit ? { fit: item.fit } : {}),
    ...(typeof item.back_name === "string" && item.back_name ? { back_name: item.back_name.slice(0, 12) } : {}),
    ...(typeof item.note === "string" ? { note: item.note } : {}),
    ...(typeof item.unit_price === "string" ? { unit_price: item.unit_price } : {}),
    ...(typeof item.line_total === "string" ? { line_total: item.line_total } : {}),
    ...(Array.isArray(item.pieces) ? { pieces: item.pieces.map(publicPiece).filter((piece): piece is ApiOrderPiece => piece !== null) } : {}),
    ...(typeof item.magazine_edition === "string" && /^[a-z0-9-]{1,20}$/.test(item.magazine_edition) ? { magazine_edition: item.magazine_edition } : {}),
  };
}

export async function getOrderStatus(id: string): Promise<ApiOrder> {
  if (!isOrderId(id)) throw new MerchApiError("This order link is not valid.", 400);
  const order = parseOrder(await merchApi(`orders/${id}/`));
  if (order.id.toLowerCase() !== id.toLowerCase()) throw new MerchApiError("We couldn’t match this receipt to your order.");
  order.authorization_url = undefined;
  order.access_code = undefined;
  return order;
}

const CHARGE_STATUSES: ChargeStatus[] = ["pay_offline", "send_otp", "success", "failed", "pending"];

export function parseCharge(value: unknown): ChargeResult {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const status = CHARGE_STATUSES.includes(raw.status as ChargeStatus) ? raw.status as ChargeStatus : "pending";
  return { status, message: typeof raw.message === "string" ? raw.message.slice(0, 200) : "" };
}

export function isOrderId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function isLegacyRef(ref: string): boolean {
  return /^CSS-[A-Z0-9]{8}$/i.test(ref);
}

export function safePaymentUrl(value: unknown): string {
  if (typeof value !== "string") throw new MerchApiError("The payment link is missing.");
  let url: URL;
  try { url = new URL(value); } catch { throw new MerchApiError("The payment link could not be read."); }
  if (url.protocol !== "https:" || !(url.hostname === "paystack.com" || url.hostname.endsWith(".paystack.com")) || url.username || url.password) throw new MerchApiError("The ordering service returned an unexpected payment link.");
  return url.href;
}
