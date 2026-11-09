import { parseMarkdown } from "@habit/shared";

// Pure helpers that build the "On this page" lists and the course outline (plan 0023). No React, so tests can run them.

export interface TocEntry {
  id: string;
  title: string;
  children?: TocEntry[];
}

/** "Open/closed + dependency inversion" -> "open-closed-dependency-inversion". */
export function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** Anchor ids for the sub-sections of "Go deeper": deeper-<slug>, made unique within one page. */
export function deeperIds(titles: string[]): string[] {
  const seen = new Map<string, number>();
  return titles.map((t) => {
    const base = `deeper-${slug(t) || "section"}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

/** The table of contents of a concept lesson. "Go deeper" lists each sub-section as a child. */
export function conceptToc(opts: {
  hasOverview: boolean;
  deeperTitles: string[];
  hasQuestions: boolean;
  hasPitfalls: boolean;
  hasReading: boolean;
}): TocEntry[] {
  const ids = deeperIds(opts.deeperTitles);
  return [
    ...(opts.hasOverview ? [{ id: "overview", title: "Overview" }] : []),
    { id: "what-to-know", title: "What to know" },
    ...(opts.deeperTitles.length > 0 ? [{ id: "deeper", title: "Go deeper", children: opts.deeperTitles.map((title, i) => ({ id: ids[i], title })) }] : []),
    ...(opts.hasQuestions ? [{ id: "interview-questions", title: "Interview questions" }] : []),
    ...(opts.hasPitfalls ? [{ id: "common-mistakes", title: "Common mistakes" }] : []),
    { id: "your-turn", title: "Your turn" },
    ...(opts.hasReading ? [{ id: "reading", title: "Reading" }] : []),
  ];
}

/** The same ids the Markdown renderer must put on its headings: md-<slug>, unique per page. */
export function markdownHeadingIds(source: string): { id: string; title: string; level: 2 | 3 }[] {
  const seen = new Map<string, number>();
  const out: { id: string; title: string; level: 2 | 3 }[] = [];
  for (const b of parseMarkdown(source)) {
    if (b.type !== "h") continue;
    const base = `md-${slug(b.text) || "section"}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.push({ id: n === 1 ? base : `${base}-${n}`, title: b.text, level: b.level });
  }
  return out;
}

/** Table of contents for an imported Markdown lesson: each ## heading, with its ### headings as children. */
export function markdownToc(source: string): TocEntry[] {
  const out: TocEntry[] = [];
  for (const h of markdownHeadingIds(source)) {
    if (h.level === 2 || out.length === 0) out.push({ id: h.id, title: h.title });
    else (out[out.length - 1].children ??= []).push({ id: h.id, title: h.title });
  }
  return out;
}

/** Every id in the order it appears on the page (parents before their children). */
export function flattenToc(items: TocEntry[]): string[] {
  return items.flatMap((i) => [i.id, ...flattenToc(i.children ?? [])]);
}

export interface OutlineLesson {
  id: string;
  title: string;
  href: string;
  covered: boolean;
  current: boolean;
  /** Sub-sections (links into the lesson page). */
  children: { id: string; title: string; href: string }[];
}
export interface OutlineSection {
  id: string;
  title: string;
  open: boolean;
  lessons: OutlineLesson[];
}

/**
 * A tree for one study area: sections, their lessons, and each lesson's sub-sections ("Go deeper" titles). `deeper`
 * returns the section titles of a lesson. The section holding the current lesson is open.
 */
export function courseOutline(opts: {
  areaId: string;
  currentId?: string;
  sections: { id: string; title: string; concepts: { id: string; title: string; confidence: number }[] }[];
  coveredAt: number;
  deeper: (conceptId: string) => string[];
}): OutlineSection[] {
  return opts.sections.map((s) => {
    const lessons = s.concepts.map((c) => {
      const href = `/study/${opts.areaId}/${c.id}`;
      const titles = opts.deeper(c.id);
      const ids = deeperIds(titles);
      return {
        id: c.id,
        title: c.title,
        href,
        covered: c.confidence >= opts.coveredAt,
        current: c.id === opts.currentId,
        children: titles.map((title, i) => ({ id: ids[i], title, href: `${href}#${ids[i]}` })),
      };
    });
    return { id: s.id, title: s.title, open: lessons.some((l) => l.current), lessons };
  });
}
