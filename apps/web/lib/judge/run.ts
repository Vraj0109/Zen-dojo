import "server-only";
import { execFile, spawn } from "node:child_process";
import { closeSync, openSync, readFileSync, statSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { JudgeLang, ProblemSpec } from "@habit/shared";
import { firstDifference, sameAnswer } from "./compare";
import { CPP_PRELUDE_LINES, JAVA_PRELUDE, JAVA_PRELUDE_LINES, MEMORY_LIMIT_MB, cppProgram, javaProgram, javaSupportFiles, javascriptProgram } from "./harness";

// Runs your code on a problem's test cases, on this computer, like LeetCode's Run button. It compiles with the
// compilers installed here (g++, a JDK, Node) and runs the program with time, memory and output limits. Nothing leaves
// the machine. The programs are your own code: the route that calls this only accepts same-origin requests.
//
// How the answers get out: the test program writes each answer to a file (results.txt) and keeps standard output free
// for whatever YOUR code prints. Before each case it prints a marker, so the output can be split per case.
// If your code crashes or hangs on one case, that case is marked and the remaining cases are run again, so one bad
// case never hides the rest.
//
// Three kinds of case: the examples, more tests (answers written into the problem), and "large inputs" that check speed
// and memory. A large input has no stored answer: the reference solution computes it once (and the result is kept while
// the app runs). Each large input runs in its own process with its own time limit (1.5 s for C++, 3 times that for Java,
// 5 times for JavaScript, unless the problem says otherwise), and every program is limited to 256 MB.

export const JUDGE_LIMITS = {
  code: 100_000,
  compileMs: 30_000,
  /** Longest a single run of the normal cases may take before it is stopped. */
  batchMs: 4_000,
  /** All runs of the normal cases together. */
  totalMs: 15_000,
  /** All the large inputs together. */
  stressTotalMs: 30_000,
  /** Console output kept per run; more than this stops the program. */
  output: 1_000_000,
  /** Console output kept per case when shown. */
  perCaseOutput: 20_000,
  memoryMb: MEMORY_LIMIT_MB,
};

/** Default time limit of a large input in C++, in milliseconds. */
export const DEFAULT_LIMIT_MS = 1500;
/** Java starts slowly and JavaScript is slower, so they get longer. */
export const TIME_MULTIPLIER: Record<JudgeLang, number> = { cpp: 1, java: 3, javascript: 5 };

export type CaseResult = {
  index: number;
  kind: "example" | "test" | "stress";
  /** Name of a large input ("100000 random numbers") */
  label?: string;
  pass: boolean;
  input: string;
  expected: string;
  /** What your function returned (as JSON) */
  actual?: string;
  /** Set when the case did not produce a right answer in time: an exception, a crash, a timeout, too much memory, or not run */
  error?: string;
  problem?: "exception" | "crash" | "timeout" | "memory" | "not-run";
  micros?: number;
  /** Design problems: which operation first gave a wrong answer */
  note?: string;
  /** Whatever your code printed during this case (cout, printf, System.out, console.log ...) */
  output?: string;
};

export type RunResult =
  | { status: "unavailable"; message: string }
  | { status: "compile_error"; message: string }
  | { status: "done"; message?: string; results: CaseResult[]; passed: number; total: number; beforeTests?: string; saved?: boolean };

/** Where each tool is. Set HABIT_GPP / HABIT_JAVAC / HABIT_JAVA / HABIT_NODE if yours are not on PATH. */
const tool = (envName: string, fallback: string) => process.env[envName] || fallback;
const nodeBinary = () => process.env.HABIT_NODE || (process.versions.electron ? "node" : process.execPath);

interface Exec {
  code: number | null;
  signal: string | null;
  output: string;
  timedOut: boolean;
  tooMuchOutput: boolean;
  missing: boolean;
  /** The operating system refused to start the program (Windows Smart App Control blocks unsigned programs that g++ just built) */
  blocked: boolean;
}

import { isBlockedSpawnError } from "./blocked";
export { isBlockedSpawnError };

/** What to tell the learner when the compiled program was blocked. */
function blockedMessage(lang: JudgeLang): string {
  const where = lang === "cpp" ? "the program that g++ built from your code" : "a program the judge needs";
  return (
    `The operating system refused to start ${where}. On Windows this is usually Smart App Control (or Defender reputation protection), ` +
    "which blocks unsigned programs that were just built. Options: run this problem in Java or JavaScript (they start through the signed java and node programs), " +
    "or turn Smart App Control off (Windows Security > App & browser control > Smart App Control settings; it cannot be turned back on without reinstalling Windows), " +
    "or allow the folder in Windows Security. Answers for the large inputs come from a C++ reference, so they are skipped while C++ programs are blocked."
  );
}

/**
 * Runs a program with a time limit and an output cap. Standard output and standard error go to the SAME file, so what
 * your code prints through cout, printf and cerr keeps its order. The file size is watched while it runs, so a
 * loop that prints forever is stopped.
 */
function runProcess(file: string, args: string[], opts: { cwd: string; timeout: number; input?: string }): Promise<Exec> {
  return new Promise((resolve) => {
    const outPath = path.join(opts.cwd, "console.txt");
    const fd = openSync(outPath, "w");
    let timedOut = false;
    let tooMuchOutput = false;
    let missing = false;
    let blocked = false;
    let finished = false;
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(file, args, { cwd: opts.cwd, windowsHide: true, stdio: ["pipe", fd, fd] });
    } catch (e) {
      // Some failures (Windows "spawn UNKNOWN") are thrown instead of sent as an error event.
      closeSync(fd);
      resolve({ code: null, signal: null, output: "", timedOut: false, tooMuchOutput: false, missing: (e as NodeJS.ErrnoException).code === "ENOENT", blocked: isBlockedSpawnError(e) });
      return;
    }
    const watcher = setInterval(() => {
      try {
        if (statSync(outPath).size > JUDGE_LIMITS.output) {
          tooMuchOutput = true;
          child.kill("SIGKILL");
        }
      } catch {
        // the file may be briefly unavailable; look again next time
      }
    }, 50);
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, opts.timeout);
    const finish = (code: number | null, signal: string | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearInterval(watcher);
      closeSync(fd);
      let output = "";
      try {
        output = readFileSync(outPath).subarray(0, JUDGE_LIMITS.output).toString("utf8");
      } catch {
        // no output file: treat as no output
      }
      resolve({ code, signal, output, timedOut, tooMuchOutput, missing, blocked });
    };
    child.on("error", (e: NodeJS.ErrnoException) => {
      missing = e.code === "ENOENT";
      blocked = isBlockedSpawnError(e);
      finish(null, null);
    });
    child.on("close", (code, signal) => finish(code, signal));
    child.stdin?.on("error", () => {});
    child.stdin?.end(opts.input ?? "");
  });
}

/** The compiler step: collected output only. */
function runCompiler(file: string, args: string[], cwd: string): Promise<{ ok: boolean; text: string; missing: boolean; timedOut: boolean }> {
  return new Promise((resolve) => {
    execFile(file, args, { cwd, timeout: JUDGE_LIMITS.compileMs, maxBuffer: JUDGE_LIMITS.output, windowsHide: true, killSignal: "SIGKILL" }, (err, stdout, stderr) => {
      const e = err as (NodeJS.ErrnoException & { killed?: boolean }) | null;
      resolve({ ok: !e, text: String(stderr || stdout || ""), missing: Boolean(e && e.code === "ENOENT"), timedOut: Boolean(e && e.killed) });
    });
  });
}

const MISSING: Record<JudgeLang, string> = {
  cpp: "g++ was not found. Install a C++ compiler (on Windows: winget install BrechtSanders.WinLibs.POSIX.UCRT) and restart the app, or set HABIT_GPP to its path.",
  java: "A JDK was not found (javac and java). Install one (on Windows: winget install EclipseAdoptium.Temurin.17.JDK) and restart the app, or set HABIT_JAVAC and HABIT_JAVA.",
  javascript: "Node was not found. Install Node.js and restart the app, or set HABIT_NODE.",
};

/** Hide the temporary folder name in compiler messages. */
const clean = (text: string, dir: string) => text.split(dir).join(".").replaceAll(dir.replaceAll("\\", "/"), ".").slice(0, 6000);

/**
 * The compiler reports lines of the whole file (headers, your code, harness). Your editor shows only your code, so
 * "main.cpp:12:" becomes "line 3:" (minus the lines the judge added), and anything outside your code is named as such.
 */
export function shiftLines(text: string, preludeLines: number, userLines: number): string {
  const inUser = (n: number) => n > preludeLines && n <= preludeLines + userLines;
  const lined = text.replace(/(?:\.\/)?(main\.cpp|Solution\.java|[A-Za-z]+\.java):(\d+)(?::\d+)?/g, (_m, file: string, n: string) => {
    const k = Number(n);
    if (file === "main.cpp" || file === "Solution.java") return inUser(k) ? `line ${k - preludeLines}` : "code added by the judge";
    return "code added by the judge";
  });
  // gcc also quotes the source line with its number: "   12 | int x"
  return lined.replace(/^(\s*)(\d+)( \|)/gm, (m, sp: string, n: string, bar: string) => (inUser(Number(n)) ? `${sp}${Number(n) - preludeLines}${bar}` : m));
}

/** A plain-words reason for a program that ended without finishing its cases. */
export function describeExit(code: number | null, signal: string | null): string {
  if (signal === "SIGSEGV" || code === 3221225477 || code === -1073741819) return "invalid memory access (segmentation fault). Check array and vector indexes and null pointers.";
  if (signal === "SIGABRT" || code === 3 || code === 3221226505 || code === -1073740791) return "the program aborted (abort() or a failed check, for example an index outside a vector).";
  if (code === 3221225725 || code === -1073741571) return "stack overflow: the recursion went too deep.";
  if (signal === "SIGFPE" || code === 3221225620 || code === -1073741676) return "division by zero.";
  if (code === 0) return "the program ended early (did your code call exit?).";
  return signal ? `the program was stopped by ${signal}.` : `the program exited with code ${code}.`;
}

const MARKER = /\u0001CASE (\d+)\u0002\r?\n?/;

/** Splits collected output into the text before the first marker and the text of each case (by the batch's own numbering). */
export function splitOutput(output: string): { before: string; perCase: Map<number, string> } {
  const parts = output.split(new RegExp(MARKER.source, "g"));
  const perCase = new Map<number, string>();
  for (let k = 1; k + 1 < parts.length; k += 2) perCase.set(Number(parts[k]), (perCase.get(Number(parts[k])) ?? "") + parts[k + 1]);
  return { before: parts[0] ?? "", perCase };
}

const cap = (text: string) => (text.length > JUDGE_LIMITS.perCaseOutput ? text.slice(0, JUDGE_LIMITS.perCaseOutput) + "\n... (output cut off)" : text);
const brief = (text: string, n = 240) => (text.length > n ? text.slice(0, n) + "..." : text);
const OUT_OF_MEMORY = /bad_alloc|OutOfMemoryError|heap out of memory|Allocation failed|out of memory/i;

interface Prepared {
  run: { file: string; args: string[] };
}

/** Writes the program into `dir` and compiles it. Returns how to start it, or the result to report instead. */
async function prepare(spec: ProblemSpec, lang: JudgeLang, code: string, dir: string, shift = true): Promise<{ ok: true; value: Prepared } | { ok: false; result: RunResult }> {
  if (lang === "cpp") {
    const cppLines = { pre: CPP_PRELUDE_LINES(spec), user: code.split("\n").length };
    await writeFile(path.join(dir, "main.cpp"), cppProgram(spec, code));
    const exe = process.platform === "win32" ? "main.exe" : "main";
    // _GLIBCXX_ASSERTIONS makes an out-of-range vector index stop with a message instead of reading garbage.
    // On Windows a big stack lets deep recursion work, as it does on LeetCode.
    const flags = ["-O2", "-std=c++17", "-D_GLIBCXX_ASSERTIONS", ...(process.platform === "win32" ? ["-Wl,--stack,268435456"] : []), "-o", exe, "main.cpp"];
    const c = await runCompiler(tool("HABIT_GPP", "g++"), flags, dir);
    if (c.missing) return { ok: false, result: { status: "unavailable", message: MISSING.cpp } };
    if (c.timedOut) return { ok: false, result: { status: "compile_error", message: "The compiler took too long." } };
    if (!c.ok) return { ok: false, result: { status: "compile_error", message: shift ? shiftLines(clean(c.text, dir), cppLines.pre, cppLines.user) : clean(c.text, dir) } };
    return { ok: true, value: { run: { file: path.join(dir, exe), args: [] } } };
  }
  if (lang === "java") {
    await writeFile(path.join(dir, "Solution.java"), JAVA_PRELUDE + code);
    await writeFile(path.join(dir, "Main.java"), javaProgram(spec));
    const support = javaSupportFiles(spec);
    for (const [file, text] of Object.entries(support)) await writeFile(path.join(dir, file), text);
    const c = await runCompiler(tool("HABIT_JAVAC", "javac"), ["-encoding", "UTF-8", "Solution.java", "Main.java", ...Object.keys(support)], dir);
    if (c.missing) return { ok: false, result: { status: "unavailable", message: MISSING.java } };
    if (c.timedOut) return { ok: false, result: { status: "compile_error", message: "The compiler took too long." } };
    if (!c.ok) return { ok: false, result: { status: "compile_error", message: shift ? shiftLines(clean(c.text, dir), JAVA_PRELUDE_LINES, code.split("\n").length) : clean(c.text, dir) } };
    return { ok: true, value: { run: { file: tool("HABIT_JAVA", "java"), args: [`-Xmx${MEMORY_LIMIT_MB}m`, "-Xss64m", "-cp", ".", "Main"] } } };
  }
  await writeFile(path.join(dir, "main.js"), javascriptProgram(spec, code));
  return { ok: true, value: { run: { file: nodeBinary(), args: [`--max-old-space-size=${MEMORY_LIMIT_MB}`, "main.js"] } } };
}

interface RunCase {
  input: unknown[];
}

interface Outcome {
  actual?: unknown;
  /** The answer as text when it was not valid JSON */
  rawActual?: string;
  micros?: number;
  problem?: NonNullable<CaseResult["problem"]>;
  error?: string;
  output: string;
}

/**
 * Runs the cases at `indices` (positions in `cases`), together in one process. If the program stops early (crash, hang,
 * exit) that case is marked and the rest are run again, until all are done or `budgetMs` is used up.
 */
async function runSet(dir: string, run: Prepared["run"], cases: RunCase[], indices: number[], batchMs: number, budgetMs: number) {
  const outcomes = new Map<number, Outcome>();
  let beforeTests = "";
  let pending = [...indices];
  let budget = budgetMs;
  let unavailable = false;
  let blocked = false;

  while (pending.length > 0 && budget > 200) {
    await rm(path.join(dir, "results.txt"), { force: true });
    const stdin = `${pending.length}\n${pending.map((i) => JSON.stringify(cases[i].input)).join("\n")}\n`;
    const started = Date.now();
    const limit = Math.min(batchMs, budget);
    const r = await runProcess(run.file, run.args, { cwd: dir, timeout: limit, input: stdin });
    budget -= Date.now() - started;
    if (r.missing) {
      unavailable = true;
      break;
    }
    if (r.blocked) {
      blocked = true;
      break;
    }

    const text = await readFile(path.join(dir, "results.txt"), "utf8").catch(() => "");
    const lines = text.split("\n").map((l) => l.replace(/\r$/, "")).filter((l) => l.startsWith("OK\t") || l.startsWith("ERR\t"));
    const { before, perCase } = splitOutput(r.output);
    beforeTests += before;
    const printed = new Map<number, string>();
    for (const [local, out] of perCase) if (pending[local] !== undefined) printed.set(pending[local], (printed.get(pending[local]) ?? "") + out);

    lines.forEach((line, local) => {
      const i = pending[local];
      if (i === undefined) return;
      const [tag, payload, micros] = line.split("\t");
      const output = printed.get(i) ?? "";
      if (tag === "ERR") {
        outcomes.set(i, { problem: OUT_OF_MEMORY.test(payload ?? "") ? "memory" : "exception", error: OUT_OF_MEMORY.test(payload ?? "") ? `Memory limit exceeded (${MEMORY_LIMIT_MB} MB).` : (payload ?? "error"), output });
        return;
      }
      try {
        outcomes.set(i, { actual: JSON.parse(payload), micros: micros ? Number(micros) : undefined, output });
      } catch {
        outcomes.set(i, { problem: "exception", error: "The answer could not be read back.", rawActual: payload, output });
      }
    });

    const done = lines.length;
    if (done >= pending.length) {
      pending = [];
      break;
    }
    const stopped = pending[done];
    const output = printed.get(stopped) ?? "";
    if (r.timedOut) outcomes.set(stopped, { problem: "timeout", error: `Time limit exceeded (stopped after ${Math.round(limit / 100) / 10} s).`, output });
    else if (r.tooMuchOutput) outcomes.set(stopped, { problem: "crash", error: "Your code printed too much output and was stopped.", output });
    else if (OUT_OF_MEMORY.test(r.output)) outcomes.set(stopped, { problem: "memory", error: `Memory limit exceeded (${MEMORY_LIMIT_MB} MB).`, output });
    else outcomes.set(stopped, { problem: "crash", error: `Crashed: ${describeExit(r.code, r.signal)}`, output });
    pending = pending.slice(done + 1);
  }

  for (const i of pending) outcomes.set(i, { problem: "not-run", error: "Not run: the time for this run was used up by earlier cases.", output: "" });
  return { outcomes, beforeTests, unavailable, blocked };
}

// ---- answers for the large inputs: computed by the reference solution once, kept while the app runs

const referenceCache = new Map<string, Promise<(unknown | undefined)[] | null>>();

/** Expected answers of a problem's large inputs, in order. null when the reference cannot be run (no g++). */
export function referenceAnswers(spec: ProblemSpec): Promise<(unknown | undefined)[] | null> {
  const stress = spec.stress ?? [];
  if (stress.length === 0) return Promise.resolve([]);
  // Keyed by the solution too, so an updated pack problem does not keep the old answers.
  const cacheKey = spec.id + "|" + spec.solution.cpp;
  let cached = referenceCache.get(cacheKey);
  if (!cached) {
    cached = (async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "habit-ref-"));
      try {
        const prepared = await prepare(spec, "cpp", spec.solution.cpp, dir, false);
        if (!prepared.ok) return null;
        const cases = stress.map((s) => ({ input: s.make() }));
        const { outcomes, unavailable, blocked } = await runSet(dir, prepared.value.run, cases, cases.map((_, i) => i), 30_000, 120_000);
        if (unavailable || blocked) return null;
        return cases.map((_, i) => outcomes.get(i)?.actual);
      } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => {});
      }
    })();
    referenceCache.set(cacheKey, cached);
    // A failed attempt (for example no compiler yet) must not stick: try again on the next Run.
    cached.then((v) => {
      if (v === null) referenceCache.delete(cacheKey);
    });
  }
  return cached;
}

type AnyCase = RunCase & { kind: CaseResult["kind"]; output?: unknown; label?: string; limitMs?: number };

export async function runCode(spec: ProblemSpec, lang: JudgeLang, code: string): Promise<RunResult> {
  if (code.length > JUDGE_LIMITS.code) return { status: "compile_error", message: "The code is too long." };

  const known: AnyCase[] = [...spec.examples.map((c) => ({ ...c, kind: "example" as const })), ...spec.tests.map((c) => ({ ...c, kind: "test" as const }))];
  const stress: AnyCase[] = (spec.stress ?? []).map((s) => ({ kind: "stress" as const, label: s.label, input: s.make(), limitMs: s.limitMs ?? DEFAULT_LIMIT_MS }));
  const cases: AnyCase[] = [...known, ...stress];

  const dir = await mkdtemp(path.join(os.tmpdir(), "habit-judge-"));
  try {
    const prepared = await prepare(spec, lang, code, dir);
    if (!prepared.ok) return prepared.result;
    const { run } = prepared.value;

    const first = await runSet(dir, run, cases, known.map((_, i) => i), JUDGE_LIMITS.batchMs, JUDGE_LIMITS.totalMs);
    if (first.unavailable) return { status: "unavailable", message: MISSING[lang] };
    if (first.blocked) return { status: "unavailable", message: blockedMessage(lang) };
    const outcomes = first.outcomes;
    let beforeTests = first.beforeTests;

    // Large inputs: each in its own process with its own time limit.
    let stressBudget = JUDGE_LIMITS.stressTotalMs;
    for (let s = 0; s < stress.length; s++) {
      const i = known.length + s;
      const limit = (stress[s].limitMs ?? DEFAULT_LIMIT_MS) * TIME_MULTIPLIER[lang];
      const timeout = limit + 1500; // startup and reading the input come on top of the work itself
      const part = await runSet(dir, run, cases, [i], timeout, Math.min(timeout, stressBudget));
      stressBudget -= Math.min(timeout, stressBudget);
      beforeTests += part.beforeTests;
      const o = part.outcomes.get(i);
      if (o) outcomes.set(i, o);
    }
    const expectedStress = stress.length > 0 ? await referenceAnswers(spec) : [];

    const results: CaseResult[] = cases.map((c, i) => {
      const o = outcomes.get(i) ?? { problem: "not-run" as const, error: "Not run.", output: "" };
      const isStress = c.kind === "stress";
      const expectedValue = isStress ? expectedStress?.[i - known.length] : c.output;
      const input = isStress ? `(large input: ${c.label})` : JSON.stringify(c.input);
      const expected = isStress ? (expectedValue === undefined ? "(not available)" : brief(JSON.stringify(expectedValue))) : JSON.stringify(c.output);
      const base: CaseResult = { index: i, kind: c.kind, label: c.label, pass: false, input, expected, micros: o.micros };
      const out = o.output.replace(/\r\n/g, "\n");
      const printed = out.trim() ? { output: cap(out) } : {};
      const limitMs = c.limitMs ?? DEFAULT_LIMIT_MS;

      if (o.problem) return { ...base, problem: o.problem, error: o.error, ...(o.rawActual !== undefined ? { actual: o.rawActual } : {}), ...printed };

      const actualText = brief(JSON.stringify(o.actual));
      const tooSlow = isStress && (o.micros ?? 0) / 1000 > limitMs * TIME_MULTIPLIER[lang];
      if (isStress && expectedValue === undefined) {
        // No reference answer (g++ missing): all that can be checked is that it finished in time.
        return tooSlow ? slow(base, o, limitMs, lang, printed) : { ...base, pass: true, actual: actualText, ...printed };
      }
      const right = sameAnswer(expectedValue, o.actual, spec.unordered);
      if (right && tooSlow) return slow(base, o, limitMs, lang, printed);
      const note = !right && spec.design ? firstDifference(c.input, expectedValue, o.actual) : undefined;
      return { ...base, pass: right, actual: actualText, ...(note ? { note } : {}), ...printed };
    });

    return { status: "done", results, passed: results.filter((x) => x.pass).length, total: results.length, ...(beforeTests.trim() ? { beforeTests: cap(beforeTests) } : {}) };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function slow(base: CaseResult, o: Outcome, limitMs: number, lang: JudgeLang, printed: { output?: string }): CaseResult {
  const limit = limitMs * TIME_MULTIPLIER[lang];
  const took = Math.round((o.micros ?? 0) / 1000);
  return { ...base, problem: "timeout", actual: brief(JSON.stringify(o.actual)), error: `Right answer, but too slow: ${took} ms, the limit here is ${limit} ms. Look for a faster algorithm.`, ...printed };
}

export type CustomResult =
  | { status: "unavailable" | "compile_error"; message: string }
  | { status: "done"; output?: string; error?: string; printed?: string; micros?: number };

/** Runs your code once on an input you typed (one JSON value per parameter). There is no expected answer. */
export async function runCustom(spec: ProblemSpec, lang: JudgeLang, code: string, input: unknown[]): Promise<CustomResult> {
  if (code.length > JUDGE_LIMITS.code) return { status: "compile_error", message: "The code is too long." };
  const dir = await mkdtemp(path.join(os.tmpdir(), "habit-judge-"));
  try {
    const prepared = await prepare(spec, lang, code, dir);
    if (!prepared.ok) return prepared.result as CustomResult;
    const r = await runSet(dir, prepared.value.run, [{ input }], [0], JUDGE_LIMITS.batchMs, JUDGE_LIMITS.batchMs);
    if (r.unavailable) return { status: "unavailable", message: MISSING[lang] };
    if (r.blocked) return { status: "unavailable", message: blockedMessage(lang) };
    const o = r.outcomes.get(0);
    const printed = (r.beforeTests + (o?.output ?? "")).replace(/\r\n/g, "\n");
    return {
      status: "done",
      ...(o?.error ? { error: o.error } : {}),
      ...(o && !o.problem ? { output: JSON.stringify(o.actual), micros: o.micros } : {}),
      ...(o?.rawActual !== undefined ? { output: o.rawActual } : {}),
      ...(printed.trim() ? { printed: cap(printed) } : {}),
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export type ComputedOutputs =
  | { status: "unavailable" | "compile_error"; message: string }
  | { status: "done"; results: ({ ok: true; value: unknown; micros?: number } | { ok: false; error: string })[] };

/**
 * Runs a solution on inputs and returns what it answered for each (no expected answers needed). Used by pack:build to
 * write the expected outputs of a draft pack. One compile, all inputs in as few runs as possible.
 */
export async function computeOutputs(spec: ProblemSpec, lang: JudgeLang, code: string, inputs: unknown[][]): Promise<ComputedOutputs> {
  if (code.length > JUDGE_LIMITS.code) return { status: "compile_error", message: "The code is too long." };
  const dir = await mkdtemp(path.join(os.tmpdir(), "habit-build-"));
  try {
    const prepared = await prepare(spec, lang, code, dir);
    if (!prepared.ok) return prepared.result as ComputedOutputs;
    const cases = inputs.map((input) => ({ input }));
    const r = await runSet(dir, prepared.value.run, cases, cases.map((_, i) => i), 30_000, 120_000);
    if (r.unavailable) return { status: "unavailable", message: MISSING[lang] };
    if (r.blocked) return { status: "unavailable", message: blockedMessage(lang) };
    return {
      status: "done",
      results: cases.map((_, i) => {
        const o = r.outcomes.get(i);
        if (!o || o.problem) return { ok: false as const, error: o?.error ?? "not run" };
        return { ok: true as const, value: o.actual, micros: o.micros };
      }),
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
