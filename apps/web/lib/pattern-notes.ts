import "server-only";
import { ALL_PATTERNS, toLocalDate } from "@habit/shared";
import { getDb } from "./db";
import { patternNotes } from "./schema";

// Your cheat sheet per DSA pattern: template code and how you recognize the pattern.

export const PATTERN_NOTE_LIMITS = { template: 20_000, recognize: 5_000, language: 30 } as const;

export type PatternNote = typeof patternNotes.$inferSelect;

const patternIds = new Set(ALL_PATTERNS.map((p) => p.id));

export async function getPatternNotes(): Promise<Map<string, PatternNote>> {
  const db = await getDb();
  return new Map((await db.select().from(patternNotes)).map((n) => [n.patternId, n]));
}

export async function savePatternNote(patternId: string, input: { template: string; recognize: string; language: string }): Promise<boolean> {
  if (!patternIds.has(patternId)) return false;
  const db = await getDb();
  const row = {
    template: input.template.slice(0, PATTERN_NOTE_LIMITS.template),
    recognize: input.recognize.slice(0, PATTERN_NOTE_LIMITS.recognize),
    language: input.language.trim().slice(0, PATTERN_NOTE_LIMITS.language),
    updatedOn: toLocalDate(),
  };
  await db.insert(patternNotes).values({ patternId, ...row }).onConflictDoUpdate({ target: patternNotes.patternId, set: row });
  return true;
}
