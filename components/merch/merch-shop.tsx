"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import { addLine, calculateTotals, lineKey, money, PENDING_ORDER_KEY, productIsOpen, unitPrice, updateLine, validateLine } from "@/lib/merch/order";
import type { ApiOrder, CheckoutCatalog, MerchStoreContent, TeeId, TeeLine } from "@/types/merch-store";
import { MerchBot } from "./merch-bot";
import { MerchImage } from "./merch-image";
import { saveStoredValue, useMerchCart, usePendingOrder } from "./use-merch-cart";

const stepNames = ["Choose", "Configure", "Review & pay"];
const stepHashes = ["choose", "configure", "review"];
const subscribeHydration = () => () => {};

function Quantity({ quantity, max, label, onChange }: { quantity: number; max: number; label: string; onChange: (quantity: number) => void }) {
  return <div className="merch-quantity" role="group" aria-label={label}>
    <button type="button" aria-label={`Decrease ${label}`} disabled={quantity <= 1} onClick={() => onChange(quantity - 1)}>−</button>
    <output aria-label={`${label}: ${quantity}`}>{quantity}</output>
    <button type="button" aria-label={`Increase ${label}`} disabled={quantity >= max} onClick={() => onChange(quantity + 1)}>+</button>
  </div>;
}

export function MerchShop({ content, initialProduct, initialColourway, hasSelection }: {
  content: MerchStoreContent; initialProduct: TeeId; initialColourway?: string; hasSelection: boolean;
}) {
  const seed = content.products.find(({ id }) => id === initialProduct) ?? content.products[0];
  const { lines, setLines } = useMerchCart(content);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const { session: pendingSession, resumeUrl: pendingPaymentUrl } = usePendingOrder();
  const [step, setStep] = useState(hasSelection ? 1 : 0);
  const [draft, setDraft] = useState<TeeLine>({ productId: seed.id, colourwayId: seed.colourways.find(({ id }) => id === initialColourway)?.id ?? seed.colourways[0].id, size: "M", fit: "regular", quantity: 1 });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [side, setSide] = useState<"front" | "back">("front");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState<CheckoutCatalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<ApiOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [lastCartAtQuote, setLastCartAtQuote] = useState("");
  const catalogAbort = useRef<AbortController | null>(null);
  const orderAbort = useRef<AbortController | null>(null);

  const refreshCatalog = useCallback(async () => {
    catalogAbort.current?.abort();
    const controller = new AbortController(); catalogAbort.current = controller;
    try {
      const response = await fetch("/api/merch/catalog", { signal: controller.signal, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "The ordering service is unavailable.");
      setCatalog(data); setCatalogError("");
    } catch (failure) {
      if (!controller.signal.aborted) { setCatalog(null); setCatalogError(failure instanceof Error ? failure.message : "The ordering service is unavailable."); }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    // Start the asynchronous connection after hydration; avoid starting a request
    // during React's discarded Strict Mode effect setup.
    queueMicrotask(() => { if (mounted) void refreshCatalog(); });
    const handleHistory = () => {
      const index = stepHashes.indexOf(location.hash.slice(1));
      setStep(index >= 0 ? index : hasSelection ? 1 : 0); setError("");
    };
    if (location.hash) queueMicrotask(handleHistory);
    window.addEventListener("popstate", handleHistory);
    window.addEventListener("hashchange", handleHistory);
    return () => { mounted = false; catalogAbort.current?.abort(); orderAbort.current?.abort(); window.removeEventListener("popstate", handleHistory); window.removeEventListener("hashchange", handleHistory); };
  }, [refreshCatalog, hasSelection]);

  const pendingId = pendingSession?.id ?? null;
  const product = content.products.find(({ id }) => id === draft.productId)!;
  const colourway = product.colourways.find(({ id }) => id === draft.colourwayId) ?? product.colourways[0];
  const totals = calculateTotals(lines, content);
  const isStale = !!createdOrder && lastCartAtQuote !== JSON.stringify(lines);
  const unavailableLines = lines.some((line) => !validateLine(line, content) || (catalog?.products[line.productId] && !catalog.products[line.productId]?.in_stock));
  const canPay = !!catalog?.pricingReady && lines.length > 0 && !unavailableLines && lines.every((line) => !!catalog.products[line.productId]?.in_stock && catalog.products[line.productId]?.price !== null);

  function goStep(next: number) {
    if (submitting || busy) return;
    setStep(next); setError(""); setMessage("");
    history.pushState({ ...history.state }, "", `#${stepHashes[next]}`);
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); if (window.innerWidth < 768) heading.current?.scrollIntoView({ behavior: "instant", block: "start" }); });
  }

  function chooseProduct(id: TeeId) {
    const chosen = content.products.find((item) => item.id === id)!;
    setDraft({ productId: id, colourwayId: chosen.colourways[0].id, size: "M", fit: "regular", quantity: 1 });
    setSide("front"); setEditingKey(null); setMessage("");
  }

  function addToOrder() {
    setError("");
    if (!validateLine(draft, content)) { setError("That tee is no longer available. Please choose another."); return; }
    try {
      const next = editingKey ? updateLine(lines, editingKey, draft, content.maxQuantity) : addLine(lines, draft, content.maxQuantity);
      const live = catalog?.products[draft.productId];
      const productQuantity = next.filter((line) => line.productId === draft.productId).reduce((sum, line) => sum + line.quantity, 0);
      if (live && (!live.in_stock || (live.stock_quantity !== null && productQuantity > live.stock_quantity))) throw new Error(`${product.name} has ${live.stock_quantity ?? 0} available. Please adjust your quantities.`);
      const count = next.reduce((sum, line) => sum + line.quantity, 0);
      setLines(next); setEditingKey(null); setMessage(`${product.name} ${editingKey ? "updated" : "added"}. ${count} ${count === 1 ? "tee" : "tees"} in your order.`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "This tee could not be added."); }
  }

  function editLine(line: TeeLine) { setDraft({ ...line }); setEditingKey(lineKey(line)); setSide("front"); goStep(1); }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !canPay || createdOrder || pendingId) return;
    setError("");
    if (!lines.every((line) => validateLine(line, content))) { setError("Please remove any tee whose ordering period has ended."); return; }
    const data = new FormData(event.currentTarget);
    const buyer = { name: String(data.get("name") ?? ""), email: String(data.get("email") ?? ""), phone: String(data.get("phone") ?? "") };
    setSubmitting(true);
    const controller = new AbortController(); orderAbort.current = controller;
    try {
      const response = await fetch("/api/merch/orders", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ buyer, lines }) });
      const output = await response.json();
      if (!response.ok) {
        if (output.error?.orderId) saveStoredValue(PENDING_ORDER_KEY, JSON.stringify({ id: output.error.orderId, lines }));
        throw new Error(output.error?.message ?? "Your order could not be placed. Please try again.");
      }
      const order = output as ApiOrder;
      setLastCartAtQuote(JSON.stringify(lines));
      saveStoredValue(PENDING_ORDER_KEY, JSON.stringify({ id: order.id, lines, authorization_url: order.authorization_url, expires_at: order.expires_at }));
      setCreatedOrder(order);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Your order could not be placed.");
    } finally { if (!controller.signal.aborted) setSubmitting(false); }
  }

  function continuePayment() {
    if (!createdOrder?.authorization_url || isStale) return;
    if (createdOrder.expires_at && Date.parse(createdOrder.expires_at) <= Date.now()) { setError("This payment session has expired. Open the order page to check its status."); return; }
    setBusy(true);
    location.assign(createdOrder.authorization_url);
  }

  return <>
    <div className="merch-shop-top"><TransitionLink href="/merch" transitionLabel="MERCH">← Back to merch</TransitionLink><strong>CSS MERCH / ORDER BUILDER</strong><span className="merch-label">Paystack checkout</span></div>
    <ol className="merch-stepper" aria-label="Order steps">{stepNames.map((name, index) => <li key={name} aria-current={step === index ? "step" : undefined}><button type="button" disabled={submitting || busy || (index === 2 && !lines.length)} onClick={() => goStep(index)}><span>{index + 1}</span>{name}</button></li>)}</ol>
    <div className="merch-builder">
      <aside className="merch-builder__preview" aria-label="Selected tee preview">
        <div className="merch-builder__stage" key={`${colourway.id}-${side}`}>
          <span className="merch-label merch-builder__stage-tag">{product.name} / {side}</span>
          <MerchImage src={colourway[side]} alt={`${product.name}, ${colourway.name}, ${side}`} sizes="(max-width: 767px) 90vw, 45vw" />
          <MerchBot doctor={product.id === "pink-october"} />
          <button className="merch-builder__flip" type="button" onClick={() => setSide(side === "front" ? "back" : "front")}>↻ See {side === "front" ? "back" : "front"}</button>
        </div>
        <div className="merch-builder__preview-caption"><strong>{colourway.name}</strong><span>{product.id === "css-tee" ? `${colourway.base} / ${colourway.print}` : "October 2026 edition"}</span></div>
        <p className="merch-offer">Any 2+ tees. <strong>5% off the merchandise subtotal.</strong></p>
      </aside>
      <section className="merch-builder__panel" aria-labelledby="order-step-title" aria-busy={submitting}>
        <p className="merch-label">0{step + 1} / 03 · {stepNames[step]}</p>
        <h1 id="order-step-title" ref={heading} tabIndex={-1}>{["Pick your tee.", editingKey ? "Make an edit." : "Make it yours.", "Check. Then ship."][step]}</h1>
        <p className="merch-builder__sub">{["Two designs. Start with the one you want to wear.", "Choose your options, then add this tee to your order.", "Your tees, your details, and one secure payment."][step]}</p>
        {step === 0 && <div className="merch-pick-products">{content.products.map((item) => <button key={item.id} type="button" className="merch-pick-product" aria-pressed={draft.productId === item.id} disabled={!productIsOpen(item) || (catalog?.products[item.id] && !catalog.products[item.id]?.in_stock)} onClick={() => chooseProduct(item.id)}>
          <span className="merch-pick-product__image"><MerchImage src={item.colourways[0].front} alt="" sizes="104px" /></span><span><strong>{item.name}</strong><small>{productIsOpen(item) ? item.description : "This edition has ended."}</small></span><b>{money(item.priceMinor)}</b>
        </button>)}</div>}
        {step === 1 && <>
          <div className="merch-options">
            {product.colourways.length > 1 && <fieldset><legend>Colourway <small>{colourway.name}</small></legend><div className="merch-options__colourways">{product.colourways.map((item) => <button key={item.id} type="button" aria-pressed={draft.colourwayId === item.id} aria-label={`${item.name}, ${item.base} fabric with ${item.print} print`} onClick={() => setDraft({ ...draft, colourwayId: item.id })}><span><MerchImage src={item.front} alt="" sizes="120px" /></span><span>{item.name}</span></button>)}</div></fieldset>}
            <fieldset><legend>Fit</legend><div className="merch-options__buttons">{product.fits.map((fit) => <button type="button" key={fit.id} aria-pressed={draft.fit === fit.id} onClick={() => setDraft({ ...draft, fit: fit.id })}>{fit.name}{fit.extraMinor > 0 && <small>+{money(fit.extraMinor)}</small>}</button>)}</div></fieldset>
            <fieldset><legend>Size</legend><div className="merch-options__buttons">{content.sizes.map((size) => <button type="button" key={size.id} aria-pressed={draft.size === size.id} onClick={() => setDraft({ ...draft, size: size.id })}>{size.id}{size.extraMinor > 0 && <small>+{money(size.extraMinor)}</small>}</button>)}</div></fieldset>
            <fieldset><legend>Quantity</legend><Quantity quantity={draft.quantity} max={content.maxQuantity} label="tee quantity" onChange={(quantity) => setDraft({ ...draft, quantity })} /></fieldset>
          </div>
          <details className="merch-size-guide"><summary>Find your size ↗</summary><table><caption className="sr-only">Tee measurements in inches</caption><thead><tr><th scope="col">Size</th><th scope="col">Chest (in)</th><th scope="col">Length (in)</th></tr></thead><tbody>{content.sizes.map((size) => <tr key={size.id}><th scope="row">{size.id}</th><td>{size.chest}</td><td>{size.length}</td></tr>)}</tbody></table><p>Between sizes? Consider sizing up.{product.id === "css-tee" && <> The oversized CSS Tee option adds {money(product.fits.find(({ id }) => id === "oversized")!.extraMinor)} to the regular-fit price.</>}</p></details>
          <div className="merch-builder__add"><p>This configuration<strong>{money(unitPrice(draft, content) * draft.quantity)}</strong></p><button className="merch-button" type="button" disabled={!hydrated || !productIsOpen(product)} onClick={addToOrder}>{editingKey ? "Save changes" : "Add to order"} <span aria-hidden="true">+</span></button></div>
          <p role="status" className="merch-secure-note">{message}</p>
          {lines.length > 0 && <button className="merch-text-button" type="button" onClick={() => goStep(0)}>Add a different tee ↗</button>}
        </>}
        {step === 2 && <>
          {!lines.length ? <div className="merch-empty"><h2>Your order starts here.</h2><p>Choose a tee and add your preferred size and colourway.</p><button className="merch-button" type="button" onClick={() => goStep(0)}>Choose a tee ↗</button></div> : <>
            <div className="merch-cart" aria-label="Tees in your order">{lines.map((line) => {
              const item = content.products.find(({ id }) => id === line.productId)!;
              const cw = item.colourways.find(({ id }) => id === line.colourwayId)!;
              return <article className="merch-cart-line" key={lineKey(line)}><div className="merch-cart-line__image"><MerchImage src={cw.front} alt="" sizes="72px" /></div><div><h3>{item.name}</h3><p>{cw.name} · {line.size} · {line.fit}</p>{!productIsOpen(item) && <p className="merch-form-error">This edition has ended. Remove it to continue.</p>}<div className="merch-cart-line__actions"><Quantity quantity={line.quantity} max={content.maxQuantity} label={`${item.name}, ${cw.name}, ${line.size} quantity`} onChange={(quantity) => setLines(lines.map((other) => lineKey(other) === lineKey(line) ? { ...other, quantity } : other))} /><button type="button" onClick={() => editLine(line)}>Edit</button><button type="button" onClick={() => setLines(lines.filter((other) => lineKey(other) !== lineKey(line)))}>Remove</button></div></div><strong>{money(unitPrice(line, content) * line.quantity)}</strong></article>;
            })}</div>
            <button className="merch-text-button" type="button" onClick={() => goStep(0)}>Add another tee +</button>
            <dl className="merch-totals"><div><dt>Merchandise subtotal</dt><dd>{money(totals.subtotalMinor)}</dd></div>{totals.discountMinor > 0 && <div className="merch-totals__discount"><dt>2+ tees / 5% off</dt><dd>−{money(totals.discountMinor)}</dd></div>}<div><dt>Payment fee</dt><dd>{createdOrder && !isStale ? money(Math.round(Number(createdOrder.fee) * 100)) : "Confirmed by checkout"}</dd></div><div className="merch-totals__total"><dt>{createdOrder && !isStale ? "Total to pay" : "Merchandise total"}</dt><dd>{createdOrder && !isStale ? money(Math.round(Number(createdOrder.total) * 100)) : money(totals.totalMinor)}</dd></div></dl>
            {totals.quantity === 1 && <p className="merch-notice">Add one more tee to get 5% off your entire merchandise subtotal.</p>}
            {catalogError ? <p className="merch-notice" role="status">{catalogError}<button type="button" onClick={() => void refreshCatalog()}>Retry connection</button></p> : !canPay && <p className="merch-notice" role="status">{catalog === null ? "Checking the ordering service…" : unavailableLines ? "A tee in your order is unavailable. Please update your selection." : "Online ordering is being connected. You can build your order; your tees are saved on this device."}</p>}
            {pendingId && !createdOrder && <p className="merch-notice">You already have a payment session. <TransitionLink href={`/merch/order/${pendingId}`} transitionLabel="YOUR ORDER">Check your order →</TransitionLink>{pendingPaymentUrl && <> · <a href={pendingPaymentUrl}>Resume payment ↗</a></>}</p>}
            {createdOrder ? <div className="merch-notice" role="status"><strong>Your payment session is ready.</strong><p>{isStale ? "Your cart has changed. Check the existing order before starting another payment." : `The backend confirmed ${money(Math.round(Number(createdOrder.total) * 100))}, including its payment fee. Continue to Paystack to pay.`}</p><TransitionLink href={`/merch/order/${createdOrder.id}`} transitionLabel="YOUR ORDER">View order status →</TransitionLink></div> : <form className="merch-contact" id="merch-pay-form" ref={form} onSubmit={createOrder}><fieldset disabled={submitting || !!pendingId}><legend>Your details</legend><label>Full name<input name="name" autoComplete="name" required maxLength={150} /></label><div className="merch-contact__pair"><label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label><label>Phone<input name="phone" type="tel" autoComplete="tel" required pattern={String.raw`\+?[0-9\s\(\)\-]{9,20}`} maxLength={20} placeholder="024 000 0000" /></label></div></fieldset></form>}
            <p className="merch-secure-note">Payment is handled by Paystack. After payment, your order page will show the confirmed status and pickup code when available.</p>
          </>}
        </>}
        <p className="merch-form-error" role="alert">{error}</p>
        <noscript><p className="merch-notice">Enable JavaScript to configure tees and use checkout. You can still explore the collection and size information on the merch page.</p></noscript>
      </section>
    </div>
    <div className="merch-shop-actions">
      {step > 0 && <button type="button" className="merch-button merch-button--secondary" disabled={submitting || busy} onClick={() => goStep(step - 1)}>← Back</button>}
      <div className="merch-shop-actions__total">{totals.quantity} tee{totals.quantity === 1 ? "" : "s"} / merchandise<strong>{money(totals.totalMinor)}</strong></div>
      {step === 0 && <button className="merch-button" type="button" disabled={!productIsOpen(product)} onClick={() => goStep(1)}>Configure →</button>}
      {step === 1 && <button className="merch-button" type="button" disabled={!lines.length || !!editingKey} onClick={() => goStep(2)}>Review order →</button>}
      {step === 2 && (createdOrder ? <button className="merch-button" type="button" disabled={busy || isStale} onClick={continuePayment}>{busy ? "Opening Paystack…" : "Continue to Paystack ↗"}</button> : <button className="merch-button" type="submit" form="merch-pay-form" disabled={!canPay || submitting || !!pendingId}>{submitting ? "Creating payment…" : "Prepare payment ↗"}</button>)}
    </div>
  </>;
}
