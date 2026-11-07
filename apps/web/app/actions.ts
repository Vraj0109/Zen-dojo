"use server";

import { refresh } from "next/cache";
import { ALL_EXERCISES, CATEGORIES, PROBLEMS, type Category } from "@habit/shared";
import { getProblemDetail, markSolved, undoSolve } from "@/lib/dsa";
import { saveNote } from "@/lib/notes";
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

/** Interview date for Quick revise; an empty value clears it. */
export async function setInterviewDateAction(formData: FormData) {
  const clear = formData.get("clear") === "1";
  await setInterviewDate(clear ? "" : String(formData.get("interviewDate") ?? ""));
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
