// Plain constants shared by the notes form (client) and notes.ts (server). No imports from the database here.
import { MAX_TOTAL_BYTES } from "./project-files";

export const JAVA_PROJECT = "java-project";

/** `code` is the limit for plain text; a `java-project` uses `projectCode` (total bytes of all files). */
export const NOTE_LIMITS = { notes: 20_000, code: 50_000, projectCode: MAX_TOTAL_BYTES } as const;

export const LANGUAGES = ["Java", "C++", "Python", "TypeScript", "JavaScript", "Go", "C#", "Kotlin", "Other", JAVA_PROJECT] as const;
