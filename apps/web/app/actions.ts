"use server";

import { refresh } from "next/cache";
import { ALL_EXERCISES, CATEGORIES, PROBLEMS, type Category } from "@habit/shared";
import { getProblemDetail, markSolved, undoSolve } from "@/lib/dsa";
import { getSavedSolutions, saveNote, saveSolutionFor, type SavedSolution, type SolutionLang } from "@/lib/notes";
import { applyFreeze } from "@/lib/progress";
import { toggleFavouriteCourse } from "@/lib/courses";
import { getPackProblemSpec, fetchPackText, installPack, removePack, setPackItemDone } from "@/lib/packs";
import { saveReflection, weekOf } from "@/lib/weekly";
import { regenerateExtensionToken } from "@/lib/leetcode/extension";
import { connectLeetCode, disconnectLeetCode, syncLeetCode } from "@/lib/leetcode/sync";
import { addCustomTask, deleteCustomTask, setPlanStart, toggleTask } from "@/lib/tasks";
import { deletePractice, logPractice, rateConcept, saveConcept } from "@/lib/study";
import { saveBossFight } from "@/lib/boss";
import { deleteDiagram } from "@/lib/diagrams";
import { savePatternNote } from "@/lib/pattern-notes";
import { addCustomReading, deleteCustomReading, setReadingDone } from "@/lib/reading";
import { clearStruggles, logStruggle } from "@/lib/struggles";
import { logFocus } from "@/lib/timer";
import { setInterviewDate } from "@/lib/revise";
import { setSimpleMode } from "@/lib/ui-prefs";

// Local mode: single user, no auth yet. Add an auth check here before exposing the app
// beyond localhost (see SPEC.md "Hosted mode").

function idFrom(formData: FormData): number | null {
  const id = Number(formData.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function toggleTaskAction(formData: FormData) {
  const id = idFrom(formData);
  if (id) await toggleTask(id);
  refresh();
}

export async function addTaskAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const category = String(formData.get("category") ?? "other");
  const scope = formData.get("scope") === "week" ? "week" : "day";
  if (!title) return;
  await addCustomTask(title, category in CATEGORIES ? (category as Category) : "other", scope);
  refresh();
}

export async function deleteTaskAction(formData: FormData) {
  const id = idFrom(formData);
  if (id) await deleteCustomTask(id);
  refresh();
}

export async function markSolvedAction(formData: FormData) {
  await markSolved(String(formData.get("problemId") ?? "")); // ignores unknown ids
  refresh();
}

export async function undoSolveAction(formData: FormData) {
  await undoSolve(String(formData.get("problemId") ?? ""));
  refresh();
}

export async function saveNoteAction(formData: FormData) {
  const problemId = String(formData.get("problemId") ?? "");
  // only known DSA problems, designs and LLD problems
  if (!(problemId in ALL_EXERCISES) && !(await getProblemDetail(problemId))) return;
  await saveNote(problemId, {
    notes: String(formData.get("notes") ?? ""),
    code: String(formData.get("code") ?? ""),
    language: String(formData.get("language") ?? ""),
  });
  refresh();
}

// Results of these are stored in settings and shown in Profile → Settings and the DSA sync card.
export async function connectLeetCodeAction(formData: FormData) {
  await connectLeetCode(String(formData.get("username") ?? "").trim());
  refresh();
}

export async function syncLeetCodeAction() {
  await syncLeetCode();
  refresh();
}

export async function disconnectLeetCodeAction() {
  await disconnectLeetCode();
  refresh();
}

export async function regenerateExtensionKeyAction() {
  await regenerateExtensionToken();
  refresh();
}

export async function setPlanStartAction(formData: FormData) {
  const date = String(formData.get("planStart") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  await setPlanStart(date);
  refresh();
}

/** Star or un-star a course on the Learn page. */
export async function toggleFavouriteCourseAction(formData: FormData) {
  await toggleFavouriteCourse(String(formData.get("course") ?? ""));
  refresh();
}

/** Cover one missed day with this week's streak freeze (Today). Ignored unless the day is eligible. */
export async function freezeDayAction(formData: FormData) {
  const day = String(formData.get("day") ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) await applyFreeze(day);
  refresh();
}

/** Save the reflection for one week of the weekly review. */
export async function saveReflectionAction(formData: FormData) {
  const field = (name: string) => String(formData.get(name) ?? "");
  await saveReflection(weekOf(field("week")), { wins: field("wins"), struggles: field("struggles"), nextFocus: field("nextFocus") });
  refresh();
}

/** Interview date for Quick revise; an empty value clears it. */
export async function setInterviewDateAction(formData: FormData) {
  const clear = formData.get("clear") === "1";
  await setInterviewDate(clear ? "" : String(formData.get("interviewDate") ?? ""));
  refresh();
}

/** Simple mode on or off (Profile, Settings). */
export async function setSimpleModeAction(formData: FormData) {
  await setSimpleMode(formData.get("simple") === "1");
  refresh();
}

// Study areas (system design, LLD, core CS)

export async function saveConceptAction(formData: FormData) {
  await saveConcept(String(formData.get("conceptId") ?? ""), {
    confidence: Number(formData.get("confidence") ?? 0),
    checked: formData.getAll("point").map(Number),
    notes: String(formData.get("notes") ?? ""),
  });
  refresh();
}

export async function logPracticeAction(formData: FormData) {
  const scores: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("score:") && value !== "") scores[key.slice("score:".length)] = Number(value);
  }
  const minutes = String(formData.get("minutes") ?? "").trim();
  await logPractice(String(formData.get("itemId") ?? ""), {
    minutes: minutes ? Number(minutes) : null,
    scores,
    notes: String(formData.get("notes") ?? ""),
    link: String(formData.get("link") ?? ""),
  });
  refresh();
}

export async function deletePracticeAction(formData: FormData) {
  const id = idFrom(formData);
  if (id) await deletePractice(id);
  refresh();
}

// Focus timer (called from the timer component)

export async function logFocusAction(formData: FormData) {
  await logFocus(String(formData.get("itemId") ?? ""), Number(formData.get("minutes")));
  refresh();
}

// Stuck list

export async function logStruggleAction(formData: FormData) {
  const problemId = String(formData.get("problemId") ?? "");
  if (!(await getProblemDetail(problemId))) return;
  await logStruggle(problemId, String(formData.get("kind") ?? ""), String(formData.get("reason") ?? ""));
  refresh();
}

/** Solved it cold: clears the stuck-list entries, and records the first solve if there wasn't one. */
export async function clearStruggleAction(formData: FormData) {
  const problemId = String(formData.get("problemId") ?? "");
  const p = await getProblemDetail(problemId);
  if (!p) return;
  await clearStruggles(problemId);
  if (problemId in PROBLEMS && p.status.state === "unsolved") await markSolved(problemId);
  refresh();
}

// Review queue

export async function rateConceptAction(formData: FormData) {
  await rateConcept(String(formData.get("conceptId") ?? ""), Number(formData.get("confidence")));
  refresh();
}

// Boss fight: fields problemId (repeated), result:<problemId>, minutes, notes

export async function saveBossFightAction(formData: FormData) {
  const results = formData.getAll("problemId").map((id) => ({ problemId: String(id), result: String(formData.get(`result:${id}`) ?? "") }));
  const minutes = String(formData.get("minutes") ?? "").trim();
  await saveBossFight({ results, minutes: minutes ? Number(minutes) : null, notes: String(formData.get("notes") ?? "") });
  refresh();
}

// Reading list

export async function toggleReadingAction(formData: FormData) {
  await setReadingDone(String(formData.get("readingId") ?? ""), formData.get("done") === "1");
  refresh();
}

export async function addReadingAction(formData: FormData) {
  await addCustomReading(String(formData.get("itemId") ?? ""), String(formData.get("title") ?? ""), String(formData.get("url") ?? ""));
  refresh();
}

export async function deleteReadingAction(formData: FormData) {
  const id = idFrom(formData);
  if (id) await deleteCustomReading(id);
  refresh();
}

// Diagrams (adding goes through /api/diagrams because of image size)

export async function deleteDiagramAction(formData: FormData) {
  const id = idFrom(formData);
  if (id) await deleteDiagram(id);
  refresh();
}

// DSA pattern cheat sheets

export async function savePatternNoteAction(formData: FormData) {
  await savePatternNote(String(formData.get("patternId") ?? ""), {
    template: String(formData.get("template") ?? ""),
    recognize: String(formData.get("recognize") ?? ""),
    language: String(formData.get("language") ?? ""),
  });
  refresh();
}

// ---- saved solutions (the Save button next to Run)

export type SaveSolutionResult = { ok: true; solution: SavedSolution } | { ok: false; error: string };

/** Keeps the code as your solution for one language of a problem. `verified` is true when the last run of exactly this code passed every case. */
export async function saveSolutionAction(problemId: string, lang: string, code: string): Promise<SaveSolutionResult> {
  if (lang !== "cpp" && lang !== "java" && lang !== "javascript") return { ok: false, error: "Unknown language." };
  if (typeof code !== "string" || code.length > 50_000) return { ok: false, error: "The code is too long to save (over 50,000 characters)." };
  const { JUDGE_PROBLEMS } = await import("@habit/shared");
  const known = typeof problemId === "string" && (problemId.startsWith("pack:") ? Boolean(await getPackProblemSpec(problemId)) : Boolean(JUDGE_PROBLEMS[problemId]));
  if (!known) return { ok: false, error: "Unknown problem." };
  const solution = await saveSolutionFor(problemId, lang as SolutionLang, code);
  refresh();
  return { ok: true, solution };
}

/** The solutions you saved for a problem, one per language (for the Notes tab). */
export async function getSavedSolutionsAction(problemId: string): Promise<SavedSolution[]> {
  return typeof problemId === "string" && problemId.length < 200 ? getSavedSolutions(problemId) : [];
}

// ---- content packs (docs/content-packs.md)

export interface PackImportState {
  ok: boolean;
  message: string;
  errors: string[];
  warnings: string[];
}

/** Imports a pack from pasted text, an uploaded file or a web address. With "checkOnly", only validates. */
export async function importPackAction(_prev: PackImportState | null, formData: FormData): Promise<PackImportState> {
  const fail = (message: string, errors: string[] = []): PackImportState => ({ ok: false, message, errors, warnings: [] });
  let text = String(formData.get("json") ?? "").trim();
  const file = formData.get("file");
  const url = String(formData.get("url") ?? "").trim();
  if (!text && file instanceof File && file.size > 0) {
    if (file.size > 2_000_000) return fail("That file is over 2 MB.");
    text = (await file.text()).trim();
  }
  if (!text && url) {
    const got = await fetchPackText(url);
    if (!got.ok) return fail(got.error);
    text = got.text.trim();
  }
  if (!text) return fail("Paste the pack, choose a file or enter a web address first.");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return fail("That is not valid JSON.", [e instanceof Error ? e.message : String(e)]);
  }
  if (formData.get("checkOnly") === "1") {
    const { validatePack } = await import("@habit/shared");
    const r = validatePack(data);
    return r.ok ? { ok: true, message: `Looks good: "${r.pack.title}" is valid.`, errors: [], warnings: r.warnings } : fail("The pack has problems. Fix these and try again.", r.errors);
  }
  const r = await installPack(data);
  if (!r.ok) return fail("The pack has problems. Fix these and try again.", r.errors);
  refresh();
  return { ok: true, message: r.replaced ? "Updated. Your progress on items that still exist was kept." : "Installed. It is now a course in Learn.", errors: [], warnings: r.warnings };
}

export async function removePackAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (/^[a-z0-9-]+$/.test(id)) await removePack(id);
  refresh();
}

export async function togglePackItemAction(formData: FormData) {
  const pack = String(formData.get("pack") ?? "");
  const item = String(formData.get("item") ?? "");
  if (/^[a-z0-9-]+$/.test(pack) && /^[a-z0-9-]+$/.test(item)) await setPackItemDone(pack, item, formData.get("done") === "1");
  refresh();
}
