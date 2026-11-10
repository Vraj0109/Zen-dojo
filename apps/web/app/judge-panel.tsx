"use client";

import type { CaseResult, RunResult } from "@/lib/judge/run";

// How the results of a Run are shown: the verdict, one expandable row per case, and the console section.

// Fields another change adds to CaseResult; read through a narrow local type so this compiles either way.
type TleFields = { problem?: string; timedOut?: boolean; elapsedMs?: number; timeLimitMs?: number };
const isTle = (r: CaseResult) => {
  const t = r as unknown as TleFields;
  return !r.pass && (t.problem === "tle" || t.problem === "timeout" || t.timedOut === true);
};
const isNotRun = (r: CaseResult) => !r.pass && (r as unknown as TleFields).problem === "not-run";
const ms = (n: number) => `${Math.round(n).toLocaleString("en-US")}ms`;
const tleDetail = (r: CaseResult) => {
  const t = r as unknown as TleFields;
  if (typeof t.elapsedMs === "number" && typeof t.timeLimitMs === "number") return `Time Limit Exceeded: ${ms(t.elapsedMs)} (limit: ${ms(t.timeLimitMs)})`;
  if (typeof t.timeLimitMs === "number") return `Time Limit Exceeded (limit: ${ms(t.timeLimitMs)})`;
  if (typeof t.elapsedMs === "number") return `Time Limit Exceeded: ${ms(t.elapsedMs)}`;
  return "Time Limit Exceeded";
};

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="shrink-0">
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.5V8l2.3 1.4" />
    </svg>
  );
}

const label = (r: CaseResult) => (r.kind === "example" ? `Example ${r.index + 1}` : r.kind === "stress" ? `Large input: ${r.label ?? r.index + 1}` : `Test ${r.index + 1}`);

export function Results({ result }: { result: RunResult }) {
  if (result.status === "unavailable") {
    return <p className="rounded-xl border border-cat-beh bg-surface p-3 text-sm">{result.message}</p>;
  }
  if (result.status === "compile_error") {
    return (
      <div className="rounded-xl border border-cat-mock bg-surface p-3">
        <p className="font-semibold text-diff-hard">Compile error</p>
        <pre className="mt-2 overflow-x-auto text-xs whitespace-pre-wrap">{result.message}</pre>
      </div>
    );
  }
  const results = result.results;
  const first = results.find((r) => !r.pass && !isNotRun(r)) ?? results.find((r) => !r.pass);
  const accepted = !first;
  const printed = results.filter((r) => r.output);
  const headline = accepted
    ? "Accepted"
    : isTle(first)
      ? "Time Limit Exceeded (TLE)"
      : first.problem === "memory"
        ? "Memory limit exceeded"
        : first.problem === "crash" || first.problem === "exception"
        ? "Runtime error"
        : first.problem === "not-run"
          ? "Stopped early"
          : "Wrong answer";

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border bg-surface p-3 ${accepted ? "border-diff-easy" : "border-cat-mock"}`}>
        <p className={`font-semibold ${accepted ? "text-diff-easy" : "text-diff-hard"}`}>
          {headline}
          <span className="ml-2 font-normal text-muted">
            {result.passed} of {result.total} cases passed
          </span>
        </p>
        {first && isTle(first) && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-diff-medium bg-diff-medium/15 px-2 py-0.5 text-xs font-semibold text-diff-medium">
            <ClockIcon />
            {tleDetail(first)}
          </p>
        )}
        {first && (
          <p className="mt-1 text-xs text-muted">
            First failure: {label(first)}. Open any case below to see its input, the expected answer and what your code returned.
          </p>
        )}
      </div>

      <ul className="space-y-1 text-sm">
        {results.map((r) => (
          <li key={r.index}>
            <details className={`rounded-lg border bg-surface ${isTle(r) ? "border-diff-medium bg-diff-medium/10" : isNotRun(r) ? "border-line opacity-70" : "border-line"}`} open={r === first}>
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5">
                <span>
                  {label(r)}
                  <span className="ml-2 font-mono text-xs text-muted">{r.input.length > 44 ? r.input.slice(0, 44) + "…" : r.input}</span>
                </span>
                <span className={r.pass ? "text-diff-easy" : isTle(r) ? "text-diff-medium" : isNotRun(r) ? "text-muted" : "text-diff-hard"}>
                  {isTle(r) ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-diff-medium/20 px-1.5 py-0.5 text-xs font-semibold">
                      <ClockIcon />
                      Time Limit Exceeded (TLE)
                    </span>
                  ) : isNotRun(r) ? (
                    <span className="rounded-md border border-line px-1.5 py-0.5 text-xs">Not run</span>
                  ) : r.pass ? "Passed" : r.problem === "timeout" ? "Too slow" : r.problem === "memory" ? "Too much memory" : r.problem === "crash" || r.problem === "exception" ? "Error" : r.problem === "not-run" ? "Not run" : "Failed"}
                  {r.micros !== undefined && <span className="ml-2 text-xs text-muted">{r.micros < 1000 ? `${r.micros} µs` : `${Math.round(r.micros / 1000)} ms`}</span>}
                </span>
              </summary>
              <dl className="space-y-1 border-t border-line px-3 py-2">
                {isTle(r) && <p className="text-xs font-semibold text-diff-medium">{tleDetail(r)}</p>}
                <Row label="Input" value={r.input} highlight={isTle(r)} />
                <Row label="Expected" value={r.expected} />
                {r.note && <Row label="First wrong operation" value={r.note} />}
                <Row label={r.error ? "What happened" : "Your output"} value={r.error ?? r.actual ?? "(nothing)"} />
                {r.output && <Row label="Printed by your code" value={r.output} block />}
              </dl>
            </details>
          </li>
        ))}
      </ul>

      {(printed.length > 0 || result.beforeTests) && (
        <section aria-label="Console output" className="rounded-xl border border-line bg-surface p-3">
          <h4 className="text-sm font-semibold">Console output</h4>
          <p className="mb-2 text-xs text-muted">Everything your code printed, case by case (cout, printf, cerr, System.out, console.log ...).</p>
          <div className="space-y-2">
            {result.beforeTests && (
              <div>
                <p className="text-xs font-medium text-muted">Before the first case</p>
                <pre className="overflow-x-auto rounded bg-background p-2 text-xs whitespace-pre-wrap">{result.beforeTests}</pre>
              </div>
            )}
            {printed.map((r) => (
              <div key={r.index}>
                <p className="text-xs font-medium text-muted">
                  {label(r)} <span className="font-mono">{r.input.length > 40 ? r.input.slice(0, 40) + "…" : r.input}</span>
                </p>
                <pre className="overflow-x-auto rounded bg-background p-2 text-xs whitespace-pre-wrap">{r.output}</pre>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value, block = false, highlight = false }: { label: string; value: string; block?: boolean; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`${block ? "font-mono text-xs break-all whitespace-pre-wrap" : "font-mono text-xs break-all"}${highlight ? " rounded bg-diff-medium/15 px-1 py-0.5" : ""}`}>{value}</dd>
    </div>
  );
}
