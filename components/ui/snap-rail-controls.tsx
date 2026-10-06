"use client";

export function SnapRailControls({ label, railId, index, count, onSelect }: {
  label: string;
  railId: string;
  index: number;
  count: number;
  onSelect: (index: number) => void;
}) {
  if (!count) return null;
  return (
    <div className="home-rail-controls" aria-label={`${label} navigation`}>
      <button aria-controls={railId} aria-label={`Previous ${label}`} disabled={index === 0} onClick={() => onSelect(index - 1)} type="button">
        <span aria-hidden="true">←</span>
      </button>
      <p className="eyebrow" aria-live="polite" aria-atomic="true">
        <span className="sr-only">{label} </span>{index + 1} / {count}
      </p>
      <button aria-controls={railId} aria-label={`Next ${label}`} disabled={index === count - 1} onClick={() => onSelect(index + 1)} type="button">
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
