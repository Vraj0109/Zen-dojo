// Small presentational pieces shared by the pages.

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-line"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Page wrapper: wide content area next to the sidebar. `narrow` for reading/form pages. */
export function PageMain({ title, children, narrow = false }: { title: string; children: React.ReactNode; narrow?: boolean }) {
  return (
    <main className={`w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-8 ${narrow ? "max-w-4xl" : "max-w-7xl"}`}>
      <h1 className="sr-only">{title}</h1>
      {children}
    </main>
  );
}
