"use client";

import { useEffect, useRef, useState } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import { CART_KEY, money, normalizeStoredLines, PENDING_ORDER_KEY, subtractPurchasedLines } from "@/lib/merch/order";
import type { ApiOrder, MerchStoreContent } from "@/types/merch-store";
import { saveStoredValue, storedValue, usePendingOrder } from "./use-merch-cart";

const pendingStatuses = ["PENDING", "PENDING_PAYMENT", "AWAITING_PAYMENT", "CREATED", "UNPAID"];
const paidStatuses = ["PAID", "COLLECTED"];
const terminalStatuses = ["FAILED", "EXPIRED", "CANCELLED", "CANCELED"];

function statusCopy(status: string): [string, string, string] {
  if (status === "PAID") return ["> build succeeded", "Paid. You’re in.", "Your payment is confirmed. Keep your order reference and pickup code handy."];
  if (status === "COLLECTED") return ["> deployed", "Collected.", "This order has been picked up. Enjoy the drip."];
  if (status === "EXPIRED") return ["> session expired", "Time to retry.", "The payment session has expired. Check your payment records before starting a new order."];
  if (status === "FAILED") return ["> build interrupted", "Payment unconfirmed.", "The ordering service reports a failed payment. If money was deducted, keep this reference and check with the payment provider before retrying."];
  if (status === "CANCELLED" || status === "CANCELED") return ["> cancelled", "Order cancelled.", "This order has been cancelled. Your saved tee choices remain available in the shop."];
  if (pendingStatuses.includes(status)) return ["> awaiting confirmation", "One more moment.", "Payment is not confirmed yet. Mobile Money confirmations can take a little time. Check again before starting another payment."];
  return ["> order received", "Your order.", "The ordering service has returned the status below. Payment is only confirmed when it reports Paid or Collected."];
}

function textField(item: unknown, name: string): string | null {
  if (!item || typeof item !== "object") return null;
  const value = (item as Record<string, unknown>)[name];
  return typeof value === "string" ? value : null;
}

function syncCompletedOrder(order: ApiOrder, content: MerchStoreContent) {
  try {
    const saved = JSON.parse(storedValue(PENDING_ORDER_KEY));
    if (saved.id !== order.id) return;
    const status = order.status.toUpperCase();
    if (paidStatuses.includes(status)) {
      const cart: unknown = JSON.parse(storedValue(CART_KEY) || "[]");
      const purchased: unknown = saved.lines;
      if (Array.isArray(cart) && Array.isArray(purchased)) {
        const validCart = normalizeStoredLines(cart, content);
        const validPurchased = normalizeStoredLines(purchased, content);
        saveStoredValue(CART_KEY, JSON.stringify(subtractPurchasedLines(validCart, validPurchased)));
      }
      saveStoredValue(PENDING_ORDER_KEY, "");
    } else if (terminalStatuses.includes(status)) saveStoredValue(PENDING_ORDER_KEY, "");
  } catch { /* Receipt remains readable without browser storage. */ }
}

export function MerchOrderStatus({ id, content }: { id: string; content: MerchStoreContent }) {
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [retry, setRetry] = useState(0);
  const { session: savedSession, resumeUrl: savedUrl } = usePendingOrder();
  const attempt = useRef(0);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    attempt.current = 0;
    async function check() {
      if (document.hidden) { timer = setTimeout(check, 3000); return; }
      try {
        const response = await fetch(`/api/merch/orders/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message ?? "This order could not be loaded.");
        if (cancelled) return;
        setOrder(data); setError(""); setChecking(false);
        syncCompletedOrder(data, content);
        if (pendingStatuses.includes(String(data.status).toUpperCase()) && ++attempt.current < 6) timer = setTimeout(check, 3000);
      } catch (failure) {
        if (!cancelled) { setError(failure instanceof Error ? failure.message : "The order could not be checked."); setChecking(false); }
      }
    }
    void check();
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [id, content, retry]);

  const status = order?.status.toUpperCase() ?? "";
  const resumeUrl = savedSession?.id === id && pendingStatuses.includes(status) ? savedUrl : null;
  const [kicker, title, copy] = order ? statusCopy(status) : ["> checking your order", "One sec.", "We’re checking the ordering service for your payment status."];
  const retryCheck = () => { setChecking(true); setRetry((value) => value + 1); };
  return <section className="merch-order" aria-labelledby="receipt-title" aria-busy={checking}>
    <p className="merch-label">{kicker}</p><h1 id="receipt-title">{error && !order ? "Let’s check that." : title}</h1>
    <p className="merch-order__copy" role="status">{copy}</p>
    {order && <>
      <p className="merch-order__status">{order.status.replaceAll("_", " ")}</p>
      {paidStatuses.includes(status) && order.pickup_code && <div className="merch-order__pickup"><p className="merch-label">Your pickup code</p><strong>{order.pickup_code}</strong><p className="merch-secure-note">Keep this code available when collecting your tees.</p></div>}
      {order.items && order.items.length > 0 && <div className="merch-order__items" aria-label="Order items">{order.items.map((item, index) => {
        const name = textField(item, "product_name") ?? textField(item, "name");
        const note = textField(item, "note");
        const selections = note ? Object.fromEntries(note.split(";").map((part) => part.split("="))) : {};
        const colourway = content.products.flatMap((product) => product.colourways).find((cw) => cw.id === selections.colourway);
        const options = colourway && content.sizes.some(({ id }) => id === selections.size)
          ? `${colourway.name} · Size ${selections.size}` : note;
        const quantity = item && typeof item === "object" ? (item as Record<string, unknown>).quantity : undefined;
        return <div className="merch-order__item" key={index}><div>{name ?? `Item ${index + 1}`}{options && <small>{options}</small>}</div>{typeof quantity === "number" && <span>× {quantity}</span>}</div>;
      })}</div>}
      <dl className="merch-totals"><div><dt>Merchandise subtotal</dt><dd>{money(Math.round(Number(order.subtotal) * 100))}</dd></div>{order.discount && Number(order.discount) > 0 && <div className="merch-totals__discount"><dt>Merchandise discount</dt><dd>−{money(Math.round(Number(order.discount) * 100))}</dd></div>}<div><dt>Payment fee</dt><dd>{money(Math.round(Number(order.fee) * 100))}</dd></div><div className="merch-totals__total"><dt>Total</dt><dd>{money(Math.round(Number(order.total) * 100))}</dd></div></dl>
      {pendingStatuses.includes(status) && order.expires_at && <p className="merch-secure-note">Stock hold ends: {new Date(order.expires_at).toLocaleString("en-GB", { timeZone: "Africa/Accra" })} (Ghana time).</p>}
    </>}
    <p className="merch-order__reference">Order reference: {id}</p>
    {error && <p className="merch-form-error" role="alert">{error}</p>}
    <div className="merch-order__actions">{resumeUrl && <a href={resumeUrl} className="merch-button">Resume payment ↗</a>}{(!order || !paidStatuses.includes(status) || error) && <button type="button" className="merch-button" disabled={checking} onClick={retryCheck}>{checking ? "Checking…" : "Check again ↻"}</button>}<TransitionLink href="/merch/shop" transitionLabel="SHOP" className="merch-button merch-button--secondary">Back to shop</TransitionLink><TransitionLink href="/merch" transitionLabel="MERCH" className="merch-text-button">Back to merch ↗</TransitionLink></div>
    <noscript><p className="merch-notice">Enable JavaScript to check live payment status. Your order reference is shown above.</p></noscript>
  </section>;
}
