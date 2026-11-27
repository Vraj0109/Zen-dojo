// Shape check for snapshot chunks and size-based chunking (plan 0115 units and snapshot). Pure.

import { canonicalJson } from "./rev";
import { CODE_LANGS, TEMPLATE_IDS } from "./types";
import type { AssetRow, ContentEntity } from "./types";

export interface SnapshotChunk {
  entities: ContentEntity[];
  assets: AssetRow[];
}

export type SnapshotCheck = { ok: true; value: SnapshotChunk } | { ok: false; errors: string[] };

const KINDS = ["course", "lesson", "problem", "doc"] as const;
const BLOCK_TYPES = ["markdown", "code", "diagram", "image"] as const;
const VARIANTS = ["brute", "semi", "optimal", "custom"] as const;
const MIMES = ["image/png", "image/jpeg", "image/webp"] as const;
const MAX_ERRORS = 50;

type Obj = Record<string, unknown>;
type Add = (path: string, msg: string) => void;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function checkObj(v: unknown, path: string, add: Add): v is Obj {
  if (isObj(v)) return true;
  add(path, "expected an object");
  return false;
}

function str(v: unknown, path: string, add: Add): void {
  if (typeof v !== "string") add(path, "expected a string");
}

function strOrNull(v: unknown, path: string, add: Add): void {
  if (v !== null && typeof v !== "string") add(path, "expected a string or null");
}

function num(v: unknown, path: string, add: Add): void {
  if (typeof v !== "number" || !Number.isFinite(v)) add(path, "expected a number");
}

function numOrNull(v: unknown, path: string, add: Add): void {
  if (v !== null && (typeof v !== "number" || !Number.isFinite(v))) add(path, "expected a number or null");
}

function bool(v: unknown, path: string, add: Add): void {
  if (typeof v !== "boolean") add(path, "expected a boolean");
}

function oneOf(v: unknown, list: readonly string[], path: string, add: Add): void {
  if (typeof v !== "string" || !list.includes(v)) add(path, `expected one of ${list.join(", ")}`);
}

function oneOfOrNull(v: unknown, list: readonly string[], path: string, add: Add): void {
  if (v !== null) oneOf(v, list, path, add);
}

function eachItem(v: unknown, path: string, add: Add, check: (item: unknown, path: string) => void): void {
  if (!Array.isArray(v)) {
    add(path, "expected an array");
    return;
  }
  v.forEach((item, i) => check(item, `${path}[${i}]`));
}

function checkCourseRow(v: unknown, path: string, add: Add): void {
  if (!checkObj(v, path, add)) return;
  str(v.id, `${path}.id`, add);
  str(v.area, `${path}.area`, add);
  str(v.title, `${path}.title`, add);
  str(v.summaryMd, `${path}.summaryMd`, add);
  num(v.ord, `${path}.ord`, add);
  checkObj(v.data, `${path}.data`, add);
}

function checkLessonRow(v: unknown, path: string, add: Add): void {
  if (!checkObj(v, path, add)) return;
  str(v.id, `${path}.id`, add);
  str(v.courseId, `${path}.courseId`, add);
  num(v.ord, `${path}.ord`, add);
  str(v.title, `${path}.title`, add);
  oneOf(v.template, TEMPLATE_IDS, `${path}.template`, add);
  checkObj(v.meta, `${path}.meta`, add);
}

function checkProblemRow(v: unknown, path: string, add: Add): void {
  if (!checkObj(v, path, add)) return;
  str(v.id, `${path}.id`, add);
  str(v.source, `${path}.source`, add);
  str(v.title, `${path}.title`, add);
  oneOfOrNull(v.difficulty, ["easy", "medium", "hard"], `${path}.difficulty`, add);
  strOrNull(v.pattern, `${path}.pattern`, add);
  strOrNull(v.url, `${path}.url`, add);
  oneOf(v.kind, ["function", "design"], `${path}.kind`, add);
  eachItem(v.constraints, `${path}.constraints`, add, (c, p) => str(c, p, add));
  strOrNull(v.inputFormatMd, `${path}.inputFormatMd`, add);
  strOrNull(v.outputFormatMd, `${path}.outputFormatMd`, add);
  if (checkObj(v.fn, `${path}.fn`, add)) {
    str(v.fn.name, `${path}.fn.name`, add);
    str(v.fn.returns, `${path}.fn.returns`, add);
    eachItem(v.fn.params, `${path}.fn.params`, add, (p, pp) => {
      if (!checkObj(p, pp, add)) return;
      str(p.name, `${pp}.name`, add);
      str(p.type, `${pp}.type`, add);
    });
  }
  bool(v.unordered, `${path}.unordered`, add);
  strOrNull(v.complexity, `${path}.complexity`, add);
  checkObj(v.extra, `${path}.extra`, add);
}

function checkBlock(v: unknown, path: string, add: Add): void {
  if (!checkObj(v, path, add)) return;
  str(v.id, `${path}.id`, add);
  num(v.ord, `${path}.ord`, add);
  oneOf(v.type, BLOCK_TYPES, `${path}.type`, add);
  str(v.body, `${path}.body`, add);
  strOrNull(v.caption, `${path}.caption`, add);
  oneOfOrNull(v.variant, VARIANTS, `${path}.variant`, add);
  strOrNull(v.label, `${path}.label`, add);
  strOrNull(v.timeComplexity, `${path}.timeComplexity`, add);
  strOrNull(v.spaceComplexity, `${path}.spaceComplexity`, add);
  strOrNull(v.assetId, `${path}.assetId`, add);
  if (checkObj(v.code, `${path}.code`, add)) {
    for (const [lang, code] of Object.entries(v.code)) {
      oneOf(lang, CODE_LANGS, `${path}.code (key)`, add);
      str(code, `${path}.code.${lang}`, add);
    }
  }
}

function checkPage(v: unknown, path: string, add: Add): void {
  if (!checkObj(v, path, add)) return;
  oneOf(v.template, TEMPLATE_IDS, `${path}.template`, add);
  eachItem(v.sections, `${path}.sections`, add, (s, sp) => {
    if (!checkObj(s, sp, add)) return;
    str(s.id, `${sp}.id`, add);
    str(s.slot, `${sp}.slot`, add);
    num(s.ord, `${sp}.ord`, add);
    strOrNull(s.title, `${sp}.title`, add);
    eachItem(s.blocks, `${sp}.blocks`, add, (b, bp) => checkBlock(b, bp, add));
  });
}

function checkEntity(v: unknown, path: string, add: Add): void {
  if (!checkObj(v, path, add)) return;
  oneOf(v.kind, KINDS, `${path}.kind`, add);
  if (!checkObj(v.value, `${path}.value`, add)) return;
  const value = v.value;
  switch (v.kind) {
    case "course":
      checkCourseRow(value.row, `${path}.value.row`, add);
      break;
    case "doc":
      if (checkObj(value.row, `${path}.value.row`, add)) {
        str(value.row.kind, `${path}.value.row.kind`, add);
        str(value.row.id, `${path}.value.row.id`, add);
        if (!("body" in value.row)) add(`${path}.value.row.body`, "missing");
      }
      break;
    case "lesson":
      checkLessonRow(value.row, `${path}.value.row`, add);
      checkPage(value.page, `${path}.value.page`, add);
      break;
    case "problem":
      checkProblemRow(value.row, `${path}.value.row`, add);
      eachItem(value.cases, `${path}.value.cases`, add, (c, cp) => {
        if (!checkObj(c, cp, add)) return;
        num(c.ord, `${cp}.ord`, add);
        oneOf(c.role, ["example", "test"], `${cp}.role`, add);
        if (!Array.isArray(c.input)) add(`${cp}.input`, "expected an array");
        if (!("output" in c)) add(`${cp}.output`, "missing");
        strOrNull(c.explanationMd, `${cp}.explanationMd`, add);
      });
      eachItem(value.hints, `${path}.value.hints`, add, (h, hp) => {
        if (!checkObj(h, hp, add)) return;
        num(h.ord, `${hp}.ord`, add);
        str(h.bodyMd, `${hp}.bodyMd`, add);
      });
      checkPage(value.statement, `${path}.value.statement`, add);
      checkPage(value.solution, `${path}.value.solution`, add);
      break;
  }
}

function checkAsset(v: unknown, path: string, add: Add): void {
  if (!checkObj(v, path, add)) return;
  str(v.id, `${path}.id`, add);
  oneOf(v.mime, MIMES, `${path}.mime`, add);
  str(v.base64, `${path}.base64`, add);
  numOrNull(v.width, `${path}.width`, add);
  numOrNull(v.height, `${path}.height`, add);
}

/**
 * Checks the shape of one snapshot chunk `{ entities, assets }` (for example a downloaded unit page) before any of it
 * is written. Returns the typed value, or the first 50 problems with their JSON paths.
 */
export function validateSnapshotChunk(json: unknown): SnapshotCheck {
  const errors: string[] = [];
  const add: Add = (path, msg) => {
    if (errors.length < MAX_ERRORS) errors.push(`${path}: ${msg}`);
  };
  if (!isObj(json)) return { ok: false, errors: ["$: expected an object"] };
  eachItem(json.entities, "$.entities", add, (e, p) => checkEntity(e, p, add));
  eachItem(json.assets, "$.assets", add, (a, p) => checkAsset(a, p, add));
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { entities: json.entities as ContentEntity[], assets: json.assets as AssetRow[] } };
}

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/**
 * Splits entities into groups whose canonical JSON array stays under `maxBytes`, keeping order. A group's size is the
 * size of `canonicalJson(group)`; an entity larger than `maxBytes` alone gets a group of its own (it cannot be split).
 * The caller adds the wrapper and any assets to the size.
 */
export function chunkPlan(entities: ContentEntity[], maxBytes: number): ContentEntity[][] {
  const groups: ContentEntity[][] = [];
  let cur: ContentEntity[] = [];
  let size = 2; // "[]"
  for (const e of entities) {
    const n = byteLength(canonicalJson(e));
    if (cur.length > 0 && size + 1 + n > maxBytes) {
      groups.push(cur);
      cur = [];
      size = 2;
    }
    size += (cur.length > 0 ? 1 : 0) + n;
    cur.push(e);
  }
  if (cur.length > 0) groups.push(cur);
  return groups;
}
