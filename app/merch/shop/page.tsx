import type { Metadata } from "next";
import { MerchShop } from "@/components/merch/merch-shop";
import { getMerchStore } from "@/lib/content/merch-store";

export const metadata: Metadata = { title: "Build your order — CSS KNUST Merch", description: "Build your CSS KNUST merch order: the CSS Tee with your choice of back, fit and name, the General Lacoste, and bundles. Pay with Mobile Money or card.", robots: { index: false, follow: true } };

export default async function MerchShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const content = await getMerchStore();
  const query = await searchParams;
  const product = typeof query.product === "string" && content.products.some(({ id }) => id === query.product) ? query.product : "css-tee";
  return <main className="merch-shop-page"><MerchShop content={content} initialProduct={product} initialColourway={typeof query.cw === "string" ? query.cw : undefined} /></main>;
}
