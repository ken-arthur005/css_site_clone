import type { MerchProduct } from "./merch";

export type TeeId = "css-tee" | "pink-october";
export type TeeSize = "S" | "M" | "L" | "XL" | "XXL" | "3XL";

export type TeeColourway = {
  id: string;
  name: string;
  base: string;
  print: string;
  baseValue: string;
  printValue: string;
  modelVariantId?: string;
  front: string;
  back: string;
  photo: string;
};

export type TeeProduct = {
  id: TeeId;
  name: string;
  description: string;
  priceMinor: number;
  colourways: TeeColourway[];
  availableUntil?: string;
};

export type MerchStoreContent = {
  products: TeeProduct[];
  sizes: { id: TeeSize; chest: string; length: string; extraMinor: number }[];
  discount: { minimumQuantity: number; percent: number };
  maxQuantity: number;
  story: { title: string; description: string }[];
  manifesto: string;
  features: string[];
  facts: string[];
  faq: { question: string; answer: string }[];
  modelProduct: MerchProduct;
};

export type TeeLine = {
  productId: TeeId;
  colourwayId: string;
  size: TeeSize;
  quantity: number;
};

export type Buyer = { name: string; phone: string; email: string };
export type MerchTotals = { quantity: number; subtotalMinor: number; discountMinor: number; totalMinor: number };

export type ApiMerchandise = {
  id: number;
  name: string;
  price: string | null;
  in_stock: boolean;
  stock_quantity: number | null;
  availability: string;
};

export type CheckoutCatalog = {
  products: Partial<Record<TeeId, ApiMerchandise>>;
  pricingReady: boolean;
};

export type ApiOrder = {
  id: string;
  status: string;
  payment?: string;
  subtotal: string;
  discount?: string;
  fee: string;
  total: string;
  authorization_url?: string;
  expires_at: string | null;
  pickup_code?: string | null;
  items?: unknown[];
};
