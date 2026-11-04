import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isLegacyRef, isOrderId, merchApi } from "@/lib/api/merch";
import { MerchOrderReturn } from "@/components/merch/merch-order-return";

export const metadata: Metadata = { title: "Payment return — CSS KNUST Merch", robots: { index: false, follow: false } };

/** Old css-merch receipts (?ref=CSS-XXXXXXXX) open the imported order's receipt. */
async function legacyOrderId(ref: string): Promise<string | null> {
  try {
    const found = await merchApi(`orders/legacy/${encodeURIComponent(ref.toUpperCase())}/`) as { id?: unknown } | null;
    return typeof found?.id === "string" && isOrderId(found.id) ? found.id : null;
  } catch { return null; }
}

export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const id = query.public_id ?? query.order_id ?? query.id;
  if (typeof id === "string" && isOrderId(id)) redirect(`/merch/order/${id}`);
  if (typeof query.ref === "string" && isLegacyRef(query.ref)) {
    const found = await legacyOrderId(query.ref);
    if (found) redirect(`/merch/order/${found}`);
  }
  return <main className="merch-order-page"><MerchOrderReturn /></main>;
}
