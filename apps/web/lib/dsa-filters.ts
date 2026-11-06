import type { Difficulty } from "@habit/shared";
import type { PatternView, ProblemView } from "./dsa";

// Search and filters for the DSA page. Filters live in the URL (/dsa?q=&topic=&difficulty=&status=&has=)
// so they work without JavaScript and can be bookmarked.

export const STATUS_FILTERS = {
  unsolved: "Not solved",
  solved: "Solved",
  due: "Re-solve due",
  resolved: "Re-solved",
} as const;

export const HAS_FILTERS = {
  notes: "Has notes",
  code: "Has saved solutions",
  none: "No notes yet",
} as const;

export interface DsaFilters {
  q: string;
  topic: string;
  difficulty: Difficulty | "";
  status: keyof typeof STATUS_FILTERS | "";
  has: keyof typeof HAS_FILTERS | "";
}

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
const pick = <T extends string>(v: string, allowed: readonly T[]): T | "" => ((allowed as readonly string[]).includes(v) ? (v as T) : "");

export function parseDsaFilters(params: Params): DsaFilters {
  return {
    q: one(params.q).slice(0, 100),
    topic: one(params.topic).slice(0, 50),
    difficulty: pick(one(params.difficulty), ["easy", "medium", "hard"] as const),
    status: pick(one(params.status), Object.keys(STATUS_FILTERS) as (keyof typeof STATUS_FILTERS)[]),
    has: pick(one(params.has), Object.keys(HAS_FILTERS) as (keyof typeof HAS_FILTERS)[]),
  };
}

export const hasActiveFilters = (f: DsaFilters) => Boolean(f.q || f.topic || f.difficulty || f.status || f.has);

function matches(p: ProblemView, f: DsaFilters): boolean {
  if (f.q) {
    const q = f.q.toLowerCase().replace(/^#/, "");
    // Digits search the problem number only ("1" shouldn't match "01 Matrix").
    const hit = /^\d+$/.test(q) ? String(p.number ?? "") === q : p.title.toLowerCase().includes(q) || p.id.toLowerCase() === q;
    if (!hit) return false;
  }
  if (f.topic && !p.topics.includes(f.topic)) return false;
  if (f.difficulty && p.difficulty !== f.difficulty) return false;
  const s = p.status;
  if (f.status === "unsolved" && s.state !== "unsolved") return false;
  if (f.status === "solved" && s.state === "unsolved") return false;
  if (f.status === "due" && !(s.state === "solved" && s.resolveDue)) return false;
  if (f.status === "resolved" && s.state !== "resolved") return false;
  const noted = p.noted || p.lcNotes;
  if (f.has === "notes" && !noted) return false;
  if (f.has === "code" && p.submissions === 0) return false;
  if (f.has === "none" && noted) return false;
  return true;
}

/** Roadmap problems matching the filters, each once, with the patterns it appears in (roadmap order). */
export function filterProblems(patterns: PatternView[], f: DsaFilters): { problem: ProblemView; patterns: string[] }[] {
  const byId = new Map<string, { problem: ProblemView; patterns: string[] }>();
  for (const pattern of patterns) {
    for (const p of pattern.items) {
      if (!matches(p, f)) continue;
      const hit = byId.get(p.id);
      if (hit) hit.patterns.push(pattern.name);
      else byId.set(p.id, { problem: p, patterns: [pattern.name] });
    }
  }
  return [...byId.values()];
}
