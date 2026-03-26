interface Props {
  improvements: string[];
}

export default function ImprovementsPanel({ improvements }: Props) {
  return (
    <section className="animate-fade-in-up rounded-2xl border border-border bg-surface-card p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-secondary">
        Suggestions
      </h2>

      <ol className="space-y-3">
        {improvements.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <span className="text-text-secondary">{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
