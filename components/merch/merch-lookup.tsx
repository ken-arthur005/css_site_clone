"use client";

import { useState, type FormEvent } from "react";
import type { ApiOrder } from "@/types/merch-store";

/**
 * Find a buyer's orders from their phone number: we text a 6-digit code, or
 * they can type one of their 7-digit order codes instead.
 */
export function MerchLookup({ onFound, intro }: { onFound: (orders: ApiOrder[]) => void; intro?: string }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"phone" | "code" | "order">("phone");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function post(url: string, body: unknown) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message ?? "Something went wrong. Try again.");
    return data;
  }

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try { const data = await post("/api/merch/my-orders/code", { phone }); setMessage(data.message); setMode("code"); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "We couldn’t send a code."); }
    finally { setBusy(false); }
  }

  async function lookUp(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const data = await post("/api/merch/my-orders", mode === "order" ? { phone, orderCode: code } : { phone, code });
      const orders = data.orders as ApiOrder[];
      if (!orders.length) setError("No orders found for that number.");
      onFound(orders);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "That didn’t work. Try again."); }
    finally { setBusy(false); }
  }

  return <div className="merch-lookup">
    {intro && <p className="merch-order__copy">{intro}</p>}
    {mode === "phone" ? <form onSubmit={requestCode} className="merch-contact">
      <label>Phone number you ordered with<input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required pattern={String.raw`\+?[0-9\s\(\)\-]{9,20}`} maxLength={20} placeholder="024 000 0000" /></label>
      <div className="merch-order__actions"><button className="merch-button" type="submit" disabled={busy}>{busy ? "Sending…" : "Text me a code"}</button><button className="merch-text-button" type="button" onClick={() => { setMode("order"); setError(""); }}>I have an order code instead</button></div>
    </form> : <form onSubmit={lookUp} className="merch-contact">
      {message && <p className="merch-secure-note" role="status">{message}</p>}
      <label>Phone number<input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required maxLength={20} /></label>
      <label>{mode === "order" ? "7-digit order code (from your receipt or text)" : "6-digit code we texted you"}<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required maxLength={9} /></label>
      <div className="merch-order__actions"><button className="merch-button" type="submit" disabled={busy}>{busy ? "Checking…" : "Show my orders"}</button><button className="merch-text-button" type="button" onClick={() => { setMode("phone"); setCode(""); setError(""); }}>{mode === "order" ? "Text me a code instead" : "Send a new code"}</button></div>
    </form>}
    <p className="merch-form-error" role="alert">{error}</p>
  </div>;
}
