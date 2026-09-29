import type { Color, ContentAsset, ContentStatus } from "./content";

export type MerchPrice =
  | { contentStatus: "placeholder" }
  | { contentStatus: "verified"; amount: number; currency: "GHS" };

export type MerchVariant = {
  id: string;
  baseColor: Color;
  printColor: Color;
  availability: "available" | "out-of-stock" | "unknown";
  texture: ContentAsset;
  fallbackImage: ContentAsset;
  sizes?: string[];
};

export type MerchProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  contentStatus: ContentStatus;
  price: MerchPrice;
  featured: boolean;
  images?: ContentAsset[];
  model?: ContentAsset;
  variants: MerchVariant[];
};
