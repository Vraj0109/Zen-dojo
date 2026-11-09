// Content packs: new problems and lessons added to the app without changing its code. A pack is one JSON file
// (format "prepwise-pack"); the app validates it here, stores it, and shows it as a course in Learn. Pure code, no I/O.
// The format is written up in docs/content-packs.md, with a prompt another AI can follow to produce a pack.

import { ALL_CONCEPTS, STUDY_AREAS } from "./study";
import { checkStress, expandStress, type PackStress } from "./judge/stress-gen";
import type { Case, ProblemSpec, Ty } from "./judge/types";
import type { Lesson } from "./learn/types";

export type { Gen, PackStress } from "./judge/stress-gen";

/** "prepwise-pack" is the name from before the app was renamed. Both are accepted for ever. */
export const PACK_FORMATS = ["prepwise-pack", "zendojo-pack"] as const;
export const PACK_FORMAT = PACK_FORMATS[1];
export type PackFormat = (typeof PACK_FORMATS)[number];
/** Version 1 packs (app 0.4.0) still work. Version 2 adds target, revision, tags and source. */
export const PACK_VERSIONS = [1, 2] as const;
export const PACK_VERSION = 2;
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
  /** Free labels, for example ["graphs", "bfs"] */
  tags?: string[];
  /** Where the problem came from, in words ("AtCoder ABC 300 C") and a link */
  source?: string;
  sourceUrl?: string;
  /** Large inputs (speed and memory checks) written as data; see judge/stress-gen.ts. Needs solution.cpp for expected answers. */
  stress?: PackStress[];
  difficulty?: "easy" | "medium" | "hard";
  /** Where the original problem lives, if anywhere (shown as a link) */
  url?: string;
  solution?: { idea: string[]; complexity: string; cpp?: string };
};
export interface PackPatch {
  type: "patch";
  id: string;
  title: string;
  /** The id of the built-in concept to patch (e.g. "lld-solid") */
  concept: string;
  /** The replacement lesson */
  replace: Lesson;
}
export type PackItem = PackLesson | PackProblem | PackPatch;
export interface PackTarget {
  /** A study area id: "sd" (system design), "lld" or "core" (core CS) */
  area: string;
  /** Heading the items are listed under (an existing section title puts them next to it) */
  section?: string;
}
export interface PackSection {
  title: string;
  items: PackItem[];
}
export interface Pack {
  format: PackFormat;
  version: number;
  /** Your own version of the pack's content, for update checks ("1.2.0") */
  revision?: string;
  /** Put the pack's items into a built-in study area instead of making a course of its own */
  target?: PackTarget;
  /** Lowercase letters, digits and hyphens */
  id: string;
  title: string;
  description: string;
  sections: PackSection[];
}

export type PackCheck = { ok: true; pack: Pack; warnings: string[] } | { ok: false; errors: string[] };

export const FEED_FORMATS = ["zendojo-feed"] as const;
export const FEED_FORMAT = FEED_FORMATS[0];
export const FEED_VERSIONS = [1] as const;
export const FEED_VERSION = 1;

export interface FeedPackEntry {
  id: string;
  title: string;
  version: string;
  url: string;
  sha256?: string;
  description?: string;
}

export interface ContentFeed {
  format: (typeof FEED_FORMATS)[number];
  version: (typeof FEED_VERSIONS)[number];
  packs: FeedPackEntry[];
}

export type FeedCheck = { ok: true; feed: ContentFeed } | { ok: false; errors: string[] };

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
  let tags: string[] | undefined;
  if (o.tags !== undefined) {
    if (!Array.isArray(o.tags) || o.tags.length > 10 || !o.tags.every((t) => isStr(t, 30))) errs.push(`${where}.tags must be a list of up to 10 short labels.`);
    else tags = o.tags as string[];
  }
  if (o.source !== undefined && !isStr(o.source, 80)) errs.push(`${where}.source must be text of up to 80 characters.`);
  if (o.sourceUrl !== undefined && !(typeof o.sourceUrl === "string" && /^https?:\/\/\S+$/.test(o.sourceUrl) && o.sourceUrl.length <= 300)) errs.push(`${where}.sourceUrl must be an http or https address.`);
  if (errs.length > before) return null;
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
    ...(tags && tags.length > 0 ? { tags } : {}),
    ...(typeof o.source === "string" ? { source: o.source } : {}),
    ...(typeof o.sourceUrl === "string" ? { sourceUrl: o.sourceUrl } : {}),
  };
}

/**
 * Validates a Mermaid diagram source text.
 * Checks for recognized diagram type header, non-empty content, and balanced delimiters.
 */
export function validateMermaid(source: string): { ok: true } | { ok: false; error: string } {
  if (!source || source.trim().length === 0) {
    return { ok: false, error: "diagram source is empty." };
  }
  let cleaned = source.trim();
  if (cleaned.startsWith("---")) {
    const end = cleaned.indexOf("---", 3);
    if (end !== -1) cleaned = cleaned.slice(end + 3).trim();
  }
  const lines = cleaned.split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("%%"));
  if (lines.length === 0) {
    return { ok: false, error: "diagram has no content." };
  }
  const first = lines[0];
  const validHeader = /^(graph\s+(TD|TB|BT|RL|LR)|flowchart\s+(TD|TB|BT|RL|LR)|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|xychart-beta|zenuml|sankey-beta|packet-beta|kanban|block-beta|architecture-beta)\b/i;
  if (!validHeader.test(first)) {
    return { ok: false, error: `unknown diagram type or missing header: "${first.slice(0, 40)}". Expected "flowchart TD", "sequenceDiagram", etc.` };
  }
  const isEr = /^erDiagram\b/i.test(first);
  const isSeq = /^sequenceDiagram\b/i.test(first);
  const stack: { char: string; line: number }[] = [];
  for (let li = 0; li < lines.length; li++) {
    const l = lines[li];
    let inQuote = false;
    for (let ci = 0; ci < l.length; ci++) {
      const ch = l[ci];
      if (ch === '"') {
        inQuote = !inQuote;
        continue;
      }
      if (inQuote) continue;
      // In sequence diagrams, -) and --) are asynchronous arrows, not closing parens
      if (isSeq && ch === ")" && ci > 0 && l[ci - 1] === "-") continue;
      // In ER diagrams, { and } in relationships (like ||--o{ or }|--||) are cardinality symbols, not code blocks
      if (isEr && (ch === "{" || ch === "}")) {
        const prev = ci > 0 ? l[ci - 1] : "";
        const next = ci < l.length - 1 ? l[ci + 1] : "";
        if (/[-.o|]/.test(prev) || /[-.o|]/.test(next)) continue;
      }
      if (ch === "[" || ch === "(" || ch === "{") {
        stack.push({ char: ch, line: li + 1 });
      } else if (ch === "]" || ch === ")" || ch === "}") {
        const expected = ch === "]" ? "[" : ch === ")" ? "(" : "{";
        if (stack.length === 0 || stack[stack.length - 1].char !== expected) {
          return { ok: false, error: `unmatched closing "${ch}" on line ${li + 1}.` };
        }
        stack.pop();
      }
    }
    if (inQuote) {
      return { ok: false, error: `unterminated quote on line ${li + 1}.` };
    }
  }
  if (stack.length > 0) {
    const unclosed = stack.pop()!;
    return { ok: false, error: `unclosed "${unclosed.char}" from line ${unclosed.line}.` };
  }
  return { ok: true };
}

function checkLessonReplace(o: unknown, where: string, errs: string[]): Lesson | null {
  if (!isObj(o)) {
    errs.push(`${where} must be an object with "overview", "explain", and "questions".`);
    return null;
  }
  const before = errs.length;
  if (!isStr(o.overview, PACK_LIMITS.text)) errs.push(`${where}.overview must be non-empty text.`);
  const explain = strList(o.explain, `${where}.explain`, errs, 1);
  const questions = strList(o.questions, `${where}.questions`, errs, 0);
  let pitfalls: string[] | undefined;
  if (o.pitfalls !== undefined) {
    pitfalls = strList(o.pitfalls, `${where}.pitfalls`, errs, 0);
  }
  if (errs.length > before) return null;
  return {
    overview: String(o.overview),
    explain,
    questions,
    ...(pitfalls ? { pitfalls } : {}),
  };
}

/** Validates a content feed JSON document (format "zendojo-feed"). */
export function validateFeed(input: unknown): FeedCheck {
  const errs: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ["The feed must be a JSON object."] };
  if (input.format !== FEED_FORMAT) errs.push(`"format" must be "${FEED_FORMAT}".`);
  if (input.version !== FEED_VERSION) errs.push(`"version" must be ${FEED_VERSION}.`);
  if (!Array.isArray(input.packs)) {
    errs.push(`"packs" must be a list of pack entries.`);
    return { ok: false, errors: errs };
  }
  const packs: FeedPackEntry[] = [];
  const seen = new Set<string>();
  input.packs.forEach((p, idx) => {
    const where = `packs[${idx}]`;
    if (!isObj(p)) return void errs.push(`${where} must be an object.`);
    if (typeof p.id !== "string" || !SLUG.test(p.id)) return void errs.push(`${where}: "id" must be lowercase letters, digits and hyphens.`);
    if (seen.has(p.id)) return void errs.push(`${where}: duplicate pack id "${p.id}".`);
    seen.add(p.id);
    if (!isStr(p.title, 120)) return void errs.push(`${where}: "title" is required (up to 120 characters).`);
    if (typeof p.version !== "string" || !/^[0-9A-Za-z.+-]{1,20}$/.test(p.version)) {
      return void errs.push(`${where}: "version" must be a version string like "1.2.0".`);
    }
    if (typeof p.url !== "string" || !/^https?:\/\/\S+$/.test(p.url) || p.url.length > 2000) {
      return void errs.push(`${where}: "url" must be an http(s) address.`);
    }
    let sha256: string | undefined;
    if (p.sha256 !== undefined) {
      if (typeof p.sha256 !== "string" || !/^[a-fA-F0-9]{64}$/.test(p.sha256)) {
        errs.push(`${where}: "sha256" must be a 64-character hexadecimal checksum.`);
      } else {
        sha256 = p.sha256.toLowerCase();
      }
    }
    const description = typeof p.description === "string" ? p.description.slice(0, 400) : undefined;
    packs.push({
      id: p.id,
      title: String(p.title),
      version: p.version,
      url: p.url,
      ...(sha256 ? { sha256 } : {}),
      ...(description !== undefined ? { description } : {}),
    });
  });
  if (errs.length > 0) return { ok: false, errors: errs };
  return {
    ok: true,
    feed: {
      format: input.format as ContentFeed["format"],
      version: input.version as ContentFeed["version"],
      packs,
    },
  };
}

/** Checks a pack (already parsed JSON) and returns it cleaned, or every problem found, in plain words. */
export function validatePack(input: unknown): PackCheck {
  const errs: string[] = [];
  const warnings: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ["The file must be a JSON object."] };
  if (!(PACK_FORMATS as readonly unknown[]).includes(input.format)) errs.push(`"format" must be "${PACK_FORMAT}" (or the older "prepwise-pack").`);
  if (!(PACK_VERSIONS as readonly unknown[]).includes(input.version)) errs.push(`"version" must be 1 or 2.`);
  const revision = input.revision === undefined ? undefined : typeof input.revision === "string" && /^[0-9A-Za-z.+-]{1,20}$/.test(input.revision) ? input.revision : null;
  if (revision === null) errs.push(`"revision" must be a short version text such as "1.2.0" (letters, digits, dots and hyphens, up to 20 characters).`);
  let target: PackTarget | undefined;
  if (input.target !== undefined) {
    const t = input.target;
    if (!isObj(t) || typeof t.area !== "string" || !STUDY_AREAS.some((a) => a.id === t.area)) errs.push(`"target.area" must be one of: ${STUDY_AREAS.map((a) => a.id).join(", ")}.`);
    else if (t.section !== undefined && !isStr(t.section, 80)) errs.push(`"target.section" must be a heading of up to 80 characters.`);
    else target = { area: t.area, ...(typeof t.section === "string" ? { section: t.section } : {}) };
  }
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
      const rawId = typeof it.id === "string" && it.id.length > 0 ? it.id : (it.type === "patch" && typeof it.concept === "string" ? it.concept : "");
      if (!SLUG.test(rawId)) return void errs.push(`${where}: ${it.type === "patch" && !it.id ? '"concept"' : '"id"'} must be lowercase letters, digits and hyphens.`);
      if (seen.has(rawId)) return void errs.push(`${where}: the id "${rawId}" is used twice. Ids must be different within a pack.`);
      seen.add(rawId);
      if (it.type === "lesson") {
        if (!isStr(it.title, 120)) return void errs.push(`${where}: "title" is required.`);
        if (typeof it.markdown !== "string" || it.markdown.trim().length < 20 || it.markdown.length > PACK_LIMITS.text) return void errs.push(`${where}: "markdown" must be between 20 and ${PACK_LIMITS.text} characters.`);
        const blocks = parseMarkdown(it.markdown);
        for (const b of blocks) {
          if (b.type === "code" && b.lang.trim().toLowerCase() === "mermaid") {
            const mv = validateMermaid(b.text);
            if (!mv.ok) {
              errs.push(`${where}: invalid Mermaid diagram: ${mv.error}`);
            }
          }
        }
        items.push({ type: "lesson", id: rawId, title: String(it.title), markdown: it.markdown });
      } else if (it.type === "problem") {
        const p = checkProblem(it, where, errs, warnings);
        if (p) items.push(p);
      } else if (it.type === "patch") {
        if (!isStr(it.concept, 60) || !SLUG.test(it.concept)) {
          errs.push(`${where}: "concept" is required (lowercase letters, digits and hyphens, up to 60 characters).`);
        } else if (!(it.concept in ALL_CONCEPTS)) {
          errs.push(`${where}: "${it.concept}" is not a recognized built-in concept.`);
        }
        const rep = checkLessonReplace(it.replace, `${where}.replace`, errs);
        const title = typeof it.title === "string" && it.title.trim().length > 0 ? String(it.title) : (ALL_CONCEPTS[String(it.concept)]?.title ?? String(it.concept));
        if (rep) items.push({ type: "patch", id: rawId, title, concept: String(it.concept), replace: rep });
      } else errs.push(`${where}: "type" must be "lesson", "problem" or "patch".`);
    });
    sections.push({ title: String(s.title), items });
  });
  if (count > PACK_LIMITS.items) errs.push(`A pack can hold at most ${PACK_LIMITS.items} items.`);
  if (errs.length > 0) return { ok: false, errors: errs.slice(0, 40) };
  return {
    ok: true,
    pack: {
      format: input.format as PackFormat,
      version: input.version as number,
      id: String(input.id),
      title: String(input.title),
      description,
      ...(revision ? { revision } : {}),
      ...(target ? { target } : {}),
      sections,
    },
    warnings,
  };
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
