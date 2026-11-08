import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { problemNotes } from "./schema";

export const NOTE_LIMITS = { notes: 20_000, code: 50_000 } as const;
export const LANGUAGES = ["Java", "C++", "Python", "TypeScript", "JavaScript", "Go", "C#", "Kotlin", "Other"] as const;

export type ProblemNote = typeof problemNotes.$inferSelect;

export async function getNote(problemId: string): Promise<ProblemNote | null> {
  const db = await getDb();
  return (await db.query.problemNotes.findFirst({ where: eq(problemNotes.problemId, problemId) })) ?? null;
}

/** Ids of problems that have notes or saved code (for the 📝 marker on the DSA list). */
export async function getNotedIds(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.select({ id: problemNotes.problemId }).from(problemNotes);
  return new Set(rows.map((r) => r.id));
}

/** Save only the solution code and language; the notes you already wrote stay as they are. Used when a run passes every test. */
export async function saveSolution(problemId: string, code: string, language: string) {
  const existing = await getNote(problemId);
  await saveNote(problemId, { notes: existing?.notes ?? "", code, language });
}

/** Save notes/code; saving both empty removes the entry. Over-long input is truncated. */
export async function saveNote(problemId: string, input: { notes: string; code: string; language: string }) {
  const db = await getDb();
  const notes = input.notes.slice(0, NOTE_LIMITS.notes);
  const code = input.code.slice(0, NOTE_LIMITS.code);
  const language = (LANGUAGES as readonly string[]).includes(input.language) ? input.language : "";

  if (!notes.trim() && !code.trim()) {
    await db.delete(problemNotes).where(eq(problemNotes.problemId, problemId));
    return;
  }
  const updatedAt = new Date().toISOString();
  await db
    .insert(problemNotes)
    .values({ problemId, notes, code, language, updatedAt })
    .onConflictDoUpdate({ target: problemNotes.problemId, set: { notes, code, language, updatedAt } });
}
