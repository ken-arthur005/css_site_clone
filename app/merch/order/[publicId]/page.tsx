import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MerchOrderStatus } from "@/components/merch/merch-order-status";
import { getMerchStore } from "@/lib/content/merch-store";
import { getOrderStatus, isOrderId, MerchApiError } from "@/lib/api/merch";
import type { ApiOrder } from "@/types/merch-store";

export const metadata: Metadata = { title: "Your receipt — CSS KNUST Merch", robots: { index: false, follow: false } };

export default async function OrderPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  if (!isOrderId(publicId)) notFound();
  let initialOrder: ApiOrder | null = null;
  let initialError = "";
  try { initialOrder = await getOrderStatus(publicId); }
  catch (error) {
    if (error instanceof MerchApiError && error.status === 404) notFound();
    initialError = "We couldn’t load your receipt just yet. Try checking again below.";
  }
  return <main className="merch-order-page"><MerchOrderStatus key={publicId} id={publicId} content={await getMerchStore()} initialOrder={initialOrder} initialError={initialError} /></main>;
}
