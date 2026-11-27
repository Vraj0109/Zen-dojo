"use server";

import { refresh, revalidatePath, revalidateTag } from "next/cache";
import { createElement, type ReactNode } from "react";
import { ContentPage as ContentPageView } from "@/app/content-page";
import {
  packProblemSpec,
  specFromContent,
  TAG,
  type CodeLang,
  type ContentLesson,
  type ContentPage,
  type ContentProblem,
  type PackProblem,
  type ProblemDraft,
  type TemplateDef,
  type TemplateId,
} from "@habit/shared";
import { AdminDeniedError, requireAdminAction } from "@/lib/auth/admin";
import type { AdminProof } from "@/lib/auth/admin-proof";
import { getContentWriteDb } from "@/lib/content-db/client";
import { writeAudit } from "@/lib/content-db/audit";
import { putAsset } from "@/lib/content-db/write";
import { deleteItem, getItem, upsertItem } from "@/lib/content";
import { isHosted } from "@/lib/hosted";
import { runCode } from "@/lib/judge/run";
import { stressFor } from "@/lib/content-repo/stress";
import {
  deleteLesson,
  deleteProblem,
  isDesktop,
  restoreFromAudit,
  saveLesson,
  saveDoc,
  saveProblem,
  type WriteResult,
} from "@/lib/admin-content/write";
import { contentOrigin } from "@/lib/content-sync/origin";
import { fetchWithAccessToken } from "@/lib/auth/session";
import { detectMimeType } from "@/app/api/admin/content/assets/route";

// Admin problem saving (plan 0045 & 0116).
// Supports legacy PackProblem saving as well as the new database-backed ProblemDraft, ContentLesson, and Doc editing.

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

async function save(mode: "create" | "update", fd: FormData, proof: AdminProof): Promise<ProblemActionResult> {
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
    if (result.changed) {
      try {
        const contentDb = await getContentWriteDb(proof);
        await contentDb.transaction(async (tx) => {
          await writeAudit(tx, proof, {
            action: mode === "create" ? "create" : "update",
            entity: "content_item",
            entityId: `problem:${built.item.id}`,
            before: existing ? existing.item : null,
            after: built.item,
            requestId: null,
          });
        });
      } catch {
        // Fallback for environments without content write db configured
      }
    }
    refresh();
    revalidatePath("/admin/problems");
    const warn = result.warnings.length > 0 ? ` Notes: ${result.warnings.join(" ")}` : "";
    return { ok: true, id: result.id, message: (result.changed ? "Saved." : "No changes to save.") + warn };
  } catch {
    return { ok: false, errors: ["Could not save the problem. Check the server log."] };
  }
}

export async function saveProblemAction(_prev: ProblemActionResult | null, formData: FormData): Promise<ProblemActionResult> {
  try {
    const proof = await requireAdminAction();
    return await save("create", formData, proof);
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    throw e;
  }
}

export async function updateProblemAction(_prev: ProblemActionResult | null, formData: FormData): Promise<ProblemActionResult> {
  try {
    const proof = await requireAdminAction();
    return await save("update", formData, proof);
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    throw e;
  }
}

export type VerifyResult = { ok: true; passed: number; total: number; maxMs: number; failures: string[] } | { ok: false; errors: string[] };

const short = (s: string) => (s.length > 80 ? `${s.slice(0, 77)}...` : s);

/** Compiles the C++ code of the form and runs it on every case of the form. Saves nothing. */
export async function verifyProblemAction(_prev: VerifyResult | null, formData: FormData): Promise<VerifyResult> {
  try {
    await requireAdminAction();
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
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    throw e;
  }
}

/** Removes a stored problem. Built-in problems are never touched. */
export async function deleteProblemAction(_prev: ProblemActionResult | null, formData: FormData): Promise<ProblemActionResult> {
  try {
    const proof = await requireAdminAction();
    const id = text(formData, "id").trim();
    const row = SLUG.test(id) ? await getItem(`problem:${id}`) : null;
    if (!row || row.source === "builtin") return { ok: false, errors: ["That stored problem does not exist."] };
    await deleteItem(`problem:${id}`);
    try {
      const contentDb = await getContentWriteDb(proof);
      await contentDb.transaction(async (tx) => {
        await writeAudit(tx, proof, {
          action: "delete",
          entity: "content_item",
          entityId: `problem:${id}`,
          before: row.item,
          after: null,
          requestId: null,
        });
      });
    } catch {
      // Fallback for environments without content write db configured
    }
    refresh();
    revalidatePath("/admin/problems");
    return { ok: true, id: `problem:${id}`, message: "Deleted. Built-in problems are unchanged." };
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    throw e;
  }
}

// -------------------------------------------------------------------------------------------------
// Plan 0116: Problem draft actions (content DB)
// -------------------------------------------------------------------------------------------------

export async function saveProblemDraftAction(
  draft: ProblemDraft,
  baseRev: string | null = null,
  extra?: { note?: string | null; notify?: boolean },
): Promise<WriteResult<ContentProblem>> {
  try {
    const proof = await requireAdminAction();
    const res = await saveProblem(proof, draft, baseRev, extra);
    if (res.ok) {
      refresh();
      revalidatePath("/admin/problems");
      revalidatePath(`/admin/problems/${draft.row.id}`);
    }
    return res;
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    throw e;
  }
}

export async function deleteProblemDraftAction(
  id: string,
  baseRev: string | null = null,
): Promise<WriteResult<ContentProblem>> {
  try {
    const proof = await requireAdminAction();
    const res = await deleteProblem(proof, id, baseRev);
    if (res.ok) {
      refresh();
      revalidatePath("/admin/problems");
    }
    return res;
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    throw e;
  }
}

export type RunDraftResult =
  | { ok: true; passed: number; total: number; maxMs: number; failures: string[] }
  | { ok: false; errors: string[] };

/**
 * Plan 0116 step 6: Runs tests against a problem draft's code on desktop.
 * Hosted environments return an error indicating testing is desktop-only.
 */
export async function runDraftAction(
  draft: ProblemDraft,
  lang: CodeLang,
  code: string,
  includeStress = false,
): Promise<RunDraftResult> {
  try {
    await requireAdminAction();
    if (isHosted()) {
      return { ok: false, errors: ["Run tests in the desktop app"] };
    }
    if (!code || !code.trim()) {
      return { ok: false, errors: ["Write solution code first."] };
    }

    if (lang !== "cpp" && lang !== "java" && lang !== "javascript" && lang !== "python") {
      return { ok: false, errors: [`Judge only supports C++, Java, JavaScript, and Python. Cannot run ${lang}.`] };
    }

    try {
      const spec = specFromContent(draft, includeStress ? stressFor(draft.row.id) : undefined);
      const run = await runCode(spec, lang, code);
      if (run.status !== "done") {
        return { ok: false, errors: [run.message] };
      }
      const failures = run.results
        .filter((r) => !r.pass)
        .slice(0, 5)
        .map(
          (r) =>
            `Case ${r.index + 1}: ${r.error ?? `expected ${short(r.expected)}, got ${short(r.actual ?? "nothing")}`}`,
        );
      return {
        ok: true,
        passed: run.passed,
        total: run.total,
        maxMs: Math.round(Math.max(0, ...run.results.map((r) => r.elapsedMs ?? 0))),
        failures,
      };
    } catch {
      return { ok: false, errors: ["Could not run the judge. Check the server log."] };
    }
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    throw e;
  }
}

/**
 * Plan 0116 step 5: renders the preview on the server with the same component the public pages use
 * (app/content-page.tsx: Markdown with Shiki highlighting, code tabs, diagrams, images), so the preview matches the
 * reader exactly. The client page editor cannot import that component (Shiki is server-only), so it calls this.
 */
export async function previewAction(
  fragment: { template: TemplateId | TemplateDef; page: ContentPage },
): Promise<{ ok: true; node: ReactNode } | { ok: false; errors: string[] }> {
  try {
    await requireAdminAction();
    return { ok: true, node: createElement(ContentPageView, { template: fragment.template, page: fragment.page }) };
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    throw e;
  }
}

/** Plan 0116 step 4b: Image asset upload. */
export async function uploadAssetAction(
  formData: FormData,
): Promise<{ ok: true; id: string; url: string } | { ok: false; error: string }> {
  try {
    const proof = await requireAdminAction();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return { ok: false, error: "Missing file field." };
    }
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (bytes.byteLength > 1024 * 1024) {
      return { ok: false, error: "Image is larger than 1 MB." };
    }
    const headerSlice = new TextDecoder().decode(bytes.slice(0, 100)).trim().toLowerCase();
    if (headerSlice.startsWith("<svg") || headerSlice.startsWith("<?xml")) {
      return { ok: false, error: "SVG images are not allowed (use a Mermaid diagram for vector drawings)." };
    }
    const mime = detectMimeType(bytes);
    if (!mime) {
      return { ok: false, error: "Only PNG, JPEG, and WebP images are allowed." };
    }

    if (isDesktop()) {
      const origin = contentOrigin();
      const url = `${origin}/api/admin/content/assets`;
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetchWithAccessToken(url, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        return { ok: false, error: json.error ?? "Asset upload failed." };
      }
      const json = await res.json();
      return { ok: true, id: json.id, url: json.url };
    }

    const db = await getContentWriteDb(proof);
    let assetId = "";
    await db.transaction(async (tx) => {
      const res = await putAsset(tx, bytes, mime, proof.name || proof.userId);
      assetId = res.id;
    });
    return { ok: true, id: assetId, url: `/api/content/assets/${assetId}` };
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, error: "Not allowed." };
    return { ok: false, error: e instanceof Error ? e.message : "Failed to upload asset." };
  }
}

// -------------------------------------------------------------------------------------------------
// Plan 0116 step 7 & 8: Lesson & Doc editing and restore
// -------------------------------------------------------------------------------------------------

export async function saveLessonContentAction(
  draft: ContentLesson,
  baseRev: string | null = null,
  extra?: { note?: string | null; notify?: boolean },
): Promise<WriteResult<ContentLesson>> {
  try {
    const proof = await requireAdminAction();
    const res = await saveLesson(proof, draft, baseRev, extra);
    if (res.ok) {
      refresh();
      revalidatePath("/admin/study");
      revalidatePath(`/admin/study/${draft.row.courseId}/${draft.row.id}`);
    }
    return res;
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    throw e;
  }
}

export async function deleteLessonContentAction(
  id: string,
  baseRev: string | null = null,
): Promise<WriteResult<ContentLesson>> {
  try {
    const proof = await requireAdminAction();
    const res = await deleteLesson(proof, id, baseRev);
    if (res.ok) {
      refresh();
      revalidatePath("/admin/study");
    }
    return res;
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    throw e;
  }
}

export async function saveDocContentAction(
  kind: string,
  id: string,
  body: unknown,
  baseRev: string | null = null,
  extra?: { note?: string | null; notify?: boolean },
): Promise<{ ok: true; rev: string } | { ok: false; errors: string[] }> {
  try {
    const proof = await requireAdminAction();
    // saveDoc writes the hosted content database (or forwards there from the desktop app) with an audit row.
    const res = await saveDoc(proof, { row: { kind, id, body } }, baseRev, extra);
    if (!res.ok) {
      if (res.conflict) return { ok: false, errors: ["Someone saved this doc after you opened it. Reload to see their version."] };
      return { ok: false, errors: res.errors };
    }
    revalidateTag(TAG.doc(kind, id), { expire: 0 });
    revalidateTag(TAG.docs(kind), { expire: 0 });
    refresh();
    revalidatePath("/admin/docs");
    revalidatePath(`/admin/docs/${kind}/${id}`);
    return { ok: true, rev: res.rev };
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    return { ok: false, errors: [e instanceof Error ? e.message : "Save failed."] };
  }
}

export async function restoreAuditAction(
  auditId: number,
): Promise<WriteResult<unknown>> {
  try {
    const proof = await requireAdminAction();
    const res = await restoreFromAudit(proof, auditId);
    if (res.ok) {
      refresh();
      revalidatePath("/admin/problems");
      revalidatePath("/admin/study");
      revalidatePath("/admin/audit");
    }
    return res;
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    throw e;
  }
}
