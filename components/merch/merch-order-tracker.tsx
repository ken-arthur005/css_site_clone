import type { ApiOrder, OrderStage } from "@/types/merch-store";

const STEPS: { stage: Exclude<OrderStage, "cancelled">; name: string; detail: string; at: keyof ApiOrder }[] = [
  { stage: "placed", name: "Placed", detail: "We have your order.", at: "created_at" },
  { stage: "paid", name: "Paid", detail: "Payment confirmed. It joins the next print batch.", at: "paid_at" },
  { stage: "printing", name: "Printing", detail: "On the press right now.", at: "printing_at" },
  { stage: "ready", name: "Ready", detail: "Ready for pickup. We’ve texted you.", at: "ready_at" },
  { stage: "collected", name: "Collected", detail: "Picked up. Enjoy it.", at: "collected_at" },
];

function stageOf(order: ApiOrder): OrderStage {
  if (order.stage) return order.stage;
  const status = order.status.toUpperCase();
  if (status === "COLLECTED") return "collected";
  if (status === "PAID") return "paid";
  if (["CANCELLED", "CANCELED", "EXPIRED", "FAILED"].includes(status)) return "cancelled";
  return "placed";
}

const when = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" })
  : null;

/** Where the order is: placed → paid → printing → ready → collected. */
export function MerchOrderTracker({ order }: { order: ApiOrder }) {
  const stage = stageOf(order);
  if (stage === "cancelled") return null;
  const current = STEPS.findIndex((step) => step.stage === stage);
  return <section className="merch-tracker" aria-labelledby="merch-tracker-title">
    <h2 id="merch-tracker-title" className="merch-label">Order progress</h2>
    <ol>{STEPS.map((step, index) => {
      const state = index < current ? "done" : index === current ? "current" : "next";
      const at = state !== "next" ? when(order[step.at]) : null;
      return <li key={step.stage} data-state={state} aria-current={state === "current" ? "step" : undefined}>
        <span className="merch-tracker__dot" aria-hidden="true">{state === "done" ? "✓" : index + 1}</span>
        <span><strong>{step.name}</strong>{state === "current" && <small>{step.detail}</small>}{at && <time dateTime={String(order[step.at])}>{at}</time>}</span>
        {state !== "next" && <span className="sr-only">{state === "done" ? "Completed" : "Current step"}</span>}
      </li>;
    })}</ol>
    {stage === "ready" && order.checked_in_at && <p className="merch-secure-note" role="status">You’re checked in at the pickup desk. A helper will call you shortly.</p>}
  </section>;
}
