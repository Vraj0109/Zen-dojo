// Small presentational pieces shared by the pages.
import Link from "next/link";

export function Stat({ label, value, hint, href, className = "" }: { label: string; value: string; hint?: string; href?: string; className?: string }) {
  const content = (
    <>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={`block rounded-xl border border-line bg-surface p-4 hover:bg-background ${className}`}>
        {content}
      </Link>
    );
  }
  return (
    <div className={`rounded-xl border border-line bg-surface p-4 ${className}`}>
      {content}
    </div>
  );
}

/** Shown at the bottom of pages where Simple mode hid something. */
export function SimpleHint() {
  return (
    <p className="text-xs text-muted">
      Simple mode hides some tools. Turn it off in{" "}
      <Link href="/profile/settings" className="underline hover:text-foreground">
        Profile → Settings
      </Link>
      .
    </p>
  );
}

export function Difficulty({ level }: { level?: string | null }) {
  if (!level) return null;
  const key = level.toLowerCase();
  const color =
    key === "easy"
      ? "text-diff-easy"
      : key === "medium"
        ? "text-diff-medium"
        : key === "hard"
          ? "text-diff-hard"
          : "text-muted";
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span className={`text-xs font-medium ${color}`} aria-label={`Difficulty: ${label}`}>
      {label}
    </span>
  );
}

export function StatusMark({ state }: { state: "solved" | "resolve" | "none" }) {
  if (state === "solved") {
    return (
      <svg
        className="size-4 shrink-0 text-diff-easy"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="Solved"
        role="img"
      >
        <path d="m3.5 8.5 3 3 6-7" />
      </svg>
    );
  }
  if (state === "resolve") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center" aria-label="Needs re-solve" role="img">
        <span className="size-2 rounded-full bg-diff-medium" />
      </span>
    );
  }
  return <span className="inline-block size-4 shrink-0" aria-label="Unsolved" />;
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
