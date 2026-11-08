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
  /** Fundraiser magazines: the edition (empty for garments). */
  magazine_edition?: string;
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
  /** The magazine is bound to a device (staff can move it to a new one). */
  magazine_locked?: boolean;
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

export type AuditLine = { name: string; sold: number; money: string; cost: string; profit: string; profit_each: string };
export type AuditOrder = { code: string; legacy_ref: string | null; paid_day: string; group: "exec" | "public"; buyer: string; payment: string; money: string; cost: string; fee: string; profit: string };

export type AuditProfit = {
  range: { from: string | null; to: string | null; group: string };
  paid_orders: number; money: string; print_cost: string; fees: string; fee_orders: number; fee_rate: string;
  expenses: string; expenses_count: number; paystack_typed: string; profit: string;
  /** Magazine money: all goes to the cause, so it is kept out of the profit. */
  fundraiser?: string;
  due: { orders: number; money: string; profit: string };
  lines: AuditLine[];
  pieces: { name: string; pieces: number; average: string; cost: string }[];
  expense_categories: { category: string; amount: string }[];
  orders: AuditOrder[];
};

export type PaystackSummary = { balance: string; paid_out: string; on_the_way: string; payouts: { amount: string; status: string; date: string | null }[]; checked_at: string } | { error: string };

export type MoneyCheck = {
  came_in: { cash: string; paystack: string; total: string; store_fees: string };
  paystack: PaystackSummary | null;
  to_printer: string; store_spent: string; owed_back: string;
  in_hand: { day: string; amount: string; label: string } | null;
  cash_lines: { kind: string; label: string; amount: string }[];
  cash_held: string; cash_unaccounted: string;
  paystack_held?: string; paystack_pending?: string; reached?: string; should_have?: string; short?: string | null; unexplained?: string;
  printer: { name: string; sent: number; sent_cost: string; left: number; left_cost: string }[];
  sent_cost: string; left_cost: string; printer_gap: string;
  cash_by_person: { person: string; orders: number; money: string }[];
};

export type AuditData = { profit: AuditProfit; check: MoneyCheck };

export type BulkOptions = { enabled: boolean; audiences: { id: string; label: string }[]; placeholders: Record<string, string>; max_template: number };
export type BulkPreview = { count: number; sample: string; chars: number; parts: number; max_parts: number; total_parts: number; people: { name: string; phone: string; code: string; group: string; owed: string; ready: string; text: string }[] };
export type BulkResult = { sent: number; failed: number; skipped: number; left: number };
export type NotificationRow = { id: number; created_at: string; order: string | null; channel: "SMS" | "EMAIL" | "PUSH"; kind: string; recipient: string; ok: boolean; info: string };
