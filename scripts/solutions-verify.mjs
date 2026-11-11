// pnpm solutions:verify [--group d|e|f] [--lang java|python] [<id> | <id>.java | <id>.py | <path> | <glob like lc-1*>] ...
// Runs reference solution files from packages/shared/content/solutions/ through the real judge (examples, tests and
// large inputs) and prints one line per file:  ok lc-1.java 2.1s   or   FAIL lc-1.py case 3: expected ... got ...
// Exit code 1 when any file fails. It does not touch the generated bundle. Plan 0063; guide: docs/solutions.md.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(root, "packages/shared/content/solutions");
const usage = "Usage: pnpm solutions:verify [--group d|e|f] [--lang java|python] [<id> | <id>.java | <id>.py | <path> | <glob>] ...";

const args = process.argv.slice(2);
const take = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const group = take("--group");
const lang = take("--lang");
if (lang && lang !== "java" && lang !== "python") {
  console.error(`--lang must be java or python.\n${usage}`);
  process.exit(2);
}
if (args.some((a) => a.startsWith("-"))) {
  console.error(`Unknown option ${args.find((a) => a.startsWith("-"))}.\n${usage}`);
  process.exit(2);
}
if (!group && args.length === 0) {
  console.error(usage);
  process.exit(2);
}

const exts = { java: [".java"], python: [".py"] };
const wantExts = lang ? exts[lang] : [".java", ".py"];
const inFolder = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((n) => n !== "README.md") : [];
const files = new Map(); // absolute path -> true (ordered)
const warnings = [];
const addName = (name, what) => {
  const f = path.join(DIR, name);
  if (fs.existsSync(f)) files.set(f, true);
  else warnings.push(`no file ${name}${what ? ` (${what})` : ""}`);
};

if (group) {
  await import("./lib/register-ts.mjs");
  const { SOLUTION_GROUP_IDS, groupIds } = await import("../packages/shared/src/judge/solution-groups.ts");
  if (!SOLUTION_GROUP_IDS.includes(group)) {
    console.error(`Unknown group "${group}". Use one of: ${SOLUTION_GROUP_IDS.join(", ")}`);
    process.exit(2);
  }
  const ids = new Set(groupIds(group));
  for (const n of inFolder) {
    const ext = path.extname(n);
    if (ids.has(n.slice(0, -ext.length)) && wantExts.includes(ext)) files.set(path.join(DIR, n), true);
  }
}

for (const a of args) {
  const base = path.basename(a);
  const ext = path.extname(base);
  if (ext === ".java" || ext === ".py") {
    // A path or a file name. A path outside the folder is used as it is (handy for trying a solution before it is saved).
    const abs = path.isAbsolute(a) ? a : fs.existsSync(path.resolve(a)) ? path.resolve(a) : path.join(DIR, base);
    if (lang && !wantExts.includes(ext)) continue;
    if (fs.existsSync(abs)) files.set(abs, true);
    else warnings.push(`no file ${a}`);
  } else if (a.includes("*")) {
    const re = new RegExp(`^${a.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
    const hits = inFolder.filter((n) => wantExts.includes(path.extname(n)) && re.test(n.slice(0, -path.extname(n).length)));
    if (!hits.length) warnings.push(`nothing matches ${a}`);
    for (const n of hits) files.set(path.join(DIR, n), true);
  } else {
    for (const e of wantExts) addName(a + e);
  }
}

for (const w of warnings) console.log(`warning: ${w}`);
if (files.size === 0) {
  console.log("Nothing to verify.");
  process.exit(warnings.length ? 1 : 0);
}

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "solutions-verify-")), "results.jsonl");
const vitest = path.join(root, "node_modules/vitest/vitest.mjs");
const run = spawnSync(process.execPath, [vitest, "run", "apps/web/lib/judge/solutions-verify.test.ts", "--reporter=dot", "--silent"], {
  cwd: root,
  env: { ...process.env, SOLUTIONS_FILES: [...files.keys()].join("|"), SOLUTIONS_OUT: out },
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});

const lines = fs.existsSync(out)
  ? fs
      .readFileSync(out, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l))
  : [];
for (const l of lines) console.log(l.status === "ok" ? `ok ${l.file} ${l.seconds.toFixed(1)}s` : `${l.status} ${l.file} ${l.detail}`);
const ran = new Set(lines.map((l) => l.file));
const lost = [...files.keys()].map((f) => path.basename(f)).filter((n) => !ran.has(n));
for (const n of lost) console.log(`FAIL ${n} did not run`);
const failed = lines.filter((l) => l.status === "FAIL").length + lost.length;
const skipped = lines.filter((l) => l.status === "SKIP").length;
console.log(`\n${lines.filter((l) => l.status === "ok").length} ok, ${failed} failed${skipped ? `, ${skipped} skipped` : ""} of ${files.size}`);
if (lost.length) console.log(`${run.stdout ?? ""}${run.stderr ?? ""}`.trim().split("\n").slice(-30).join("\n"));
fs.rmSync(path.dirname(out), { recursive: true, force: true });
process.exit(failed ? 1 : 0);
