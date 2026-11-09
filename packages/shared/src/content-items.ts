// Content items (plan 0030): ONE problem, extra test cases for a problem, a lesson, a lesson patch or a reading link, added
// without a release. An item is a small JSON document with a "type". Problems, lessons and patches use exactly the pack v2
// formats (packs.ts), so validation is the pack validation: no second set of rules. Pure code, no I/O.
// The format is written up in docs/content-editing.md ("Add one thing").

import { JUDGE_PROBLEMS } from "./judge";
import type { Case } from "./judge/types";
import { PACK_FORMAT, PACK_LIMITS, PACK_VERSION, matchesTy, validatePack, type PackItem } from "./packs";

export const ITEM_TYPES = ["problem", "tests", "lesson", "patch", "reading"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

/** The id of the pack that holds stored problems, lessons and patches. Its problems are run as "pack:items:<id>". */
export const ITEMS_PACK_ID = "items";

export interface TestsItem {
  type: "tests";
  /** The id of the problem: a built-in id like "lc-1", or "pack:items:<id>" for a stored one */
  problem: string;
  cases: { input: unknown[]; output?: unknown }[];
}
export interface ReadingItem {
  type: "reading";
  id: string;
  title: string;
  url: string;
  /** Optional: a study area ("sd", "lld", "core") or "dsa" */
  area?: string;
  note?: string;
}
export type StoredItem = PackItem | TestsItem | ReadingItem;

export type ItemCheck =
  | { ok: true; id: string; type: ItemType; item: StoredItem; warnings: string[] }
  | { ok: false; errors: string[] };

const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The stored id of an item: "<type>:<target>". */
export function itemId(item: StoredItem): string {
  return item.type === "tests" ? `tests:${item.problem}` : item.type === "patch" ? `patch:${item.concept}` : `${item.type}:${item.id}`;
}

/** The function signature of a built-in problem, for checking test cases against it. */
export function builtinFn(problemId: string): { params: { name: string; type: string }[]; returns: string } | null {
  const spec = JUDGE_PROBLEMS[problemId];
  return spec && !spec.design ? (spec.fn as { params: { name: string; type: string }[]; returns: string }) : null;
}

/** Cases that still need an expected output (they were written with only an input). */
export function casesMissingOutput(item: TestsItem): number[] {
  return item.cases.flatMap((c, i) => (c.output === undefined ? [i] : []));
}

/** Validates one item exactly as the stored form will be read. Never throws; messages name the field. */
export function validateItem(raw: unknown): ItemCheck {
  if (!isObj(raw)) return { ok: false, errors: ["An item must be a JSON object with a \"type\"."] };
  const type = raw.type;
  if (!(ITEM_TYPES as readonly unknown[]).includes(type)) return { ok: false, errors: [`"type" must be one of: ${ITEM_TYPES.join(", ")}.`] };

  if (type === "tests") {
    const errs: string[] = [];
    if (typeof raw.problem !== "string" || raw.problem.length < 2 || raw.problem.length > 100) errs.push(`"problem" must be the id of a problem, for example "lc-1".`);
    if (!Array.isArray(raw.cases) || raw.cases.length === 0 || raw.cases.length > PACK_LIMITS.tests) errs.push(`"cases" must be a list of 1 to ${PACK_LIMITS.tests} cases, each {"input": [...], "output": ...}.`);
    if (errs.length > 0) return { ok: false, errors: errs };
    const fn = builtinFn(raw.problem as string);
    (raw.cases as unknown[]).forEach((c, i) => {
      const where = `cases[${i}]`;
      if (!isObj(c) || !Array.isArray(c.input)) return void errs.push(`${where} needs "input", a list with one value per parameter.`);
      if (fn) {
        if (c.input.length !== fn.params.length) errs.push(`${where}.input has ${c.input.length} values but ${raw.problem} takes ${fn.params.length}.`);
        else
          c.input.forEach((x, j) => {
            if (!matchesTy(x, fn.params[j].type as Parameters<typeof matchesTy>[1])) errs.push(`${where}.input[${j}] is not a valid ${fn.params[j].type} (parameter ${fn.params[j].name}).`);
          });
        if ("output" in c && c.output !== undefined && !matchesTy(c.output, fn.returns as Parameters<typeof matchesTy>[1])) errs.push(`${where}.output is not a valid ${fn.returns}.`);
      }
    });
    if (errs.length > 0) return { ok: false, errors: errs.slice(0, 20) };
    const item: TestsItem = {
      type: "tests",
      problem: raw.problem as string,
      cases: (raw.cases as { input: unknown[]; output?: unknown }[]).map((c) => ("output" in c && c.output !== undefined ? { input: c.input, output: c.output } : { input: c.input })),
    };
    return { ok: true, id: itemId(item), type: "tests", item, warnings: fn ? [] : [`"${raw.problem}" is not a built-in problem, so the cases are checked when the problem runs.`] };
  }

  if (type === "reading") {
    const errs: string[] = [];
    if (typeof raw.id !== "string" || !SLUG.test(raw.id)) errs.push(`"id" must be lowercase letters, digits and hyphens.`);
    if (typeof raw.title !== "string" || raw.title.trim().length === 0 || raw.title.length > 160) errs.push(`"title" is required (up to 160 characters).`);
    if (typeof raw.url !== "string" || !/^https?:\/\/\S+$/.test(raw.url) || raw.url.length > 300) errs.push(`"url" must be an http or https address.`);
    if (raw.note !== undefined && (typeof raw.note !== "string" || raw.note.length > 400)) errs.push(`"note" must be text of up to 400 characters.`);
    if (raw.area !== undefined && !["dsa", "sd", "lld", "core"].includes(String(raw.area))) errs.push(`"area" must be one of: dsa, sd, lld, core.`);
    if (errs.length > 0) return { ok: false, errors: errs };
    const item: ReadingItem = { type: "reading", id: raw.id as string, title: (raw.title as string).trim(), url: raw.url as string, ...(raw.area ? { area: raw.area as string } : {}), ...(raw.note ? { note: raw.note as string } : {}) };
    return { ok: true, id: itemId(item), type: "reading", item, warnings: [] };
  }

  // problem, lesson, patch: the pack validators do the work, on a one-item pack
  const { section: _section, ...rest } = raw;
  void _section;
  const check = validatePack({ format: PACK_FORMAT, version: PACK_VERSION, id: ITEMS_PACK_ID, title: "Added items", description: "", sections: [{ title: "Added items", items: [rest] }] });
  if (!check.ok) return { ok: false, errors: check.errors };
  const item = check.pack.sections[0].items[0];
  return { ok: true, id: itemId(item), type: type as ItemType, item, warnings: check.warnings };
}

/** The stored cases of a tests item as judge cases (only those that have an output). */
export function itemCases(item: TestsItem): Case[] {
  return item.cases.filter((c) => c.output !== undefined).map((c) => ({ input: c.input, output: c.output }) as Case);
}
