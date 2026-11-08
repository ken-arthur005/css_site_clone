"use client";

import { useEffect, useState } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import { orderMagazines } from "@/lib/merch/magazine";
import { LAST_RECEIPT_KEY, money, minorOf, ORDER_HISTORY_KEY, PENDING_ORDER_KEY } from "@/lib/merch/order";
import type { ApiOrder } from "@/types/merch-store";
import { MerchLookup } from "./merch-lookup";
import { storedValue } from "./use-merch-cart";

const STAGE_NAMES: Record<string, string> = { placed: "Awaiting payment", paid: "Paid", printing: "Printing", ready: "Ready for pickup", collected: "Collected", cancelled: "Cancelled" };

/** Order IDs this device knows about: the pending checkout, history and last receipt. */
export function savedOrderIds(): string[] {
  const ids = new Set<string>();
  const add = (value: unknown) => { if (typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value)) ids.add(value.toLowerCase()); };
  try { add(JSON.parse(storedValue(PENDING_ORDER_KEY) || "null")?.id); } catch { /* ignore */ }
  try { for (const entry of JSON.parse(storedValue(ORDER_HISTORY_KEY) || "[]")) add(entry?.id); } catch { /* ignore */ }
  add(storedValue(LAST_RECEIPT_KEY));
  return [...ids].slice(0, 20);
}

export async function fetchOrders(ids: string[]): Promise<ApiOrder[]> {
  const results = await Promise.all(ids.map(async (id) => {
    try {
      const response = await fetch(`/api/merch/orders/${encodeURIComponent(id)}`, { cache: "no-store" });
      return response.ok ? await response.json() as ApiOrder : null;
    } catch { return null; }
  }));
  return results.filter((order): order is ApiOrder => !!order).sort((a, b) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? ""));
}

export function OrderList({ orders, action }: { orders: ApiOrder[]; action?: (order: ApiOrder) => React.ReactNode }) {
  return <div className="merch-order__items">{orders.map((order) => {
    const items = order.items?.map((item) => `${item.quantity}× ${item.product_name ?? "Item"}`).join(", ");
    const stage = order.stage ?? order.status.toLowerCase();
    return <article className="merch-order__item merch-order-card" key={order.id}>
      <div><h3>{STAGE_NAMES[stage] ?? order.status}</h3><p>{items}</p>
        <small>{order.created_at && new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" })}{order.pickup_code && <> · Pickup code <strong>{order.pickup_code}</strong></>}</small></div>
      <div className="merch-order-card__side"><strong>{money(minorOf(order.total) ?? 0)}</strong>{action ? action(order) : <TransitionLink href={`/merch/order/${order.id}`} transitionLabel="YOUR RECEIPT" className="merch-text-button">Receipt ↗</TransitionLink>}{["PAID", "COLLECTED"].includes(order.status.toUpperCase()) && orderMagazines(order).length > 0 && <a href={`/merch/magazine?read=${encodeURIComponent(order.id)}`} className="merch-text-button">Read magazine ↗</a>}</div>
    </article>;
  })}</div>;
}

export function MerchMyOrders() {
  const [local, setLocal] = useState<ApiOrder[] | null>(null);
  const [found, setFound] = useState<ApiOrder[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const ids = savedOrderIds();
    void (ids.length ? fetchOrders(ids) : Promise.resolve([])).then((orders) => { if (!cancelled) setLocal(orders); });
    return () => { cancelled = true; };
  }, []);
  const orders = found ?? local ?? [];
  return <section className="merch-order" aria-labelledby="my-orders-title">
    <div className="merch-order__hero"><div><p className="merch-label">CSS Merch / My orders</p><h1 id="my-orders-title">Your orders.</h1><p className="merch-order__copy">{found ? "Orders for that phone number." : "Orders placed on this device. On another device, find them with your phone number."}</p></div></div>
    {local === null && !found ? <p className="merch-secure-note" role="status">Loading your orders…</p> : orders.length > 0 && <OrderList orders={orders} />}
    {!found && <MerchLookup onFound={setFound} intro="Find all your orders, on any device, with the phone number you ordered with." />}
    <div className="merch-order__actions"><TransitionLink href="/merch/shop" transitionLabel="SHOP" className="merch-button merch-button--secondary">Back to shop</TransitionLink></div>
  </section>;
}
