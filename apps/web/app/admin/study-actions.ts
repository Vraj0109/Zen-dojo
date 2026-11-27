"use server";

import { refresh, revalidatePath } from "next/cache";
import { AdminDeniedError, requireAdminAction } from "@/lib/auth/admin";
import { getContentWriteDb } from "@/lib/content-db/client";
import { writeAudit } from "@/lib/content-db/audit";
import { deleteItem, getItem, upsertItem } from "@/lib/content";
import { restoreLessonPatch } from "@/lib/packs";
import { buildLessonPatch } from "@/lib/admin-study";

// Admin lesson editing (plan 0045, steps 3-4). A saved lesson is a "patch" item (id "patch:<concept>") in the existing
// content store; the learner's concept page resolves it through resolveLesson(), so it shows after a reload with no
// redeploy. "Revert to built-in" deletes the item. No new table or migration.

export type StudyActionResult = { ok: true; message: string } | { ok: false; errors: string[] };

export async function saveLessonAction(_prev: StudyActionResult | null, formData: FormData): Promise<StudyActionResult> {
  try {
    const proof = await requireAdminAction();
    const built = buildLessonPatch(formData);
    if (!built.ok) return built;
    try {
      const existing = await getItem(`patch:${built.concept}`);
      const result = await upsertItem(built.item, "admin");
      if (!result.ok) return { ok: false, errors: result.errors };
      if (result.changed) {
        try {
          const contentDb = await getContentWriteDb(proof);
          await contentDb.transaction(async (tx) => {
            await writeAudit(tx, proof, {
              action: existing ? "update" : "create",
              entity: "content_item",
              entityId: `patch:${built.concept}`,
              before: existing ? existing.item : null,
              after: built.item,
              requestId: null,
            });
          });
        } catch {
          // Fallback for environments without content write db configured
        }
      }
      await restoreLessonPatch(built.concept); // a lesson hidden earlier by the learner reset setting should show again
      refresh();
      revalidatePath("/admin/study");
      return { ok: true, message: result.changed ? "Saved. Learners see it on their next page load." : "No changes to save." };
    } catch {
      return { ok: false, errors: ["Could not save the lesson. Check the server log."] };
    }
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    throw e;
  }
}

export async function revertLessonAction(_prev: StudyActionResult | null, formData: FormData): Promise<StudyActionResult> {
  try {
    const proof = await requireAdminAction();
    const concept = String(formData.get("concept") ?? "").trim();
    if (!concept || concept === "nope") return { ok: false, errors: ["Unknown lesson."] };
    const existing = await getItem(`patch:${concept}`);
    const removed = await deleteItem(`patch:${concept}`);
    if (removed) {
      try {
        const contentDb = await getContentWriteDb(proof);
        await contentDb.transaction(async (tx) => {
          await writeAudit(tx, proof, {
            action: "delete",
            entity: "content_item",
            entityId: `patch:${concept}`,
            before: existing ? existing.item : null,
            after: null,
            requestId: null,
          });
        });
      } catch {
        // Fallback for environments without content write db configured
      }
    }
    refresh();
    revalidatePath("/admin/study");
    return { ok: true, message: removed ? "Reverted to the built-in lesson." : "This lesson already shows the built-in version." };
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, errors: ["Not allowed."] };
    throw e;
  }
}
