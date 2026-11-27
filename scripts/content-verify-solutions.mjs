// pnpm content:verify-solutions [--ids a,b] [--lang cpp|java|javascript|python] [--brute] [--db <file>]
//
// Runs every code block of every problem in the content database against the problem's tests, with the local judge
// (apps/web/lib/judge/run.ts; it needs the compilers and runtimes installed on this computer). Plan 0117 step 3:
// it replaces `solutions:verify` and reads the code from the database, not from files.
//   --ids a,b     only these problem ids (unknown ids are an error)
//   --lang x      only one language (cpp, java, javascript or python; the flag can be given with a comma list)
//   --brute       only brute force blocks. Without it every code block runs.
//   --db <file>   the content database (default: data/content.db)
// Brute force blocks run without the large inputs (stress) and with the time limit times five. Every other block runs
// with its large inputs. A Python block whose first line is "# verify: skip-stress" runs without them too.
// One line per problem, language and block; exit code 1 when any block fails, 2 on bad arguments.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./lib/register-ts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const usage = "Usage: pnpm content:verify-solutions [--ids a,b] [--lang cpp|java|javascript|python] [--brute] [--db <file>]";

const args = process.argv.slice(2);
function takeFlag(name) {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  if (v === undefined || v.startsWith("--")) {
    console.error(`${name} needs a value.\n${usage}`);
    process.exit(2);
  }
  args.splice(i, 2);
  return v;
}
function takeBool(name) {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
}

const idsFlag = takeFlag("--ids");
const langFlag = takeFlag("--lang");
const dbFlag = takeFlag("--db");
const brute = takeBool("--brute");
if (args.length) {
  console.error(`Unknown arguments: ${args.join(" ")}\n${usage}`);
  process.exit(2);
}

const JUDGE_LANGS = ["cpp", "java", "javascript", "python"];
const ids = idsFlag === undefined ? undefined : idsFlag.split(",").map((s) => s.trim()).filter(Boolean);
const langs = langFlag === undefined ? undefined : langFlag.split(",").map((s) => s.trim()).filter(Boolean);
if (langs && langs.some((l) => !JUDGE_LANGS.includes(l))) {
  console.error(`--lang must be one of ${JUDGE_LANGS.join(", ")}.\n${usage}`);
  process.exit(2);
}
const file = path.resolve(dbFlag ?? path.join(root, "data", "content.db"));

async function main() {
  const { openContentFile, loadLiveProblems, missingSolutionIds, selectSolutionJobs } = await import("../apps/web/lib/content-db/verify-db.ts");
  const { stressFor } = await import("../apps/web/lib/content-repo/stress.ts");
  const { specFromContent } = await import("@habit/shared");
  const { runCode } = await import("../apps/web/lib/judge/run.ts");

  let opened;
  try {
    opened = openContentFile(file);
  } catch (err) {
    console.error(`content:verify-solutions ${err instanceof Error ? err.message : err}`);
    return 2;
  }
  let jobs;
  let problems;
  try {
    problems = await loadLiveProblems(opened.db);
  } finally {
    opened.close();
  }

  if (ids) {
    const unknown = missingSolutionIds(problems, ids);
    if (unknown.length) {
      console.error(`Not problem ids in ${file}: ${unknown.join(", ")}`);
      return 2;
    }
  }
  jobs = selectSolutionJobs(problems, { ids, langs, brute });
  if (jobs.length === 0) {
    console.log("Nothing to verify: no code blocks match.");
    return 0;
  }

  console.log(`content:verify-solutions  ${jobs.length} code block${jobs.length === 1 ? "" : "s"} from ${file}${brute ? " (brute force only)" : ""}`);
  const byId = new Map(problems.map((p) => [p.row.id, p]));
  let ok = 0;
  let failed = 0;
  const failedNames = [];
  for (const job of jobs) {
    const started = Date.now();
    const label = `${job.problemId} ${job.lang} ${job.variant}`;
    const seconds = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;
    const problem = byId.get(job.problemId);
    const spec = specFromContent(problem, job.stress ? stressFor(job.problemId) : []);
    const target = job.timeMultiplier === 1 ? spec : { ...spec, timeLimitMs: (spec.timeLimitMs ?? 2500) * job.timeMultiplier };

    let detail;
    try {
      const run = await runCode(target, job.lang, job.code);
      if (run.status === "unavailable") detail = `cannot run ${job.lang} here: ${brief(run.message)}`;
      else if (run.status === "compile_error") detail = `compile error: ${brief(run.message, 300)}`;
      else {
        const bad = run.results.find((r) => !r.pass);
        if (bad) {
          const where = bad.kind === "stress" ? `large input ${bad.label ?? bad.index + 1}` : `case ${bad.index + 1}`;
          const what = bad.error ? brief(bad.error, 200) : `expected ${brief(bad.expected)} got ${brief(bad.actual)}`;
          detail = `${where}: ${what}`;
        }
      }
    } catch (err) {
      detail = `judge error: ${brief(err instanceof Error ? err.message : String(err))}`;
    }

    if (detail === undefined) {
      ok++;
      console.log(`ok      ${label} ${seconds()}`);
    } else {
      failed++;
      failedNames.push(label);
      console.log(`FAIL    ${label} ${seconds()}  ${detail}`);
    }
  }

  console.log(`\n${ok} ok, ${failed} failed of ${jobs.length} code blocks`);
  if (failed) console.log(`failed: ${failedNames.join("; ")}`);
  return failed ? 1 : 0;
}

const brief = (s, n = 120) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}...` : t;
};

let code = 1;
try {
  code = await main();
} catch (err) {
  console.error("content:verify-solutions failed:", err instanceof Error ? err.message : err);
  code = 1;
}
process.exit(code);
