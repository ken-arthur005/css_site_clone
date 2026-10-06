import { merchStoreCopy, teeProducts } from "@/content/merch-store";
import { getMerchProductBySlug } from "@/lib/content/merch";
import type { MerchStoreContent } from "@/types/merch-store";

export async function getMerchStore(): Promise<MerchStoreContent> {
  const modelProduct = await getMerchProductBySlug("css-core-tee");
  if (!modelProduct) throw new Error("The CSS tee model content is missing.");
  return { ...merchStoreCopy, products: teeProducts, modelProduct };
}
