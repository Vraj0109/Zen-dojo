import "server-only";
import { execFile, spawn } from "node:child_process";
import { closeSync, openSync, readFileSync, statSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { JudgeLang, ProblemSpec } from "@habit/shared";
import { sameAnswer } from "./compare";
import { cppProgram, javaProgram, javaSupportFiles, javascriptProgram } from "./harness";

// Runs your code on a problem's test cases, on this computer, like LeetCode's Run button. It compiles with the
// compilers installed here (g++, a JDK, Node) and runs the program with time and output limits. Nothing leaves the
// machine. The programs are your own code: the route that calls this only accepts same-origin requests.
//
// How the answers get out: the test program writes each answer to a file (results.txt) and keeps standard output free
// for whatever YOUR code prints. Before each case it prints a marker, so the output can be split per case.
// If your code crashes or hangs on one case, that case is marked and the remaining cases are run again, so one bad
// case never hides the rest.

export const JUDGE_LIMITS = {
  code: 100_000,
  compileMs: 30_000,
  /** Longest a single run of the cases may take before it is stopped. */
  batchMs: 4_000,
  /** All runs of one Run press together. */
  totalMs: 15_000,
  /** Console output kept per run; more than this stops the program. */
  output: 1_000_000,
  /** Console output kept per case when shown. */
  perCaseOutput: 20_000,
};

export type CaseResult = {
  index: number;
  kind: "example" | "test";
  pass: boolean;
  input: string;
  expected: string;
  /** What your function returned (as JSON) */
  actual?: string;
  /** Set when the case did not produce an answer: an exception, a crash, a timeout, or not run */
  error?: string;
  /** Why the case failed without a wrong answer */
  problem?: "exception" | "crash" | "timeout" | "not-run";
  micros?: number;
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
    let finished = false;
    const child = spawn(file, args, { cwd: opts.cwd, windowsHide: true, stdio: ["pipe", fd, fd] });
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
        const buf = readFileSync(outPath);
        output = buf.subarray(0, JUDGE_LIMITS.output).toString("utf8");
      } catch {
        // no output file: treat as no output
      }
      resolve({ code, signal, output, timedOut, tooMuchOutput, missing });
    };
    child.on("error", (e: NodeJS.ErrnoException) => {
      missing = e.code === "ENOENT";
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

export async function runCode(spec: ProblemSpec, lang: JudgeLang, code: string): Promise<RunResult> {
  if (code.length > JUDGE_LIMITS.code) return { status: "compile_error", message: "The code is too long." };
  const cases = [...spec.examples.map((c) => ({ ...c, kind: "example" as const })), ...spec.tests.map((c) => ({ ...c, kind: "test" as const }))];

  const dir = await mkdtemp(path.join(os.tmpdir(), "habit-judge-"));
  try {
    let run: { file: string; args: string[] };

    if (lang === "cpp") {
      await writeFile(path.join(dir, "main.cpp"), cppProgram(spec, code));
      const exe = process.platform === "win32" ? "main.exe" : "main";
      // _GLIBCXX_ASSERTIONS makes an out-of-range vector index stop with a message instead of reading garbage.
      const c = await runCompiler(tool("HABIT_GPP", "g++"), ["-O2", "-std=c++17", "-D_GLIBCXX_ASSERTIONS", "-o", exe, "main.cpp"], dir);
      if (c.missing) return { status: "unavailable", message: MISSING.cpp };
      if (c.timedOut) return { status: "compile_error", message: "The compiler took too long." };
      if (!c.ok) return { status: "compile_error", message: clean(c.text, dir) };
      run = { file: path.join(dir, exe), args: [] };
    } else if (lang === "java") {
      await writeFile(path.join(dir, "Solution.java"), code);
      await writeFile(path.join(dir, "Main.java"), javaProgram(spec));
      const support = javaSupportFiles(spec);
      for (const [file, text] of Object.entries(support)) await writeFile(path.join(dir, file), text);
      const c = await runCompiler(tool("HABIT_JAVAC", "javac"), ["-encoding", "UTF-8", "Solution.java", "Main.java", ...Object.keys(support)], dir);
      if (c.missing) return { status: "unavailable", message: MISSING.java };
      if (c.timedOut) return { status: "compile_error", message: "The compiler took too long." };
      if (!c.ok) return { status: "compile_error", message: clean(c.text, dir) };
      run = { file: tool("HABIT_JAVA", "java"), args: ["-cp", ".", "Main"] };
    } else {
      await writeFile(path.join(dir, "main.js"), javascriptProgram(spec, code));
      run = { file: nodeBinary(), args: ["main.js"] };
    }

    const results: (CaseResult | undefined)[] = new Array(cases.length).fill(undefined);
    const outputs: string[] = new Array(cases.length).fill("");
    const shown = (i: number) => ({ input: JSON.stringify(cases[i].input), expected: JSON.stringify(cases[i].output) });
    const failed = (i: number, problem: NonNullable<CaseResult["problem"]>, error: string): CaseResult => ({
      index: i,
      kind: cases[i].kind,
      pass: false,
      ...shown(i),
      problem,
      error,
    });

    let pending = cases.map((_, i) => i);
    let budget = JUDGE_LIMITS.totalMs;
    let beforeTests = "";

    // Run all pending cases; if the program stops early (crash, hang, exit), mark that case and run the rest again.
    while (pending.length > 0 && budget > 200) {
      await rm(path.join(dir, "results.txt"), { force: true });
      const stdin = `${pending.length}\n${pending.map((i) => JSON.stringify(cases[i].input)).join("\n")}\n`;
      const started = Date.now();
      const r = await runProcess(run.file, run.args, { cwd: dir, timeout: Math.min(JUDGE_LIMITS.batchMs, budget), input: stdin });
      budget -= Date.now() - started;
      if (r.missing) return { status: "unavailable", message: MISSING[lang] };

      const text = await readFile(path.join(dir, "results.txt"), "utf8").catch(() => "");
      const lines = text.split("\n").map((l) => l.replace(/\r$/, "")).filter((l) => l.startsWith("OK\t") || l.startsWith("ERR\t"));
      const { before, perCase } = splitOutput(r.output);
      beforeTests += before;
      for (const [local, out] of perCase) if (pending[local] !== undefined) outputs[pending[local]] += out;

      lines.forEach((line, local) => {
        const i = pending[local];
        if (i === undefined) return;
        const [tag, payload, micros] = line.split("\t");
        if (tag === "ERR") {
          results[i] = failed(i, "exception", payload ?? "error");
          return;
        }
        let actual: unknown;
        try {
          actual = JSON.parse(payload);
        } catch {
          results[i] = { ...failed(i, "exception", "The answer could not be read back."), actual: payload };
          return;
        }
        results[i] = {
          index: i,
          kind: cases[i].kind,
          pass: sameAnswer(cases[i].output, actual, spec.unordered),
          ...shown(i),
          actual: JSON.stringify(actual),
          micros: micros ? Number(micros) : undefined,
        };
      });

      const done = lines.length;
      if (done >= pending.length) {
        pending = [];
        break;
      }
      const stopped = pending[done];
      if (r.timedOut) results[stopped] = failed(stopped, "timeout", `Time limit exceeded (more than ${Math.round(JUDGE_LIMITS.batchMs / 1000)} s).`);
      else if (r.tooMuchOutput) results[stopped] = failed(stopped, "crash", "Your code printed too much output and was stopped.");
      else results[stopped] = failed(stopped, "crash", `Crashed: ${describeExit(r.code, r.signal)}`);
      pending = pending.slice(done + 1);
    }

    for (const i of pending) results[i] = failed(i, "not-run", "Not run: the time for this run was used up by earlier cases.");

    const final = results.map((res, i) => {
      const out = outputs[i].replace(/\r\n/g, "\n");
      return { ...(res as CaseResult), ...(out.trim() ? { output: cap(out) } : {}) };
    });
    return { status: "done", results: final, passed: final.filter((x) => x.pass).length, total: cases.length, ...(beforeTests.trim() ? { beforeTests: cap(beforeTests) } : {}) };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
