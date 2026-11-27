// Pure helpers for the Pattern map (plan 0091): node ids, links, and progress ("mastery") per pattern.
// No I/O and no React, so the render test can use them without a database.
import type { Problem, ThinkPattern, ThinkSignal } from "@habit/shared";

export const MAP_VIEWS = [
  { id: "think", label: "Thinking map" },
  { id: "read", label: "How to read a problem" },
  { id: "groups", label: "Pattern groups" },
  { id: "recall", label: "Recall" },
] as const;
export type MapView = (typeof MAP_VIEWS)[number]["id"];

export function parseView(v: string | undefined): MapView {
  return MAP_VIEWS.some((x) => x.id === v) ? (v as MapView) : "think";
}

// ---- node ids: "pattern" or "pattern/variation"

export interface NodeRef {
  pattern: string;
  variation?: string;
}

export function parseNode(raw: string | undefined): NodeRef | null {
  if (!raw) return null;
  const [pattern, variation] = raw.split("/");
  if (!pattern) return null;
  return variation ? { pattern, variation } : { pattern };
}

export function nodeId(ref: NodeRef): string {
  return ref.variation ? `${ref.pattern}/${ref.variation}` : ref.pattern;
}

export function nodeHref(ref: NodeRef): string {
  return `/revise?tab=map&view=think&node=${encodeURIComponent(nodeId(ref))}`;
}

/** Clue and example `points` may be "pattern" or "pattern/variation". */
export function pointRef(point: string): NodeRef {
  return parseNode(point) ?? { pattern: point };
}

/** The first signal that lists a pattern (a pattern can sit under several signals). */
export function signalFor(signals: ThinkSignal[], patternId: string): ThinkSignal | undefined {
  return signals.find((s) => s.patterns.includes(patternId));
}

// ---- progress

export type MasteryState = "solid" | "shaky" | "none" | "untracked";
export interface Mastery {
  state: MasteryState;
  solved: number;
  total: number;
}

export const MASTERY_LABEL: Record<MasteryState, string> = {
  solid: "Solid",
  shaky: "Shaky",
  none: "Not started",
  untracked: "No problems yet",
};

/** The slice of a DSA pattern (from getDsaView) that mastery needs. */
export interface ProgressPattern {
  id: string;
  items: { status: { state: string; resolveDue?: boolean } }[];
}

/** Solved and total per DSA pattern id. A problem counts as solved once it is solved or re-solved. */
export function progressByPattern(patterns: ProgressPattern[]): Record<string, Mastery> {
  const out: Record<string, Mastery> = {};
  for (const p of patterns) {
    const total = p.items.length;
    const solved = p.items.filter((i) => i.status.state !== "unsolved").length;
    const due = p.items.some((i) => i.status.state === "solved" && i.status.resolveDue);
    out[p.id] = { state: masteryState(solved, total, due), solved, total };
  }
  return out;
}

/** solid = every problem solved (and none due for a re-solve); shaky = some solved or a re-solve is due; else not started. */
export function masteryState(solved: number, total: number, resolveDue = false): MasteryState {
  if (total === 0) return "untracked";
  if (solved === 0) return "none";
  if (solved >= total && !resolveDue) return "solid";
  return "shaky";
}

/** Mastery per think pattern id: its DSA pattern plus every id it covers, added together. */
export function masteryForThink(patterns: Record<string, ThinkPattern>, progress: Record<string, Mastery>): Record<string, Mastery> {
  const out: Record<string, Mastery> = {};
  for (const p of Object.values(patterns)) {
    const ids = [...new Set([p.appPattern ?? p.id, p.id, ...(p.covers ?? [])])].filter((id) => progress[id]);
    if (ids.length === 0) {
      out[p.id] = { state: "untracked", solved: 0, total: 0 };
      continue;
    }
    let solved = 0;
    let total = 0;
    let anyShaky = false;
    for (const id of ids) {
      solved += progress[id].solved;
      total += progress[id].total;
      if (progress[id].state === "shaky") anyShaky = true;
    }
    const state = masteryState(solved, total, anyShaky && solved >= total);
    out[p.id] = { state, solved, total };
  }
  return out;
}

export const GUIDE_HREF = (id: string) => `/dsa/pattern/${id}`;
export const PRACTICE_HREF = (id: string) => `/dsa/pattern/${id}?tab=practice`;

export interface ProblemLink {
  label: string;
  href: string;
  external: boolean;
}

/** An example reference: an app problem id (opens in the app), or "slug:<leetcode slug>" (opens on LeetCode). */
/** `problems` is the roadmap list by id (the database's dsa-problems doc), used for titles. */
export function problemLink(ref: string, problems: Record<string, Problem>): ProblemLink {
  if (ref.startsWith("slug:")) {
    const slug = ref.slice(5);
    const label = slug
      .split("-")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
    return { label, href: `https://leetcode.com/problems/${slug}/`, external: true };
  }
  const p = problems[ref];
  return { label: p ? p.title : ref, href: `/dsa/${encodeURIComponent(ref)}`, external: false };
}

// ---- data the client components receive (plain objects, no functions)

export interface ThinkVarData {
  id: string;
  label: string;
  when: string;
  key: string;
  examples: ProblemLink[];
}
export interface ThinkPatData {
  id: string;
  label: string;
  when: string;
  key: string;
  watch: string[];
  template?: { code: string; complexity: string };
  variations: ThinkVarData[];
  /** DSA pattern id for the guide and practice links, when one exists */
  appPattern?: string;
}
export interface ThinkSigData {
  id: string;
  label: string;
  when: string;
  patterns: string[];
}

export function thinkPatternData(p: ThinkPattern, problems: Record<string, Problem>): ThinkPatData {
  return {
    id: p.id,
    label: p.label,
    when: p.when,
    key: p.key,
    watch: p.watch,
    template: p.template ? { code: p.template.code, complexity: p.template.complexity } : undefined,
    appPattern: p.appPattern,
    variations: p.variations.map((v) => ({
      id: v.id,
      label: v.label,
      when: v.when,
      key: v.key,
      examples: (v.examples ?? []).map((ref) => problemLink(ref, problems)),
    })),
  };
}

/** "Pattern" or "Pattern: Variation" for a node, falling back to the raw id when the pattern is unknown. */
export function labelFor(ref: NodeRef, patterns: Record<string, ThinkPattern>): string {
  const p = patterns[ref.pattern];
  if (!p) return ref.pattern;
  const v = ref.variation ? p.variations.find((x) => x.id === ref.variation) : undefined;
  return v ? `${p.label}: ${v.label}` : p.label;
}
