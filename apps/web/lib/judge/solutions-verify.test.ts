// Runs reference solution files (packages/shared/content/solutions/<id>.java|.py) through the real judge.
// Skipped unless SOLUTIONS_FILES is set (so `pnpm test` stays fast); use `pnpm solutions:verify` (scripts/solutions-verify.mjs),
// which sets the variables, runs this file and prints one line per solution. Plan 0063.
//   SOLUTIONS_FILES  absolute file paths, separated by "|"
//   SOLUTIONS_OUT    optional: a file the result lines are appended to as JSON (the script reads it)
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JUDGE_LANGS, JUDGE_PROBLEMS, type JudgeLang } from "@habit/shared";
import { runCode, type CaseResult } from "./run";

const FILES = (process.env.SOLUTIONS_FILES ?? "").split("|").filter(Boolean);
const OUT = process.env.SOLUTIONS_OUT;
const SKIP_STRESS = "# verify: skip-stress";

export interface VerifyLine {
  file: string;
  status: "ok" | "FAIL" | "SKIP";
  seconds: number;
  detail?: string;
}

const brief = (s: string | undefined, n = 120) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}...` : t;
};

/** Runs one solution file and returns its result line. Never throws. */
export async function verifyFile(filePath: string): Promise<VerifyLine> {
  const name = path.basename(filePath);
  const started = Date.now();
  const done = (status: VerifyLine["status"], detail?: string): VerifyLine => ({ file: name, status, seconds: (Date.now() - started) / 1000, ...(detail ? { detail } : {}) });
  const ext = path.extname(name);
  const id = name.slice(0, -ext.length);
  const lang = ext === ".java" ? "java" : ext === ".py" ? "python" : null;
  const spec = JUDGE_PROBLEMS[id];
  if (!lang) return done("FAIL", "the extension must be .java or .py");
  if (!spec) return done("FAIL", `"${id}" is not a problem id`);
  if (!fs.existsSync(filePath)) return done("FAIL", "the file does not exist");
  if (!(JUDGE_LANGS as readonly string[]).includes(lang)) return done("SKIP", `${lang} is not supported by the judge yet`);

  const code = fs.readFileSync(filePath, "utf8").replace(/\r\n?/g, "\n");
  const skipStress = lang === "python" && code.split("\n")[0].trim() === SKIP_STRESS;
  const target = skipStress ? { ...spec, stress: [] } : spec;
  const run = await runCode(target, lang as JudgeLang, code);
  if (run.status === "unavailable") return done("FAIL", `cannot run ${lang} here: ${brief(run.message)}`);
  if (run.status === "compile_error") return done("FAIL", `compile error: ${brief(run.message, 300)}`);
  const bad: CaseResult | undefined = run.results.find((r) => !r.pass);
  if (bad) {
    const label = bad.kind === "stress" ? `large input ${bad.label ?? bad.index + 1}` : `case ${bad.index + 1}`;
    const what = bad.error ? brief(bad.error, 200) : `expected ${brief(bad.expected)} got ${brief(bad.actual)}`;
    return done("FAIL", `${label}: ${what}`);
  }
  return done("ok");
}

describe.skipIf(FILES.length === 0)("reference solution files", () => {
  for (const file of FILES) {
    it(path.basename(file), { timeout: 600_000 }, async () => {
      const line = await verifyFile(file);
      if (OUT) fs.appendFileSync(OUT, `${JSON.stringify(line)}\n`);
      expect(line.status === "FAIL" ? `${line.file} ${line.detail}` : "ok").toBe("ok");
    });
  }
});
