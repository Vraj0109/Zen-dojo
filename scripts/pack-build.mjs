// pnpm pack:build <draft.json> -o <pack.json>
// pnpm pack:build --verify <pack.json>
//
// Writing the expected output of every test by hand is where packs go wrong. A DRAFT is a pack in which the examples and
// tests of a problem have only "input" (no "output") and the problem has "solution": { "cpp": "..." } (a C++ class
// Solution). This script checks the draft, compiles the solution with g++, runs every input, writes the answers in as
// "output", checks the finished pack, and saves it. It fails (and writes nothing) if the draft is invalid, g++ is
// missing, the solution does not compile, or it crashes or times out on any input.
//
// --verify <pack.json> runs each problem's C++ solution on all of the pack's stored cases and reports any that differ.
// Needs g++ (on Windows: winget install BrechtSanders.WinLibs.POSIX.UCRT). Nothing here uses the network.
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const verify = args.includes("--verify");
const outIndex = args.indexOf("-o");
const out = outIndex >= 0 ? args[outIndex + 1] : undefined;
const file = args.find((a, i) => !a.startsWith("-") && args[i - 1] !== "-o");
if (!file || (!verify && !out)) {
  console.error("Usage: pnpm pack:build <draft.json> -o <pack.json>\n       pnpm pack:build --verify <pack.json>");
  process.exit(2);
}

const { validatePack, packItems, packProblemSpec } = await import("@habit/shared");
const { computeOutputs, runCode } = await import("@/lib/judge/run");

const fail = (lines) => {
  for (const l of lines) console.error(l);
  process.exit(1);
};
const read = () => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    return fail([`Cannot read ${file} as JSON: ${e.message}`]);
  }
};
const show = (v) => JSON.stringify(v);

// A value of each type that passes the pack check, used only to let a draft through validation before the real answers exist.
const DUMMY = { int: 0, long: 0, double: 0, bool: false, string: "x", list: [], tree: [], "int[]": [], "long[]": [], "bool[]": [], "string[]": [], "int[][]": [], "string[][]": [] };

if (verify) {
  const check = validatePack(read());
  if (!check.ok) fail([`${file} is not a valid pack:`, ...check.errors.map((m, i) => `  ${i + 1}. ${m}`)]);
  let bad = 0;
  for (const item of packItems(check.pack)) {
    if (item.type !== "problem") continue;
    if (!item.solution?.cpp) {
      console.log(`- ${item.id}: no C++ solution, skipped`);
      continue;
    }
    const spec = packProblemSpec(item, check.pack.id);
    const r = await runCode(spec, "cpp", item.solution.cpp);
    if (r.status !== "done") {
      console.error(`- ${item.id}: ${r.message}`);
      bad++;
      continue;
    }
    const failed = r.results.filter((c) => !c.pass);
    if (failed.length === 0) console.log(`- ${item.id}: all ${r.total} cases agree with the solution`);
    else {
      bad++;
      console.error(`- ${item.id}: ${failed.length} of ${r.total} cases differ:`);
      for (const c of failed.slice(0, 5)) console.error(`    ${c.kind} ${c.index + 1}: input ${c.input.slice(0, 160)}\n      stored ${c.expected.slice(0, 160)}, solution gave ${(c.error ?? c.actual ?? "").slice(0, 160)}`);
    }
  }
  process.exit(bad ? 1 : 0);
}

const draft = read();
const copy = structuredClone(draft);

// 1. Cases without "output" get a placeholder so the whole draft can be checked first.
const pending = []; // { section, item, list: "examples" | "tests", index }
(copy.sections ?? []).forEach?.((s, si) =>
  (s?.items ?? []).forEach?.((it, ii) => {
    if (it?.type !== "problem" || !it.fn) return;
    for (const list of ["examples", "tests"]) {
      (Array.isArray(it[list]) ? it[list] : []).forEach((c, k) => {
        if (c && typeof c === "object" && !("output" in c)) {
          c.output = DUMMY[it.fn.returns] ?? null;
          pending.push({ si, ii, list, k });
        }
      });
    }
  }),
);
const first = validatePack(copy);
if (!first.ok) fail([`${file} is not a valid draft (cases without "output" are fine here):`, ...first.errors.map((m, i) => `  ${i + 1}. ${m}`)]);

// 2. Run each problem's solution on the inputs that need an answer.
const problems = []; // per problem: { si, ii, item, cases: [pending...] }
first.pack.sections.forEach((s, si) =>
  s.items.forEach((item, ii) => {
    if (item.type !== "problem") return;
    const cases = pending.filter((p) => p.si === si && p.ii === ii);
    if (cases.length > 0) problems.push({ si, ii, item, cases });
  }),
);
const problemFailures = [];
for (const { si, ii, item, cases } of problems) {
  const cpp = item.solution?.cpp;
  if (!cpp) {
    problemFailures.push(`${item.id}: needs "solution": { "cpp": "class Solution {...}" } so the outputs can be computed.`);
    continue;
  }
  const spec = packProblemSpec(item, first.pack.id);
  const inputs = cases.map((c) => first.pack.sections[si].items[ii][c.list][c.k].input);
  const r = await computeOutputs(spec, "cpp", cpp, inputs);
  if (r.status !== "done") {
    problemFailures.push(`${item.id}: ${r.status === "compile_error" ? "the C++ solution does not compile:\n" : ""}${r.message}`);
    continue;
  }
  let bad = 0;
  r.results.forEach((res, n) => {
    const c = cases[n];
    if (!res.ok) {
      bad++;
      problemFailures.push(`${item.id}: ${c.list}[${c.k}] input ${show(inputs[n]).slice(0, 200)}: ${res.error}`);
    } else copy.sections[si].items[ii][c.list][c.k].output = res.value;
  });
  if (bad === 0) console.log(`- ${item.id}: wrote ${cases.length} output(s)`);
}
if (problemFailures.length > 0) fail(["Nothing was written. Problems:", ...problemFailures.map((m) => `  - ${m}`)]);

// 3. The finished pack must pass the same check as an import.
const final = validatePack(copy);
if (!final.ok) fail(["The built pack is not valid:", ...final.errors.map((m, i) => `  ${i + 1}. ${m}`)]);
writeFileSync(out, JSON.stringify(copy, null, 2) + "\n");
for (const w of final.warnings) console.log(`Warning: ${w}`);
console.log(`Wrote ${out} (${final.pack.sections.length} section(s), ${packItems(final.pack).length} item(s)). Next: pnpm pack:check ${out}`);
