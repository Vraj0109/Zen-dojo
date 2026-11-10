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

/**
 * Solved marks, like a chat app's ticks. One green tick: solved here (every test passed in the editor). Two blue ticks:
 * solved here and also seen on LeetCode. A faint single tick: only seen on LeetCode so far, not solved here.
 */
export function StatusMark({ state, here, onLeetCode }: { state: "solved" | "resolve" | "none"; here?: boolean; onLeetCode?: boolean }) {
  if (state === "solved" && here !== undefined) {
    const both = here && !!onLeetCode;
    const label = both ? "Solved here and on LeetCode" : here ? "Solved here" : "Solved on LeetCode, not solved here yet";
    return (
      <svg
        className={`h-4 shrink-0 ${both ? "w-5 text-accent" : here ? "w-4 text-diff-easy" : "w-4 text-muted opacity-60"}`}
        viewBox={both ? "0 0 20 16" : "0 0 16 16"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label={label}
        role="img"
      >
        <title>{label}</title>
        <path d="m3.5 8.5 3 3 6-7" />
        {both && <path d="m9 11.5 1 1 6.5-8" />}
      </svg>
    );
  }
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
      <div className="anim-grow h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Page wrapper: wide content area next to the sidebar. `narrow` for reading/form pages. */
export function PageMain({ title, children, narrow = false, full = false }: { title: string; children: React.ReactNode; narrow?: boolean; full?: boolean }) {
  return (
    <main className={`anim-fade-up w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-8 ${full ? "max-w-none" : narrow ? "max-w-4xl" : "max-w-7xl"}`}>
      <h1 className="sr-only">{title}</h1>
      {children}
    </main>
  );
}
