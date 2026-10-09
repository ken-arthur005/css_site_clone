"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TransitionLink } from "@/components/transitions/transition-link";
import { usePendingOrder } from "./use-merch-cart";
import { LAST_RECEIPT_KEY } from "@/lib/merch/order";
import { useStoredValue } from "./use-merch-cart";

export function MerchOrderReturn() {
  const { session } = usePendingOrder();
  const lastReceipt = useStoredValue(LAST_RECEIPT_KEY);
  const id = session?.id ?? (/^[0-9a-f-]{36}$/i.test(lastReceipt) ? lastReceipt : null);
  const router = useRouter();
  useEffect(() => {
    if (id) router.replace(`/merch/order/${id}`);
  }, [id, router]);
  return <section className="merch-order"><p className="merch-label">CSS Merch / Your receipt</p><h1>Find your receipt.</h1><p className="merch-order__copy">We’ll open your last order saved on this device. On another device, use the receipt link for your order.</p><div className="merch-order__actions"><TransitionLink className="merch-button" href="/merch/shop" transitionLabel="SHOP">Back to shop ↗</TransitionLink></div></section>;
}
