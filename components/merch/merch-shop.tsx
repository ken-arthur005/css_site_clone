"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { TransitionLink } from "@/components/transitions/transition-link";
import { useSmoothScroll } from "@/components/providers/smooth-scroll-provider";
import { addLine, CART_KEY, calculateTotals, describeLine, findProduct, lineKey, money, normalizeLine, normalizeStoredLines, productIsOpen, unitPrice, updateLine, validateLine } from "@/lib/merch/order";
import { selectionIssue, stockIssue, unitsByProduct, withCatalogPricing } from "@/lib/merch/catalog";
import { defaultDraft } from "@/lib/merch/draft";
import type { ApiOrder, MerchStoreContent, MomoProvider, ProductId, PromoCheck, ShopLine } from "@/types/merch-store";
import { MerchOrderShelf, type ShelfFeedback } from "./merch-order-shelf";
import { MerchReviewCart, reviewLineId } from "./merch-review-cart";
import { Quantity } from "./merch-quantity";
import { MerchImage } from "./merch-image";
import { rememberOrderReference, saveCheckoutOrder, storedValue, useMerchCart } from "./use-merch-cart";
import { useMerchCatalog } from "./use-merch-catalog";
import { useOrderReconciliation } from "./use-order-reconciliation";
import { NETWORKS, PaySheet, type PayMethod } from "./shop/pay-sheet";
import { ShopOptions } from "./shop/shop-options";
import { ShopPicker } from "./shop/shop-picker";
import { ShopPreview, type PreviewSide } from "./shop/shop-preview";

const stepNames = ["Build your order", "Review & pay"];
const stepHashes = ["build", "review"];
const subscribeHydration = () => () => {};

export function MerchShop({ content: localContent, initialProduct, initialColourway }: {
  content: MerchStoreContent; initialProduct: ProductId; initialColourway?: string;
}) {
  const router = useRouter();
  const { catalog, error: catalogError, refresh: refreshCatalog } = useMerchCatalog();
  const content = useMemo(() => withCatalogPricing(localContent, catalog), [localContent, catalog]);
  const requested = findProduct(content, initialProduct);
  // Old links may point at an edition that has ended: start on an open product.
  const seed = requested && productIsOpen(requested, new Date(), content) ? requested : content.products.find((item) => productIsOpen(item, new Date(), content)) ?? content.products[0];
  const { lines, setLines } = useMerchCart(content);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const { checkPreviousOrder, pending, resumeUrl: pendingPaymentUrl, lastReceipt } = useOrderReconciliation(localContent);
  const { scrollToPosition } = useSmoothScroll();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ShopLine>(() => defaultDraft(seed, content, null, undefined, initialColourway));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const beforeEdit = useRef<ShopLine | null>(null);
  const [feedback, setFeedback] = useState<ShelfFeedback | null>(null);
  const feedbackSequence = useRef(0);
  const [addFeedbackSequence, setAddFeedbackSequence] = useState(0);
  const [removed, setRemoved] = useState<{ line: ShopLine; index: number } | null>(null);
  const [side, setSide] = useState<PreviewSide>("front");
  const [selectedReviewKey, setSelectedReviewKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoCheck | null>(null);
  const [promoState, setPromoState] = useState<{ checking: boolean; message: string }>({ checking: false, message: "" });
  const [payKind, setPayKind] = useState<"momo" | "card">("momo");
  const [network, setNetwork] = useState<MomoProvider>("mtn");
  const [paying, setPaying] = useState<{ order: ApiOrder; method: PayMethod } | null>(null);
  // The order placed for this exact cart; paying again reuses it instead of
  // placing a second order (the backend allows only two unpaid ones per buyer).
  const openOrder = useRef<{ order: ApiOrder; signature: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
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

  const product = findProduct(content, draft.productId)!;
  const normalizedDraft = normalizeLine(draft, content);
  const totals = calculateTotals(lines, content, catalog, promo);
  const units = totals.quantity;
  const activeReviewKey = lines.some((line) => lineKey(line) === selectedReviewKey) ? selectedReviewKey : null;
  const added = normalizedDraft && feedback?.sequence === addFeedbackSequence && feedback.key === lineKey(normalizedDraft) ? feedback : null;
  const stockError = stockIssue(lines, content, catalog);
  const unavailableLines = !!stockError || lines.some((line) => !!selectionIssue(line, content, catalog));
  const canPay = !!catalog && lines.length > 0 && !unavailableLines && !paying;
  const draftIssue = normalizedDraft ? selectionIssue({ ...normalizedDraft, quantity: Math.min(normalizedDraft.quantity, content.maxQuantity) }, content, catalog) : "Choose a size for every piece, and check the name on the back.";
  const draftPrice = normalizedDraft ? unitPrice(normalizedDraft, content, catalog) * normalizedDraft.quantity : 0;
  const description = normalizedDraft ? describeLine(normalizedDraft, content) : null;

  function goStep(next: number) {
    if (submitting || (next === 1 && editingKey)) return;
    setStep(next); setError(""); setMessage("");
    history.pushState({ ...history.state }, "", `#${stepHashes[next]}`);
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); scrollToPosition({ x: 0, y: 0 }); });
  }

  function chooseProduct(id: ProductId) {
    const chosen = findProduct(content, id)!;
    setDraft(defaultDraft(chosen, content, catalog, draft));
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

  function commitLines(next: ShopLine[]) {
    if (catalog) {
      for (const line of next) {
        const previous = lines.find((item) => lineKey(item) === lineKey(line));
        if (!previous || line.quantity > previous.quantity) {
          const issue = selectionIssue(line, content, catalog);
          if (issue) throw new Error(issue);
        }
      }
      // Reductions and removals must remain possible even after stock changes.
      const before = unitsByProduct(lines, content);
      for (const [id, count] of unitsByProduct(next, content)) {
        const stock = catalog.products[id]?.stock_quantity;
        if (stock != null && count > stock && count > (before.get(id) ?? 0)) throw new Error(`${findProduct(content, id)?.name ?? "This item"} has ${stock} available. Please adjust your quantities.`);
      }
    }
    setLines(next);
  }

  function notify(line: ShopLine, action: ShelfFeedback["action"]) {
    setFeedback({ key: lineKey(line), sequence: ++feedbackSequence.current, action });
  }

  function addToOrder() {
    setError("");
    if (!normalizedDraft) { setError("Choose a size for every piece, and check the name on the back."); return; }
    if (normalizedDraft.quantity > content.maxQuantity) { setError(`Choose up to ${content.maxQuantity} of this item.`); return; }
    if (draftIssue) { setError(draftIssue); return; }
    try {
      const next = editingKey ? updateLine(lines, editingKey, normalizedDraft, content.maxQuantity) : addLine(lines, normalizedDraft, content.maxQuantity);
      commitLines(next);
      const count = next.reduce((sum, line) => sum + line.quantity, 0);
      const merged = !!editingKey && lines.some((line) => lineKey(line) !== editingKey && lineKey(line) === lineKey(normalizedDraft));
      notify(normalizedDraft, editingKey ? "Updated" : "Added");
      setAddFeedbackSequence(feedbackSequence.current);
      setEditingKey(null); beforeEdit.current = null;
      setMessage(`${description?.label} ${editingKey ? "updated" : "added"}.${merged ? " Matching selections combined." : ""} ${count} ${count === 1 ? "item" : "items"} in your order.`);
      setDraft({ ...normalizedDraft, quantity: 1 });
    } catch (failure) { setError(failure instanceof Error ? failure.message : "This item could not be added."); }
  }

  function editLine(line: ShopLine) {
    beforeEdit.current = draft;
    goStep(0); setDraft({ ...line }); setEditingKey(lineKey(line)); setSide("front"); setFeedback(null);
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); scrollToPosition({ x: 0, y: 0 }); });
  }

  function cancelEdit() {
    if (beforeEdit.current) setDraft(beforeEdit.current);
    beforeEdit.current = null; setEditingKey(null); setError(""); setMessage("Edit cancelled. Your order is unchanged.");
  }

  function changeQuantity(line: ShopLine, quantity: number) {
    setError("");
    try {
      if (!Number.isInteger(quantity) || quantity < 1 || (quantity > content.maxQuantity && quantity >= line.quantity)) throw new Error(`Choose between 1 and ${content.maxQuantity}.`);
      const next = lines.map((other) => lineKey(other) === lineKey(line) ? { ...other, quantity } : other);
      commitLines(next); notify(line, "Updated");
      setMessage(`${describeLine(line, content).title}: quantity ${quantity}.`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Quantity could not be updated."); }
  }

  function removeLine(line: ShopLine) {
    setRemoved({ line, index: lines.findIndex((other) => lineKey(other) === lineKey(line)) });
    setLines(lines.filter((other) => lineKey(other) !== lineKey(line)));
    if (editingKey === lineKey(line)) cancelEdit();
    setFeedback(null); setError(""); setMessage(`${describeLine(line, content).label} removed from your order.`);
  }

  function undoRemoval() {
    if (!removed) return;
    try {
      const next = addLine(lines, removed.line, Math.max(content.maxQuantity, removed.line.quantity));
      if (!lines.some((line) => lineKey(line) === lineKey(removed.line))) {
        const restored = next.pop()!;
        next.splice(Math.min(removed.index, next.length), 0, restored);
      }
      commitLines(next); notify(removed.line, "Added"); setRemoved(null); setError(""); setMessage("Item restored to your order.");
      requestAnimationFrame(() => (document.getElementById("merch-shelf-title") ?? heading.current)?.focus({ preventScroll: true }));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "This item could not be restored."); }
  }

  async function applyPromo(event?: FormEvent) {
    event?.preventDefault();
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoState({ checking: true, message: "" });
    try {
      const response = await fetch(`/api/merch/promo/${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "That code couldn’t be checked.");
      setPromo(data as PromoCheck);
      const saving = calculateTotals(lines, content, catalog, data as PromoCheck).discountMinor;
      setPromoState({ checking: false, message: saving > 0 ? `Code applied: you save ${money(saving)}.` : (data as PromoCheck).kind === "bundle" ? "Code saved. It lowers the price of bundles; add a bundle to use it." : "Code saved." });
    } catch (failure) {
      setPromo(null);
      setPromoState({ checking: false, message: failure instanceof Error ? failure.message : "That code couldn’t be checked." });
    }
  }

  function removePromo() { setPromo(null); setPromoInput(""); setPromoState({ checking: false, message: "Code removed." }); }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || submitting || !canPay) return;
    setError("");
    if (!lines.every((line) => validateLine(line, content))) { setError("Please remove any item whose ordering period has ended."); return; }
    const data = new FormData(event.currentTarget);
    const buyer = { name: String(data.get("name") ?? ""), email: String(data.get("email") ?? ""), phone: String(data.get("phone") ?? "") };
    const momoPhone = String(data.get("momo") ?? "").trim() || buyer.phone;
    submitLock.current = true; setSubmitting(true);
    const controller = new AbortController(); orderAbort.current = controller;
    try {
      await checkPreviousOrder();
      if (controller.signal.aborted) return;
      let currentLines: ShopLine[] = [];
      try { currentLines = normalizeStoredLines(JSON.parse(storedValue(CART_KEY) || "[]"), content); } catch { /* An invalid draft needs rebuilding. */ }
      if (JSON.stringify(currentLines) !== JSON.stringify(lines)) { setMessage("Your cart has been updated. Review your selections before paying."); return; }
      const method: PayMethod = payKind === "momo" ? { kind: "momo", provider: network, phone: momoPhone } : { kind: "card" };
      const signature = JSON.stringify({ lines, promo: promo?.code ?? "", buyer });
      const reusable = openOrder.current;
      if (reusable && reusable.signature === signature && (!reusable.order.expires_at || Date.parse(reusable.order.expires_at) > Date.now() + 60000)) {
        setPaying({ order: reusable.order, method });
        return;
      }
      const response = await fetch("/api/merch/orders", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ buyer, lines, promoCode: promo?.code ?? "" }) });
      const output = await response.json();
      if (!response.ok) {
        if (output.error?.orderId) rememberOrderReference(output.error.orderId, lines);
        void refreshCatalog();
        throw new Error(output.error?.message ?? "Your order could not be placed. Please try again.");
      }
      const order = output as ApiOrder;
      saveCheckoutOrder(order, lines);
      openOrder.current = { order, signature };
      setPaying({ order, method });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Your order could not be placed.");
    } finally { submitLock.current = false; if (!controller.signal.aborted) setSubmitting(false); }
  }

  function paid(id: string) {
    setPaying(null); openOrder.current = null;
    router.push(`/merch/order/${id}`);
  }

  const stageTag = product.kind === "bundle" ? `${product.name} · ${product.pieces?.length} pieces` : product.name;
  return <>
    <div className="merch-shop-top"><TransitionLink href="/merch" transitionLabel="MERCH">← Back to merch</TransitionLink><strong>CSS MERCH / ORDER BUILDER</strong><TransitionLink href="/merch/orders" transitionLabel="MY ORDERS" className="merch-label">My orders ↗</TransitionLink></div>
    <ol className="merch-stepper" aria-label="Order steps">{stepNames.map((name, index) => <li key={name} aria-current={step === index ? "step" : undefined}><button type="button" disabled={submitting || (index === 1 && (!lines.length || !!editingKey))} onClick={() => goStep(index)}><span>{index + 1}</span>{name}</button></li>)}</ol>
    <div className="merch-builder">
      <aside className={`merch-builder__preview${step === 1 ? " merch-builder__preview--review" : ""}`} aria-label={step === 1 ? "Saved order preview" : "Selected item preview"}>
        {step === 1 ? <MerchReviewCart content={content} lines={lines} selectedKey={activeReviewKey} onSelect={selectReviewLine} onBuild={() => goStep(0)} /> : <>
          <div className="merch-builder__stage" key={`${draft.productId}-${side}`}>
            <span className="merch-label merch-builder__stage-tag">{editingKey ? "Editing" : "Currently configuring"} / {stageTag} / {side}</span>
            <ShopPreview content={content} line={draft} side={side} />
            <button className="merch-builder__flip" type="button" onClick={() => setSide(side === "front" ? "back" : "front")}>↻ See {side === "front" ? "back" : "front"}</button>
          </div>
          <div className="merch-builder__preview-caption"><strong>{description?.title ?? product.name}</strong><span>{description?.details.join(" · ")}</span></div>
          {product.kind === "tee" && draft.backName && <p className="merch-secure-note">The name preview shows placement. The print follows the official back layout.</p>}
        </>}
      </aside>
      <section className="merch-builder__panel" aria-labelledby="order-step-title" aria-busy={submitting}>
        <p className="merch-label">0{step + 1} / 02 · {stepNames[step]}</p>
        <h1 id="order-step-title" ref={heading} tabIndex={-1}>{step === 0 ? editingKey ? "Make an edit." : "Make it yours." : "Review & pay."}</h1>
        <p className="merch-builder__sub">{step === 0 ? editingKey ? "Update this selection, then save your changes." : "Pick a tee, the Lacoste or a bundle. Make it yours. Add it to your order." : "Check your order, add your details, then pay with Mobile Money or card, right here."}</p>
        {step === 0 && <>
          <ShopPicker content={content} catalog={catalog} selected={draft.productId} disabled={!!editingKey} onChoose={chooseProduct} />
          <p className="merch-pick-description">{product.description}</p>
          <ShopOptions content={content} catalog={catalog} draft={draft} maxQuantity={content.maxQuantity} onChange={(next) => { setDraft(next); setError(""); }} />
          <details className="merch-size-guide"><summary>Find your size ↗</summary><table><caption className="sr-only">Measurements in inches</caption><thead><tr><th scope="col">Size</th><th scope="col">Chest (in)</th><th scope="col">Length (in)</th></tr></thead><tbody>{content.sizes.map((size) => <tr key={size.id}><th scope="row">{size.id}</th><td>{size.chest}</td><td>{size.length}</td></tr>)}</tbody></table><p>Between sizes? Consider sizing up. We’ll check availability once more when you pay.</p></details>
          {draftIssue && normalizedDraft && <p className="merch-notice" role="status">{draftIssue}</p>}
          {catalogError && <p className="merch-notice" role="status">{catalogError} Prices below are estimates. <button type="button" onClick={() => void refreshCatalog()}>Retry connection</button></p>}
          <div className="merch-builder__add"><p>{!catalog && "Estimate · "}This selection · {draft.quantity} {draft.quantity === 1 ? "item" : "items"}<strong>{money(draftPrice)}</strong></p><button className="merch-button" data-added={!!added && !editingKey || undefined} type="button" disabled={!hydrated || !!draftIssue} onClick={addToOrder}>{editingKey ? "Save changes" : added ? `${added.action} ✓` : "Add to order"} <span aria-hidden="true">{editingKey ? "↗" : "+"}</span></button></div>
          {editingKey ? <button className="merch-text-button" type="button" onClick={cancelEdit}>Cancel edit</button> : <p className="merch-secure-note">Changing options only changes this preview. Add your selection to save it in your order.</p>}
        </>}
        {step === 1 && <>
          {!lines.length ? <div className="merch-empty"><h2>Your order starts here.</h2><p>Choose a tee, the Lacoste or a bundle and add it to your order.</p><button className="merch-button" type="button" onClick={() => goStep(0)}>Start shopping ↗</button></div> : <>
            <div className="merch-cart" aria-label="Items in your order">{lines.map((line) => {
              const info = describeLine(line, content);
              const issue = selectionIssue(line, content, catalog);
              return <article className="merch-cart-line" key={lineKey(line)} id={reviewLineId(line)} tabIndex={-1} aria-label={info.label} data-selected={activeReviewKey === lineKey(line) || undefined} onFocusCapture={() => setSelectedReviewKey(lineKey(line))}>
                <div className="merch-cart-line__image">{info.image && <MerchImage src={info.image} alt="" sizes="72px" />}</div>
                <div><h3>{info.title}</h3><p>{info.details.join(" · ")}</p>{issue && <p className="merch-form-error">{issue} Edit or remove this selection.</p>}{line.quantity > content.maxQuantity && <p className="merch-form-error">Reduce this quantity to {content.maxQuantity} or fewer.</p>}
                  <div className="merch-cart-line__actions"><Quantity quantity={line.quantity} max={content.maxQuantity} label={`${info.label} quantity`} disabled={submitting} onChange={(quantity) => changeQuantity(line, quantity)} /><button type="button" disabled={submitting} aria-label={`Edit ${info.label}`} onClick={() => editLine(line)}>Edit</button><button type="button" disabled={submitting} aria-label={`Remove ${info.label}`} onClick={() => { removeLine(line); requestAnimationFrame(() => heading.current?.focus({ preventScroll: true })); }}>Remove</button></div>
                </div>
                <strong>{money(unitPrice(line, content, catalog) * line.quantity)}</strong>
              </article>;
            })}</div>
            <button className="merch-text-button" type="button" onClick={() => goStep(0)}>Add something else +</button>
            <form className="merch-promo" onSubmit={applyPromo} aria-label="Promo code">
              {promo ? <p className="merch-promo__applied"><span>Code <strong>{promo.code}</strong></span><button type="button" className="merch-text-button" onClick={removePromo}>Remove</button></p> : <label>Got a code?<span><input value={promoInput} onChange={(event) => setPromoInput(event.target.value.toUpperCase())} maxLength={32} autoComplete="off" spellCheck={false} placeholder="e.g. BUNDLE-XXXX" /><button type="submit" className="merch-button merch-button--secondary" disabled={promoState.checking || promoInput.trim().length < 3}>{promoState.checking ? "Checking…" : "Apply"}</button></span></label>}
              {promoState.message && <p className="merch-secure-note" role="status">{promoState.message}</p>}
            </form>
            <dl className="merch-totals"><div><dt>Your items</dt><dd>{money(totals.subtotalMinor)}</dd></div>{totals.discountMinor > 0 && <div className="merch-totals__discount"><dt>Code {promo?.code}</dt><dd>−{money(totals.discountMinor)}</dd></div>}<div><dt>Processing fee</dt><dd>Added at payment</dd></div><div className="merch-totals__total"><dt>Merchandise total</dt><dd>{money(totals.totalMinor)}</dd></div></dl>
            {catalogError ? <p className="merch-notice" role="status">{catalogError} Prices shown are estimates.<button type="button" onClick={() => void refreshCatalog()}>Try again</button></p> : !canPay && !paying && <p className="merch-notice" role="status">{catalog === null ? "Checking your items…" : stockError ?? (unavailableLines ? "An item in your order is unavailable. Please update your selection." : "Checkout is temporarily unavailable. Your items are saved on this device.")}</p>}
            <form className="merch-contact" id="merch-pay-form" onSubmit={createOrder}>
              <fieldset disabled={submitting || !!paying}><legend>Your details</legend><label>Full name<input name="name" autoComplete="name" required maxLength={150} /></label><div className="merch-contact__pair"><label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label><label>Phone<input name="phone" type="tel" autoComplete="tel" required pattern={String.raw`\+?[0-9\s\(\)\-]{9,20}`} maxLength={20} placeholder="024 000 0000" /></label></div></fieldset>
              <fieldset className="merch-pay-method" disabled={submitting || !!paying}><legend>Pay with</legend>
                <div className="merch-options__buttons" role="group" aria-label="Payment method">{(["momo", "card"] as const).map((kind) => <button key={kind} type="button" aria-pressed={payKind === kind} onClick={() => setPayKind(kind)}>{kind === "momo" ? "Mobile Money" : "Card"}</button>)}</div>
                {payKind === "momo" ? <>
                  <div className="merch-options__buttons" role="group" aria-label="Mobile Money network">{NETWORKS.map((item) => <button key={item.id} type="button" aria-pressed={network === item.id} onClick={() => setNetwork(item.id)}>{item.name}</button>)}</div>
                  <label>Mobile Money number <small>Leave empty to use your phone number above</small><input name="momo" type="tel" inputMode="tel" autoComplete="tel" pattern={String.raw`\+?[0-9\s\(\)\-]{9,20}`} maxLength={20} placeholder="024 000 0000" /></label>
                  <p className="merch-secure-note">You’ll get a prompt on your phone to approve the payment. No redirect.</p>
                </> : <p className="merch-secure-note">Paystack’s secure card form opens on this page. We never see your card details.</p>}
              </fieldset>
            </form>
            <p className="merch-secure-note">A processing fee is added to the merchandise total and shown before you approve. After payment, your receipt shows your pickup code, and we text you when it’s ready.</p>
          </>}
        </>}
        {lastReceipt && <p className="merch-order-history"><TransitionLink href={`/merch/order/${lastReceipt}`} transitionLabel="YOUR RECEIPT">View your last receipt ↗</TransitionLink></p>}
        {pending && <details className="merch-order-history"><summary>An earlier checkout is unfinished</summary><p>You can finish that order or pay for the items in your cart now.</p><TransitionLink href={`/merch/order/${pending.id}`} transitionLabel="YOUR ORDER">View earlier order ↗</TransitionLink>{pendingPaymentUrl && <a href={pendingPaymentUrl}>Resume earlier payment ↗</a>}</details>}
        <p className="merch-form-error" role="alert">{error}</p>
        <noscript><p className="merch-notice">Enable JavaScript to build an order and pay. You can still explore the collection and size information on the merch page.</p></noscript>
      </section>
    </div>
    <div className="merch-order-feedback"><p role="status">{message}</p>{removed && <button type="button" disabled={submitting} onClick={undoRemoval}>Undo removal ↶</button>}</div>
    {step === 0 && <MerchOrderShelf content={content} catalog={catalog} lines={lines} editingKey={editingKey} feedback={feedback} disabled={submitting} onEdit={editLine} onRemove={removeLine} onQuantity={changeQuantity} />}
    <div className="merch-shop-actions">
      {step > 0 && <button type="button" className="merch-button merch-button--secondary" disabled={submitting} onClick={() => goStep(step - 1)}>← Back</button>}
      <div className="merch-shop-actions__total">{units} {units === 1 ? "item" : "items"} / merchandise<strong>{money(totals.totalMinor)}</strong></div>
      {step === 0 && <>{totals.discountMinor > 0 && <span className="merch-shop-actions__saving">Code applied</span>}<button className="merch-button" type="button" disabled={!lines.length || !!editingKey} onClick={() => goStep(1)}>Review order →</button></>}
      {step === 1 && <button className="merch-button" type="submit" form="merch-pay-form" disabled={!canPay || submitting}>{submitting ? "Placing your order…" : payKind === "momo" ? "Pay with Mobile Money ↗" : "Pay by card ↗"}</button>}
    </div>
    {paying && <PaySheet order={paying.order} method={paying.method} onPaid={paid} onClose={() => setPaying(null)} />}
  </>;
}
