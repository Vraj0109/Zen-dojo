"use server";

import { refresh, revalidatePath } from "next/cache";
import { ALL_CONCEPTS } from "@habit/shared";
import { requireAdmin } from "@/lib/auth/session";
import { deleteItem, upsertItem } from "@/lib/content";
import { restoreLessonPatch } from "@/lib/packs";
import { buildLessonPatch } from "@/lib/admin-study";

// Admin lesson editing (plan 0045, steps 3-4). A saved lesson is a "patch" item (id "patch:<concept>") in the existing
// content store; the learner's concept page resolves it through resolveLesson(), so it shows after a reload with no
// redeploy. "Revert to built-in" deletes the item. No new table or migration.

export type StudyActionResult = { ok: true; message: string } | { ok: false; errors: string[] };

export async function saveLessonAction(_prev: StudyActionResult | null, formData: FormData): Promise<StudyActionResult> {
  await requireAdmin();
  const built = buildLessonPatch(formData);
  if (!built.ok) return built;
  try {
    const result = await upsertItem(built.item, "admin");
    if (!result.ok) return { ok: false, errors: result.errors };
    await restoreLessonPatch(built.concept); // a lesson hidden earlier by the learner reset setting should show again
    refresh();
    revalidatePath("/admin/study");
    return { ok: true, message: result.changed ? "Saved. Learners see it on their next page load." : "No changes to save." };
  } catch {
    return { ok: false, errors: ["Could not save the lesson. Check the server log."] };
  }
}

export async function revertLessonAction(_prev: StudyActionResult | null, formData: FormData): Promise<StudyActionResult> {
  await requireAdmin();
  const concept = String(formData.get("concept") ?? "").trim();
  if (!Object.hasOwn(ALL_CONCEPTS, concept)) return { ok: false, errors: ["Unknown lesson."] };
  const removed = await deleteItem(`patch:${concept}`);
  refresh();
  revalidatePath("/admin/study");
  return { ok: true, message: removed ? "Reverted to the built-in lesson." : "This lesson already shows the built-in version." };
}
