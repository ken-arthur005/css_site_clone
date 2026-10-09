import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isOrderId } from "@/lib/api/merch";
import { getSiteInfo } from "@/lib/content/site";

export const metadata: Metadata = { title: "Payment return — CSS KNUST Merch", robots: { index: false, follow: false } };

// Compatibility with the callback observed in the deployed backend during QA.
// New payment sessions should use /merch/order/<UUID> directly.
export default async function LegacyPaymentReturn({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  if (!isOrderId(publicId)) notFound();
  const site = await getSiteInfo();
  redirect(new URL(`/merch/order/${publicId}`, site.canonicalOrigin.value).href);
}
