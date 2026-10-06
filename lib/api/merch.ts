import type { ApiMerchandise, ApiOrder, CheckoutCatalog, TeeId } from "@/types/merch-store";

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
    if (!response.ok) throw new MerchApiError(data?.error?.message ?? "The ordering service couldn’t complete this request.", response.status);
    return data;
  } catch (error) {
    if (error instanceof MerchApiError) throw error;
    throw new MerchApiError("The ordering service is taking a little longer. Please try again.", 503);
  }
}

function isMerchandise(value: unknown): value is ApiMerchandise {
  if (!value || typeof value !== "object") return false;
  const item = value as ApiMerchandise;
  return Number.isInteger(item.id) && typeof item.name === "string" && typeof item.in_stock === "boolean" &&
    (item.price === null || typeof item.price === "string") && (item.stock_quantity === null || Number.isInteger(item.stock_quantity));
}

export async function getCheckoutCatalog(): Promise<CheckoutCatalog> {
  const records: ApiMerchandise[] = [];
  // Follow pages on our configured origin only; never use arbitrary response URLs.
  for (let page = 1; page <= 20; page++) {
    const data = await merchApi(`merchandise/?page=${page}&page_size=100`) as { results?: unknown[]; next?: string | null };
    if (!Array.isArray(data.results)) throw new MerchApiError("The merchandise catalog could not be read.");
    records.push(...data.results.filter(isMerchandise));
    if (!data.next) break;
  }
  const mapping: [TeeId, string | undefined, string][] = [
    ["css-tee", process.env.CSS_MERCH_TEE_ID, "CSS Tee"],
    ["pink-october", process.env.CSS_MERCH_PINK_ID, "Pink October Tee"],
  ];
  const products: CheckoutCatalog["products"] = {};
  for (const [id, configured, name] of mapping) {
    const matches = records.filter((item) => configured ? item.id === Number(configured) : item.name.trim().toLowerCase() === name.toLowerCase());
    if (matches.length === 1) products[id] = matches[0];
  }
  return { products, pricingReady: process.env.CSS_MERCH_PRICING_READY === "true" };
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
  amountMinor(order.subtotal); amountMinor(order.fee); amountMinor(order.total);
  if (order.discount !== undefined) amountMinor(order.discount);
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
