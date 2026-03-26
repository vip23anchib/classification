export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-6">
        {/* Icon */}
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-primary"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-text-primary">
            Satellite Classifier
          </h1>
          <p className="hidden text-xs text-text-muted sm:block">
            AI-powered terrain analysis
          </p>
        </div>
      </div>
    </nav>
  );
}
