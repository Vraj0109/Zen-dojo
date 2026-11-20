"use server";

import { refresh, revalidatePath } from "next/cache";
import { packProblemSpec, type PackProblem } from "@habit/shared";
import { requireAdmin } from "@/lib/auth/session";
import { deleteItem, getItem, upsertItem } from "@/lib/content";
import { isHosted } from "@/lib/hosted";
import { runCode } from "@/lib/judge/run";

// Admin problem saving (plan 0045). Saves go through the existing content store (`upsertItem`, table `content_items`,
// item id "problem:<slug>"); the store validates the item again with the same rules the pack importer uses and sets
// `updated_at`. No new table or migration.

export type ProblemActionResult = { ok: true; message: string; id: string } | { ok: false; errors: string[] };

const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const TYPES = ["list", "tree", "int", "long", "double", "bool", "string", "int[]", "long[]", "bool[]", "string[]", "int[][]", "string[][]"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const MAX = { title: 120, source: 80, category: 60, description: 20000, tests: 200000, code: 60000, constraints: 4000, fnName: 60, hints: 20, hint: 500 };

function text(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v.replace(/\r\n/g, "\n") : "";
}

type Built = { ok: true; item: PackProblem } | { ok: false; errors: string[] };

function build(fd: FormData): Built {
  const errors: string[] = [];
  const title = text(fd, "title").trim();
  const slug = text(fd, "slug").trim();
  const difficulty = text(fd, "difficulty").trim();
  const source = text(fd, "source").trim();
  const category = text(fd, "category").trim();
  const description = text(fd, "description").trim();
  const constraints = text(fd, "constraints").trim();
  const testsRaw = text(fd, "tests").trim();
  const code = text(fd, "code");
  const fnName = text(fd, "fnName").trim();
  const paramsRaw = text(fd, "params").trim();
  const returns = text(fd, "returns").trim();
  const hints = text(fd, "hints").split("\n").map((h) => h.trim()).filter(Boolean);

  if (!title || title.length > MAX.title) errors.push(`Title is required (up to ${MAX.title} characters).`);
  if (!SLUG.test(slug)) errors.push("Slug must be lowercase letters, digits and hyphens, starting with a letter or digit (up to 40 characters).");
  if (!DIFFICULTIES.includes(difficulty)) errors.push("Difficulty must be easy, medium or hard.");
  if (source.length > MAX.source) errors.push(`Source is up to ${MAX.source} characters.`);
  if (category.length > MAX.category) errors.push(`Category is up to ${MAX.category} characters.`);
  if (!description || description.length > MAX.description) errors.push(`Description is required (up to ${MAX.description} characters).`);
  if (constraints.length > MAX.constraints) errors.push(`Constraints are up to ${MAX.constraints} characters.`);
  if (hints.length > MAX.hints || hints.some((h) => h.length > MAX.hint)) errors.push(`Hints: up to ${MAX.hints} lines of ${MAX.hint} characters each.`);
  if (code.length > MAX.code) errors.push(`Initial code is up to ${MAX.code} characters.`);
  if (!NAME.test(fnName) || fnName.length > MAX.fnName) errors.push("Function name must be an identifier such as twoSum.");
  if (!TYPES.includes(returns)) errors.push(`Return type must be one of: ${TYPES.join(", ")}.`);

  const params: { name: string; type: string }[] = [];
  if (paramsRaw) {
    for (const part of paramsRaw.split(",")) {
      const [n, t, ...rest] = part.split(":").map((s) => s.trim());
      if (!n || !t || rest.length > 0 || !NAME.test(n) || !TYPES.includes(t)) {
        errors.push(`Parameters must look like "nums:int[], target:int". Bad part: "${part.trim().slice(0, 40)}".`);
        break;
      }
      params.push({ name: n, type: t });
    }
  }

  let cases: unknown[] = [];
  if (!testsRaw) errors.push("Test cases are required.");
  else if (testsRaw.length > MAX.tests) errors.push("Test cases JSON is too long.");
  else {
    try {
      const parsed: unknown = JSON.parse(testsRaw);
      if (!Array.isArray(parsed) || parsed.length === 0) errors.push("Test cases must be a JSON array with at least one case.");
      else {
        const bad = parsed.findIndex((c) => typeof c !== "object" || c === null || Array.isArray(c) || !Array.isArray((c as { input?: unknown }).input) || !("output" in c));
        if (bad >= 0) errors.push(`Test case ${bad + 1} must be an object { "input": [one value per parameter], "output": value }.`);
        else cases = parsed.map((c) => ({ input: (c as { input: unknown }).input, output: (c as { output: unknown }).output }));
      }
    } catch (e) {
      errors.push(`Test cases are not valid JSON: ${e instanceof Error ? e.message : "parse error"}.`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const item: PackProblem = {
    type: "problem",
    id: slug,
    title,
    statement: description.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean),
    constraints: constraints ? constraints.split("\n").map((s) => s.trim()).filter(Boolean) : ["See the statement."],
    fn: { name: fnName, params: params as PackProblem["fn"]["params"], returns: returns as PackProblem["fn"]["returns"] },
    // The first case is shown as the example; the rest are tests. Together they are what the form shows again on edit.
    examples: cases.slice(0, 1) as PackProblem["examples"],
    tests: cases.slice(1) as PackProblem["tests"],
    hints,
    difficulty: difficulty as "easy" | "medium" | "hard",
    ...(category ? { group: category } : {}),
    ...(source ? { source } : {}),
    ...(code.trim() ? { solution: { idea: ["Reference code saved from the admin portal."], complexity: "Not stated.", cpp: code } } : {}),
  };
  return { ok: true, item };
}

async function save(mode: "create" | "update", fd: FormData): Promise<ProblemActionResult> {
  await requireAdmin();
  const built = build(fd);
  if (!built.ok) return built;
  const existing = await getItem(`problem:${built.item.id}`);
  if (mode === "create" && existing) return { ok: false, errors: [`A stored problem with slug "${built.item.id}" already exists. Open it with Edit instead.`] };
  if (mode === "update") {
    const original = text(fd, "originalId").trim();
    if (!original || original !== built.item.id) return { ok: false, errors: ["The slug cannot be changed when editing. Create a new problem for a new slug."] };
    if (!existing) return { ok: false, errors: ["That stored problem no longer exists."] };
  }
  try {
    const result = await upsertItem(built.item, "admin");
    if (!result.ok) return { ok: false, errors: result.errors };
    refresh();
    revalidatePath("/admin/problems");
    const warn = result.warnings.length > 0 ? ` Notes: ${result.warnings.join(" ")}` : "";
    return { ok: true, id: result.id, message: (result.changed ? "Saved." : "No changes to save.") + warn };
  } catch {
    return { ok: false, errors: ["Could not save the problem. Check the server log."] };
  }
}

export async function saveProblemAction(_prev: ProblemActionResult | null, formData: FormData): Promise<ProblemActionResult> {
  await requireAdmin();
  return save("create", formData);
}

export async function updateProblemAction(_prev: ProblemActionResult | null, formData: FormData): Promise<ProblemActionResult> {
  await requireAdmin();
  return save("update", formData);
}

// ---- verify with the judge, and delete (plan 0045 steps 2 and 4) -------------------------------------------------------

export type VerifyResult = { ok: true; passed: number; total: number; maxMs: number; failures: string[] } | { ok: false; errors: string[] };

const short = (s: string) => (s.length > 80 ? `${s.slice(0, 77)}...` : s);

/** Compiles the C++ code of the form and runs it on every case of the form (the first case plus the tests). Saves nothing. */
export async function verifyProblemAction(_prev: VerifyResult | null, formData: FormData): Promise<VerifyResult> {
  await requireAdmin();
  if (isHosted()) return { ok: false, errors: ["Running code is available in the desktop app."] };
  const built = build(formData);
  if (!built.ok) return built;
  const code = text(formData, "code");
  if (!code.trim()) return { ok: false, errors: ["Write the C++ reference solution in the code box first."] };
  try {
    const run = await runCode(packProblemSpec(built.item, "verify"), "cpp", code);
    if (run.status !== "done") return { ok: false, errors: [run.message] };
    const failures = run.results
      .filter((r) => !r.pass)
      .slice(0, 5)
      .map((r) => `Case ${r.index + 1}: ${r.error ?? `expected ${short(r.expected)}, got ${short(r.actual ?? "nothing")}`}`);
    return { ok: true, passed: run.passed, total: run.total, maxMs: Math.round(Math.max(0, ...run.results.map((r) => r.elapsedMs ?? 0))), failures };
  } catch {
    return { ok: false, errors: ["Could not run the judge. Check the server log."] };
  }
}

/** Removes a stored problem. Built-in problems are never touched, and neither are seeded copies (source "builtin"). */
export async function deleteProblemAction(_prev: ProblemActionResult | null, formData: FormData): Promise<ProblemActionResult> {
  await requireAdmin();
  const id = text(formData, "id").trim();
  const row = SLUG.test(id) ? await getItem(`problem:${id}`) : null;
  if (!row || row.source === "builtin") return { ok: false, errors: ["That stored problem does not exist."] };
  await deleteItem(`problem:${id}`);
  refresh();
  revalidatePath("/admin/problems");
  return { ok: true, id: `problem:${id}`, message: "Deleted. Built-in problems are unchanged." };
}
