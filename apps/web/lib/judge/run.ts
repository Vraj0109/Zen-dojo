import "server-only";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { JudgeLang, ProblemSpec } from "@habit/shared";
import { sameAnswer } from "./compare";
import { cppProgram, javaProgram, javaSupportFiles, javascriptProgram } from "./harness";

// Runs your code on a problem's test cases, on this computer, like LeetCode's Run button. It compiles with the
// compilers installed here (g++, a JDK, Node) and runs the program with time and output limits. Nothing leaves the
// machine. The programs are your own code: the route that calls this only accepts same-origin requests.

export const JUDGE_LIMITS = { code: 100_000, compileMs: 30_000, runMs: 10_000, output: 2_000_000 };

export type CaseResult = {
  index: number;
  kind: "example" | "test";
  pass: boolean;
  /** Always set for examples; for other tests only when they fail */
  input?: string;
  expected?: string;
  actual?: string;
  error?: string;
  micros?: number;
};

export type RunResult =
  | { status: "unavailable"; message: string }
  | { status: "compile_error"; message: string }
  | { status: "timeout"; message: string; results: CaseResult[] }
  | { status: "done"; message?: string; results: CaseResult[]; passed: number; total: number };

/** Where each tool is. Set HABIT_GPP / HABIT_JAVAC / HABIT_JAVA / HABIT_NODE if yours are not on PATH. */
const tool = (envName: string, fallback: string) => process.env[envName] || fallback;
const nodeBinary = () => process.env.HABIT_NODE || (process.versions.electron ? "node" : process.execPath);

interface Exec {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  missing: boolean;
}

function exec(file: string, args: string[], opts: { cwd: string; timeout: number; input?: string }): Promise<Exec> {
  return new Promise((resolve) => {
    const child = execFile(
      file,
      args,
      { cwd: opts.cwd, timeout: opts.timeout, maxBuffer: JUDGE_LIMITS.output, windowsHide: true, killSignal: "SIGKILL" },
      (err, stdout, stderr) => {
        const e = err as (NodeJS.ErrnoException & { killed?: boolean; code?: number | string }) | null;
        resolve({
          code: e ? (typeof e.code === "number" ? e.code : null) : 0,
          stdout: String(stdout ?? ""),
          stderr: String(stderr ?? ""),
          timedOut: Boolean(e && e.killed && !e.code),
          missing: Boolean(e && e.code === "ENOENT"),
        });
      },
    );
    child.stdin?.on("error", () => {});
    child.stdin?.end(opts.input ?? "");
  });
}

const MISSING: Record<JudgeLang, string> = {
  cpp: "g++ was not found. Install a C++ compiler (on Windows: winget install BrechtSanders.WinLibs.POSIX.UCRT) and restart the app, or set HABIT_GPP to its path.",
  java: "A JDK was not found (javac and java). Install one (on Windows: winget install EclipseAdoptium.Temurin.17.JDK) and restart the app, or set HABIT_JAVAC and HABIT_JAVA.",
  javascript: "Node was not found. Install Node.js and restart the app, or set HABIT_NODE.",
};

/** Hide the temporary folder name in compiler messages. */
const clean = (text: string, dir: string) => text.split(dir).join(".").replaceAll(dir.replaceAll("\\", "/"), ".").slice(0, 6000);

/** Lines of "OK<TAB>json<TAB>us" or "ERR<TAB>message", one per case, in order. */
function parseLines(stdout: string) {
  return stdout
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => l.startsWith("OK\t") || l.startsWith("ERR\t"));
}

export async function runCode(spec: ProblemSpec, lang: JudgeLang, code: string): Promise<RunResult> {
  if (code.length > JUDGE_LIMITS.code) return { status: "compile_error", message: "The code is too long." };
  const cases = [...spec.examples.map((c) => ({ ...c, kind: "example" as const })), ...spec.tests.map((c) => ({ ...c, kind: "test" as const }))];
  const stdin = `${cases.length}\n${cases.map((c) => JSON.stringify(c.input)).join("\n")}\n`;

  const dir = await mkdtemp(path.join(os.tmpdir(), "habit-judge-"));
  try {
    let run: { file: string; args: string[] };

    if (lang === "cpp") {
      await writeFile(path.join(dir, "main.cpp"), cppProgram(spec, code));
      const exe = process.platform === "win32" ? "main.exe" : "main";
      const c = await exec(tool("HABIT_GPP", "g++"), ["-O2", "-std=c++17", "-o", exe, "main.cpp"], { cwd: dir, timeout: JUDGE_LIMITS.compileMs });
      if (c.missing) return { status: "unavailable", message: MISSING.cpp };
      if (c.timedOut) return { status: "compile_error", message: "The compiler took too long." };
      if (c.code !== 0) return { status: "compile_error", message: clean(c.stderr || c.stdout, dir) };
      run = { file: path.join(dir, exe), args: [] };
    } else if (lang === "java") {
      await writeFile(path.join(dir, "Solution.java"), code);
      await writeFile(path.join(dir, "Main.java"), javaProgram(spec));
      const support = javaSupportFiles(spec);
      for (const [file, text] of Object.entries(support)) await writeFile(path.join(dir, file), text);
      const c = await exec(tool("HABIT_JAVAC", "javac"), ["-encoding", "UTF-8", "Solution.java", "Main.java", ...Object.keys(support)], { cwd: dir, timeout: JUDGE_LIMITS.compileMs });
      if (c.missing) return { status: "unavailable", message: MISSING.java };
      if (c.timedOut) return { status: "compile_error", message: "The compiler took too long." };
      if (c.code !== 0) return { status: "compile_error", message: clean(c.stderr || c.stdout, dir) };
      run = { file: tool("HABIT_JAVA", "java"), args: ["-cp", ".", "Main"] };
    } else {
      await writeFile(path.join(dir, "main.js"), javascriptProgram(spec, code));
      run = { file: nodeBinary(), args: ["main.js"] };
    }

    const r = await exec(run.file, run.args, { cwd: dir, timeout: JUDGE_LIMITS.runMs, input: stdin });
    if (r.missing) return { status: "unavailable", message: MISSING[lang] };
    const lines = parseLines(r.stdout);

    const results: CaseResult[] = [];
    lines.forEach((line, index) => {
      const c = cases[index];
      if (!c) return;
      const [tag, payload, micros] = line.split("\t");
      const base = { index, kind: c.kind, micros: micros ? Number(micros) : undefined };
      const shown = c.kind === "example" ? { input: JSON.stringify(c.input), expected: JSON.stringify(c.output) } : {};
      if (tag === "ERR") {
        results.push({ ...base, pass: false, input: JSON.stringify(c.input), expected: JSON.stringify(c.output), error: payload });
        return;
      }
      let actual: unknown;
      try {
        actual = JSON.parse(payload);
      } catch {
        results.push({ ...base, pass: false, input: JSON.stringify(c.input), expected: JSON.stringify(c.output), actual: payload });
        return;
      }
      const pass = sameAnswer(c.output, actual, spec.unordered);
      results.push({
        ...base,
        pass,
        ...shown,
        actual: JSON.stringify(actual),
        ...(pass ? {} : { input: JSON.stringify(c.input), expected: JSON.stringify(c.output) }),
      });
    });

    if (r.timedOut) {
      return { status: "timeout", message: `Time limit exceeded (${JUDGE_LIMITS.runMs / 1000} s for all cases). It stopped on case ${results.length + 1}.`, results };
    }
    if (results.length < cases.length) {
      const tail = clean(r.stderr, dir).trim();
      return {
        status: "done",
        message: `The program stopped on case ${results.length + 1} (crash or exit)${tail ? `:\n${tail}` : "."}`,
        results,
        passed: results.filter((x) => x.pass).length,
        total: cases.length,
      };
    }
    return { status: "done", results, passed: results.filter((x) => x.pass).length, total: cases.length };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
