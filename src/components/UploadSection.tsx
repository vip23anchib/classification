import { useRef, useState, useCallback } from "react";

interface Props {
  onFileSelect: (file: File) => void;
  onAnalyze: () => void;
  previewUrl: string | null;
  hasFile: boolean;
  loading: boolean;
}

export default function UploadSection({
  onFileSelect,
  onAnalyze,
  previewUrl,
  hasFile,
  loading,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (file && file.type.startsWith("image/")) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  return (
    <section className="animate-fade-in-up rounded-2xl border border-border bg-surface-card p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-secondary">
        Upload Image
      </h2>

      <div
        role="button"
        tabIndex={0}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all duration-200 ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-text-muted hover:bg-surface-card-hover"
        }`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id="file-upload"
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview of selected file"
            className="max-h-56 rounded-lg object-contain"
          />
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7 text-primary"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary">
              Drop an image here, or{" "}
              <span className="font-medium text-primary underline underline-offset-2">
                browse
              </span>
            </p>
            <p className="text-xs text-text-muted">
              PNG, JPG, TIFF — max 10 MB
            </p>
          </>
        )}
      </div>

      {hasFile && (
        <button
          id="analyze-button"
          onClick={onAnalyze}
          disabled={loading}
          className="mt-4 w-full cursor-pointer rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-glow transition-all duration-200 hover:bg-primary-hover hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Analyze Image"}
        </button>
      )}
    </section>
  );
}
