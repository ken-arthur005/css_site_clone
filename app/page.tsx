export default function Home() {
  return (
    <main className="page-shell flex flex-1 flex-col justify-between py-[var(--section-space)]">
      <div className="flex items-center justify-between border-b border-border-strong pb-4">
        <p className="eyebrow">CSS KNUST / 001</p>
        <p className="eyebrow text-foreground-muted">Visual foundation</p>
      </div>

      <section className="content-narrow py-[var(--space-9)]">
        <p className="eyebrow mb-5 text-accent-strong">Computer Science Society</p>
        <h1 className="display-type">Built for a sharper point of view.</h1>
        <p className="editorial-type mt-8 text-foreground-muted">
          A working visual language for the CSS KNUST website: editorial in voice,
          precise in its interface, and unmistakable in its use of colour.
        </p>
      </section>

      <section className="grid gap-8 border-y border-border-subtle py-8 md:grid-cols-[1.25fr_1fr] md:gap-16">
        <div>
          <p className="eyebrow mb-4 text-foreground-muted">Typography</p>
          <p className="font-display text-[var(--text-h2)] font-semibold leading-[var(--leading-heading)] tracking-[var(--tracking-heading)]">
            Bricolage Grotesque
          </p>
          <p className="editorial-type mt-5">
            BioRhyme makes the editorial voice warm and distinctive.
          </p>
        </div>
        <div className="flex flex-col justify-between gap-8">
          <div className="flex gap-2" aria-label="Colour palette">
            <span className="angular-cut h-14 flex-1 bg-foreground" />
            <span className="angular-cut h-14 flex-1 bg-accent" />
            <span className="angular-cut h-14 flex-1 border border-border-strong bg-surface-raised" />
          </div>
          <div className="flex flex-wrap gap-3">
            <a className="button button-primary angular-cut" href="#system">
              Primary action
            </a>
            <a className="button button-secondary angular-cut" href="#system">
              Secondary action
            </a>
          </div>
        </div>
      </section>

      <p id="system" className="eyebrow pt-5 text-foreground-subtle">
        Cornflower / Cool neutrals / Angular restraint
      </p>
    </main>
  );
}
