import type { Metadata } from "next";
import { MagazineStore } from "@/components/merch/magazine/magazine-store";
import { isMagazineRef } from "@/lib/merch/magazine";

export const metadata: Metadata = {
  title: "Pink October Magazine — CSS KNUST Merch",
  description: "Buy the CSS Pink October magazine, Code & Her or Code & Him. GH₵5 or more: every cedi goes to breast cancer care.",
  alternates: { canonical: "/merch/magazine" },
};

export default async function MagazinePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { read } = await searchParams;
  const readRef = typeof read === "string" && isMagazineRef(read) ? read.trim() : "";
  return <main className="merch-order-page merch-mag-page"><MagazineStore readRef={readRef} /></main>;
}
