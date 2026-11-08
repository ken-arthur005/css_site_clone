"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import { money, ORDER_HISTORY_KEY } from "@/lib/merch/order";
import {
  cedisToMinor, isDeviceId, MAGAZINE_AMOUNTS, MAGAZINE_DEVICE_KEY, MAGAZINE_EDITIONS, MAGAZINE_MAX_COPIES, MAGAZINE_MIN_MINOR,
  MAGAZINE_REFS_KEY, magazineAmountIssue, magazineTotals, minorToCedis, parseMagazineSession,
  type MagazineCopies, type MagazineSession,
} from "@/lib/merch/magazine";
import type { ApiOrder, MomoProvider } from "@/types/merch-store";
import { NETWORKS, PaySheet, type PayMethod } from "../shop/pay-sheet";
import { saveStoredValue, storedValue, useStoredValue } from "../use-merch-cart";
import { MagazineJar } from "./magazine-jar";
import { MagazineReader } from "./magazine-reader";

function deviceId(): string {
  const saved = storedValue(MAGAZINE_DEVICE_KEY);
  if (isDeviceId(saved)) return saved;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  saveStoredValue(MAGAZINE_DEVICE_KEY, id);
  return id;
}

function readRefs(raw: string): string[] {
  try { const refs = JSON.parse(raw || "[]"); return Array.isArray(refs) ? refs.filter((ref): ref is string => typeof ref === "string").slice(0, 10) : []; }
  catch { return []; }
}

/** Remember an order on this device: for "Read my magazine" and for My orders. */
function remember(id: string) {
  const refs = readRefs(storedValue(MAGAZINE_REFS_KEY)).filter((ref) => ref !== id);
  saveStoredValue(MAGAZINE_REFS_KEY, JSON.stringify([id, ...refs].slice(0, 10)));
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  let history: unknown[] = [];
  try { const raw = JSON.parse(storedValue(ORDER_HISTORY_KEY) || "[]"); if (Array.isArray(raw)) history = raw; } catch { /* start a new history */ }
  const others = history.filter((entry) => (entry as { id?: unknown })?.id !== id);
  saveStoredValue(ORDER_HISTORY_KEY, JSON.stringify([{ id, lines: [], ownsCart: false, reconciled: true }, ...others].slice(0, 20)));
}

export function MagazineStore({ readRef = "" }: { readRef?: string }) {
  const [copies, setCopies] = useState<MagazineCopies>({ female: 0, male: 0 });
  const [chip, setChip] = useState(MAGAZINE_MIN_MINOR);
  const [custom, setCustom] = useState("");
  const [payKind, setPayKind] = useState<"momo" | "card">("momo");
  const [network, setNetwork] = useState<MomoProvider>("mtn");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState<{ order: ApiOrder; method: PayMethod } | null>(null);
  const [session, setSession] = useState<MagazineSession | null>(null);
  const [opening, setOpening] = useState("");
  const [readError, setReadError] = useState("");
  const [refInput, setRefInput] = useState("");
  const [jarKey, setJarKey] = useState(0);
  const openOrder = useRef<{ order: ApiOrder; signature: string } | null>(null);
  const opened = useRef(false);
  const refs = readRefs(useStoredValue(MAGAZINE_REFS_KEY));

  const customMinor = custom ? cedisToMinor(custom) : null;
  const amountMinor = custom ? customMinor ?? 0 : chip;
  const amountIssue = custom ? magazineAmountIssue(customMinor) : null;
  const { count, totalMinor, extraMinor } = magazineTotals(copies, amountMinor);

  const openReader = useCallback(async (ref: string) => {
    setReadError(""); setOpening(ref);
    try {
      const response = await fetch("/api/merch/magazine/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref, device: deviceId() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message ?? "Couldn’t open the magazine. Try again.");
      const next = parseMagazineSession(data);
      if (!next) throw new Error("Couldn’t open the magazine. Try again.");
      remember(next.id);
      setSession(next);
      history.replaceState(history.state, "", `/merch/magazine?read=${encodeURIComponent(next.id)}`);
    } catch (failure) {
      setReadError(failure instanceof Error ? failure.message : "Couldn’t open the magazine. Try again.");
      document.getElementById("merch-mag-read")?.scrollIntoView({ block: "center", behavior: "smooth" });
    } finally { setOpening(""); }
  }, []);

  useEffect(() => {
    if (!readRef || opened.current) return;
    opened.current = true;
    queueMicrotask(() => void openReader(readRef));
  }, [readRef, openReader]);

  const closeReader = useCallback(() => { setSession(null); history.replaceState(history.state, "", "/merch/magazine"); }, []);
  const expired = useCallback(() => { const id = session?.id; setSession(null); if (id) void openReader(id); }, [session, openReader]);

  function step(edition: keyof MagazineCopies, by: number) {
    setCopies((current) => ({ ...current, [edition]: Math.max(0, Math.min(MAGAZINE_MAX_COPIES, current[edition] + by)) }));
  }

  async function buy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    if (!count) { setError("Add at least one magazine."); return; }
    if (amountIssue) { setError(amountIssue); return; }
    const data = new FormData(event.currentTarget);
    const buyer = { name: String(data.get("name") ?? "").trim(), email: String(data.get("email") ?? "").trim(), phone: String(data.get("phone") ?? "").trim() };
    const momoPhone = String(data.get("momo") ?? "").trim() || buyer.phone;
    const method: PayMethod = payKind === "momo" ? { kind: "momo", provider: network, phone: momoPhone } : { kind: "card" };
    const body = { buyer, copies, amount: minorToCedis(amountMinor) };
    const signature = JSON.stringify(body);
    const reusable = openOrder.current;
    if (reusable?.signature === signature && (!reusable.order.expires_at || Date.parse(reusable.order.expires_at) > Date.now() + 60000)) { setPaying({ order: reusable.order, method }); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/merch/magazine/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: signature });
      const output = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (typeof output.error?.orderId === "string") remember(output.error.orderId);
        throw new Error(output.error?.message ?? "Your order could not be placed. Please try again.");
      }
      const order = output as ApiOrder;
      remember(order.id);
      openOrder.current = { order, signature };
      setPaying({ order, method });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Your order could not be placed.");
    } finally { setSubmitting(false); }
  }

  function paid(id: string) {
    setPaying(null); openOrder.current = null; setJarKey((key) => key + 1);
    void openReader(id);
  }

  function readTyped(event: FormEvent) {
    event.preventDefault();
    if (refInput.trim()) void openReader(refInput.trim());
  }

  return <>
    <section className="merch-mag" aria-labelledby="merch-mag-title">
      <div className="merch-mag__top"><TransitionLink href="/merch" transitionLabel="MERCH">← Back to merch</TransitionLink><TransitionLink href="/merch/orders" transitionLabel="MY ORDERS" className="merch-label">My orders ↗</TransitionLink></div>
      <div className="merch-mag__grid">
        <div className="merch-mag__main">
          <p className="merch-label merch-mag__kicker">{"// Pink October · fundraiser"}</p>
          <h1 id="merch-mag-title">Code &amp; Her. <span>Code &amp; Him.</span></h1>
          <p className="merch-mag__lede">The CSS Pink October magazine, in two editions. Pay GH₵5 or more per copy: every cedi goes to breast cancer care. Read it right here once you’ve paid.</p>

          <form className="merch-mag__form merch-contact" onSubmit={buy} aria-busy={submitting}>
            <fieldset disabled={submitting || !!paying}>
              <legend>1. Pick your edition</legend>
              <div className="merch-mag__editions">{MAGAZINE_EDITIONS.map((edition) => <div className="merch-mag__edition" key={edition.id} data-on={copies[edition.id] > 0 || undefined}>
                <button type="button" className="merch-mag__cover" onClick={() => { if (!copies[edition.id]) step(edition.id, 1); }} aria-label={`Add ${edition.name}`}>
                  <Image src={edition.cover} alt={`${edition.name} magazine cover`} width={420} height={594} draggable={false} sizes="(max-width: 700px) 45vw, 220px" />
                </button>
                <strong>{edition.name}: {edition.edition}</strong><span>from GH₵5</span>
                <div className="merch-mag__qty">
                  <button type="button" onClick={() => step(edition.id, -1)} disabled={!copies[edition.id]} aria-label={`One fewer ${edition.name}`}>−</button>
                  <output aria-live="polite" aria-label={`${edition.name} copies`}>{copies[edition.id]}</output>
                  <button type="button" onClick={() => step(edition.id, 1)} disabled={copies[edition.id] >= MAGAZINE_MAX_COPIES} aria-label={`One more ${edition.name}`}>+</button>
                </div>
              </div>)}</div>
            </fieldset>

            <fieldset disabled={submitting || !!paying}>
              <legend>2. How much per magazine?</legend>
              <div className="merch-options__buttons" role="group" aria-label="Amount per magazine">{MAGAZINE_AMOUNTS.map((cedis) => <button key={cedis} type="button" aria-pressed={!custom && chip === cedis * 100} onClick={() => { setChip(cedis * 100); setCustom(""); }}>GH₵{cedis}</button>)}</div>
              <label className="merch-mag__custom">Or your own amount (GH₵)<input value={custom} onChange={(event) => setCustom(event.target.value)} inputMode="decimal" placeholder="5 or more" aria-invalid={!!amountIssue || undefined} maxLength={9} /></label>
              {amountIssue && <p className="merch-form-error" role="alert">{amountIssue}</p>}
              <p className="merch-secure-note">GH₵5 is the price. Anything above it is an extra gift to the cause.</p>
            </fieldset>

            <fieldset disabled={submitting || !!paying}>
              <legend>3. Your details</legend>
              <label>Full name<input name="name" autoComplete="name" required maxLength={150} /></label>
              <div className="merch-contact__pair"><label>Email <small>for your receipt</small><input name="email" type="email" autoComplete="email" required maxLength={254} /></label><label>Phone<input name="phone" type="tel" autoComplete="tel" required pattern={String.raw`\+?[0-9\s\(\)\-]{9,20}`} maxLength={20} placeholder="024 000 0000" /></label></div>
            </fieldset>

            <fieldset className="merch-pay-method" disabled={submitting || !!paying}><legend>Pay with</legend>
              <div className="merch-options__buttons" role="group" aria-label="Payment method">{(["momo", "card"] as const).map((kind) => <button key={kind} type="button" aria-pressed={payKind === kind} onClick={() => setPayKind(kind)}>{kind === "momo" ? "Mobile Money" : "Card"}</button>)}</div>
              {payKind === "momo" ? <>
                <div className="merch-options__buttons" role="group" aria-label="Mobile Money network">{NETWORKS.map((item) => <button key={item.id} type="button" aria-pressed={network === item.id} onClick={() => setNetwork(item.id)}>{item.name}</button>)}</div>
                <label>Mobile Money number <small>Leave empty to use your phone number above</small><input name="momo" type="tel" inputMode="tel" autoComplete="tel" pattern={String.raw`\+?[0-9\s\(\)\-]{9,20}`} maxLength={20} placeholder="024 000 0000" /></label>
              </> : <p className="merch-secure-note">Paystack’s secure card form opens on this page. We never see your card details.</p>}
            </fieldset>

            <dl className="merch-totals">
              {MAGAZINE_EDITIONS.filter((edition) => copies[edition.id]).map((edition) => <div key={edition.id}><dt>{copies[edition.id]} × {edition.name}</dt><dd>{money(copies[edition.id] * amountMinor)}</dd></div>)}
              {extraMinor > 0 && <div className="merch-totals__discount"><dt>Your extra gift</dt><dd>{money(extraMinor)}</dd></div>}
              <div className="merch-totals__total"><dt>To the jar</dt><dd>{money(totalMinor)}</dd></div>
            </dl>
            <button className="merch-button merch-mag__pay" type="submit" disabled={submitting || !!paying || !count || !!amountIssue}>{submitting ? "Placing your order…" : !count ? "Add a magazine above" : payKind === "momo" ? "Pay with Mobile Money ↗" : "Pay by card ↗"}</button>
            <p className="merch-form-error" role="alert">{error}</p>
            <p className="merch-secure-note">A small payment fee is added so the full amount reaches the jar. Once you’ve paid, the magazine opens right here, on this device only.</p>
          </form>

          <section className="merch-mag__read" id="merch-mag-read" aria-labelledby="merch-mag-read-title">
            <h2 id="merch-mag-read-title">Already bought it?</h2>
            {refs.length > 0 && <div className="merch-mag__mine">{refs.map((ref) => <button key={ref} type="button" className="merch-button" disabled={!!opening} onClick={() => void openReader(ref)}>{opening === ref ? "Opening…" : refs.length > 1 ? `Read order ${ref.slice(0, 8)} ↗` : "Read my magazine ↗"}</button>)}</div>}
            <form onSubmit={readTyped} className="merch-mag__ref">
              <label>Your order code <small>The 7 digits on your receipt (or CSS-… from the old store)</small><input value={refInput} onChange={(event) => setRefInput(event.target.value)} autoComplete="off" spellCheck={false} maxLength={40} /></label>
              <button type="submit" className="merch-button merch-button--secondary" disabled={!refInput.trim() || !!opening}>{opening && opening === refInput.trim() ? "Opening…" : "Open"}</button>
            </form>
            <p className="merch-form-error" role="alert">{readError}</p>
            <p className="merch-secure-note">The magazine opens on the first device you read it on. Changed phones? Ask at the CSS desk to move it.</p>
          </section>
        </div>
        <MagazineJar refreshKey={jarKey} />
      </div>
    </section>
    {paying && <PaySheet order={paying.order} method={paying.method} onPaid={paid} onClose={() => setPaying(null)} />}
    {session && <MagazineReader session={session} onClose={closeReader} onExpired={expired} />}
  </>;
}
