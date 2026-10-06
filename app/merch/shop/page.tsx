import type { Metadata } from "next";
import { MerchShop } from "@/components/merch/merch-shop";
import { getMerchStore } from "@/lib/content/merch-store";

export const metadata: Metadata = { title: "Build your order — CSS KNUST Merch", description: "Choose CSS and Pink October tees, configure your sizes and colourways, and review your order.", robots: { index: false, follow: true } };

export default async function MerchShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const content = await getMerchStore();
  const query = await searchParams;
  const product = query.product === "pink-october" ? "pink-october" : "css-tee";
  return <main className="merch-shop-page"><MerchShop content={content} initialProduct={product} initialColourway={typeof query.cw === "string" ? query.cw : undefined} hasSelection={query.product === "css-tee" || query.product === "pink-october"} /></main>;
}
