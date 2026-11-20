import { MASTERY_LABEL, type Mastery, type MasteryState } from "./lib";

/** Mastery dot: filled green = solid, filled amber = shaky, outline = not started. Nothing when the pattern has no problems. */
export function MasteryDot({ state, className = "" }: { state: MasteryState; className?: string }) {
  if (state === "untracked") return null;
  const look =
    state === "solid"
      ? "bg-primary border-primary"
      : state === "shaky"
        ? "bg-warning border-warning"
        : "border-line-strong bg-transparent";
  return <span role="img" aria-label={MASTERY_LABEL[state]} title={MASTERY_LABEL[state]} className={`inline-block size-2.5 shrink-0 rounded-full border-2 ${look} ${className}`} />;
}

export function MasteryLegend() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
      <span className="inline-flex items-center gap-1.5">
        <MasteryDot state="solid" /> Solid: every problem solved
      </span>
      <span className="inline-flex items-center gap-1.5">
        <MasteryDot state="shaky" /> Shaky: some solved, or a re-solve is due
      </span>
      <span className="inline-flex items-center gap-1.5">
        <MasteryDot state="none" /> Not started
      </span>
    </p>
  );
}

export function MasteryLine({ m }: { m: Mastery | undefined }) {
  if (!m || m.state === "untracked") return null;
  const pct = m.total > 0 ? Math.round((m.solved / m.total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label="Solved"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="inline-flex items-center gap-1.5 text-sm text-muted">
        <MasteryDot state={m.state} />
        {m.solved} of {m.total} · {MASTERY_LABEL[m.state]}
      </span>
    </div>
  );
}
