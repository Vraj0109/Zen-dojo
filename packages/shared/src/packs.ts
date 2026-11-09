// Content packs: new problems and lessons added to the app without changing its code. A pack is one JSON file
// (format "prepwise-pack"); the app validates it here, stores it, and shows it as a course in Learn. Pure code, no I/O.
// The format is written up in docs/content-packs.md, with a prompt another AI can follow to produce a pack.

import { checkStress, expandStress, type PackStress } from "./judge/stress-gen";
import type { Case, ProblemSpec, Ty } from "./judge/types";

export type { Gen, PackStress } from "./judge/stress-gen";

export const PACK_FORMAT = "prepwise-pack";
export const PACK_VERSION = 1;
export const PACK_LIMITS = { bytes: 2_000_000, items: 500, tests: 200, text: 60_000 } as const;

const TYPES: readonly Ty[] = ["list", "tree", "int", "long", "double", "bool", "string", "int[]", "long[]", "bool[]", "string[]", "int[][]", "string[][]"];

export interface PackLesson {
  type: "lesson";
  id: string;
  title: string;
  /** Markdown: paragraphs, ## headings, - lists, ``` code fences, **bold**, `code` */
  markdown: string;
}
export type PackProblem = Omit<ProblemSpec, "source" | "solution" | "stress" | "url"> & {
  type: "problem";
  /** Large inputs (speed and memory checks) written as data; see judge/stress-gen.ts. Needs solution.cpp for expected answers. */
  stress?: PackStress[];
  difficulty?: "easy" | "medium" | "hard";
  /** Where the original problem lives, if anywhere (shown as a link) */
  url?: string;
  solution?: { idea: string[]; complexity: string; cpp?: string };
};
export type PackItem = PackLesson | PackProblem;
export interface PackSection {
  title: string;
  items: PackItem[];
}
export interface Pack {
  format: typeof PACK_FORMAT;
  version: number;
  /** Lowercase letters, digits and hyphens */
  id: string;
  title: string;
  description: string;
  sections: PackSection[];
}

export type PackCheck = { ok: true; pack: Pack; warnings: string[] } | { ok: false; errors: string[] };

const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;
const isStr = (v: unknown, max = 300): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown) => typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER;

/** True when `v` is a value of type `t` as written in test JSON. */
export function matchesTy(v: unknown, t: Ty): boolean {
  switch (t) {
    case "int":
      return isInt(v) && Math.abs(v as number) <= 2147483648;
    case "long":
      return isInt(v);
    case "double":
      return typeof v === "number" && Number.isFinite(v);
    case "bool":
      return typeof v === "boolean";
    case "string":
      return typeof v === "string";
    case "int[]":
    case "long[]":
    case "list":
      return Array.isArray(v) && v.every((x) => matchesTy(x, t === "long[]" ? "long" : "int"));
    case "bool[]":
      return Array.isArray(v) && v.every((x) => typeof x === "boolean");
    case "string[]":
      return Array.isArray(v) && v.every((x) => typeof x === "string");
    case "tree":
      return Array.isArray(v) && v.every((x) => x === null || matchesTy(x, "int"));
    case "int[][]":
      return Array.isArray(v) && v.every((x) => matchesTy(x, "int[]"));
    case "string[][]":
      return Array.isArray(v) && v.every((x) => matchesTy(x, "string[]"));
  }
}

const strList = (v: unknown, what: string, errs: string[], min = 1): string[] => {
  if (!Array.isArray(v) || v.length < min || !v.every((x) => isStr(x, PACK_LIMITS.text))) {
    errs.push(`${what} must be a list of ${min > 0 ? "at least " + min : ""} non-empty text${min === 1 ? "" : "s"}.`);
    return [];
  }
  return v as string[];
};

function checkCases(v: unknown, what: string, fn: PackProblem["fn"], errs: string[], max: number): Case[] {
  if (!Array.isArray(v)) {
    errs.push(`${what} must be a list.`);
    return [];
  }
  if (v.length > max) errs.push(`${what} has more than ${max} cases.`);
  v.slice(0, max).forEach((c, i) => {
    const where = `${what}[${i}]`;
    if (!isObj(c) || !Array.isArray(c.input) || !("output" in c)) return void errs.push(`${where} needs "input" (a list, one value per parameter) and "output".`);
    if (c.input.length !== fn.params.length) return void errs.push(`${where}.input has ${c.input.length} values but the function takes ${fn.params.length}.`);
    c.input.forEach((x, j) => {
      if (!matchesTy(x, fn.params[j].type)) errs.push(`${where}.input[${j}] is not a valid ${fn.params[j].type} (parameter ${fn.params[j].name}).`);
    });
    if (!matchesTy(c.output, fn.returns)) errs.push(`${where}.output is not a valid ${fn.returns}.`);
  });
  return v as Case[];
}

function checkProblem(o: Record<string, unknown>, where: string, errs: string[], warnings: string[]): PackProblem | null {
  const before = errs.length;
  if (!isStr(o.title, 120)) errs.push(`${where}: "title" is required.`);
  const statement = strList(o.statement, `${where}.statement`, errs);
  const constraints = strList(o.constraints, `${where}.constraints`, errs);
  const hints = strList(o.hints ?? [], `${where}.hints`, errs, 0);
  const fn = o.fn;
  let fnOk = false;
  if (!isObj(fn) || !isStr(fn.name, 60) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(fn.name)) || !Array.isArray(fn.params) || fn.params.length > 6 || !TYPES.includes(fn.returns as Ty)) {
    errs.push(`${where}.fn needs "name" (an identifier), "params" (up to 6 of {name, type}) and "returns" (one of ${TYPES.join(", ")}).`);
  } else {
    const params = fn.params as unknown[];
    const bad = params.some((p) => !isObj(p) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(p.name)) || !TYPES.includes(p.type as Ty));
    if (bad) errs.push(`${where}.fn.params: each parameter needs an identifier "name" and a "type" from: ${TYPES.join(", ")}.`);
    else if (new Set(params.map((p) => (p as { name: string }).name)).size !== params.length) errs.push(`${where}.fn.params: parameter names must be different.`);
    else fnOk = true;
  }
  if (!fnOk || errs.length > before) return null;
  const f = fn as PackProblem["fn"];
  const examples = checkCases(o.examples, `${where}.examples`, f, errs, 20) as PackProblem["examples"];
  const tests = checkCases(o.tests, `${where}.tests`, f, errs, PACK_LIMITS.tests);
  if (examples.length === 0) errs.push(`${where}.examples needs at least one example.`);
  if (tests.length < 3) warnings.push(`${where}: only ${tests.length} extra test(s). Add edge cases (empty, one element, duplicates, extremes).`);
  if (errs.length > before) return null;
  let solution: PackProblem["solution"];
  if (o.solution !== undefined) {
    const s = o.solution;
    if (!isObj(s) || !Array.isArray(s.idea) || !isStr(s.complexity, 200)) errs.push(`${where}.solution needs "idea" (list of text) and "complexity" (text); "cpp" is optional.`);
    else solution = { idea: s.idea.filter((x): x is string => typeof x === "string"), complexity: String(s.complexity), ...(typeof s.cpp === "string" ? { cpp: s.cpp.slice(0, PACK_LIMITS.text) } : {}) };
  } else warnings.push(`${where}: no solution given, so the Solution section will be empty.`);
  if (errs.length > before) return null;
  const checked = checkStress(o.stress, f.params, `${where}.stress`, matchesTy);
  errs.push(...checked.errors);
  if (checked.stress.length > 0 && !solution?.cpp) warnings.push(`${where}: large inputs without a C++ solution can only check speed, not the answer.`);
  if (errs.length > before) return null;
  const difficulty = o.difficulty === "easy" || o.difficulty === "medium" || o.difficulty === "hard" ? o.difficulty : undefined;
  const url = typeof o.url === "string" && /^https?:\/\//.test(o.url) && o.url.length <= 300 ? o.url : undefined;
  return {
    type: "problem",
    id: String(o.id),
    title: String(o.title),
    statement,
    constraints,
    fn: f,
    examples,
    tests,
    hints,
    ...(o.unordered === true ? { unordered: true } : {}),
    ...(solution ? { solution } : {}),
    ...(checked.stress.length > 0 ? { stress: checked.stress } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(url ? { url } : {}),
  };
}

/** Checks a pack (already parsed JSON) and returns it cleaned, or every problem found, in plain words. */
export function validatePack(input: unknown): PackCheck {
  const errs: string[] = [];
  const warnings: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ["The file must be a JSON object."] };
  if (input.format !== PACK_FORMAT) errs.push(`"format" must be "${PACK_FORMAT}".`);
  if (input.version !== PACK_VERSION) errs.push(`"version" must be ${PACK_VERSION}.`);
  if (typeof input.id !== "string" || !SLUG.test(input.id)) errs.push(`"id" must be lowercase letters, digits and hyphens (up to 40 characters).`);
  if (!isStr(input.title, 80)) errs.push(`"title" is required (up to 80 characters).`);
  const description = typeof input.description === "string" ? input.description.slice(0, 400) : "";
  if (!Array.isArray(input.sections) || input.sections.length === 0) errs.push(`"sections" must be a list with at least one section.`);
  if (errs.length > 0) return { ok: false, errors: errs };

  const sections: PackSection[] = [];
  const seen = new Set<string>();
  let count = 0;
  (input.sections as unknown[]).forEach((s, si) => {
    const sw = `sections[${si}]`;
    if (!isObj(s) || !isStr(s.title, 80) || !Array.isArray(s.items)) return void errs.push(`${sw} needs a "title" and an "items" list.`);
    const items: PackItem[] = [];
    s.items.forEach((it, ii) => {
      const where = `${sw}.items[${ii}]`;
      count++;
      if (!isObj(it)) return void errs.push(`${where} must be an object.`);
      if (typeof it.id !== "string" || !SLUG.test(it.id)) return void errs.push(`${where}: "id" must be lowercase letters, digits and hyphens.`);
      if (seen.has(it.id)) return void errs.push(`${where}: the id "${it.id}" is used twice. Ids must be different within a pack.`);
      seen.add(it.id);
      if (it.type === "lesson") {
        if (!isStr(it.title, 120)) return void errs.push(`${where}: "title" is required.`);
        if (typeof it.markdown !== "string" || it.markdown.trim().length < 20 || it.markdown.length > PACK_LIMITS.text) return void errs.push(`${where}: "markdown" must be between 20 and ${PACK_LIMITS.text} characters.`);
        items.push({ type: "lesson", id: it.id, title: String(it.title), markdown: it.markdown });
      } else if (it.type === "problem") {
        const p = checkProblem(it, where, errs, warnings);
        if (p) items.push(p);
      } else errs.push(`${where}: "type" must be "lesson" or "problem".`);
    });
    sections.push({ title: String(s.title), items });
  });
  if (count > PACK_LIMITS.items) errs.push(`A pack can hold at most ${PACK_LIMITS.items} items.`);
  if (errs.length > 0) return { ok: false, errors: errs.slice(0, 40) };
  return { ok: true, pack: { format: PACK_FORMAT, version: PACK_VERSION, id: String(input.id), title: String(input.title), description, sections }, warnings };
}

export const packItems = (p: Pack): PackItem[] => p.sections.flatMap((s) => s.items);

/** The runnable spec for a pack problem (judge format), with its large inputs expanded from the generators. */
export function packProblemSpec(p: PackProblem, packId: string): ProblemSpec {
  return {
    id: `pack:${packId}:${p.id}`,
    source: "leetcode",
    title: p.title,
    statement: p.statement,
    constraints: p.constraints,
    fn: p.fn,
    examples: p.examples,
    tests: p.tests,
    hints: p.hints,
    ...(p.unordered ? { unordered: true } : {}),
    solution: { idea: p.solution?.idea ?? [], complexity: p.solution?.complexity ?? "", cpp: p.solution?.cpp ?? "" },
    ...(p.url ? { url: p.url } : {}),
    ...(p.stress?.length ? { stress: expandStress(p.fn.params, p.stress) } : {}),
  };
}

// ---- lesson markdown ----------------------------------------------------------------------------------------------

export type MdBlock = { type: "h"; level: 2 | 3; text: string } | { type: "p"; text: string } | { type: "ul"; items: string[] } | { type: "ol"; items: string[] } | { type: "code"; lang: string; text: string };

/** A small, safe Markdown reader for lessons: headings, paragraphs, lists and code fences. Everything else stays text. */
export function parseMarkdown(src: string): MdBlock[] {
  const out: MdBlock[] = [];
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  const startsBlock = (l: string) => /^(#{1,3}\s|```|\s*[-*]\s|\s*\d+[.)]\s)/.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    const fence = line.match(/^```(\S*)\s*$/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push({ type: "code", lang: fence[1], text: body.join("\n") });
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      out.push({ type: "h", level: h[1].length === 3 ? 3 : 2, text: h[2].trim() });
      i++;
      continue;
    }
    if (/^\s*[-*]\s/.test(line) || /^\s*\d+[.)]\s/.test(line)) {
      const ordered = /^\s*\d+[.)]\s/.test(line);
      const re = ordered ? /^\s*\d+[.)]\s+(.*)$/ : /^\s*[-*]\s+(.*)$/;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, "$1").trim());
      out.push({ type: ordered ? "ol" : "ul", items });
      continue;
    }
    const para: string[] = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !startsBlock(lines[i])) para.push(lines[i++].trim());
    out.push({ type: "p", text: para.join(" ") });
  }
  return out;
}

/** Splits inline text into plain, **bold** and `code` pieces. */
export function inlineParts(text: string): { kind: "text" | "bold" | "code"; text: string }[] {
  const parts: { kind: "text" | "bold" | "code"; text: string }[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push({ kind: "text", text: text.slice(last, m.index) });
    parts.push(m[0].startsWith("**") ? { kind: "bold", text: m[0].slice(2, -2) } : { kind: "code", text: m[0].slice(1, -1) });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}
