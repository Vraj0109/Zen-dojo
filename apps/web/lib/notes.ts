import "server-only";
import { eq, inArray } from "drizzle-orm";
import { toLocalDate } from "@habit/shared";
import { getDb } from "./db";
import { getRuns } from "./solution-runs";
import { problemNotes, settings } from "./schema";

import { isEmptyProject, readProjectJson, serializeProject, validateProject } from "./project-files";
import { JAVA_PROJECT, LANGUAGES, NOTE_LIMITS } from "./note-limits";

export { LANGUAGES, NOTE_LIMITS };

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

export type SolutionLang = "cpp" | "java" | "javascript";
const SOLUTION_LANGS: Record<string, SolutionLang> = { "C++": "cpp", Java: "java", JavaScript: "javascript" };
const LANG_LABEL: Record<SolutionLang, string> = { cpp: "C++", java: "Java", javascript: "JavaScript" };

/** A solution you saved for one language of a problem. `verified`: the last run of exactly this code passed every case. */
export interface SavedSolution {
  lang: SolutionLang;
  code: string;
  savedOn: string;
  verified: boolean;
}

// Saved solutions live in the settings table (one row per problem and language), so they are part of backups and need no
// new table.
const solutionKey = (problemId: string, lang: SolutionLang) => `saved-solution:${problemId}:${lang}`;

async function writeSolution(problemId: string, lang: SolutionLang, code: string, verified: boolean): Promise<SavedSolution> {
  const db = await getDb();
  const saved: SavedSolution = { lang, code, savedOn: toLocalDate(new Date()), verified };
  const value = JSON.stringify({ code, savedOn: saved.savedOn, verified });
  await db.insert(settings).values({ key: solutionKey(problemId, lang), value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  // The Notes form keeps showing the latest saved code too.
  const existing = await getNote(problemId);
  await saveNote(problemId, { notes: existing?.notes ?? "", code, language: LANG_LABEL[lang] });
  return saved;
}

/** Save only the solution code and language; the notes you already wrote stay as they are. Used when a run passes every test. */
export async function saveSolution(problemId: string, code: string, language: string) {
  const lang = SOLUTION_LANGS[language];
  if (lang) await writeSolution(problemId, lang, code, true);
  else {
    const existing = await getNote(problemId);
    await saveNote(problemId, { notes: existing?.notes ?? "", code, language });
  }
}

/** The Save button: keeps this code as the solution for the language, whether or not it passed. Replaces the earlier one. */
export async function saveSolutionFor(problemId: string, lang: SolutionLang, code: string): Promise<SavedSolution> {
  const run = (await getRuns(problemId)).find((r) => r.lang === lang);
  const verified = Boolean(run && run.code === code && run.status === "done" && run.total > 0 && run.passed === run.total);
  return writeSolution(problemId, lang, code.slice(0, NOTE_LIMITS.code), verified);
}

export async function getSavedSolutions(problemId: string): Promise<SavedSolution[]> {
  const db = await getDb();
  const langs = Object.values(SOLUTION_LANGS);
  const rows = await db.select().from(settings).where(inArray(settings.key, langs.map((l) => solutionKey(problemId, l))));
  const out: SavedSolution[] = [];
  for (const lang of langs) {
    const row = rows.find((r) => r.key === solutionKey(problemId, lang));
    if (!row) continue;
    try {
      const v = JSON.parse(row.value) as { code?: unknown; savedOn?: unknown; verified?: unknown };
      if (typeof v.code === "string" && typeof v.savedOn === "string") out.push({ lang, code: v.code, savedOn: v.savedOn, verified: v.verified === true });
    } catch {
      // a damaged row is ignored
    }
  }
  return out;
}

export type SaveNoteResult = { ok: true } | { ok: false; error: string };

/**
 * Save notes/code; saving both empty removes the entry. Over-long input is truncated, except for a `java-project`
 * (JSON of files): that is validated and refused with a plain-English `error` instead, and nothing is saved.
 */
export async function saveNote(problemId: string, input: { notes: string; code: string; language: string }): Promise<SaveNoteResult> {
  const db = await getDb();
  const notes = input.notes.slice(0, NOTE_LIMITS.notes);
  let language = (LANGUAGES as readonly string[]).includes(input.language) ? input.language : "";
  let code: string;

  if (language === JAVA_PROJECT) {
    const files = readProjectJson(input.code);
    if (!files) return { ok: false, error: "Your classes could not be read. Reload the page and try again." };
    const check = validateProject(files);
    if (!check.ok) return check;
    if (isEmptyProject(files)) {
      code = "";
      language = "";
    } else {
      code = serializeProject(files);
    }
  } else {
    code = input.code.slice(0, NOTE_LIMITS.code);
  }

  if (!notes.trim() && !code.trim()) {
    await db.delete(problemNotes).where(eq(problemNotes.problemId, problemId));
    return { ok: true };
  }
  const updatedAt = new Date().toISOString();
  await db
    .insert(problemNotes)
    .values({ problemId, notes, code, language, updatedAt })
    .onConflictDoUpdate({ target: problemNotes.problemId, set: { notes, code, language, updatedAt } });
  return { ok: true };
}
