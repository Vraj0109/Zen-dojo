import type { ProblemSpec } from "@habit/shared";
import type { CaseResult } from "@/lib/judge/run";

export const MAX_MY_CASES = 10;

export type WorkspaceAction =
  | "run"
  | "submit"
  | "save"
  | "next-case"
  | "prev-case"
  | `jump-case-${number}`
  | "toggle-problem"
  | "toggle-results"
  | "shortcuts";

/**
 * Formats inputs into name = value lines for display in the workspace.
 * For design problems, outputs ops and args.
 */
export function formatInputs(
  params: { name: string; type: string }[] | undefined,
  input: unknown,
): string[] {
  let parsed = input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
      return [trimmed];
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return [input];
    }
  }

  const isDesignParams =
    params &&
    params.length === 2 &&
    params[0]?.name === "ops" &&
    params[1]?.name === "args";
  const isDesignInput =
    Array.isArray(parsed) &&
    parsed.length === 2 &&
    Array.isArray(parsed[0]) &&
    Array.isArray(parsed[1]) &&
    parsed[0].every((x) => typeof x === "string");

  if (isDesignParams || (params === undefined && isDesignInput)) {
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return [
        `ops = ${JSON.stringify(parsed[0])}`,
        `args = ${JSON.stringify(parsed[1])}`,
      ];
    }
  }

  if (Array.isArray(parsed)) {
    if (params && params.length > 0) {
      const lines: string[] = [];
      const total = Math.max(params.length, parsed.length);
      for (let i = 0; i < total; i++) {
        const p = params[i];
        if (p && i < parsed.length) {
          lines.push(`${p.name} = ${JSON.stringify(parsed[i])}`);
        } else if (p) {
          lines.push(`${p.name} = undefined`);
        } else {
          lines.push(JSON.stringify(parsed[i]));
        }
      }
      return lines;
    }
    return parsed.map((v, i) => `param${i + 1} = ${JSON.stringify(v)}`);
  }

  if (params && params.length > 0) {
    return [`${params[0].name} = ${JSON.stringify(parsed)}`];
  }
  return [JSON.stringify(parsed)];
}

/**
 * Returns plain verdict text for a case result.
 */
export function verdictText(caseResult: Partial<CaseResult>): string {
  if (caseResult.pass) {
    const time =
      caseResult.micros !== undefined
        ? caseResult.micros < 1000
          ? `${caseResult.micros} µs`
          : `${Math.round(caseResult.micros / 1000)} ms`
        : typeof caseResult.elapsedMs === "number"
          ? `${caseResult.elapsedMs} ms`
          : undefined;
    return time ? `Accepted · ${time}` : "Accepted";
  }

  if (caseResult.problem === "tle" || caseResult.problem === "timeout") {
    if (caseResult.elapsedMs !== undefined) {
      return `Time limit: stopped at ${caseResult.elapsedMs.toLocaleString("en-US")} ms`;
    }
    if (caseResult.timeLimitMs !== undefined) {
      return `Time limit: ${caseResult.timeLimitMs.toLocaleString("en-US")} ms`;
    }
    return "Time limit exceeded";
  }

  if (caseResult.problem === "crash") {
    if (caseResult.error) {
      return caseResult.error.startsWith("Crashed:") ? caseResult.error : `Crashed: ${caseResult.error}`;
    }
    return "Crashed";
  }

  if (caseResult.problem === "exception") {
    if (caseResult.error) {
      return caseResult.error.startsWith("Exception:") ? caseResult.error : `Exception: ${caseResult.error}`;
    }
    return "Exception";
  }

  if (caseResult.problem === "memory") {
    return caseResult.error ?? "Memory limit exceeded";
  }

  if (caseResult.problem === "not-run") {
    if (caseResult.error) {
      return caseResult.error.startsWith("Not run:") ? caseResult.error : `Not run: ${caseResult.error}`;
    }
    return "Not run";
  }

  if (caseResult.note) {
    return `Wrong answer: ${caseResult.note}`;
  }
  return "Wrong answer";
}

const CUT_MARK = "\n... (output cut off)";

/**
 * What a case printed, ready to show: the text without the judge's "cut off" marker, its line count (a trailing
 * newline does not start a new line) and whether the judge cut it at its per-case limit.
 */
export function consoleText(output: string | undefined): { text: string; lines: number; cut: boolean } {
  let text = output ?? "";
  const cut = text.endsWith(CUT_MARK);
  if (cut) text = text.slice(0, -CUT_MARK.length);
  const body = text.endsWith("\n") ? text.slice(0, -1) : text;
  return { text, lines: body === "" ? 0 : body.split("\n").length, cut };
}

/**
 * Parses custom cases stored in localStorage, enforcing arrays and capping at 10.
 */
export function parseMyCases(raw: string | null): unknown[][] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Array.isArray).slice(0, MAX_MY_CASES);
  } catch {
    return [];
  }
}

/**
 * Serializes custom cases for localStorage, capping at 10.
 */
export function serializeMyCases(cases: unknown[][]): string {
  if (!Array.isArray(cases)) return "[]";
  const valid = cases.filter(Array.isArray).slice(0, MAX_MY_CASES);
  return JSON.stringify(valid);
}

/**
 * Maps keyboard events to workspace actions according to platform rules.
 */
export function shortcutFor(
  event: {
    key: string;
    /** Physical key ("Digit1", "Quote"); used where the layout changes `key` (Option+1 on a Mac types "¡"). */
    code?: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
  },
  isMac: boolean,
): WorkspaceAction | null {
  const mod = isMac ? (Boolean(event.metaKey) && !event.ctrlKey) : (Boolean(event.ctrlKey) && !event.metaKey);

  // Mod shortcuts (Cmd on Mac, Ctrl on Windows/Linux)
  if (mod && !event.altKey) {
    if (event.key === "'" || event.key === "\"" || event.code === "Quote") return "run";
    if (event.key === "Enter") return "submit";
    if (event.key === "s" || event.key === "S") return "save";
    if (event.key === "b" || event.key === "B") return "toggle-problem";
    if (event.key === "j" || event.key === "J") return "toggle-results";
  }

  // Alt shortcuts
  if (event.altKey && !event.ctrlKey && !event.metaKey) {
    if (event.key === "ArrowRight") return "next-case";
    if (event.key === "ArrowLeft") return "prev-case";
    if (/^[1-9]$/.test(event.key)) {
      return `jump-case-${Number(event.key)}` as WorkspaceAction;
    }
    const digit = /^(?:Digit|Numpad)([1-9])$/.exec(event.code ?? "");
    if (digit) return `jump-case-${Number(digit[1])}` as WorkspaceAction;
  }

  // ? outside modifiers
  if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key === "?") {
    return "shortcuts";
  }

  return null;
}


/**
 * The part of a problem the workspace needs, as plain data. The server builds it with `workspaceSpec`; the full
 * `ProblemSpec` cannot cross to the client because large-input cases carry generator functions.
 */
export type WorkspaceSpec = Pick<ProblemSpec, "fn" | "design" | "examples"> & { testCount: number; stressCount: number };

export function workspaceSpec(spec: ProblemSpec): WorkspaceSpec {
  return {
    fn: spec.fn,
    design: spec.design,
    examples: spec.examples.map((e) => ({ input: e.input, output: e.output })),
    testCount: spec.tests.length,
    stressCount: spec.stress?.length ?? 0,
  };
}
