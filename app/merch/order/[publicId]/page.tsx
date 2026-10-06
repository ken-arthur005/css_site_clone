import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MerchOrderStatus } from "@/components/merch/merch-order-status";
import { getMerchStore } from "@/lib/content/merch-store";
import { isOrderId } from "@/lib/api/merch";

export const metadata: Metadata = { title: "Your order — CSS KNUST Merch", robots: { index: false, follow: false } };

export default async function OrderPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  if (!isOrderId(publicId)) notFound();
  return <main className="merch-order-page"><MerchOrderStatus id={publicId} content={await getMerchStore()} /></main>;
}
