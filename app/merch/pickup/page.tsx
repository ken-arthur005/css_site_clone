import type { Metadata } from "next";
import { MerchPickup } from "@/components/merch/merch-pickup";

export const metadata: Metadata = { title: "Pickup desk — CSS KNUST Merch", robots: { index: false, follow: false } };

export default async function PickupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const code = typeof query.s === "string" && /^[A-Za-z0-9]{4,12}$/.test(query.s) ? query.s : null;
  return <main className="merch-order-page"><MerchPickup deskCode={code} /></main>;
}
