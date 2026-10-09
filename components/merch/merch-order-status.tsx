"use client";

import { useEffect, useRef, useState } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import { money, orderPhase, receiptOptions, receiptProduct } from "@/lib/merch/order";
import type { ApiOrder, MerchStoreContent } from "@/types/merch-store";
import { reconcileStoredOrder, usePendingOrder } from "./use-merch-cart";
import { MerchImage } from "./merch-image";

function statusCopy(status: string): [string, string, string] {
  if (status === "PAID") return ["> build successful. drip secured.", "Payment confirmed.", "Your tees are paid for. Save your pickup code and show it when collecting your order."];
  if (status === "COLLECTED") return ["> deployed", "Order collected.", "Your tees have been picked up. Enjoy the drip."];
  if (status === "EXPIRED") return ["> checkout expired", "Checkout expired.", "This payment link has expired. If money left your account, check this order again before paying for a new one."];
  if (status === "FAILED") return ["> payment not completed", "Payment not completed.", "Your payment hasn’t been confirmed. If money left your account, check this order again before trying another payment."];
  if (status === "CANCELLED" || status === "CANCELED") return ["> checkout cancelled", "Order cancelled.", "This checkout was cancelled. Your unpaid tee selections are still available in the shop."];
  if (orderPhase(status) === "pending") return ["> awaiting confirmation", "One more moment.", "We’re waiting for your Mobile Money confirmation. Your receipt and pickup code will appear here once payment is confirmed."];
  return ["> checking payment", "Checking your payment.", "We don’t have a confirmed payment yet. You can check again below."];
}

export function MerchOrderStatus({ id, content, initialOrder = null, initialError = "" }: {
  id: string; content: MerchStoreContent; initialOrder?: ApiOrder | null; initialError?: string;
}) {
  const [order, setOrder] = useState<ApiOrder | null>(initialOrder);
  const [error, setError] = useState(initialError);
  const [checking, setChecking] = useState(!initialOrder && !initialError);
  const [retry, setRetry] = useState(0);
  const { session: savedSession, resumeUrl: savedUrl } = usePendingOrder();
  const code = useRef<HTMLElement>(null);
  const [copyMessage, setCopyMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    let attempts = 0;
    let inFlight = false;
    if (initialOrder) reconcileStoredOrder(initialOrder, content);
    if (!retry && initialOrder && orderPhase(initialOrder.status) === "paid" && initialOrder.pickup_code) return () => controller.abort();
    async function check() {
      if (document.hidden || inFlight || cancelled) return;
      inFlight = true;
      try {
        const response = await fetch(`/api/merch/orders/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok || String(data.id).toLowerCase() !== id.toLowerCase()) throw new Error("We couldn’t refresh your receipt. Please try checking again.");
        if (cancelled) return;
        setOrder(data); setError(""); setChecking(false);
        reconcileStoredOrder(data, content);
        if ((orderPhase(data.status) === "pending" || (orderPhase(data.status) === "paid" && !data.pickup_code)) && ++attempts < 24) timer = setTimeout(check, 5000);
      } catch (failure) {
        if (!cancelled) { setError(failure instanceof Error ? failure.message : "We couldn’t refresh your receipt. Please try again."); setChecking(false); }
      } finally { inFlight = false; }
    }
    void check();
    const onVisible = () => { if (!document.hidden) { clearTimeout(timer); void check(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [id, content, initialOrder, retry]);

  const status = order?.status.toUpperCase() ?? "";
  const phase = orderPhase(status);
  const paid = phase === "paid";
  const resumeUrl = savedSession?.id === id && phase === "pending" ? savedUrl : null;
  const [kicker, title, copy] = order ? statusCopy(status) : ["> finding your receipt", "Finding your receipt.", "We’re checking your payment. Your receipt and pickup code will appear here once it’s confirmed."];
  const retryCheck = () => { setChecking(true); setRetry((value) => value + 1); };
  async function copyCode() {
    if (!order?.pickup_code) return;
    try { await navigator.clipboard.writeText(order.pickup_code); setCopyMessage("Pickup code copied."); }
    catch {
      if (code.current) { const range = document.createRange(); range.selectNodeContents(code.current); const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range); }
      setCopyMessage("Code selected. Copy it or save a screenshot of this receipt.");
    }
  }
  const amount = (value: string) => money(Math.round(Number(value) * 100));
  const quantity = order?.items?.reduce((total, item) => total + item.quantity, 0) ?? 0;
  return <section className="merch-order" data-paid={paid || undefined} aria-labelledby="receipt-title" aria-busy={checking}>
    <div className="merch-order__hero">
      <div><p className="merch-label">CSS Merch / {paid ? "Your receipt" : "Your order"}</p><h1 id="receipt-title">{error && !order ? "Let’s find your receipt." : title}</h1><p className="merch-order__copy" role="status">{copy}</p><p className="merch-order__kicker">{kicker}</p></div>
      {paid && <div className="merch-order__stamp" aria-label={status === "COLLECTED" ? "Order collected" : "Payment received"}><svg viewBox="0 0 72 72" fill="none" aria-hidden="true"><path d="M10 10h42l10 10v42H20L10 52Z" stroke="currentColor" strokeWidth="1.5" /><path d="m23 36 9 9 18-20" stroke="currentColor" strokeWidth="3" /></svg><span>{status === "COLLECTED" ? "Collected" : "Paid"}</span></div>}
    </div>
    {order && <>
      {!paid && <p className="merch-order__status">{order.status.replaceAll("_", " ")}</p>}
      {paid && <div className="merch-order__pickup">
        <div><p className="merch-label">Your pickup code</p><strong ref={code}>{order.pickup_code || "On its way"}</strong><p>Show this code when collecting your tees.</p></div>
        <div className="merch-order__copy-control">{order.pickup_code ? <button type="button" className="merch-button merch-button--secondary" onClick={() => void copyCode()}>Copy code <span aria-hidden="true">↗</span></button> : <p>Your payment is confirmed. Check again shortly for your pickup code.</p>}<p role="status">{copyMessage}</p></div>
      </div>}
      <div className="merch-order__body">
        <section className="merch-order__selection" aria-labelledby="receipt-items-title"><div className="merch-order__section-heading"><h2 id="receipt-items-title">Your order</h2>{quantity > 0 && <span>{quantity} tee{quantity === 1 ? "" : "s"}</span>}</div>
          {order.items && order.items.length > 0 ? <div className="merch-order__items">{order.items.map((item, index) => {
            const match = receiptProduct(item, content);
            const name = match?.product.name ?? item.product_name ?? `Item ${index + 1}`;
            const options = receiptOptions(item, content);
            const lineTotal = item.line_total ?? (item.unit_price ? (Number(item.unit_price) * item.quantity).toFixed(2) : null);
            return <article className="merch-order__item" key={index}><div className="merch-order__item-image">{match?.colourway ? <MerchImage src={match.colourway.front} alt={`${name}, ${options}`} sizes="96px" /> : <span aria-hidden="true">CSS</span>}</div><div><h3>{name}</h3>{options && <p>{options}</p>}<small>Qty {item.quantity}{item.unit_price && <> · {amount(item.unit_price)} each</>}</small></div>{lineTotal && <strong>{amount(lineTotal)}</strong>}</article>;
          })}</div> : <p className="merch-secure-note">The item details aren’t available yet. Your order reference is below.</p>}
        </section>
        <section className="merch-order__summary" aria-labelledby="receipt-payment-title"><h2 id="receipt-payment-title">Payment summary</h2><dl className="merch-totals"><div><dt>Your tees</dt><dd>{amount(order.subtotal)}</dd></div>{Number(order.discount_amount) > 0 && <div className="merch-totals__discount"><dt>Discount ({Number(order.discount_percent)}%)</dt><dd>−{amount(order.discount_amount)}</dd></div>}<div><dt>Payment fee</dt><dd>{amount(order.fee)}</dd></div><div className="merch-totals__total"><dt>{paid ? "Amount paid" : "Order total"}</dt><dd>{amount(order.total)}</dd></div></dl>{order.created_at && <p className="merch-secure-note">Order placed {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" })}.</p>}</section>
      </div>
      {phase === "pending" && order.expires_at && <p className="merch-secure-note">This payment link expires {new Date(order.expires_at).toLocaleString("en-GB", { timeZone: "Africa/Accra" })} (Ghana time).</p>}
    </>}
    <p className="merch-order__reference">Order reference: {id}</p>
    {error && <p className="merch-form-error" role="alert">{error}</p>}
    <div className="merch-order__actions">{resumeUrl && <a href={resumeUrl} className="merch-button">Finish payment ↗</a>}{(!order || !paid || !order.pickup_code || error) && <button type="button" className="merch-button merch-button--secondary" disabled={checking} onClick={retryCheck}>{checking ? "Checking payment…" : "Check payment ↻"}</button>}<TransitionLink href="/merch/shop" transitionLabel="SHOP" className={`merch-button${paid ? "" : " merch-button--secondary"}`}>{paid ? "Shop again ↗" : "Back to shop"}</TransitionLink><TransitionLink href="/merch" transitionLabel="MERCH" className="merch-text-button">Explore the collection ↗</TransitionLink></div>
    <noscript><p className="merch-secure-note">Save a screenshot of this receipt. Refresh the page to check for payment updates.</p></noscript>
  </section>;
}
