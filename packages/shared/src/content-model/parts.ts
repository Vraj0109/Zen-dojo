// Part-level diff, extraction, patch and merge for content changes (plan 0115 steps 3-4). Pure: no I/O, runs in Node and
// in the browser.
//
// Guarantee (tested in parts.test.ts): for any before/after,
//   revOf(patchEntity(before, diffParts(before, after), extractParts(after, parts))) === revOf(after)
// so a client can check a patch and fetch the whole entity when the rev does not match.
//
// Layout data: a "section-order:<slot>" part carries the layout of the whole entity (every page: template and the
// ordered list of { id, slot, ord }). A "section:<id>" part carries { page, section } so a new section knows its page.
// Section ids are assumed unique within one entity.

import { canonicalJson } from "./rev";
import { entityKey } from "./types";
import type { ChangeEntry, ContentEntity, ContentPage, PartId, SectionRow } from "./types";

type Layout = { template: ContentPage["template"]; sections: { id: string; slot: string; ord: number }[] };
type Layouts = Record<string, Layout>;
type SectionPayload = { page: string; section: SectionRow } | { deleted: true };

const SECTION = "section:";
const ORDER = "section-order:";
const ASSET = "asset:";

function rowOf(e: ContentEntity): unknown {
  return e.value.row;
}

/** Pages of an entity by name: problems have statement and solution, lessons one page, courses and docs none. */
function pagesOf(e: ContentEntity): Record<string, ContentPage> {
  switch (e.kind) {
    case "problem":
      return { statement: e.value.statement, solution: e.value.solution };
    case "lesson":
      return { page: e.value.page };
    default:
      return {};
  }
}

function layoutsOf(e: ContentEntity): Layouts {
  const out: Layouts = {};
  for (const [name, page] of Object.entries(pagesOf(e))) {
    out[name] = { template: page.template, sections: page.sections.map((s) => ({ id: s.id, slot: s.slot, ord: s.ord })) };
  }
  return out;
}

function locate(e: ContentEntity): Map<string, { page: string; section: SectionRow }> {
  const out = new Map<string, { page: string; section: SectionRow }>();
  for (const [page, p] of Object.entries(pagesOf(e))) {
    for (const s of p.sections) if (!out.has(s.id)) out.set(s.id, { page, section: s });
  }
  return out;
}

function sameJson(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

/** What a section is, apart from its place: its title and blocks (block ord included). */
function sectionBody(s: SectionRow): unknown {
  return { title: s.title, blocks: s.blocks };
}

function assetIds(e: ContentEntity): Set<string> {
  const out = new Set<string>();
  for (const p of Object.values(pagesOf(e))) {
    for (const s of p.sections) for (const b of s.blocks) if (b.assetId) out.add(b.assetId);
  }
  return out;
}

/**
 * The parts that differ between two versions of one entity. `null` on one side means create or delete, which is "all".
 * Section moves within a slot give section-order parts only; a change to a section's title or blocks gives its
 * section part; an image block whose asset the entity did not use before adds an asset part.
 */
export function diffParts(before: ContentEntity | null, after: ContentEntity | null): PartId[] {
  if (!before && !after) return [];
  if (!before || !after) return ["all"];
  if (entityKey(before) !== entityKey(after)) return ["all"];

  const parts: PartId[] = [];
  const add = (p: PartId) => {
    if (!parts.includes(p)) parts.push(p);
  };

  if (!sameJson(rowOf(before), rowOf(after))) add("meta");
  if (before.kind === "problem" && after.kind === "problem") {
    if (!sameJson(before.value.cases, after.value.cases)) add("cases");
    if (!sameJson(before.value.hints, after.value.hints)) add("hints");
  }

  const beforeAssets = assetIds(before);
  const beforeLoc = locate(before);
  for (const [id, a] of locate(after)) {
    const b = beforeLoc.get(id);
    if (b && b.page === a.page && sameJson(sectionBody(b.section), sectionBody(a.section))) continue;
    add(`${SECTION}${id}`);
    for (const block of a.section.blocks) {
      if (block.type === "image" && block.assetId && !beforeAssets.has(block.assetId)) add(`${ASSET}${block.assetId}`);
    }
  }

  // A page whose layout changed contributes the slots it had before and has after.
  const bl = layoutsOf(before);
  const al = layoutsOf(after);
  const slots = new Set<string>();
  for (const name of new Set([...Object.keys(bl), ...Object.keys(al)])) {
    if (sameJson(bl[name], al[name])) continue;
    for (const lay of [bl[name], al[name]]) {
      if (lay) for (const s of lay.sections) slots.add(s.slot);
    }
  }
  if (slots.size > 0) for (const slot of slots) add(`${ORDER}${slot}`);
  else if (!sameJson(bl, al)) add("all");

  return parts.includes("all") ? ["all"] : parts;
}

/** The data a server sends for the given parts of an entity (shape described in the module header). */
export function extractParts(entity: ContentEntity, parts: PartId[]): Record<PartId, unknown> {
  if (parts.includes("all")) return { all: entity };
  const out: Record<PartId, unknown> = {};
  const loc = locate(entity);
  for (const p of parts) {
    if (p === "meta") {
      out[p] = rowOf(entity);
    } else if (p === "cases" && entity.kind === "problem") {
      out[p] = entity.value.cases;
    } else if (p === "hints" && entity.kind === "problem") {
      out[p] = entity.value.hints;
    } else if (p.startsWith(SECTION)) {
      const found = loc.get(p.slice(SECTION.length));
      out[p] = found ? { page: found.page, section: found.section } : { deleted: true };
    } else if (p.startsWith(ORDER)) {
      out[p] = layoutsOf(entity);
    } else if (p.startsWith(ASSET)) {
      // The image bytes live in the assets list, not in the entity. The server attaches them separately.
      out[p] = null;
    }
  }
  return out;
}

function pick<T>(parts: PartId[], data: Record<PartId, unknown>, key: PartId, fallback: T): T {
  return parts.includes(key) && data[key] !== undefined ? (data[key] as T) : fallback;
}

/**
 * Rebuild the pages of an entity from the layout and section parts. Sections come from the layout order; the content
 * of a section comes from its section part when present, else from the current copy.
 */
function patchPages(
  pages: Record<string, ContentPage>,
  parts: PartId[],
  data: Record<PartId, unknown>,
): Record<string, ContentPage> {
  const layoutKey = parts.find((p) => p.startsWith(ORDER) && data[p] !== undefined);
  const layouts = layoutKey ? (data[layoutKey] as Layouts) : undefined;
  const sectionData = (id: string): SectionRow | undefined => {
    const key = `${SECTION}${id}`;
    const v = parts.includes(key) ? (data[key] as SectionPayload | undefined) : undefined;
    return v && "section" in v ? v.section : undefined;
  };

  const out: Record<string, ContentPage> = {};
  for (const [name, page] of Object.entries(pages)) {
    const lay = layouts?.[name];
    if (!lay) {
      out[name] = {
        template: page.template,
        sections: page.sections.map((s) => {
          const changed = sectionData(s.id);
          return changed ? { ...changed, slot: s.slot, ord: s.ord } : s;
        }),
      };
      continue;
    }
    const byId = new Map(page.sections.map((s) => [s.id, s] as const));
    const sections: SectionRow[] = [];
    for (const e of lay.sections) {
      const base = sectionData(e.id) ?? byId.get(e.id);
      if (base) sections.push({ ...base, slot: e.slot, ord: e.ord });
    }
    out[name] = { template: lay.template, sections };
  }
  return out;
}

/**
 * Apply the given parts and their data to a copy of `current`. Parts without data are left as they are, so a short
 * or wrong patch shows up as a rev mismatch rather than an exception. `all` replaces the entity.
 */
export function patchEntity(current: ContentEntity, parts: PartId[], data: Record<PartId, unknown>): ContentEntity {
  if (parts.includes("all") && data.all !== undefined) return data.all as ContentEntity;
  switch (current.kind) {
    case "course":
      return { kind: "course", value: { ...current.value, row: pick(parts, data, "meta", current.value.row) } };
    case "doc":
      return { kind: "doc", value: { ...current.value, row: pick(parts, data, "meta", current.value.row) } };
    case "lesson": {
      const pages = patchPages(pagesOf(current), parts, data);
      return {
        kind: "lesson",
        value: { ...current.value, row: pick(parts, data, "meta", current.value.row), page: pages.page ?? current.value.page },
      };
    }
    case "problem": {
      const pages = patchPages(pagesOf(current), parts, data);
      return {
        kind: "problem",
        value: {
          ...current.value,
          row: pick(parts, data, "meta", current.value.row),
          cases: pick(parts, data, "cases", current.value.cases),
          hints: pick(parts, data, "hints", current.value.hints),
          statement: pages.statement ?? current.value.statement,
          solution: pages.solution ?? current.value.solution,
        },
      };
    }
  }
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/**
 * One change per entity from several changes in a range (plan 0115 step 3). Versions are taken in order.
 * - Latest op is delete: one delete entry, parts ["all"], no data.
 * - An upsert with "all" after the last delete becomes the base: the later parts are applied to it, so the result is
 *   one full entity under "all". Asset parts of the group (from that change on, latest data) are kept beside it.
 * - Otherwise: union of parts, latest data per part. Section-order data is always the latest layout.
 *   If a delete came before the last change, "all" is dropped (the client has no base; its rev check refetches).
 * Notes are kept in version order and joined with "; ". notify is true if any change had it.
 */
export function mergeChanges(changes: ChangeEntry[]): ChangeEntry[] {
  const groups = new Map<string, ChangeEntry[]>();
  for (const c of changes) {
    const key = `${c.entity}:${c.id}`;
    const list = groups.get(key);
    if (list) list.push(c);
    else groups.set(key, [c]);
  }
  return [...groups.values()].map((list) => mergeGroup([...list].sort((a, b) => a.version - b.version)));
}

function mergeGroup(list: ChangeEntry[]): ChangeEntry {
  const last = list[list.length - 1];
  const note = list.map((c) => c.note).filter((n): n is string => !!n).join("; ") || null;
  const head = {
    version: last.version,
    entity: last.entity,
    id: last.id,
    rev: last.rev,
    units: unique(list.flatMap((c) => c.units)),
    note,
    notify: list.some((c) => c.notify),
  };
  if (last.op === "delete") return { ...head, op: "delete", parts: ["all"] };

  let lastDelete = -1;
  list.forEach((c, i) => {
    if (c.op === "delete") lastDelete = i;
  });

  for (let i = list.length - 1; i > lastDelete; i--) {
    const base = list[i].data?.all;
    if (list[i].parts.includes("all") && base !== undefined) {
      let acc = base as ContentEntity;
      for (const c of list.slice(i + 1)) acc = patchEntity(acc, c.parts, c.data ?? {});
      // The whole entity does not carry the image bytes: keep the asset parts of this change and the later ones (the
      // latest data wins), so a fresh copy has every image its sections point at.
      const assetParts: PartId[] = [];
      const assetData: Record<PartId, unknown> = {};
      for (const c of list.slice(i)) {
        for (const p of c.parts) if (p.startsWith(ASSET) && !assetParts.includes(p)) assetParts.push(p);
        for (const [p, v] of Object.entries(c.data ?? {})) if (p.startsWith(ASSET) && v !== undefined) assetData[p] = v;
      }
      return { ...head, op: "upsert", parts: ["all", ...assetParts], data: { all: acc, ...assetData } };
    }
  }

  const parts: PartId[] = [];
  const data: Record<PartId, unknown> = {};
  let layoutFrom: ChangeEntry | undefined;
  for (const c of list) {
    for (const p of c.parts) {
      if (lastDelete >= 0 && p === "all") continue;
      if (!parts.includes(p)) parts.push(p);
    }
    for (const [p, v] of Object.entries(c.data ?? {})) {
      if (lastDelete >= 0 && p === "all") continue;
      if (v !== undefined) data[p] = v;
    }
    if (Object.keys(c.data ?? {}).some((k) => k.startsWith(ORDER))) layoutFrom = c;
  }
  if (layoutFrom?.data) {
    const key = Object.keys(layoutFrom.data).find((k) => k.startsWith(ORDER));
    if (key !== undefined) {
      const layout = layoutFrom.data[key];
      for (const k of Object.keys(data)) if (k.startsWith(ORDER)) data[k] = layout;
    }
  }
  return { ...head, op: "upsert", parts, data };
}
