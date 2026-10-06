import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isOrderId } from "@/lib/api/merch";
import { MerchOrderReturn } from "@/components/merch/merch-order-return";

export const metadata: Metadata = { title: "Payment return — CSS KNUST Merch", robots: { index: false, follow: false } };

export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const id = query.public_id ?? query.order_id ?? query.id;
  if (typeof id === "string" && isOrderId(id)) redirect(`/merch/order/${id}`);
  return <main className="merch-order-page"><MerchOrderReturn /></main>;
}
