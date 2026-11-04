/** Shapes returned by the backend staff API (/api/v1/staff/), via /api/admin/*. */

export type StaffPiece = {
  id: number;
  slot: string;
  label: string;
  product: number;
  quantity: number;
  size: string;
  colorway: string;
  back: string;
  fit: string;
  back_name: string;
  print_run: { id: number; name: string; back_at: string | null } | null;
  handed_at: string | null;
  handed_by: string | null;
  handed_to: string;
};

export type StaffItem = {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  size: string;
  colorway: string;
  back: string;
  fit: string;
  back_name: string;
  note: string;
  pieces: StaffPiece[];
};

export type StaffStage = "placed" | "paid" | "printing" | "ready" | "collected" | "cancelled";

export type StaffOrder = {
  id: string;
  code: string;
  legacy_ref: string | null;
  status: "pending" | "paid" | "collected" | "cancelled";
  stage: StaffStage;
  source: "IN_PERSON" | "ONLINE";
  payment_method: "CASH" | "PAYSTACK";
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  hall: string;
  subtotal: string;
  discount_amount: string;
  discount_percent: string;
  promo_code: string | null;
  fee: string;
  total: string;
  created_at: string;
  paid_at: string | null;
  printing_at: string | null;
  ready_at: string | null;
  checked_in_at: string | null;
  serving_by: string | null;
  serving_at: string | null;
  collected_at: string | null;
  collected_by: string | null;
  picked_up_by: string;
  cancelled_at: string | null;
  cancel_reason: string;
  items: StaffItem[];
};

export type QueuePiece = {
  id: number;
  order_code: string;
  buyer_name: string;
  paid_at: string | null;
  label: string;
  product: number;
  quantity: number;
  size: string;
  colorway: string;
  back: string;
  fit: string;
  back_name: string;
};

export type PrintRun = { id: number; name: string; created_at: string; created_by: string | null; back_at: string | null; pieces: number; units: number | null };

export type CountRow = { product: number; product_name: string; colorway: string; back: string; size: string; units: number };

export type ActivityRow = { id: number; at: string; actor_name: string; kind: string; order: string | null; text: string };

export type Expense = { id: number; day: string; category: string; note: string; amount: string; paid_by: string; reimbursed_at: string | null; created_at: string; created_by: string | null };

export type AccountedEntry = { id: number; day: string; kind: string; label: string; amount: string; created_at: string; created_by: string | null };

export type PromoCode = { id: number; code: string; kind: "BUNDLE" | "PERCENT"; percent: string | null; is_active: boolean; note: string; used_by: string | null; used_at: string | null };
