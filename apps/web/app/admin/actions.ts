"use server";

import { refresh, revalidatePath, revalidateTag } from "next/cache";
import { createElement, type ReactNode } from "react";
import { ContentPage as ContentPageView } from "@/app/content-page";
import {
  specFromContent,
  TAG,
  type CodeLang,
  type ContentLesson,
  type ContentPage,
  type ContentProblem,
  type ProblemDraft,
  type TemplateDef,
  type TemplateId,
} from "@habit/shared";
import { AdminDeniedError, requireAdminAction } from "@/lib/auth/admin";
import { getContentWriteDb } from "@/lib/content-db/client";
import { putAsset } from "@/lib/content-db/write";
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

// Admin content actions (plan 0116): problem drafts, lessons, docs, assets and restores, all in the content database.

const short = (s: string) => (s.length > 80 ? `${s.slice(0, 77)}...` : s);

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
