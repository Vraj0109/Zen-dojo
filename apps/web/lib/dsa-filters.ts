import { JUDGE_PROBLEMS, type Difficulty } from "@habit/shared";
import type { PatternView, ProblemView } from "./dsa";

// Search and filters for the DSA page. Filters live in the URL (/dsa?q=&topic=&difficulty=&status=&has=&source=) as
// repeated parameters (?difficulty=easy&difficulty=medium), so they work without JavaScript and can be bookmarked.
// Within one filter any chosen value matches (OR); across filters all must match (AND); no value means no filter.

export const STATUS_FILTERS = {
  unsolved: "Not solved",
  solved: "Solved",
  due: "Re-solve due",
  resolved: "Re-solved",
  stuck: "On my stuck list",
} as const;

export const HAS_FILTERS = {
  notes: "Has notes",
  code: "Has saved solutions",
  none: "No notes yet",
} as const;

export const DSA_TABS = ["patterns", "resolve", "other"] as const;
export type DsaTab = (typeof DSA_TABS)[number];

export const PROBLEM_TABS = ["solve", "notes", "submissions", "stuck"] as const;
export type ProblemTab = (typeof PROBLEM_TABS)[number];

/** The sources the DSA page can be limited to. The choice lives in the URL (?source=cses). */
export const SOURCE_FILTERS = [
  { value: "", label: "All" },
  { value: "leetcode", label: "LeetCode" },
  { value: "cses", label: "CSES" },
  { value: "atcoder", label: "AtCoder" },
  { value: "codeforces", label: "Codeforces" },
  { value: "euler", label: "Project Euler" },
  { value: "kattis", label: "Kattis" },
  { value: "cp-algorithms", label: "cp-algorithms" },
] as const;
export type DsaSource = Exclude<(typeof SOURCE_FILTERS)[number]["value"], "">;
const SOURCE_VALUES = SOURCE_FILTERS.map((s) => s.value).filter((v): v is DsaSource => v !== "");

export type StatusKey = keyof typeof STATUS_FILTERS;
export type HasKey = keyof typeof HAS_FILTERS;
export type FilterKey = "source" | "status" | "difficulty" | "topic" | "has";

export interface DsaFilters {
  q: string;
  source: DsaSource[];
  status: StatusKey[];
  difficulty: Difficulty[];
  topic: string[];
  has: HasKey[];
}

type Params = Record<string, string | string[] | undefined>;

const MAX_VALUES = 20;
const MAX_Q = 100;
const MAX_TOPIC = 50;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
const many = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** Repeated values: trimmed, valid, no duplicates, at most MAX_VALUES. */
function pickMany<T extends string>(v: string | string[] | undefined, allowed: readonly T[], lower = false): T[] {
  const out: T[] = [];
  for (const raw of many(v)) {
    const x = lower ? raw.trim().toLowerCase() : raw.trim();
    if ((allowed as readonly string[]).includes(x) && !out.includes(x as T)) out.push(x as T);
    if (out.length >= MAX_VALUES) break;
  }
  return out;
}

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const STATUS_KEYS = Object.keys(STATUS_FILTERS) as StatusKey[];
const HAS_KEYS = Object.keys(HAS_FILTERS) as HasKey[];

export function parseDsaFilters(params: Params): DsaFilters {
  const topic: string[] = [];
  for (const raw of many(params.topic)) {
    const t = raw.trim().slice(0, MAX_TOPIC);
    if (t && !topic.includes(t)) topic.push(t);
    if (topic.length >= MAX_VALUES) break;
  }
  return {
    q: one(params.q).slice(0, MAX_Q),
    source: pickMany(params.source, SOURCE_VALUES, true),
    status: pickMany(params.status, STATUS_KEYS),
    difficulty: pickMany(params.difficulty, DIFFICULTIES),
    topic,
    has: pickMany(params.has, HAS_KEYS),
  };
}

/** The options of each fixed filter, in display order. Topic options come from the page (they depend on the data). */
export const FILTER_OPTIONS: Record<Exclude<FilterKey, "topic">, { value: string; label: string }[]> = {
  source: SOURCE_FILTERS.filter((s) => s.value !== "").map((s) => ({ value: s.value, label: s.label })),
  status: STATUS_KEYS.map((value) => ({ value, label: STATUS_FILTERS[value] })),
  difficulty: [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
  ],
  has: HAS_KEYS.map((value) => ({ value, label: HAS_FILTERS[value] })),
};

const FILTER_KEYS: FilterKey[] = ["source", "status", "difficulty", "topic", "has"];

/** The URL parameters for these filters: repeated keys, no empty values. */
export function filtersToSearchParams(f: DsaFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  for (const key of FILTER_KEYS) for (const v of f[key]) if (v) sp.append(key, v);
  return sp;
}

/** The filters without one value (or the whole filter when no value is given); `q` clears the search. For chip links. */
export function removeFilterValue(f: DsaFilters, key: FilterKey | "q", value?: string): DsaFilters {
  if (key === "q") return { ...f, q: "" };
  const list = value === undefined ? [] : (f[key] as string[]).filter((v) => v !== value);
  return { ...f, [key]: list } as DsaFilters;
}

export function parseDsaTab(params: Params): DsaTab {
  const t = one(params.tab);
  return (DSA_TABS as readonly string[]).includes(t) ? (t as DsaTab) : "patterns";
}

export function parseProblemTab(params: Params, hasSubmissions = true): ProblemTab {
  const t = one(params.tab);
  if (t === "submissions" && !hasSubmissions) return "solve";
  return (PROBLEM_TABS as readonly string[]).includes(t) ? (t as ProblemTab) : "solve";
}

export const hasActiveFilters = (f: DsaFilters) => Boolean(f.q) || FILTER_KEYS.some((k) => f[k].length > 0);

// The heavy part of the search text (statement, hints, examples, tests) comes from the shared judge specs and never
// changes, so it is built once, lazily, per problem id. The cheap part (title, topics, patterns, source) is built per call.
// Only shared content goes in: never notes or saved code.
let judgeText: Map<string, string> | undefined;
const TEST_TEXT_LIMIT = 2000;

function judgeTextFor(id: string): string {
  if (!judgeText) {
    judgeText = new Map();
    for (const [pid, spec] of Object.entries(JUDGE_PROBLEMS)) {
      const cases = [...spec.examples, ...spec.tests].map((c) => `${JSON.stringify(c.input)} ${JSON.stringify(c.output)}`).join(" ");
      judgeText.set(pid, [...spec.statement, ...spec.hints, cases.slice(0, TEST_TEXT_LIMIT)].join(" ").toLowerCase());
    }
  }
  return judgeText.get(id) ?? "";
}

/** The source a problem belongs to (same rules as matchesSource); empty when none matches. */
function sourceOf(problem: { id: string; url?: string }): DsaSource | "" {
  return SOURCE_VALUES.find((s) => matchesSource(problem, s)) ?? "";
}

/** Lower-cased text the search looks in: title, id, number, topics, pattern names, source, statement, hints, examples and tests. */
export function searchText(p: ProblemView, patternNames: string[] = []): string {
  const label = SOURCE_FILTERS.find((s) => s.value === sourceOf(p))?.label ?? "";
  return [p.title, p.id, p.number ?? "", ...p.topics, ...patternNames, label, judgeTextFor(p.id)].join(" ").toLowerCase();
}

function matches(p: ProblemView, f: DsaFilters, patternNames: string[]): boolean {
  if (f.q) {
    const q = f.q.toLowerCase().replace(/^#/, "").trim();
    if (/^\d+$/.test(q)) {
      // Digits search the problem number only ("1" shouldn't match "01 Matrix").
      if (String(p.number ?? "") !== q) return false;
    } else {
      const text = searchText(p, patternNames);
      if (!q.split(/\s+/).filter(Boolean).every((w) => text.includes(w))) return false;
    }
  }
  if (f.source.length && !f.source.some((s) => matchesSource(p, s))) return false;
  if (f.topic.length && !f.topic.some((t) => p.topics.includes(t))) return false;
  if (f.difficulty.length && !(p.difficulty && f.difficulty.includes(p.difficulty))) return false;
  const s = p.status;
  const statusHit = (k: StatusKey) =>
    k === "unsolved"
      ? s.state === "unsolved"
      : k === "solved"
        ? s.state !== "unsolved"
        : k === "due"
          ? s.state === "solved" && s.resolveDue
          : k === "resolved"
            ? s.state === "resolved"
            : p.struggling;
  if (f.status.length && !f.status.some(statusHit)) return false;
  const noted = p.noted || p.lcNotes;
  const hasHit = (k: HasKey) => (k === "notes" ? noted : k === "code" ? p.submissions > 0 : !noted);
  if (f.has.length && !f.has.some(hasHit)) return false;
  return true;
}

/** Roadmap problems matching the filters, each once, with the patterns it appears in (roadmap order). */
export function filterProblems(patterns: PatternView[], f: DsaFilters): { problem: ProblemView; patterns: string[] }[] {
  const byId = new Map<string, { problem: ProblemView; patterns: string[] }>();
  // Every pattern a problem is in, so a word from any of those names finds it.
  const names = new Map<string, string[]>();
  if (f.q) for (const pattern of patterns) for (const p of pattern.items) names.set(p.id, [...(names.get(p.id) ?? []), pattern.name]);
  const rejected = new Set<string>();
  for (const pattern of patterns) {
    for (const p of pattern.items) {
      const hit = byId.get(p.id);
      if (hit) {
        hit.patterns.push(pattern.name);
        continue;
      }
      if (rejected.has(p.id)) continue;
      if (!matches(p, f, names.get(p.id) ?? [])) {
        rejected.add(p.id);
        continue;
      }
      byId.set(p.id, { problem: p, patterns: [pattern.name] });
    }
  }
  return [...byId.values()];
}

/** One source value from a URL parameter; empty when unknown. */
export function parseSource(v: string | string[] | undefined): DsaSource | "" {
  const s = (Array.isArray(v) ? v[0] : v)?.trim().toLowerCase() ?? "";
  return (SOURCE_VALUES as readonly string[]).includes(s) ? (s as DsaSource) : "";
}

/** Whether a problem belongs to a source: LeetCode, CSES, AtCoder, Codeforces, Euler and Kattis by id prefix, cp-algorithms by its link. An empty source matches everything. */
export function matchesSource(problem: { id: string; url?: string }, source: DsaSource | ""): boolean {
  if (source === "leetcode") return problem.id.startsWith("lc-");
  if (source === "cses") return problem.id.startsWith("cses-");
  if (source === "atcoder") return problem.id.startsWith("c-atc-");
  if (source === "codeforces") return problem.id.startsWith("c-cf-");
  if (source === "euler") return problem.id.startsWith("c-euler-");
  if (source === "kattis") return problem.id.startsWith("c-kattis-");
  if (source === "cp-algorithms") return (problem.url ?? "").includes("cp-algorithms.com");
  return true;
}
