"use client";

export function Quantity({ quantity, max, label, disabled = false, onChange }: {
  quantity: number; max: number; label: string; disabled?: boolean; onChange: (quantity: number) => void;
}) {
  return <div className="merch-quantity" role="group" aria-label={label}>
    <button type="button" aria-label={`Decrease ${label}`} disabled={disabled || quantity <= 1} onClick={() => onChange(quantity - 1)}>−</button>
    <output aria-label={`${label}: ${quantity}`}>{quantity}</output>
    <button type="button" aria-label={`Increase ${label}`} disabled={disabled || quantity >= max} onClick={() => onChange(quantity + 1)}>+</button>
  </div>;
}
