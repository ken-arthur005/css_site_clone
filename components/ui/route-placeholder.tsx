type RoutePlaceholderProps = {
  eyebrow: string;
  title: string;
};

export function RoutePlaceholder({ eyebrow, title }: RoutePlaceholderProps) {
  return (
    <main className="page-shell flex flex-1 items-center py-[var(--section-space)]">
      <div className="content-narrow">
        <p className="eyebrow mb-5 text-accent-strong">{eyebrow}</p>
        <h1 className="display-type">{title}</h1>
      </div>
    </main>
  );
}
