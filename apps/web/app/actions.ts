"use server";

import { refresh } from "next/cache";
import { CATEGORIES, type Category } from "@habit/shared";
import { getProblemDetail, markSolved, undoSolve } from "@/lib/dsa";
import { saveNote } from "@/lib/notes";
import { regenerateExtensionToken } from "@/lib/leetcode/extension";
import { connectLeetCode, disconnectLeetCode, syncLeetCode } from "@/lib/leetcode/sync";
import { addCustomTask, deleteCustomTask, setPlanStart, toggleTask } from "@/lib/tasks";

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
  if (!(await getProblemDetail(problemId))) return; // only known problems
  await saveNote(problemId, {
    notes: String(formData.get("notes") ?? ""),
    code: String(formData.get("code") ?? ""),
    language: String(formData.get("language") ?? ""),
  });
  refresh();
}

// Results of these are stored in settings and shown by the LeetCode card on the DSA page.
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
