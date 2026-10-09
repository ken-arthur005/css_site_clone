"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import { useSmoothScroll } from "@/components/providers/smooth-scroll-provider";
import { MERCH_BOT_ENABLED } from "@/lib/merch/features";
import { addLine, CART_KEY, calculateTotals, lineKey, money, normalizeStoredLines, paymentHref, productIsOpen, unitPrice, updateLine, validateLine } from "@/lib/merch/order";
import { selectionIssue, stockIssue, withCatalogPricing } from "@/lib/merch/catalog";
import type { ApiOrder, MerchStoreContent, TeeId, TeeLine } from "@/types/merch-store";
import { MerchBot } from "./merch-bot";
import { MerchImage } from "./merch-image";
import { MerchOrderShelf, type ShelfFeedback } from "./merch-order-shelf";
import { Quantity } from "./merch-quantity";
import { MerchReviewCart, reviewLineId } from "./merch-review-cart";
import { rememberOrderReference, saveCheckoutOrder, storedValue, useMerchCart } from "./use-merch-cart";
import { useMerchCatalog } from "./use-merch-catalog";
import { useOrderReconciliation } from "./use-order-reconciliation";

const stepNames = ["Build your order", "Review & pay"];
const stepHashes = ["build", "review"];
const subscribeHydration = () => () => {};

export function MerchShop({ content: localContent, initialProduct, initialColourway }: {
  content: MerchStoreContent; initialProduct: TeeId; initialColourway?: string;
}) {
  const { catalog, error: catalogError, refresh: refreshCatalog } = useMerchCatalog();
  const content = useMemo(() => withCatalogPricing(localContent, catalog), [localContent, catalog]);
  const seed = content.products.find(({ id }) => id === initialProduct) ?? content.products[0];
  const { lines, setLines } = useMerchCart(content);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const { checkPreviousOrder, pending, resumeUrl: pendingPaymentUrl, lastReceipt } = useOrderReconciliation(localContent);
  const { scrollToPosition } = useSmoothScroll();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<TeeLine>({ productId: seed.id, colourwayId: seed.colourways.find(({ id }) => id === initialColourway)?.id ?? seed.colourways[0].id, size: "M", quantity: 1 });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const beforeEdit = useRef<TeeLine | null>(null);
  const [feedback, setFeedback] = useState<ShelfFeedback | null>(null);
  const feedbackSequence = useRef(0);
  const [addFeedbackSequence, setAddFeedbackSequence] = useState(0);
  const [removed, setRemoved] = useState<{ line: TeeLine; index: number } | null>(null);
  const [side, setSide] = useState<"front" | "back">("front");
  const [selectedReviewKey, setSelectedReviewKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const orderAbort = useRef<AbortController | null>(null);
  const submitLock = useRef(false);

  useEffect(() => {
    const handleHistory = () => {
      const index = stepHashes.indexOf(location.hash.slice(1));
      setStep(index >= 0 ? index : 0); setError("");
      setEditingKey(null); beforeEdit.current = null;
    };
    if (location.hash) queueMicrotask(handleHistory);
    window.addEventListener("popstate", handleHistory);
    window.addEventListener("hashchange", handleHistory);
    const restore = () => { submitLock.current = false; setSubmitting(false); };
    window.addEventListener("pageshow", restore);
    return () => { orderAbort.current?.abort(); window.removeEventListener("popstate", handleHistory); window.removeEventListener("hashchange", handleHistory); window.removeEventListener("pageshow", restore); };
  }, []);

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

  const product = content.products.find(({ id }) => id === draft.productId)!;
  const colourway = product.colourways.find(({ id }) => id === draft.colourwayId) ?? product.colourways[0];
  const totals = calculateTotals(lines, content);
  const activeReviewKey = lines.some((line) => lineKey(line) === selectedReviewKey) ? selectedReviewKey : null;
  const added = feedback?.sequence === addFeedbackSequence && feedback.key === lineKey(draft) ? feedback : null;
  const stockError = stockIssue(lines, content, catalog);
  const unavailableLines = !!stockError || lines.some((line) => !!selectionIssue(line, content, catalog));
  const canPay = !!catalog && lines.length > 0 && !unavailableLines;
  const draftIssue = selectionIssue(draft, content, catalog);
  const liveProduct = catalog?.products[product.id];
  const visibleSizes = content.sizes.filter((size) => !catalog || liveProduct?.sizes.some((option) => option.value === size.id));
  const discount = content.discount;

  function firstValidDraft(next: TeeLine): TeeLine {
    if (!catalog || !selectionIssue(next, content, catalog)) return next;
    for (const size of content.sizes) {
      const candidate = { ...next, size: size.id };
      if (!selectionIssue(candidate, content, catalog)) return candidate;
    }
    return next;
  }

  function goStep(next: number) {
    if (submitting || (next === 1 && editingKey)) return;
    setStep(next); setError(""); setMessage("");
    history.pushState({ ...history.state }, "", `#${stepHashes[next]}`);
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); scrollToPosition({ x: 0, y: 0 }); });
  }

  function chooseProduct(id: TeeId) {
    const chosen = content.products.find((item) => item.id === id)!;
    const live = catalog?.products[id];
    const cw = chosen.colourways.find((item) => !item.apiValue || live?.colorways.some((option) => option.value === item.apiValue && option.available)) ?? chosen.colourways[0];
    setDraft(firstValidDraft({ productId: id, colourwayId: cw.id, size: draft.size, quantity: 1 }));
    setSide("front"); setMessage(""); setFeedback(null); setError("");
  }

  function selectReviewLine(key: string) {
    const line = lines.find((item) => lineKey(item) === key);
    if (!line) return;
    setSelectedReviewKey(key);
    requestAnimationFrame(() => {
      const row = document.getElementById(reviewLineId(line));
      if (!row) return;
      row.focus({ preventScroll: true });
      const bounds = row.getBoundingClientRect();
      const header = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 96;
      const actions = document.querySelector(".merch-shop-actions")?.getBoundingClientRect().height ?? 80;
      if (bounds.top < header + 16 || bounds.bottom > window.innerHeight - actions - 16) {
        row.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      }
    });
  }

  function commitLines(next: TeeLine[]) {
    if (catalog) {
      for (const line of next) {
        const previous = lines.find((item) => lineKey(item) === lineKey(line));
        if (!previous || line.quantity > previous.quantity) {
          const issue = selectionIssue(line, content, catalog);
          if (issue) throw new Error(issue);
        }
      }
    }
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
    if (draftIssue) { setError(overLimit ? `Choose up to ${content.maxQuantity} tees of this configuration.` : draftIssue); return; }
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
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); scrollToPosition({ x: 0, y: 0 }); });
  }

  function cancelEdit() {
    if (beforeEdit.current) setDraft(beforeEdit.current);
    beforeEdit.current = null; setEditingKey(null); setError(""); setMessage("Edit cancelled. Your order is unchanged.");
  }

  function changeQuantity(line: TeeLine, quantity: number) {
    setError("");
    try {
      if (!Number.isInteger(quantity) || quantity < 1 || (quantity > content.maxQuantity && quantity >= line.quantity)) throw new Error(`Choose between 1 and ${content.maxQuantity} tees.`);
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
      requestAnimationFrame(() => (document.getElementById("merch-shelf-title") ?? heading.current)?.focus({ preventScroll: true }));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "This tee could not be restored."); }
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || submitting || !canPay) return;
    setError("");
    if (!lines.every((line) => validateLine(line, content))) { setError("Please remove any tee whose ordering period has ended."); return; }
    const data = new FormData(event.currentTarget);
    const buyer = { name: String(data.get("name") ?? ""), email: String(data.get("email") ?? ""), phone: String(data.get("phone") ?? "") };
    submitLock.current = true; setSubmitting(true);
    const controller = new AbortController(); orderAbort.current = controller;
    let redirecting = false;
    try {
      await checkPreviousOrder();
      if (controller.signal.aborted) return;
      let currentLines: TeeLine[] = [];
      try { currentLines = normalizeStoredLines(JSON.parse(storedValue(CART_KEY) || "[]"), content); } catch { /* An invalid draft needs rebuilding. */ }
      if (JSON.stringify(currentLines) !== JSON.stringify(lines)) {
        setMessage("Your cart has been updated. Review your selections before paying.");
        return;
      }
      const response = await fetch("/api/merch/orders", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ buyer, lines }) });
      const output = await response.json();
      if (!response.ok) {
        if (output.error?.orderId) rememberOrderReference(output.error.orderId, lines);
        void refreshCatalog();
        throw new Error(output.error?.message ?? "Your order could not be placed. Please try again.");
      }
      const order = output as ApiOrder;
      saveCheckoutOrder(order, lines);
      const url = paymentHref(order.authorization_url);
      if (!url) throw new Error("We couldn’t open Paystack. Your order is saved; you can check it below.");
      location.assign(url);
      redirecting = true;
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Your order could not be placed.");
    } finally { if (!redirecting) { submitLock.current = false; if (!controller.signal.aborted) setSubmitting(false); } }
  }

  return <>
    <div className="merch-shop-top"><TransitionLink href="/merch" transitionLabel="MERCH">← Back to merch</TransitionLink><strong>CSS MERCH / ORDER BUILDER</strong><span className="merch-label">Paystack checkout</span></div>
    <ol className="merch-stepper" aria-label="Order steps">{stepNames.map((name, index) => <li key={name} aria-current={step === index ? "step" : undefined}><button type="button" disabled={submitting || (index === 1 && (!lines.length || !!editingKey))} onClick={() => goStep(index)}><span>{index + 1}</span>{name}</button></li>)}</ol>
    <div className="merch-builder">
      <aside className={`merch-builder__preview${step === 1 ? " merch-builder__preview--review" : ""}`} aria-label={step === 1 ? "Saved order preview" : "Selected tee preview"}>
        {step === 1 ? <MerchReviewCart content={content} lines={lines} selectedKey={activeReviewKey} onSelect={selectReviewLine} onBuild={() => goStep(0)} /> : <>
        <div className="merch-builder__stage" key={`${colourway.id}-${side}`}>
          <span className="merch-label merch-builder__stage-tag">{step === 0 ? "Currently configuring" : product.name} / {side}</span>
          <MerchImage src={colourway[side]} alt={`${product.name}, ${colourway.name}, ${side}`} sizes="(max-width: 767px) 90vw, 45vw" />
          {MERCH_BOT_ENABLED && <MerchBot doctor={product.id === "pink-october"} />}
          <button className="merch-builder__flip" type="button" onClick={() => setSide(side === "front" ? "back" : "front")}>↻ See {side === "front" ? "back" : "front"}</button>
        </div>
        <div className="merch-builder__preview-caption"><strong>{colourway.name}</strong><span>{product.id === "css-tee" ? `${colourway.base} / ${colourway.print}` : "October 2026 edition"}</span></div>
        {discount.enabled && discount.percent > 0 && <p className="merch-offer">Any {discount.minimumQuantity}+ tees. <strong>{discount.percent}% off the merchandise subtotal.</strong></p>}
        </>}
      </aside>
      <section className="merch-builder__panel" aria-labelledby="order-step-title" aria-busy={submitting}>
        <p className="merch-label">0{step + 1} / 02 · {stepNames[step]}</p>
        <h1 id="order-step-title" ref={heading} tabIndex={-1}>{step === 0 ? editingKey ? "Make an edit." : "Make it yours." : "Review & pay."}</h1>
        <p className="merch-builder__sub">{step === 0 ? editingKey ? "Update this selection, then save your changes." : "Choose your tee. Add it to the shelf. Build your order." : "Check your fit. Add your details. You’re one click from Paystack."}</p>
        {step === 0 && <>
          <fieldset className="merch-designs" disabled={!!editingKey}><legend>Design {editingKey && <small>Cancel this edit to switch designs</small>}</legend><div className="merch-pick-products">{content.products.map((item) => <button key={item.id} type="button" className="merch-pick-product" aria-pressed={draft.productId === item.id} disabled={!productIsOpen(item) || (!!catalog && (!catalog.products[item.id]?.in_stock || catalog.products[item.id]?.price == null))} onClick={() => chooseProduct(item.id)}>
            <span className="merch-pick-product__image"><MerchImage src={item.colourways[0].front} alt="" sizes="64px" /></span><span><strong>{item.name}</strong><small>{!productIsOpen(item) ? "This edition has ended." : catalog && (!catalog.products[item.id]?.in_stock || catalog.products[item.id]?.price == null) ? "Currently unavailable" : `${catalog ? "From" : "Estimate"} ${money(item.priceMinor)}`}</small></span><span aria-hidden="true">{draft.productId === item.id ? "✓" : "↗"}</span>
          </button>)}</div></fieldset>
          <div className="merch-options">
            {product.colourways.length > 1 && <fieldset><legend>Colourway <small>{colourway.name}</small></legend><div className="merch-options__colourways">{product.colourways.map((item) => <button key={item.id} type="button" aria-pressed={draft.colourwayId === item.id} disabled={!!catalog && !liveProduct?.colorways.some((option) => option.value === item.apiValue && option.available)} aria-label={`${item.name}, ${item.base} fabric with ${item.print} print`} onClick={() => { setDraft(firstValidDraft({ ...draft, colourwayId: item.id })); setError(""); }}><span><MerchImage src={item.front} alt="" sizes="120px" /></span><span>{item.name}</span></button>)}</div></fieldset>}
            <fieldset><legend>Size</legend><div className="merch-options__buttons">{visibleSizes.map((size) => <button type="button" key={size.id} disabled={!!catalog && !!selectionIssue({ ...draft, size: size.id, quantity: 1 }, content, catalog)} aria-pressed={draft.size === size.id} onClick={() => { setDraft({ ...draft, size: size.id }); setError(""); }}>{size.id}</button>)}</div></fieldset>
            <fieldset><legend>Quantity</legend><Quantity quantity={draft.quantity} max={content.maxQuantity} label="tee quantity" onChange={(quantity) => setDraft({ ...draft, quantity })} /></fieldset>
          </div>
          <details className="merch-size-guide"><summary>Find your size ↗</summary><table><caption className="sr-only">Tee measurements in inches</caption><thead><tr><th scope="col">Size</th><th scope="col">Chest (in)</th><th scope="col">Length (in)</th></tr></thead><tbody>{visibleSizes.map((size) => <tr key={size.id}><th scope="row">{size.id}</th><td>{size.chest}</td><td>{size.length}</td></tr>)}</tbody></table><p>Between sizes? Consider sizing up. We’ll check availability once more when you pay.</p></details>
          {draftIssue && <p className="merch-notice" role="status">{draftIssue}</p>}
          {catalogError && <p className="merch-notice" role="status">{catalogError} Prices below are estimates. <button type="button" onClick={() => void refreshCatalog()}>Retry connection</button></p>}
          <div className="merch-builder__add"><p>{!catalog && "Estimate · "}This selection · {draft.quantity} tee{draft.quantity === 1 ? "" : "s"}<strong>{money(unitPrice(draft, content) * draft.quantity)}</strong></p><button className="merch-button" data-added={!!added && !editingKey || undefined} type="button" disabled={!hydrated || !!draftIssue || (!!catalog && liveProduct?.stock_quantity === 0)} onClick={addToOrder}>{editingKey ? "Save changes" : added ? `${added.action} ✓` : "Add to order"} <span aria-hidden="true">{editingKey ? "↗" : "+"}</span></button></div>
          {editingKey ? <button className="merch-text-button" type="button" onClick={cancelEdit}>Cancel edit</button> : <p className="merch-secure-note">Changing options only changes this preview. Add your selection to save it in your order.</p>}
        </>}
        {step === 1 && <>
          {!lines.length ? <div className="merch-empty"><h2>Your order starts here.</h2><p>Choose a tee and add your preferred size and colourway.</p><button className="merch-button" type="button" onClick={() => goStep(0)}>Choose a tee ↗</button></div> : <>
            <div className="merch-cart" aria-label="Tees in your order">{lines.map((line) => {
              const item = content.products.find(({ id }) => id === line.productId)!;
              const cw = item.colourways.find(({ id }) => id === line.colourwayId)!;
              const label = `${item.name}, ${cw.name}, size ${line.size}`;
              const issue = selectionIssue(line, content, catalog);
              return <article className="merch-cart-line" key={lineKey(line)} id={reviewLineId(line)} tabIndex={-1} aria-label={label} data-selected={activeReviewKey === lineKey(line) || undefined} onFocusCapture={() => setSelectedReviewKey(lineKey(line))}><div className="merch-cart-line__image"><MerchImage src={cw.front} alt="" sizes="72px" /></div><div><h3>{item.name}</h3><p>{cw.name} · Size {line.size}</p>{issue && <p className="merch-form-error">{issue} Edit or remove this selection.</p>}{line.quantity > content.maxQuantity && <p className="merch-form-error">Reduce this quantity to {content.maxQuantity} or fewer.</p>}<div className="merch-cart-line__actions"><Quantity quantity={line.quantity} max={content.maxQuantity} label={`${label} quantity`} disabled={submitting} onChange={(quantity) => changeQuantity(line, quantity)} /><button type="button" disabled={submitting} aria-label={`Edit ${label}`} onClick={() => editLine(line)}>Edit</button><button type="button" disabled={submitting} aria-label={`Remove ${label}`} onClick={() => { removeLine(line); requestAnimationFrame(() => heading.current?.focus({ preventScroll: true })); }}>Remove</button></div></div><strong>{money(unitPrice(line, content) * line.quantity)}</strong></article>;
            })}</div>
            <button className="merch-text-button" type="button" onClick={() => goStep(0)}>Add another tee +</button>
            <dl className="merch-totals"><div><dt>Your tees</dt><dd>{money(totals.subtotalMinor)}</dd></div>{totals.discountMinor > 0 && <div className="merch-totals__discount"><dt>Discount ({discount.percent}%)</dt><dd>−{money(totals.discountMinor)}</dd></div>}<div><dt>Payment fee</dt><dd>Shown on Paystack</dd></div><div className="merch-totals__total"><dt>Merchandise total</dt><dd>{money(totals.totalMinor)}</dd></div></dl>
            {discount.enabled && discount.percent > 0 && totals.quantity < discount.minimumQuantity && <p className="merch-notice">Add {discount.minimumQuantity - totals.quantity} more tee{discount.minimumQuantity - totals.quantity === 1 ? "" : "s"} to get {discount.percent}% off your merchandise subtotal.</p>}
            {catalogError ? <p className="merch-notice" role="status">{catalogError} Prices shown are estimates.<button type="button" onClick={() => void refreshCatalog()}>Try again</button></p> : !canPay && <p className="merch-notice" role="status">{catalog === null ? "Checking your tees…" : stockError ?? (unavailableLines ? "A tee in your order is unavailable. Please update your selection." : "Checkout is temporarily unavailable. Your tees are saved on this device.")}</p>}
            <form className="merch-contact" id="merch-pay-form" ref={form} onSubmit={createOrder}><fieldset disabled={submitting}><legend>Your details</legend><label>Full name<input name="name" autoComplete="name" required maxLength={150} /></label><div className="merch-contact__pair"><label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label><label>Phone<input name="phone" type="tel" autoComplete="tel" required pattern={String.raw`\+?[0-9\s\(\)\-]{9,20}`} maxLength={20} placeholder="024 000 0000" /></label></div></fieldset></form>
            <p className="merch-secure-note">Paystack will show your final total, including the processing fee, before you approve payment. After payment, you’ll receive your receipt and pickup code.</p>
          </>}
        </>}
        {lastReceipt && <p className="merch-order-history"><TransitionLink href={`/merch/order/${lastReceipt}`} transitionLabel="YOUR RECEIPT">View your last receipt ↗</TransitionLink></p>}
        {pending && <details className="merch-order-history"><summary>An earlier checkout is unfinished</summary><p>You can finish that order or pay for the selections in your cart now.</p><TransitionLink href={`/merch/order/${pending.id}`} transitionLabel="YOUR ORDER">View earlier order ↗</TransitionLink>{pendingPaymentUrl && <a href={pendingPaymentUrl}>Resume earlier payment ↗</a>}</details>}
        <p className="merch-form-error" role="alert">{error}</p>
        <noscript><p className="merch-notice">Enable JavaScript to configure tees and use checkout. You can still explore the collection and size information on the merch page.</p></noscript>
      </section>
    </div>
    <div className="merch-order-feedback"><p role="status">{message}</p>{removed && <button type="button" disabled={submitting} onClick={undoRemoval}>Undo removal ↶</button>}</div>
    {step === 0 && <MerchOrderShelf content={content} catalog={catalog} lines={lines} editingKey={editingKey} feedback={feedback} disabled={submitting} onEdit={editLine} onRemove={removeLine} onQuantity={changeQuantity} />}
    <div className="merch-shop-actions">
      {step > 0 && <button type="button" className="merch-button merch-button--secondary" disabled={submitting} onClick={() => goStep(step - 1)}>← Back</button>}
      <div className="merch-shop-actions__total">{totals.quantity} tee{totals.quantity === 1 ? "" : "s"} / merchandise<strong>{money(totals.totalMinor)}</strong></div>
      {step === 0 && <>{totals.discountMinor > 0 && <span className="merch-shop-actions__saving">{discount.percent}% off applied</span>}<button className="merch-button" type="button" disabled={!lines.length || !!editingKey} onClick={() => goStep(1)}>Review order →</button></>}
      {step === 1 && <button className="merch-button" type="submit" form="merch-pay-form" disabled={!canPay || submitting}>{submitting ? "Opening secure checkout…" : "Proceed to pay ↗"}</button>}
    </div>
  </>;
}
