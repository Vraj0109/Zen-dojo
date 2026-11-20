// Pure helpers that pick which class a multi-file Java project runs (no I/O; used by the editor and the run route).
//
// "Run file" runs the class open in the editor; "Run project" runs the project's entry point: a class named Main,
// otherwise the only class with a main method, otherwise the class the user picked (remembered per project).

export type EntryFile = { name: string; content: string };

export type EntryClass = {
  /** The file that holds the class, e.g. "ParkingLot.java". */
  file: string;
  /** Simple class name (the file name without .java). */
  className: string;
  /** Fully qualified name passed to `java`, e.g. "demo.ParkingLot". */
  qualified: string;
};

export type EntryChoice =
  | ({ ok: true } & EntryClass)
  | { ok: false; reason: "no-main-in-file"; file: string; candidates: EntryClass[] }
  | { ok: false; reason: "no-main"; candidates: [] }
  | { ok: false; reason: "choose"; candidates: EntryClass[] };

export type EntryMode = "file" | "project";

/** Replaces comments, string and char literals with spaces, keeping offsets and line breaks. */
export function blankCommentsAndStrings(code: string): string {
  let out = "";
  let i = 0;
  const n = code.length;
  const blank = (s: string) => s.replace(/[^\n]/g, " ");
  while (i < n) {
    const c = code[i];
    const next = code[i + 1];
    if (c === "/" && next === "/") {
      const end = code.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      out += blank(code.slice(i, stop));
      i = stop;
    } else if (c === "/" && next === "*") {
      const end = code.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      out += blank(code.slice(i, stop));
      i = stop;
    } else if (c === '"' && code.startsWith('"""', i)) {
      const end = code.indexOf('"""', i + 3);
      const stop = end === -1 ? n : end + 3;
      out += blank(code.slice(i, stop));
      i = stop;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && code[j] !== c && code[j] !== "\n") j += code[j] === "\\" ? 2 : 1;
      const stop = Math.min(j + 1, n);
      out += blank(code.slice(i, stop));
      i = stop;
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

const MAIN_RE = /\bstatic\b[^;{}()]*\bvoid\s+main\s*\(\s*(?:final\s+)?String\s*(?:\[\s*\]\s*\w+|\.\.\.\s*\w+|\w+\s*\[\s*\])\s*\)/;

/** True when the code declares `static void main(String[] args)` (or `String... args`). */
export function hasMainMethod(code: string): boolean {
  return MAIN_RE.test(blankCommentsAndStrings(code));
}

/** The file's package ("" for the default package). */
export function packageName(code: string): string {
  return /^\s*package\s+([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*;/m.exec(blankCommentsAndStrings(code))?.[1].replace(/\s+/g, "") ?? "";
}

export function classNameOf(fileName: string): string {
  return fileName.replace(/^.*[\\/]/, "").replace(/\.java$/, "");
}

export function entryClassOf(file: EntryFile): EntryClass {
  const className = classNameOf(file.name);
  const pkg = packageName(file.content);
  return { file: file.name, className, qualified: pkg ? `${pkg}.${className}` : className };
}

/** Every class in the project that has a main method, in file order. */
export function mainClasses(files: EntryFile[]): EntryClass[] {
  return files.filter((f) => f.name.endsWith(".java") && hasMainMethod(f.content)).map(entryClassOf);
}

/**
 * Picks the class to run.
 * - file mode: the active file, if it has a main method.
 * - project mode: a class named Main, otherwise the only class with main, otherwise `remembered` (a qualified name
 *   the user picked before) when it still has main, otherwise asks the user to choose.
 */
export function pickEntry(opts: { files: EntryFile[]; active: string; mode: EntryMode; remembered?: string | null }): EntryChoice {
  const candidates = mainClasses(opts.files);
  if (opts.mode === "file") {
    const hit = candidates.find((c) => c.file === opts.active);
    if (hit) return { ok: true, ...hit };
    return { ok: false, reason: "no-main-in-file", file: opts.active, candidates };
  }
  if (candidates.length === 0) return { ok: false, reason: "no-main", candidates: [] };
  const mains = candidates.filter((c) => c.className === "Main");
  if (mains.length === 1) return { ok: true, ...mains[0] };
  if (candidates.length === 1) return { ok: true, ...candidates[0] };
  const remembered = opts.remembered ? candidates.find((c) => c.qualified === opts.remembered) : undefined;
  if (remembered) return { ok: true, ...remembered };
  return { ok: false, reason: "choose", candidates };
}

/**
 * Inserts a minimal main method at the top of the class named after the file. Returns the new code and the
 * 1-based line of the inserted body, or null when the class cannot take one (not found, or an enum).
 */
export function addMainMethod(code: string, className: string): { code: string; line: number } | null {
  const blanked = blankCommentsAndStrings(code);
  const escaped = className.replace(/[$]/g, "\\$");
  const decl = new RegExp(`\\b(class|interface|record|enum)\\s+${escaped}\\b`).exec(blanked);
  if (!decl || decl[1] === "enum") return null;
  // Records have a header in parentheses before the body; skip to the first "{" after the declaration.
  let open = -1;
  let depth = 0;
  for (let i = decl.index + decl[0].length; i < blanked.length; i += 1) {
    const ch = blanked[i];
    if (ch === "(" || ch === "<") depth += 1;
    else if (ch === ")" || ch === ">") depth = Math.max(0, depth - 1);
    else if (ch === "{" && depth === 0) {
      open = i;
      break;
    }
  }
  if (open === -1) return null;
  const lineStart = code.lastIndexOf("\n", decl.index) + 1;
  const indent = /^[ \t]*/.exec(code.slice(lineStart))?.[0] ?? "";
  const inner = `${indent}    `;
  const snippet = `\n${inner}public static void main(String[] args) {\n${inner}    \n${inner}}\n`;
  const next = code.slice(0, open + 1) + snippet + code.slice(open + 1);
  const line = code.slice(0, open + 1).split("\n").length + 2;
  return { code: next, line };
}

/** Starter Main.java for a project that has no entry point yet. */
export function starterMain(): string {
  return "public class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n";
}

/** A Java qualified class name, letters/digits/underscores separated by dots. */
export const QUALIFIED_NAME = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;
