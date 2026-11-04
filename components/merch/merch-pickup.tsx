"use client";

import { useEffect, useState } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import type { ApiOrder } from "@/types/merch-store";
import { MerchLookup } from "./merch-lookup";
import { fetchOrders, OrderList, savedOrderIds } from "./merch-my-orders";

/**
 * The page the pickup desk's QR code opens (/merch/pickup?s=<desk code>). The
 * buyer picks a paid order and joins the queue; the desk sees them waiting.
 */
export function MerchPickup({ deskCode }: { deskCode: string | null }) {
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [ticket, setTicket] = useState<ApiOrder | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const ids = savedOrderIds();
    void (ids.length ? fetchOrders(ids) : Promise.resolve([])).then((found) => { if (!cancelled) setOrders(found); });
    return () => { cancelled = true; };
  }, []);

  async function checkIn(order: ApiOrder) {
    if (!deskCode) return;
    setBusy(order.id); setError("");
    try {
      const response = await fetch("/api/merch/pickup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deskCode, order: order.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "You couldn’t be checked in. Ask at the desk.");
      setTicket(data as ApiOrder);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "You couldn’t be checked in. Ask at the desk."); }
    finally { setBusy(null); }
  }

  const paid = (orders ?? []).filter((order) => order.status.toUpperCase() === "PAID");

  if (!deskCode) return <section className="merch-order"><p className="merch-label">CSS Merch / Pickup</p><h1>Scan the desk QR code.</h1><p className="merch-order__copy">To join the pickup queue, scan the QR code at the CSS pickup desk with your phone’s camera.</p><div className="merch-order__actions"><TransitionLink href="/merch/orders" transitionLabel="MY ORDERS" className="merch-button merch-button--secondary">My orders</TransitionLink></div></section>;

  if (ticket) return <section className="merch-order merch-pickup-ticket" data-paid aria-labelledby="ticket-title">
    <p className="merch-label">CSS Merch / Pickup ticket</p>
    <h1 id="ticket-title">You’re in the queue.</h1>
    <p className="merch-order__copy" role="status">A helper will call you. Show them this screen.</p>
    <div className="merch-order__pickup"><div><p className="merch-label">Pickup code</p><strong>{ticket.pickup_code}</strong><p>{ticket.items?.map((item) => `${item.quantity}× ${item.product_name}`).join(", ")}</p></div></div>
    <div className="merch-order__actions"><TransitionLink href={`/merch/order/${ticket.id}`} transitionLabel="YOUR RECEIPT" className="merch-text-button">Full receipt ↗</TransitionLink></div>
  </section>;

  return <section className="merch-order" aria-labelledby="pickup-title">
    <div className="merch-order__hero"><div><p className="merch-label">CSS Merch / Pickup desk</p><h1 id="pickup-title">Collecting your order?</h1><p className="merch-order__copy">Choose the order you’re collecting to join the queue.</p></div></div>
    {orders === null ? <p className="merch-secure-note" role="status">Finding your orders…</p> : paid.length > 0
      ? <OrderList orders={paid} action={(order) => <button type="button" className="merch-button" disabled={!!busy} onClick={() => void checkIn(order)}>{busy === order.id ? "Checking in…" : "Check in ↗"}</button>} />
      : <MerchLookup onFound={(found) => setOrders(found)} intro="We couldn’t find a paid order on this phone. Find yours with the phone number you ordered with." />}
    <p className="merch-form-error" role="alert">{error}</p>
  </section>;
}
