"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TransitionLink } from "@/components/transitions/transition-link";
import { usePendingOrder } from "./use-merch-cart";

export function MerchOrderReturn() {
  const { session } = usePendingOrder();
  const router = useRouter();
  useEffect(() => {
    if (session) router.replace(`/merch/order/${session.id}`);
  }, [session, router]);
  return <section className="merch-order"><p className="merch-label">CSS Merch / Payment return</p><h1>Your order.</h1><p className="merch-order__copy">We’ll open the payment session saved on this device. If you’re using another device, open the order link with its reference.</p><div className="merch-order__actions"><TransitionLink className="merch-button" href="/merch/shop" transitionLabel="SHOP">Back to shop ↗</TransitionLink></div></section>;
}
