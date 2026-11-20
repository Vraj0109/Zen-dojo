import type { CaseResult } from "./run";

/** The whole saved case list of one Submit is kept under this many bytes. */
export const RUN_DETAIL_LIMIT = 64 * 1024;
/** Printed output kept per failed case. */
export const SAVED_OUTPUT_LIMIT = 2048;
const SAVED_TEXT_LIMIT = 600;

/**
 * One case of a saved Submit. Passed cases keep only the summary. Failed cases also keep what went in, what was expected and
 * returned, the error or note, and the first 2 KB of what the code printed for that case.
 */
export interface SavedCase {
  kind: "example" | "test" | "stress";
  /** Position in the run (examples, then tests, then large inputs), the same numbering as the failed ids */
  index: number;
  /** Name of a large input */
  label?: string;
  pass: boolean;
  elapsedMs?: number;
  micros?: number;
  problem?: string;
  /** Failed cases only */
  input?: unknown[];
  expected?: string;
  actual?: string;
  error?: string;
  note?: string;
  output?: string;
}

/** The per-case list of a saved run. `omitted` counts cases that did not fit under the size limit (the last ones). */
export interface SavedRunCases {
  cases: SavedCase[];
  omitted: number;
}

const cut = (text: string, n: number) => (text.length > n ? text.slice(0, n) + "..." : text);

/** Parses the input of an example or test (a JSON list of values). Large inputs are generated, so they have none. */
function inputValues(c: CaseResult): unknown[] | undefined {
  if (c.kind === "stress" || c.kind === "mine") return undefined;
  try {
    const v = JSON.parse(c.input);
    return Array.isArray(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

/** One result in the saved form. Only failed cases carry input, expected, actual and output. */
export function toSavedCase(c: CaseResult): SavedCase {
  const kind = c.kind === "mine" ? "test" : c.kind;
  const base: SavedCase = { kind, index: c.index, pass: c.pass };
  if (c.label) base.label = c.label;
  if (typeof c.elapsedMs === "number") base.elapsedMs = c.elapsedMs;
  if (typeof c.micros === "number") base.micros = c.micros;
  if (c.problem) base.problem = c.problem;
  if (c.pass) return base;
  const input = inputValues(c);
  return {
    ...base,
    ...(input ? { input } : {}),
    ...(c.expected ? { expected: cut(c.expected, SAVED_TEXT_LIMIT) } : {}),
    ...(c.actual !== undefined ? { actual: cut(c.actual, SAVED_TEXT_LIMIT) } : {}),
    ...(c.error ? { error: cut(c.error, SAVED_TEXT_LIMIT) } : {}),
    ...(c.note ? { note: cut(c.note, SAVED_TEXT_LIMIT) } : {}),
    ...(c.output ? { output: c.output.slice(0, SAVED_OUTPUT_LIMIT) } : {}),
  };
}

const hasDetail = (c: SavedCase) => c.input !== undefined || c.expected !== undefined || c.actual !== undefined || c.error !== undefined || c.note !== undefined || c.output !== undefined;

/** Drops every detail of a failed case, keeping its verdict, time and name. */
function stripped(c: SavedCase): SavedCase {
  const out: SavedCase = { kind: c.kind, index: c.index, pass: c.pass };
  if (c.label !== undefined) out.label = c.label;
  if (c.elapsedMs !== undefined) out.elapsedMs = c.elapsedMs;
  if (c.micros !== undefined) out.micros = c.micros;
  if (c.problem !== undefined) out.problem = c.problem;
  return out;
}

const sizeOf = (c: unknown) => Buffer.byteLength(JSON.stringify(c));

/**
 * Turns the results of a Submit into the saved list, kept within RUN_DETAIL_LIMIT. When it is too big, the printed output
 * goes first, then the other details of failed cases (last one first), and only then the cases at the end are left out.
 */
export function compactRunCases(results: CaseResult[]): SavedRunCases {
  const cases = results.map(toSavedCase);
  let total = cases.reduce((sum, c) => sum + sizeOf(c) + 1, 0) + sizeOf({ cases: [], omitted: 0 });
  let omitted = 0;
  // Pass 1: drop printed output (the least needed), then the details, of failed cases from the last one back.
  for (let i = cases.length - 1; total > RUN_DETAIL_LIMIT && i >= 0; i--) {
    const c = cases[i];
    if (!hasDetail(c)) continue;
    total -= sizeOf(c) + 1;
    cases[i] = stripped(c);
    total += sizeOf(cases[i]) + 1;
  }
  // Pass 2: leave out cases from the end (their verdicts are gone too, so only the count is kept).
  while (total > RUN_DETAIL_LIMIT && cases.length > 0) {
    const last = cases.pop()!;
    total -= sizeOf(last) + 1;
    omitted++;
  }
  return { cases, omitted };
}

/** The text stored in solution_runs.run_detail. */
export function serializeRunCases(data: SavedRunCases): string {
  return JSON.stringify({ v: 1, cases: data.cases, omitted: data.omitted });
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/**
 * Reads the stored text back. Returns undefined for a run saved before per-case details existed (empty text) or for text
 * that does not parse; entries that are not cases are skipped, so an older or damaged row degrades to the failed list.
 */
export function parseRunCases(text: string | null | undefined): SavedRunCases | undefined {
  if (!text) return undefined;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isObject(raw) || !Array.isArray(raw.cases)) return undefined;
  const cases = raw.cases.filter(
    (c): c is SavedCase => isObject(c) && (c.kind === "example" || c.kind === "test" || c.kind === "stress") && typeof c.index === "number" && typeof c.pass === "boolean",
  );
  const omitted = typeof raw.omitted === "number" && raw.omitted > 0 ? Math.floor(raw.omitted) : 0;
  return { cases, omitted };
}
