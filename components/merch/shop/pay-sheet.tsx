"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { money, minorOf, orderPhase, paymentHref } from "@/lib/merch/order";
import type { ApiOrder, ChargeResult, MomoProvider } from "@/types/merch-store";

export const NETWORKS: { id: MomoProvider; name: string; help: string }[] = [
  { id: "mtn", name: "MTN MoMo", help: "No prompt? Dial *170#, choose My Wallet, then My Approvals, and approve it there." },
  { id: "vod", name: "Telecel Cash", help: "No prompt? Dial *110#, choose Approve Payments (or Make Payments, then Approvals)." },
  { id: "atl", name: "AirtelTigo Money", help: "No prompt? Dial *110#, choose Wallet, then Approvals." },
];

export type PayMethod = { kind: "momo"; provider: MomoProvider; phone: string } | { kind: "card" };

type Sheet =
  | { step: "working"; title: string; body?: string }
  | { step: "approve"; body: string }
  | { step: "otp"; body: string }
  | { step: "stopped"; title: string; body: string }
  | { step: "waiting" };

declare global {
  interface Window { PaystackPop?: new () => { resumeTransaction: (accessCode: string, callbacks: { onSuccess?: () => void; onCancel?: () => void; onError?: () => void }) => void } }
}

let paystackScript: Promise<boolean> | null = null;
function loadPaystack(): Promise<boolean> {
  if (window.PaystackPop) return Promise.resolve(true);
  paystackScript ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    script.onload = () => resolve(!!window.PaystackPop);
    script.onerror = () => { paystackScript = null; resolve(false); };
    document.head.appendChild(script);
    window.setTimeout(() => resolve(!!window.PaystackPop), 8000);
  });
  return paystackScript;
}

async function postJson(url: string, body: unknown): Promise<ChargeResult> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message ?? "The payment couldn’t be started. Try again.");
  return data as ChargeResult;
}

const wasCancelled = (message: string) => /cancel|declin|reject|abandon/i.test(message);

/**
 * The pay screen shown over the review step once the order exists. Mobile Money
 * is charged on this page (approve the prompt on the phone); cards use
 * Paystack's popup. Either way the order is confirmed by polling our backend,
 * never by what a popup reports.
 */
export function PaySheet({ order, method, onPaid, onClose }: {
  order: ApiOrder; method: PayMethod; onPaid: (id: string) => void; onClose: () => void;
}) {
  const [sheet, setSheet] = useState<Sheet>({ step: "working", title: method.kind === "momo" ? "Sending the payment to your phone…" : "Opening secure card payment…" });
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const watch = useRef<{ stop: () => void } | null>(null);
  const started = useRef(false);
  const network = method.kind === "momo" ? NETWORKS.find(({ id }) => id === method.provider) : undefined;
  const total = money(minorOf(order.total) ?? 0);

  useEffect(() => { heading.current?.focus(); }, [sheet.step]);
  useEffect(() => () => watch.current?.stop(), []);

  /** Ask our server (which asks Paystack) until the order is paid. */
  function watchPaid(seconds: number, onTimeout: () => void) {
    watch.current?.stop();
    let stopped = false;
    let timer: number | undefined;
    const startedAt = Date.now();
    const check = async () => {
      if (stopped) return;
      try {
        const response = await fetch(`/api/merch/orders/${encodeURIComponent(order.id)}`, { cache: "no-store" });
        const data: ApiOrder = await response.json();
        if (response.ok && orderPhase(data.status) === "paid") { stopped = true; onPaid(order.id); return; }
        if (response.ok && orderPhase(data.status) === "closed") { stopped = true; setSheet({ step: "stopped", title: "This order has expired.", body: "No payment was confirmed in time. Your items are still in your cart; place the order again to pay." }); return; }
      } catch { /* try again on the next tick */ }
      if (!stopped && Date.now() - startedAt < seconds * 1000) timer = window.setTimeout(check, 4000);
      else if (!stopped) { stopped = true; onTimeout(); }
    };
    timer = window.setTimeout(check, 3000);
    watch.current = { stop() { stopped = true; window.clearTimeout(timer); } };
  }

  function waitForApproval(body: string) {
    setSheet({ step: "approve", body });
    watchPaid(4 * 60, () => setSheet({ step: "waiting" }));
  }

  function handleCharge(result: ChargeResult) {
    if (result.status === "success") { setSheet({ step: "working", title: "Confirming your payment…", body: "This only takes a moment." }); watchPaid(90, () => setSheet({ step: "waiting" })); return; }
    if (result.status === "send_otp") { setSheet({ step: "otp", body: result.message || "Your network sent you a one-time code. Enter it below." }); return; }
    if (result.status === "failed") {
      setSheet({ step: "stopped", title: wasCancelled(result.message) ? "Payment cancelled." : "Payment didn’t go through.", body: result.message || "Your network didn’t approve the payment. No money was taken; you can try again." });
      return;
    }
    waitForApproval(result.message || (method.kind === "momo" ? `We’ve sent a request to ${method.phone}. Approve it on your phone to pay ${total}.` : ""));
  }

  async function chargeMomo() {
    if (method.kind !== "momo") return;
    setSheet({ step: "working", title: "Sending the payment to your phone…", body: `${network?.name} · ${method.phone}` });
    try { handleCharge(await postJson(`/api/merch/orders/${encodeURIComponent(order.id)}/momo`, { phone: method.phone, provider: method.provider })); }
    catch (failure) { setSheet({ step: "stopped", title: "Payment didn’t start.", body: failure instanceof Error ? failure.message : "Try again in a moment." }); }
  }

  async function payByCard() {
    const fallback = paymentHref(order.authorization_url);
    const ready = !!order.access_code && await loadPaystack();
    if (!ready || !window.PaystackPop) { if (fallback) location.assign(fallback); else setSheet({ step: "stopped", title: "Card payment is unavailable.", body: "Pay with Mobile Money instead, or try again shortly." }); return; }
    setSheet({ step: "working", title: "Complete your card payment in the secure Paystack window.", body: `Total ${total}.` });
    try {
      new window.PaystackPop().resumeTransaction(order.access_code!, {
        onSuccess: () => { setSheet({ step: "working", title: "Confirming your payment…", body: "This only takes a moment." }); watchPaid(5 * 60, () => setSheet({ step: "waiting" })); },
        onCancel: () => setSheet({ step: "stopped", title: "Payment cancelled.", body: "No money was taken. You can try again, or pay with Mobile Money." }),
        onError: () => { if (fallback) location.assign(fallback); },
      });
    } catch { if (fallback) location.assign(fallback); }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Kick off the chosen method once, when the sheet opens.
    queueMicrotask(() => void (method.kind === "momo" ? chargeMomo() : payByCard()));
  });

  async function submitOtp(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try { handleCharge(await postJson(`/api/merch/orders/${encodeURIComponent(order.id)}/otp`, { otp })); setOtp(""); }
    catch (failure) { setSheet({ step: "otp", body: failure instanceof Error ? failure.message : "That code didn’t work. Check it and try again." }); }
    finally { setBusy(false); }
  }

  function retry() { watch.current?.stop(); void (method.kind === "momo" ? chargeMomo() : payByCard()); }
  function close() { watch.current?.stop(); onClose(); }

  const busyStep = sheet.step === "working" || sheet.step === "approve";
  return <div className="merch-pay-sheet" role="dialog" aria-modal="true" aria-labelledby="merch-pay-title" aria-busy={busyStep}>
    <div className="merch-pay-sheet__panel">
      <p className="merch-label">Secure payment · {total}</p>
      {sheet.step === "working" && <><h2 id="merch-pay-title" ref={heading} tabIndex={-1}>{sheet.title}</h2>{sheet.body && <p>{sheet.body}</p>}<span className="merch-pay-sheet__spinner" aria-hidden="true" /></>}
      {sheet.step === "approve" && <>
        <h2 id="merch-pay-title" ref={heading} tabIndex={-1}>Approve the payment on your phone.</h2>
        <p role="status">{sheet.body}</p>
        <span className="merch-pay-sheet__spinner" aria-hidden="true" />
        {network && <p className="merch-secure-note">{network.help}</p>}
        <p className="merch-secure-note">Keep this page open. We’ll confirm as soon as it’s paid.</p>
      </>}
      {sheet.step === "otp" && <form onSubmit={submitOtp}>
        <h2 id="merch-pay-title" ref={heading} tabIndex={-1}>Enter the code from your phone.</h2>
        <p role="status">{sheet.body}</p>
        <label className="merch-name-field"><span>One-time code</span><input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={12} required /></label>
        <button className="merch-button" type="submit" disabled={busy || otp.trim().length < 3}>{busy ? "Checking…" : "Confirm code"}</button>
      </form>}
      {sheet.step === "stopped" && <><h2 id="merch-pay-title" ref={heading} tabIndex={-1}>{sheet.title}</h2><p role="alert">{sheet.body}</p><button className="merch-button" type="button" onClick={retry}>Try again</button></>}
      {sheet.step === "waiting" && <>
        <h2 id="merch-pay-title" ref={heading} tabIndex={-1}>Payment not confirmed yet.</h2>
        <p role="status">We haven’t received a confirmation. If you approved it, it will show on your receipt in a few minutes. <strong>If you didn’t, no money was taken</strong>; you can try again.</p>
        <div className="merch-pay-sheet__actions"><button className="merch-button" type="button" onClick={retry}>Try again</button><button className="merch-button merch-button--secondary" type="button" onClick={() => onPaid(order.id)}>View receipt</button></div>
      </>}
      <button className="merch-text-button merch-pay-sheet__close" type="button" onClick={close}>{busyStep ? "Close (the payment continues on your phone)" : "Close"}</button>
    </div>
  </div>;
}
