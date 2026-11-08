import type { MerchProduct } from "./merch";

/** Product IDs are stable local keys and equal the backend product slug. */
export type ProductId = string;
/** @deprecated Kept for the showcase components; use ProductId. */
export type TeeId = ProductId;
export type ProductKind = "tee" | "simple" | "bundle";
export type ProductGroup = "tees" | "polos" | "bundles";
export type TeeSize = "S" | "M" | "L" | "XL" | "XXL" | "3XL";
export type BackId = "spec-sheet" | "backbone";
export type FitId = "regular" | "oversized";

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
  /** The default back (the Spec Sheet for the CSS Tee). */
  back: string;
  /** Back images per back design, for customisable tees. */
  backs?: Partial<Record<BackId, string>>;
  photo: string;
};

export type BundlePiece = { slot: string; label: string; productId: ProductId; back?: BackId };

export type ShopProduct = {
  id: ProductId;
  /** Legacy numeric backend IDs, used only if the backend has no slug yet. */
  apiId?: number;
  apiNames: string[];
  kind: ProductKind;
  group: ProductGroup;
  name: string;
  description: string;
  /** Estimate shown until the live catalogue loads; the backend sets real prices. */
  priceMinor: number;
  colourways: TeeColourway[];
  hasSizes: boolean;
  availableUntil?: string;
  pieces?: BundlePiece[];
  badge?: string;
};
/** @deprecated Kept for the showcase components; use ShopProduct. */
export type TeeProduct = ShopProduct;

export type TeeBack = { id: BackId; name: string; description: string; priceMinor: number };
export type TeeFit = { id: FitId; name: string; extraMinor: number };

export type MerchStoreContent = {
  products: ShopProduct[];
  sizes: { id: TeeSize; chest: string; length: string }[];
  backs: TeeBack[];
  fits: TeeFit[];
  backNamePriceMinor: number;
  maxQuantity: number;
  story: { title: string; description: string }[];
  manifesto: string;
  features: string[];
  facts: string[];
  faq: { question: string; answer: string }[];
  modelProduct: MerchProduct;
};

export type PieceChoice = { colourwayId?: string; size?: TeeSize };

/** One cart line. Which fields apply depends on the product's kind. */
export type ShopLine = {
  productId: ProductId;
  quantity: number;
  colourwayId?: string;
  size?: TeeSize;
  back?: BackId;
  fit?: FitId;
  backName?: string;
  pieces?: Record<string, PieceChoice>;
};
/** @deprecated Use ShopLine. */
export type TeeLine = ShopLine;

export type Buyer = { name: string; phone: string; email: string };
export type MerchTotals = { quantity: number; subtotalMinor: number; discountMinor: number; totalMinor: number };

export type ApiMerchOption = { value: string; label: string; available: boolean };
export type ApiPricedOption = ApiMerchOption & { priceMinor: number };
export type ApiComponent = {
  slot: string;
  label: string;
  product: number;
  requires_size: boolean;
  requires_colorway: boolean;
  back_design: { value: string; label: string } | null;
};

export type ApiMerchandise = {
  id: number;
  slug: string | null;
  kind: ProductKind;
  name: string;
  price: string | null;
  in_stock: boolean;
  stock_quantity: number | null;
  availability: string;
  available_until: string | null;
  sizes: ApiMerchOption[];
  colorways: ApiMerchOption[];
  unavailable_combinations: { size: string; colorway: string }[];
  backs: ApiPricedOption[];
  fits: ApiPricedOption[];
  back_name_price: string | null;
  components: ApiComponent[];
};

export type CheckoutCatalog = {
  /** Live records keyed by local product ID; a missing key means unavailable. */
  products: Partial<Record<ProductId, ApiMerchandise>>;
};

export type PromoCheck = {
  code: string;
  kind: "bundle" | "percent";
  percent?: number;
  /** Bundle codes: the promo price of each bundle, by local product ID. */
  bundlePricesMinor?: Partial<Record<ProductId, number>>;
};

export type ApiOrderPiece = {
  slot: string;
  label: string;
  size?: string;
  colorway?: string;
  back?: string;
  fit?: string;
  back_name?: string;
  handed?: boolean;
};

export type ApiOrderItem = {
  product?: number;
  product_name?: string;
  quantity: number;
  size?: string;
  colorway?: string;
  back?: string;
  fit?: string;
  back_name?: string;
  note?: string;
  unit_price?: string;
  line_total?: string;
  pieces?: ApiOrderPiece[];
  /** Fundraiser magazines: the edition the reader opens. */
  magazine_edition?: string;
};

export type OrderStage = "placed" | "paid" | "printing" | "ready" | "collected" | "cancelled";

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
  access_code?: string;
  expires_at: string | null;
  pickup_code?: string | null;
  items?: ApiOrderItem[];
  created_at?: string;
  stage?: OrderStage;
  paid_at?: string | null;
  printing_at?: string | null;
  ready_at?: string | null;
  checked_in_at?: string | null;
  collected_at?: string | null;
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

export type MomoProvider = "mtn" | "vod" | "atl";
export type ChargeStatus = "pay_offline" | "send_otp" | "success" | "failed" | "pending";
export type ChargeResult = { status: ChargeStatus; message: string };
