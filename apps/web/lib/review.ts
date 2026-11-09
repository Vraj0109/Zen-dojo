import "server-only";
import { inArray } from "drizzle-orm";
import { CONFIDENCE_LABELS, PROBLEMS, STUDY_AREAS, studyHref, type StudyAreaId } from "@habit/shared";
import { getDb } from "./db";
import { getDsaView } from "./dsa";
import { leetcodeProblems } from "./schema";
import { STRUGGLE_KINDS, openStruggles, type OpenStruggle } from "./struggles";
import { getStudyView } from "./study";

// One queue for everything due today: stuck problems, re-solves, shaky concepts and designs/LLD
// problems due for another practice. Ordered by what decays fastest.

interface Base {
  /** Problem, concept or exercise id */
  id: string;
  title: string;
  href: string;
  detail: string;
}

export type ReviewItem =
  | (Base & { kind: "struggle"; struggle: OpenStruggle; solved: boolean })
  | (Base & { kind: "resolve" })
  | (Base & { kind: "concept"; area: StudyAreaId; confidence: number })
  | (Base & { kind: "exercise"; area: StudyAreaId; score: number });

export const REVIEW_KIND_LABELS: Record<ReviewItem["kind"], string> = {
  struggle: "Stuck list",
  resolve: "Re-solve",
  concept: "Concept review",
  exercise: "Practice again",
};

const problemTitle = (id: string, extra: Map<string, { title: string; number: number | null }>) => {
  const p = PROBLEMS[id];
  if (p) return p.number ? `${p.number}. ${p.title}` : p.title;
  const e = extra.get(id);
  return e ? `${e.number ? `${e.number}. ` : ""}${e.title}` : id.replace(/^lcx-/, "");
};

export async function getReviewQueue(): Promise<ReviewItem[]> {
  const [dsa, struggles, ...areas] = await Promise.all([getDsaView(), openStruggles(), ...STUDY_AREAS.map((a) => getStudyView(a.id))]);
  const due = [...struggles.values()].filter((s) => s.due);

  // Titles for synced problems outside the roadmap list
  const slugs = due.filter((s) => !(s.problemId in PROBLEMS)).map((s) => s.problemId.replace(/^lcx-/, ""));
  const extra = new Map<string, { title: string; number: number | null }>();
  if (slugs.length) {
    const db = await getDb();
    for (const r of await db.select().from(leetcodeProblems).where(inArray(leetcodeProblems.slug, slugs))) {
      extra.set(`lcx-${r.slug}`, { title: r.title, number: r.number });
    }
  }
  const solvedIds = new Set([...dsa.groups.flatMap((g) => g.patterns.flatMap((p) => p.items)).filter((p) => p.status.state !== "unsolved").map((p) => p.id), ...dsa.extras.map((e) => e.problemId)]);

  const items: ReviewItem[] = [];
  for (const s of due) {
    items.push({
      kind: "struggle",
      id: s.problemId,
      title: problemTitle(s.problemId, extra),
      href: `/dsa/${encodeURIComponent(s.problemId)}`,
      detail: `${STRUGGLE_KINDS[s.kind]}${s.count > 1 ? ` (${s.count}×)` : ""}${s.reason ? `: ${s.reason}` : ""}`,
      struggle: s,
      solved: solvedIds.has(s.problemId),
    });
  }
  const struggling = new Set(due.map((s) => s.problemId));
  for (const p of dsa.due) {
    if (struggling.has(p.id)) continue;
    items.push({
      kind: "resolve",
      id: p.id,
      title: p.number ? `${p.number}. ${p.title}` : p.title,
      href: `/dsa/${encodeURIComponent(p.id)}`,
      detail: p.status.state === "solved" ? `Solved ${p.status.solvedOn}; solve it again cold` : "",
    });
  }
  for (const view of areas) {
    if (!view) continue;
    for (const c of view.due.concepts) {
      items.push({
        kind: "concept",
        id: c.id,
        title: c.title,
        href: studyHref(view.area.id, c.id),
        detail: `${view.area.title} · rated ${CONFIDENCE_LABELS[c.confidence]} · ${c.checked}/${c.points.length} points`,
        area: view.area.id,
        confidence: c.confidence,
      });
    }
  }
  for (const view of areas) {
    if (!view) continue;
    for (const e of view.due.exercises) {
      const score = e.practice.state === "practiced" ? e.practice.score : 0;
      items.push({
        kind: "exercise",
        id: e.id,
        title: e.title,
        href: studyHref(view.area.id, e.id),
        detail: `${view.area.title} · last scored ${score}/5`,
        area: view.area.id,
        score,
      });
    }
  }
  return items;
}

/** Move skipped items to the end, keeping their order. */
export function applySkips<T extends { kind: string; id: string }>(items: T[], skipped: string[]): T[] {
  const skip = new Set(skipped);
  const key = (i: T) => `${i.kind}:${i.id}`;
  return [...items.filter((i) => !skip.has(key(i))), ...items.filter((i) => skip.has(key(i)))];
}

export const DAILY_REVIEW_CAP = 5;

const KIND_PRIORITY: Record<ReviewItem["kind"], number> = {
  struggle: 0,
  resolve: 1,
  concept: 2,
  exercise: 3,
};

/**
 * Split review items into a capped list for today and an overflow backlog drawer.
 * Priority order: open struggles > earliest due re-solves > concepts > exercises.
 */
export function splitReviewQueue(
  items: ReviewItem[],
  cap: number = DAILY_REVIEW_CAP,
): { dueToday: ReviewItem[]; backlog: ReviewItem[] } {
  const safeCap = Math.max(0, cap);
  const sorted = [...items].sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);
  return {
    dueToday: sorted.slice(0, safeCap),
    backlog: sorted.slice(safeCap),
  };
}
