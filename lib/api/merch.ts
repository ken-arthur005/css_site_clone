import { getMerchStore } from "@/lib/content/merch-store";
import type { ApiMerchandise, ApiMerchOption, ApiOrder, ApiOrderItem, CheckoutCatalog, MerchStoreContent, TeeId } from "@/types/merch-store";

export class MerchApiError extends Error {
  status: number;
  constructor(message: string, status = 502) { super(message); this.status = status; }
}

function apiBase(): string {
  return (process.env.CSS_API_BASE_URL ?? "https://css-knust-api.onrender.com/api/v1/").replace(/\/?$/, "/");
}

export async function merchApi(path: string, init: RequestInit = {}): Promise<unknown> {
  try {
    const response = await fetch(new URL(path, apiBase()), {
      ...init, cache: "no-store", headers: { "Accept": "application/json", ...init.headers }, signal: AbortSignal.timeout(20000),
    });
    const data = await response.json();
    if (!response.ok) throw new MerchApiError(typeof data?.error?.message === "string" ? data.error.message : "The ordering service couldn’t complete this request.", response.status);
    return data;
  } catch (error) {
    if (error instanceof MerchApiError) throw error;
    throw new MerchApiError("We couldn’t connect to checkout. Your tees are saved — please try again.", 503);
  }
}

function isOption(value: unknown): value is ApiMerchOption {
  if (!value || typeof value !== "object") return false;
  const option = value as ApiMerchOption;
  return typeof option.value === "string" && typeof option.label === "string" && typeof option.available === "boolean";
}

function isMerchandise(value: unknown): value is ApiMerchandise {
  if (!value || typeof value !== "object") return false;
  const item = value as ApiMerchandise;
  try { if (item.price !== null) amountMinor(item.price); } catch { return false; }
  return Number.isSafeInteger(item.id) && item.id > 0 && typeof item.name === "string" && typeof item.in_stock === "boolean" &&
    (item.stock_quantity === null || (Number.isSafeInteger(item.stock_quantity) && item.stock_quantity >= 0)) &&
    Array.isArray(item.sizes) && item.sizes.every(isOption) && Array.isArray(item.colorways) && item.colorways.every(isOption) &&
    Array.isArray(item.unavailable_combinations) && item.unavailable_combinations.every((option) => option && typeof option.size === "string" && typeof option.colorway === "string");
}

async function getMerchandiseRecords(): Promise<ApiMerchandise[]> {
  const records: ApiMerchandise[] = [];
  // Follow pages on our configured origin only; never use arbitrary response URLs.
  for (let page = 1; page <= 20; page++) {
    const data = await merchApi(`merchandise/?page=${page}&page_size=100`) as { results?: unknown[]; next?: string | null } | null;
    if (!data || !Array.isArray(data.results)) throw new MerchApiError("The merchandise catalog could not be read.");
    records.push(...data.results.filter(isMerchandise));
    if (!data.next) return records;
  }
  throw new MerchApiError("The merchandise catalog has too many pages to load.");
}

export async function getCheckoutCatalog(content?: MerchStoreContent): Promise<CheckoutCatalog> {
  const store = content ?? await getMerchStore();
  const [records, rawDiscount] = await Promise.all([getMerchandiseRecords(), merchApi("merchandise/discount/")]);
  const discount = rawDiscount as { enabled?: unknown; percent?: unknown; min_units?: unknown } | null;
  if (!discount || typeof discount.enabled !== "boolean" || !Number.isSafeInteger(discount.min_units) || Number(discount.min_units) < 1 || amountMinor(discount.percent) > 10000) throw new MerchApiError("The current merchandise offer could not be read.");
  const configuredIds: Partial<Record<TeeId, string>> = { "css-tee": process.env.CSS_MERCH_TEE_ID, "pink-october": process.env.CSS_MERCH_PINK_ID };
  const products: CheckoutCatalog["products"] = {};
  for (const product of store.products) {
    const configured = configuredIds[product.id];
    const id = configured ? Number(configured) : product.apiId;
    if (!Number.isSafeInteger(id) || id < 1) throw new MerchApiError(`${product.name} has an invalid backend product mapping.`);
    const matches = records.filter((item) => item.id === id && !/^test\b/i.test(item.name.trim()));
    if (matches.length === 1) products[product.id] = matches[0];
  }
  return { products, discount: { enabled: discount.enabled, percent: amountMinor(discount.percent) / 100, minimumQuantity: Number(discount.min_units) } };
}

export function amountMinor(value: unknown): number {
  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value)) throw new MerchApiError("The ordering service returned an invalid price.");
  const [whole, fraction = ""] = value.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor)) throw new MerchApiError("The ordering service returned an invalid price.");
  return minor;
}

export function parseOrder(value: unknown): ApiOrder {
  if (!value || typeof value !== "object") throw new MerchApiError("The order response could not be read.");
  const order = value as ApiOrder;
  if (typeof order.id !== "string" || !isOrderId(order.id) || typeof order.status !== "string") throw new MerchApiError("The order response could not be read.");
  const subtotal = amountMinor(order.subtotal), discount = amountMinor(order.discount_amount), fee = amountMinor(order.fee), total = amountMinor(order.total);
  if (discount > subtotal || subtotal - discount + fee !== total || amountMinor(order.discount_percent) > 10000) throw new MerchApiError("The service returned an inconsistent order total.");
  if (order.expires_at !== null && (typeof order.expires_at !== "string" || !Number.isFinite(Date.parse(order.expires_at)))) throw new MerchApiError("The service returned an invalid payment expiry.");
  // Explicit public fields only: buyer contact details and future private fields
  // are never forwarded, including fields nested within receipt items.
  return {
    id: order.id, status: order.status,
    ...(typeof order.payment === "string" ? { payment: order.payment } : {}),
    subtotal: order.subtotal, discount_amount: order.discount_amount, discount_percent: order.discount_percent,
    fee: order.fee, total: order.total, expires_at: order.expires_at,
    ...(typeof order.authorization_url === "string" ? { authorization_url: order.authorization_url } : {}),
    pickup_code: ["PAID", "COLLECTED"].includes(order.status.toUpperCase()) && typeof order.pickup_code === "string" ? order.pickup_code : null,
    ...(Array.isArray(order.items) ? { items: order.items.map(publicOrderItem).filter((item): item is ApiOrderItem => item !== null) } : {}),
    ...(typeof order.created_at === "string" && Number.isFinite(Date.parse(order.created_at)) ? { created_at: order.created_at } : {}),
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
    ...(typeof item.note === "string" ? { note: item.note } : {}),
    ...(typeof item.unit_price === "string" ? { unit_price: item.unit_price } : {}),
    ...(typeof item.line_total === "string" ? { line_total: item.line_total } : {}),
  };
}

export async function getOrderStatus(id: string): Promise<ApiOrder> {
  if (!isOrderId(id)) throw new MerchApiError("This order link is not valid.", 400);
  const order = parseOrder(await merchApi(`orders/${id}/`));
  if (order.id.toLowerCase() !== id.toLowerCase()) throw new MerchApiError("We couldn’t match this receipt to your order.");
  order.authorization_url = undefined;
  return order;
}

export function isOrderId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function safePaymentUrl(value: unknown): string {
  if (typeof value !== "string") throw new MerchApiError("The payment link is missing.");
  let url: URL;
  try { url = new URL(value); } catch { throw new MerchApiError("The payment link could not be read."); }
  if (url.protocol !== "https:" || !(url.hostname === "paystack.com" || url.hostname.endsWith(".paystack.com")) || url.username || url.password) throw new MerchApiError("The ordering service returned an unexpected payment link.");
  return url.href;
}
