import { useState, useEffect } from "react";

const MESSAGES = [
  "Analyzing image…",
  "Detecting terrain features…",
  "Generating insights…",
  "Creating enhanced image…",
];

export default function Loader() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="animate-fade-in-up flex flex-col items-center gap-5 rounded-2xl border border-border bg-surface-card p-10">
      {/* Spinner */}
      <div className="relative h-12 w-12">
        <div
          className="absolute inset-0 rounded-full border-2 border-border"
          style={{ borderTopColor: "var(--color-primary)", animation: "spin 0.8s linear infinite" }}
        />
      </div>

      {/* Message */}
      <p className="text-sm font-medium text-text-secondary transition-opacity duration-300">
        {MESSAGES[index]}
      </p>

      {/* Dots */}
      <div className="flex gap-1.5">
        {MESSAGES.map((_, i) => (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full transition-colors duration-300"
            style={{
              backgroundColor:
                i === index ? "var(--color-primary)" : "var(--color-border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
