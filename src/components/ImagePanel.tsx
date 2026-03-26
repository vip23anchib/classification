import { useCallback } from "react";

interface Props {
  base64: string;
}

export default function ImagePanel({ base64 }: Props) {
  const src = `data:image/png;base64,${base64}`;

  const download = useCallback(() => {
    const a = document.createElement("a");
    a.href = src;
    a.download = "enhanced-image.png";
    a.click();
  }, [src]);

  return (
    <section className="animate-fade-in-up rounded-2xl border border-border bg-surface-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Enhanced Image
        </h2>
        <button
          id="download-button"
          onClick={download}
          className="cursor-pointer rounded-lg border border-border bg-surface-card-hover px-4 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-border"
        >
          ↓ Download
        </button>
      </div>

      <div className="overflow-hidden rounded-xl">
        <img
          src={src}
          alt="AI-generated enhanced satellite image"
          className="w-full object-contain"
        />
      </div>
    </section>
  );
}
