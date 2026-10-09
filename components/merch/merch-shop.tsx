"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import { MERCH_BOT_ENABLED } from "@/lib/merch/features";
import { addLine, calculateTotals, lineKey, money, PENDING_ORDER_KEY, productIsOpen, unitPrice, updateLine, validateLine } from "@/lib/merch/order";
import type { ApiOrder, CheckoutCatalog, MerchStoreContent, TeeId, TeeLine } from "@/types/merch-store";
import { MerchBot } from "./merch-bot";
import { MerchImage } from "./merch-image";
import { MerchOrderShelf, type ShelfFeedback } from "./merch-order-shelf";
import { Quantity } from "./merch-quantity";
import { saveStoredValue, useMerchCart, usePendingOrder } from "./use-merch-cart";

const stepNames = ["Build your order", "Review & pay"];
const stepHashes = ["build", "review"];
const subscribeHydration = () => () => {};

export function MerchShop({ content, initialProduct, initialColourway }: {
  content: MerchStoreContent; initialProduct: TeeId; initialColourway?: string;
}) {
  const seed = content.products.find(({ id }) => id === initialProduct) ?? content.products[0];
  const { lines, setLines } = useMerchCart(content);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const { session: pendingSession, resumeUrl: pendingPaymentUrl } = usePendingOrder();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<TeeLine>({ productId: seed.id, colourwayId: seed.colourways.find(({ id }) => id === initialColourway)?.id ?? seed.colourways[0].id, size: "M", quantity: 1 });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const beforeEdit = useRef<TeeLine | null>(null);
  const [feedback, setFeedback] = useState<ShelfFeedback | null>(null);
  const feedbackSequence = useRef(0);
  const [addFeedbackSequence, setAddFeedbackSequence] = useState(0);
  const [removed, setRemoved] = useState<{ line: TeeLine; index: number } | null>(null);
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
      setStep(index >= 0 ? index : 0); setError("");
      setEditingKey(null); beforeEdit.current = null;
    };
    if (location.hash) queueMicrotask(handleHistory);
    window.addEventListener("popstate", handleHistory);
    window.addEventListener("hashchange", handleHistory);
    return () => { mounted = false; catalogAbort.current?.abort(); orderAbort.current?.abort(); window.removeEventListener("popstate", handleHistory); window.removeEventListener("hashchange", handleHistory); };
  }, [refreshCatalog]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!removed) return;
    const timer = window.setTimeout(() => setRemoved(null), 10000);
    return () => window.clearTimeout(timer);
  }, [removed]);

  const pendingId = pendingSession?.id ?? null;
  const product = content.products.find(({ id }) => id === draft.productId)!;
  const colourway = product.colourways.find(({ id }) => id === draft.colourwayId) ?? product.colourways[0];
  const totals = calculateTotals(lines, content);
  const added = feedback?.sequence === addFeedbackSequence && feedback.key === lineKey(draft) ? feedback : null;
  const isStale = !!createdOrder && lastCartAtQuote !== JSON.stringify(lines);
  const unavailableLines = lines.some((line) => {
    const live = catalog?.products[line.productId];
    const count = lines.filter((other) => other.productId === line.productId).reduce((sum, other) => sum + other.quantity, 0);
    return !validateLine(line, content) || (live && (!live.in_stock || (live.stock_quantity !== null && count > live.stock_quantity)));
  });
  const canPay = !!catalog?.pricingReady && lines.length > 0 && !unavailableLines && lines.every((line) => !!catalog.products[line.productId]?.in_stock && catalog.products[line.productId]?.price !== null);

  function goStep(next: number) {
    if (submitting || busy || (next === 1 && editingKey)) return;
    setStep(next); setError(""); setMessage("");
    history.pushState({ ...history.state }, "", `#${stepHashes[next]}`);
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); if (window.innerWidth < 768) heading.current?.scrollIntoView({ behavior: "instant", block: "start" }); });
  }

  function chooseProduct(id: TeeId) {
    const chosen = content.products.find((item) => item.id === id)!;
    setDraft({ productId: id, colourwayId: chosen.colourways[0].id, size: draft.size, quantity: 1 });
    setSide("front"); setMessage(""); setFeedback(null); setError("");
  }

  function commitLines(next: TeeLine[]) {
    for (const item of content.products) {
      const live = catalog?.products[item.id];
      const count = next.filter((line) => line.productId === item.id).reduce((sum, line) => sum + line.quantity, 0);
      const previous = lines.filter((line) => line.productId === item.id).reduce((sum, line) => sum + line.quantity, 0);
      // Reductions and removals must remain possible even after stock changes.
      if (live && count > previous && (!live.in_stock || (live.stock_quantity !== null && count > live.stock_quantity))) throw new Error(`${item.name} has ${live.stock_quantity ?? 0} available. Please adjust your quantities.`);
    }
    setLines(next);
  }

  function notify(line: TeeLine, action: ShelfFeedback["action"]) {
    setFeedback({ key: lineKey(line), sequence: ++feedbackSequence.current, action });
  }

  function addToOrder() {
    setError("");
    const overLimit = draft.quantity > content.maxQuantity;
    if (!validateLine(draft, content)) { setError(overLimit ? `Choose up to ${content.maxQuantity} tees of this configuration.` : "That tee is no longer available. Please choose another."); return; }
    try {
      const next = editingKey ? updateLine(lines, editingKey, draft, content.maxQuantity) : addLine(lines, draft, content.maxQuantity);
      commitLines(next);
      const count = next.reduce((sum, line) => sum + line.quantity, 0);
      const merged = !!editingKey && lines.some((line) => lineKey(line) !== editingKey && lineKey(line) === lineKey(draft));
      notify(draft, editingKey ? "Updated" : "Added");
      setAddFeedbackSequence(feedbackSequence.current);
      setEditingKey(null); beforeEdit.current = null;
      setMessage(`${product.name}, ${colourway.name}, size ${draft.size} ${editingKey ? "updated" : "added"}.${merged ? " Matching selections combined." : ""} ${count} ${count === 1 ? "tee" : "tees"} in your order.`);
      setDraft({ ...draft, quantity: 1 });
    } catch (failure) { setError(failure instanceof Error ? failure.message : "This tee could not be added."); }
  }

  function editLine(line: TeeLine) {
    beforeEdit.current = draft;
    goStep(0); setDraft({ ...line }); setEditingKey(lineKey(line)); setSide("front"); setFeedback(null);
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ behavior: "instant", block: "start" }); });
  }

  function cancelEdit() {
    if (beforeEdit.current) setDraft(beforeEdit.current);
    beforeEdit.current = null; setEditingKey(null); setError(""); setMessage("Edit cancelled. Your order is unchanged.");
  }

  function changeQuantity(line: TeeLine, quantity: number) {
    setError("");
    try {
      const next = lines.map((other) => lineKey(other) === lineKey(line) ? { ...other, quantity } : other);
      commitLines(next); notify(line, "Updated");
      setMessage(`${content.products.find(({ id }) => id === line.productId)!.name}, size ${line.size}: quantity ${quantity}.`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Quantity could not be updated."); }
  }

  function removeLine(line: TeeLine) {
    setRemoved({ line, index: lines.findIndex((other) => lineKey(other) === lineKey(line)) });
    setLines(lines.filter((other) => lineKey(other) !== lineKey(line)));
    if (editingKey === lineKey(line)) cancelEdit();
    setFeedback(null); setError(""); setMessage(`${content.products.find(({ id }) => id === line.productId)!.name}, size ${line.size} removed from your order.`);
  }

  function undoRemoval() {
    if (!removed) return;
    try {
      const next = addLine(lines, removed.line, Math.max(content.maxQuantity, removed.line.quantity));
      if (!lines.some((line) => lineKey(line) === lineKey(removed.line))) {
        const restored = next.pop()!;
        next.splice(Math.min(removed.index, next.length), 0, restored);
      }
      commitLines(next); notify(removed.line, "Added"); setRemoved(null); setError(""); setMessage("Tee restored to your order.");
      requestAnimationFrame(() => document.getElementById("merch-shelf-title")?.focus({ preventScroll: true }));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "This tee could not be restored."); }
  }

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
    <ol className="merch-stepper" aria-label="Order steps">{stepNames.map((name, index) => <li key={name} aria-current={step === index ? "step" : undefined}><button type="button" disabled={submitting || busy || (index === 1 && (!lines.length || !!editingKey))} onClick={() => goStep(index)}><span>{index + 1}</span>{name}</button></li>)}</ol>
    <div className="merch-builder">
      <aside className="merch-builder__preview" aria-label="Selected tee preview">
        <div className="merch-builder__stage" key={`${colourway.id}-${side}`}>
          <span className="merch-label merch-builder__stage-tag">{step === 0 ? "Currently configuring" : product.name} / {side}</span>
          <MerchImage src={colourway[side]} alt={`${product.name}, ${colourway.name}, ${side}`} sizes="(max-width: 767px) 90vw, 45vw" />
          {MERCH_BOT_ENABLED && <MerchBot doctor={product.id === "pink-october"} />}
          <button className="merch-builder__flip" type="button" onClick={() => setSide(side === "front" ? "back" : "front")}>↻ See {side === "front" ? "back" : "front"}</button>
        </div>
        <div className="merch-builder__preview-caption"><strong>{colourway.name}</strong><span>{product.id === "css-tee" ? `${colourway.base} / ${colourway.print}` : "October 2026 edition"}</span></div>
        <p className="merch-offer">Any 2+ tees. <strong>5% off the merchandise subtotal.</strong></p>
      </aside>
      <section className="merch-builder__panel" aria-labelledby="order-step-title" aria-busy={submitting}>
        <p className="merch-label">0{step + 1} / 02 · {stepNames[step]}</p>
        <h1 id="order-step-title" ref={heading} tabIndex={-1}>{step === 0 ? editingKey ? "Make an edit." : "Make it yours." : "Review. Then pay."}</h1>
        <p className="merch-builder__sub">{step === 0 ? editingKey ? "Update this selection, then save your changes." : "Choose your tee. Add it to the shelf. Build your order." : "Your tees, your details, and one secure payment."}</p>
        {step === 0 && <>
          <fieldset className="merch-designs" disabled={!!editingKey}><legend>Design {editingKey && <small>Cancel this edit to switch designs</small>}</legend><div className="merch-pick-products">{content.products.map((item) => <button key={item.id} type="button" className="merch-pick-product" aria-pressed={draft.productId === item.id} disabled={!productIsOpen(item) || (catalog?.products[item.id] && !catalog.products[item.id]?.in_stock)} onClick={() => chooseProduct(item.id)}>
            <span className="merch-pick-product__image"><MerchImage src={item.colourways[0].front} alt="" sizes="64px" /></span><span><strong>{item.name}</strong><small>{!productIsOpen(item) ? "This edition has ended." : catalog?.products[item.id] && !catalog.products[item.id]?.in_stock ? "Out of stock" : `From ${money(item.priceMinor)}`}</small></span><span aria-hidden="true">{draft.productId === item.id ? "✓" : "↗"}</span>
          </button>)}</div></fieldset>
          <div className="merch-options">
            {product.colourways.length > 1 && <fieldset><legend>Colourway <small>{colourway.name}</small></legend><div className="merch-options__colourways">{product.colourways.map((item) => <button key={item.id} type="button" aria-pressed={draft.colourwayId === item.id} aria-label={`${item.name}, ${item.base} fabric with ${item.print} print`} onClick={() => setDraft({ ...draft, colourwayId: item.id })}><span><MerchImage src={item.front} alt="" sizes="120px" /></span><span>{item.name}</span></button>)}</div></fieldset>}
            <fieldset><legend>Size</legend><div className="merch-options__buttons">{content.sizes.map((size) => <button type="button" key={size.id} aria-pressed={draft.size === size.id} onClick={() => setDraft({ ...draft, size: size.id })}>{size.id}{size.extraMinor > 0 && <small>+{money(size.extraMinor)}</small>}</button>)}</div></fieldset>
            <fieldset><legend>Quantity</legend><Quantity quantity={draft.quantity} max={content.maxQuantity} label="tee quantity" onChange={(quantity) => setDraft({ ...draft, quantity })} /></fieldset>
          </div>
          <details className="merch-size-guide"><summary>Find your size ↗</summary><table><caption className="sr-only">Tee measurements in inches</caption><thead><tr><th scope="col">Size</th><th scope="col">Chest (in)</th><th scope="col">Length (in)</th></tr></thead><tbody>{content.sizes.map((size) => <tr key={size.id}><th scope="row">{size.id}</th><td>{size.chest}</td><td>{size.length}</td></tr>)}</tbody></table><p>Between sizes? Consider sizing up. XXL and 3XL each add GH₵10.</p></details>
          <div className="merch-builder__add"><p>This selection · {draft.quantity} tee{draft.quantity === 1 ? "" : "s"}<strong>{money(unitPrice(draft, content) * draft.quantity)}</strong></p><button className="merch-button" data-added={!!added && !editingKey || undefined} type="button" disabled={!hydrated || !productIsOpen(product) || (catalog?.products[product.id] && !catalog.products[product.id]?.in_stock)} onClick={addToOrder}>{editingKey ? "Save changes" : added ? `${added.action} ✓` : "Add to order"} <span aria-hidden="true">{editingKey ? "↗" : "+"}</span></button></div>
          {editingKey ? <button className="merch-text-button" type="button" onClick={cancelEdit}>Cancel edit</button> : <p className="merch-secure-note">Changing options only changes this preview. Add your selection to save it in your order.</p>}
        </>}
        {step === 1 && <>
          {!lines.length ? <div className="merch-empty"><h2>Your order starts here.</h2><p>Choose a tee and add your preferred size and colourway.</p><button className="merch-button" type="button" onClick={() => goStep(0)}>Choose a tee ↗</button></div> : <>
            <div className="merch-cart" aria-label="Tees in your order">{lines.map((line) => {
              const item = content.products.find(({ id }) => id === line.productId)!;
              const cw = item.colourways.find(({ id }) => id === line.colourwayId)!;
              const label = `${item.name}, ${cw.name}, size ${line.size}`;
              return <article className="merch-cart-line" key={lineKey(line)}><div className="merch-cart-line__image"><MerchImage src={cw.front} alt="" sizes="72px" /></div><div><h3>{item.name}</h3><p>{cw.name} · Size {line.size}</p>{!productIsOpen(item) && <p className="merch-form-error">This edition has ended. Remove it to continue.</p>}{line.quantity > content.maxQuantity && <p className="merch-form-error">Reduce this quantity to {content.maxQuantity} or fewer.</p>}<div className="merch-cart-line__actions"><Quantity quantity={line.quantity} max={content.maxQuantity} label={`${label} quantity`} disabled={submitting || busy} onChange={(quantity) => changeQuantity(line, quantity)} /><button type="button" disabled={submitting || busy} aria-label={`Edit ${label}`} onClick={() => editLine(line)}>Edit</button><button type="button" disabled={submitting || busy} aria-label={`Remove ${label}`} onClick={() => { removeLine(line); requestAnimationFrame(() => heading.current?.focus({ preventScroll: true })); }}>Remove</button></div></div><strong>{money(unitPrice(line, content) * line.quantity)}</strong></article>;
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
    <div className="merch-order-feedback"><p role="status">{message}</p>{removed && <button type="button" disabled={submitting || busy} onClick={undoRemoval}>Undo removal ↶</button>}</div>
    {step === 0 && <MerchOrderShelf content={content} lines={lines} editingKey={editingKey} feedback={feedback} disabled={submitting || busy} onEdit={editLine} onRemove={removeLine} onQuantity={changeQuantity} />}
    <div className="merch-shop-actions">
      {step > 0 && <button type="button" className="merch-button merch-button--secondary" disabled={submitting || busy} onClick={() => goStep(step - 1)}>← Back</button>}
      <div className="merch-shop-actions__total">{totals.quantity} tee{totals.quantity === 1 ? "" : "s"} / merchandise<strong>{money(totals.totalMinor)}</strong></div>
      {step === 0 && <>{totals.discountMinor > 0 && <span className="merch-shop-actions__saving">5% off applied</span>}<button className="merch-button" type="button" disabled={!lines.length || !!editingKey} onClick={() => goStep(1)}>Review order →</button></>}
      {step === 1 && (createdOrder ? <button className="merch-button" type="button" disabled={busy || isStale} onClick={continuePayment}>{busy ? "Opening Paystack…" : "Continue to Paystack ↗"}</button> : <button className="merch-button" type="submit" form="merch-pay-form" disabled={!canPay || submitting || !!pendingId}>{submitting ? "Creating payment…" : "Prepare payment ↗"}</button>)}
    </div>
  </>;
}
