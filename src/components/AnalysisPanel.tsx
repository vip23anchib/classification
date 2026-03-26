interface Props {
  classification: string;
  features: string[];
  description: string;
}

export default function AnalysisPanel({
  classification,
  features,
  description,
}: Props) {
  return (
    <section className="animate-fade-in-up rounded-2xl border border-border bg-surface-card p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-secondary">
        Analysis Results
      </h2>

      {/* Classification badge */}
      <div className="mb-4">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Classification
        </span>
        <div className="mt-1">
          <span className="inline-block rounded-lg bg-primary/15 px-4 py-1.5 text-sm font-semibold capitalize text-primary">
            {classification}
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="mb-4">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Detected Features
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {features.map((feature) => (
            <span
              key={feature}
              className="rounded-full bg-tag-bg px-3 py-1 text-xs font-medium text-tag-text"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Description
        </span>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
          {description}
        </p>
      </div>
    </section>
  );
}
