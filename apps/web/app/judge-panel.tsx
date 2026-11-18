"use client";

import Link from "next/link";
import { useState } from "react";
import type { CaseResult, RunResult } from "@/lib/judge/run";
import { TOOLS_SETTINGS_HREF, isSetupProblem } from "@/lib/judge/setup-hint";
import { buttonClass } from "./ui";

// How the results of a Run are shown (the Results pane in judge-workspace.tsx): the verdict, the cases as a list with
// the chosen case's detail beside it (input, expected, yours, why it failed, what it printed), and the console.

const isTle = (r: CaseResult) => !r.pass && (r.problem === "tle" || r.problem === "timeout");
const keyOf = (r: CaseResult) => `${r.kind}-${r.index}`;
const isNotRun = (r: CaseResult) => !r.pass && r.problem === "not-run";
const ms = (n: number) => `${Math.round(n).toLocaleString("en-US")}ms`;
const tleDetail = (r: CaseResult) => {
  if (typeof r.elapsedMs === "number" && typeof r.timeLimitMs === "number") return `Time Limit Exceeded: ${ms(r.elapsedMs)} (limit: ${ms(r.timeLimitMs)})`;
  if (typeof r.timeLimitMs === "number") return `Time Limit Exceeded (limit: ${ms(r.timeLimitMs)})`;
  if (typeof r.elapsedMs === "number") return `Time Limit Exceeded: ${ms(r.elapsedMs)}`;
  return "Time Limit Exceeded";
};

/** The time a case took, when the judge measured it. */
const caseTime = (r: CaseResult) =>
  r.micros !== undefined ? (r.micros < 1000 ? `${r.micros} µs` : `${Math.round(r.micros / 1000)} ms`) : typeof r.elapsedMs === "number" ? ms(r.elapsedMs) : "";

export const caseLabel = (r: { kind: CaseResult["kind"]; index: number; label?: string }) =>
  r.kind === "example" ? `Example ${r.index + 1}` : r.kind === "stress" ? `Large input: ${r.label ?? r.index + 1}` : `Test ${r.index + 1}`;

/** Why a case failed, in plain words, from `problem` and `error`. */
function failureReason(r: CaseResult): string {
  if (r.pass) return "";
  if (isTle(r)) return tleDetail(r);
  switch (r.problem) {
    case "memory":
      return "Used too much memory.";
    case "crash":
      return "Your program crashed.";
    case "exception":
      return "Your code threw an exception.";
    case "not-run":
      return "Not run: the run stopped before this case.";
    default:
      return r.note ? "Wrong answer at the operation below." : "Wrong answer: your output differs from the expected one.";
  }
}

function verdictOf(results: CaseResult[]) {
  const first = results.find((r) => !r.pass && !isNotRun(r)) ?? results.find((r) => !r.pass);
  if (!first) return { first, headline: "Accepted" };
  const headline = isTle(first)
    ? "Time Limit Exceeded (TLE)"
    : first.problem === "memory"
      ? "Memory limit exceeded"
      : first.problem === "crash" || first.problem === "exception"
        ? "Runtime error"
        : first.problem === "not-run"
          ? "Stopped early"
          : "Wrong answer";
  return { first, headline };
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="shrink-0">
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.5V8l2.3 1.4" />
    </svg>
  );
}

/** Pass/fail icon for a case. */
export function CaseIcon({ pass, tle = false, notRun = false }: { pass: boolean; tle?: boolean; notRun?: boolean }) {
  if (notRun) {
    return (
      <svg aria-label="Not run" role="img" viewBox="0 0 16 16" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="8" cy="8" r="5.5" strokeDasharray="2 2" />
      </svg>
    );
  }
  if (pass) {
    return (
      <svg aria-label="Passed" role="img" viewBox="0 0 16 16" className="size-4 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3.5 8.5 3 3 6-7" />
      </svg>
    );
  }
  return (
    <svg aria-label={tle ? "Too slow" : "Failed"} role="img" viewBox="0 0 16 16" className={`size-4 shrink-0 ${tle ? "text-warning" : "text-danger"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="m4.5 4.5 7 7M11.5 4.5l-7 7" />
    </svg>
  );
}

/** Shown under a failure that comes from this computer's setup, not from the learner's code: points to Settings > Tools. */
export function ToolSetupHint() {
  return (
    <div role="note" className="mt-3 rounded-md border border-line bg-surface-2 p-3 text-sm">
      <p className="font-medium">This looks like a setup problem on this computer, not a mistake in your code.</p>
      <p className="mt-1 text-muted">
        Open <span className="font-medium text-foreground">Settings, Tools for running code</span> to see what is installed and the exact command to fix what is missing.
        On a Mac, install Apple&apos;s command line tools (<code className="font-mono">xcode-select --install</code>); the app supplies the header the compiler lacks.
      </p>
      <Link href={TOOLS_SETTINGS_HREF} className={buttonClass("secondary", "sm", "mt-2")}>
        Open Tools settings
      </Link>
    </div>
  );
}

/** Verdict line plus the case list and the chosen case's detail. Compile errors and missing tools show here too. */
export function CasesView({ result }: { result: RunResult }) {
  const results = result.status === "done" ? result.results : [];
  const { first } = verdictOf(results);
  const [picked, setPicked] = useState<string | null>(null);

  if (result.status === "unavailable") {
    return (
      <div className="rounded-md border border-warning bg-surface p-3 text-sm">
        <p>{result.message}</p>
        <ToolSetupHint />
      </div>
    );
  }
  if (result.status === "compile_error") {
    return (
      <div className="rounded-md border border-danger bg-surface p-3">
        <p className="font-semibold text-danger">Compile error</p>
        <p className="mt-1 text-xs text-muted">The full compiler output is in the Console tab.</p>
        <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs whitespace-pre-wrap">{result.message}</pre>
        {isSetupProblem(result.message) && <ToolSetupHint />}
      </div>
    );
  }

  const { headline } = verdictOf(results);
  const accepted = !first;
  const current = results.find((r) => keyOf(r) === picked) ?? first ?? results[0];
  const groups: { title: string; items: CaseResult[] }[] = [
    { title: "Examples", items: results.filter((r) => r.kind === "example") },
    { title: "Tests", items: results.filter((r) => r.kind === "test") },
    { title: "Large inputs", items: results.filter((r) => r.kind === "stress") },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-3">
      {!accepted && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className={`font-semibold ${first && isTle(first) ? "text-warning" : "text-danger"}`}>{headline}</p>
          <p className="text-sm text-muted tabular-nums">
            {result.passed} of {result.total} cases passed
          </p>
          {first && <p className="w-full text-xs text-muted">First failure: {caseLabel(first)}.</p>}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)]">
        <nav aria-label="Cases" className="max-h-80 overflow-auto rounded-md border border-line md:max-h-none">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="sticky top-0 bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">{g.title}</p>
              <ul>
                {g.items.map((r) => {
                  const on = current && keyOf(current) === keyOf(r);
                  return (
                    <li key={keyOf(r)}>
                      <button
                        type="button"
                        aria-current={on ? "true" : undefined}
                        onClick={() => setPicked(keyOf(r))}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors duration-120 ${
                          on ? "bg-primary-soft text-foreground" : "hover:bg-surface-2"
                        } ${isNotRun(r) ? "opacity-70" : ""}`}
                      >
                        <CaseIcon pass={r.pass} tle={isTle(r)} notRun={isNotRun(r)} />
                        <span className="min-w-0 flex-1 truncate">{caseLabel(r)}</span>
                        <span className="shrink-0 text-xs text-muted tabular-nums">{caseTime(r)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        {current && <CaseDetail r={current} />}
      </div>
    </div>
  );
}

function CaseDetail({ r }: { r: CaseResult }) {
  const reason = failureReason(r);
  return (
    <section aria-label={`${caseLabel(r)} detail`} className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <CaseIcon pass={r.pass} tle={isTle(r)} notRun={isNotRun(r)} />
        <h4 className="text-sm font-semibold">{caseLabel(r)}</h4>
        <span className={`text-sm ${r.pass ? "text-success" : isTle(r) ? "text-warning" : isNotRun(r) ? "text-muted" : "text-danger"}`}>
          {r.pass ? "Passed" : isNotRun(r) ? "Not run" : isTle(r) ? "Too slow" : "Failed"}
        </span>
        {caseTime(r) && <span className="text-xs text-muted tabular-nums">{caseTime(r)}</span>}
      </div>
      {reason && (
        <p className={`flex items-start gap-1.5 rounded-sm px-2.5 py-1.5 text-sm ${isTle(r) ? "bg-warning/10 text-warning" : isNotRun(r) ? "bg-surface-2 text-muted" : "bg-danger/10 text-danger"}`}>
          {isTle(r) && <ClockIcon />}
          {reason}
        </p>
      )}
      <Block label="Input" value={r.input} />
      <Block label="Expected" value={r.expected} />
      {r.note && <Block label="First wrong operation" value={r.note} />}
      <Block
        label={r.error ? "What happened" : "Yours"}
        value={r.error ?? r.actual ?? "(nothing)"}
        tone={r.pass ? "success" : isNotRun(r) ? undefined : "danger"}
      />
      {r.output ? (
        <Block label="Printed during this case" value={r.output} />
      ) : (
        <p className="text-xs text-muted">Nothing printed during this case.</p>
      )}
    </section>
  );
}

function Block({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  const border = tone === "success" ? "border-success" : tone === "danger" ? "border-danger" : "border-line";
  const text = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "";
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted">{label}</p>
      <pre className={`max-h-48 overflow-auto rounded-sm border bg-surface-2 px-2.5 py-1.5 font-mono text-xs break-all whitespace-pre-wrap ${border} ${text}`}>{value}</pre>
    </div>
  );
}

/** The Console tab: compiler output and what the code printed (before the first case, then per case). */
export function ConsoleView({ result }: { result: RunResult | null }) {
  if (!result) return <p className="text-sm text-muted">Run your code to see the compiler output and everything it prints.</p>;
  if (result.status !== "done") {
    return (
      <section aria-label="Compiler output" className="space-y-2">
        <h4 className="text-sm font-semibold">{result.status === "compile_error" ? "Compiler output" : "Could not run"}</h4>
        <pre className="overflow-x-auto rounded-sm border border-line bg-surface-2 p-2.5 font-mono text-xs whitespace-pre-wrap">{result.message}</pre>
      </section>
    );
  }
  const printed = result.results.filter((r) => r.output);
  if (!result.beforeTests && printed.length === 0 && !result.message) {
    return <p className="text-sm text-muted">The code compiled and printed nothing.</p>;
  }
  return (
    <section aria-label="Console output" className="space-y-3">
      <p className="text-xs text-muted">Everything your code printed, case by case (cout, printf, cerr, System.out, console.log ...).</p>
      {result.message && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Compiler</p>
          <pre className="overflow-x-auto rounded-sm border border-line bg-surface-2 p-2.5 font-mono text-xs whitespace-pre-wrap">{result.message}</pre>
        </div>
      )}
      {result.beforeTests && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Before the first case</p>
          <pre className="overflow-x-auto rounded-sm border border-line bg-surface-2 p-2.5 font-mono text-xs whitespace-pre-wrap">{result.beforeTests}</pre>
        </div>
      )}
      {printed.map((r) => (
        <div key={`${r.kind}-${r.index}`}>
          <p className="mb-1 text-xs font-medium text-muted">
            {caseLabel(r)} <span className="font-mono">{r.input.length > 40 ? r.input.slice(0, 40) + "…" : r.input}</span>
          </p>
          <pre className="overflow-x-auto rounded-sm border border-line bg-surface-2 p-2.5 font-mono text-xs whitespace-pre-wrap">{r.output}</pre>
        </div>
      ))}
    </section>
  );
}
