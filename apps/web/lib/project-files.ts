// Pure helpers for the multi-file Java project stored in problem_notes.code (no I/O, safe on client and server).

export interface ProjectFile {
  name: string;
  content: string;
}

export const MAX_FILES = 30;
export const MAX_TOTAL_BYTES = 200_000;
export const FILE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}\.java$/;

const STUB = "public class Main { public static void main(String[] args) { } }\n";

/** A fresh project: one tiny Main.java. */
export function emptyProject(): ProjectFile[] {
  return [{ name: "Main.java", content: STUB }];
}

/** True when the project has nothing of yours in it: no files, only blank files, or only the untouched stub. */
export function isEmptyProject(files: ProjectFile[]): boolean {
  const squash = (s: string) => s.replace(/\s+/g, " ").trim();
  return files.every((f) => !f.content.trim() || (f.name === "Main.java" && squash(f.content) === squash(STUB)));
}

function isFileList(v: unknown): v is ProjectFile[] {
  return (
    Array.isArray(v) &&
    v.every((f) => typeof f === "object" && f !== null && typeof (f as ProjectFile).name === "string" && typeof (f as ProjectFile).content === "string")
  );
}

/** Strictly reads the JSON format; null when it is not valid `{"v":1,"files":[...]}` with at least one file. */
export function readProjectJson(code: string): ProjectFile[] | null {
  try {
    const data = JSON.parse(code) as { v?: unknown; files?: unknown } | null;
    if (data && data.v === 1 && isFileList(data.files) && data.files.length > 0) {
      return data.files.map((f) => ({ name: f.name, content: f.content }));
    }
  } catch {
    // not JSON
  }
  return null;
}

/** Reads the saved code. `java-project` is the JSON format; anything else is old plain text and opens as one Main.java. Never throws. */
export function parseProjectCode(code: string, language: string): ProjectFile[] {
  if (language === "java-project") return readProjectJson(code) ?? emptyProject();
  return code.trim() ? [{ name: "Main.java", content: code }] : emptyProject();
}

export function serializeProject(files: ProjectFile[]): string {
  return JSON.stringify({ v: 1, files: files.map((f) => ({ name: f.name, content: f.content })) });
}

const byteLength = (s: string) => new TextEncoder().encode(s).length;

export type ProjectCheck = { ok: true } | { ok: false; error: string };

export function validateProject(files: ProjectFile[]): ProjectCheck {
  if (files.length === 0) return { ok: false, error: "Add at least one Java file." };
  if (files.length > MAX_FILES) return { ok: false, error: `A project can have at most ${MAX_FILES} files. Delete some files and save again.` };
  const seen = new Set<string>();
  let total = 0;
  for (const f of files) {
    if (!FILE_NAME_PATTERN.test(f.name)) {
      return {
        ok: false,
        error: `"${f.name}" is not a valid file name. Use letters, digits and underscores, start with a letter, and end with .java (for example Order.java).`,
      };
    }
    if (seen.has(f.name)) return { ok: false, error: `There are two files named ${f.name}. Rename or delete one.` };
    seen.add(f.name);
    total += byteLength(f.content);
  }
  if (total > MAX_TOTAL_BYTES) {
    return { ok: false, error: `Your files are too large (${Math.ceil(total / 1000)} KB). The limit is ${Math.floor(MAX_TOTAL_BYTES / 1000)} KB in total. Shorten some files and save again.` };
  }
  return { ok: true };
}
