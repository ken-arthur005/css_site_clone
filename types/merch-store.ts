import type { MerchProduct } from "./merch";

export type TeeId = "css-tee" | "pink-october";
export type TeeSize = "S" | "M" | "L" | "XL" | "XXL" | "3XL";

export type TeeColourway = {
  id: string;
  apiValue?: string;
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
  apiId: number;
  apiNames: string[];
  name: string;
  description: string;
  priceMinor: number;
  colourways: TeeColourway[];
  availableUntil?: string;
};

export type MerchStoreContent = {
  products: TeeProduct[];
  sizes: { id: TeeSize; chest: string; length: string }[];
  discount: { enabled: boolean; minimumQuantity: number; percent: number };
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
  sizes: ApiMerchOption[];
  colorways: ApiMerchOption[];
  unavailable_combinations: { size: string; colorway: string }[];
};

export type ApiMerchOption = { value: string; label: string; available: boolean };
export type MerchDiscount = MerchStoreContent["discount"];

export type CheckoutCatalog = {
  products: Partial<Record<TeeId, ApiMerchandise>>;
  discount: MerchDiscount;
};

export type ApiOrderItem = {
  product?: number;
  product_name?: string;
  quantity: number;
  size?: string;
  colorway?: string;
  note?: string;
  unit_price?: string;
  line_total?: string;
};

export type ApiOrder = {
  id: string;
  status: string;
  payment?: string;
  subtotal: string;
  discount_amount: string;
  discount_percent: string;
  fee: string;
  total: string;
  authorization_url?: string;
  expires_at: string | null;
  pickup_code?: string | null;
  items?: ApiOrderItem[];
  created_at?: string;
};

export type MerchQuote = Pick<ApiOrder, "subtotal" | "discount_amount" | "discount_percent" | "fee" | "total">;

export type SavedMerchOrder = {
  id: string;
  lines: unknown[];
  authorization_url: string | null;
  expires_at: string | null;
  quote: MerchQuote | null;
  ownsCart: boolean;
  reconciled: boolean;
  status?: string;
};
