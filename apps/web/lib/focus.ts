import "server-only";
import {
  ALL_CONCEPTS,
  ALL_EXERCISES,
  CONFIDENCE_LABELS,
  COVERED_CONFIDENCE,
  DSA_GROUPS,
  PLAN_WEEKS,
  TOTAL_WEEKS,
  studyHref,
  weekFocus,
  type PlanWeek,
  parseWeekKey,
} from "@habit/shared";
import { getDsaView, type ProblemView } from "./dsa";
import type { Task } from "./schema";
import { getStudyView, type ConceptView, type ExerciseView } from "./study";

// Where each piece of a week's work lives in the app, with your progress on it.

export interface FocusItem {
  id: string;
  title: string;
  href: string;
  /** e.g. "2/4 solved", "Shaky", "Practiced 2×" */
  detail: string;
  done: boolean;
  kind: "pattern" | "concept" | "exercise";
}

export interface NextProblem {
  id: string;
  title: string;
  href: string;
  difficulty?: ProblemView["difficulty"];
}

export interface WeekFocusView {
  weekNo: number;
  week: PlanWeek;
  dsa: { items: FocusItem[]; href: string; next: NextProblem | null };
  sd: { items: FocusItem[]; next: FocusItem | null };
  lld: { items: FocusItem[]; next: FocusItem | null };
}

const patternGroup = new Map(DSA_GROUPS.flatMap((g) => g.patterns.map((p) => [p.id, g.id] as const)));
export const patternHref = (id: string) => `/dsa?group=${patternGroup.get(id) ?? "none"}#p-${id}`;

function studyItem(id: string, concepts: Map<string, ConceptView>, exercises: Map<string, ExerciseView>): FocusItem | null {
  const area = (ALL_CONCEPTS[id] ?? ALL_EXERCISES[id])?.area;
  if (!area) return null;
  const c = concepts.get(id);
  if (c) {
    return {
      id,
      title: c.title,
      href: studyHref(area, id),
      detail: c.confidence ? CONFIDENCE_LABELS[c.confidence] : "Not started",
      done: c.confidence >= COVERED_CONFIDENCE,
      kind: "concept",
    };
  }
  const e = exercises.get(id);
  if (!e) return null;
  const due = e.practice.state === "practiced" && e.practice.due;
  return {
    id,
    title: e.title,
    href: studyHref(area, id),
    detail: e.sessions === 0 ? "Not practiced" : `Practiced ${e.sessions}×${due ? " · due again" : ""}`,
    done: e.sessions > 0 && !due,
    kind: "exercise",
  };
}

/** A plan week's patterns, concepts and designs with your progress, plus the next thing to open. */
export async function getWeekFocus(weekNo: number): Promise<WeekFocusView> {
  const n = Math.min(Math.max(weekNo, 1), TOTAL_WEEKS);
  const focus = weekFocus(n);
  const [dsa, sd, lld] = await Promise.all([getDsaView(), getStudyView("sd"), getStudyView("lld")]);

  const patterns = new Map(dsa.groups.flatMap((g) => g.patterns).map((p) => [p.id, p]));
  const dsaItems: FocusItem[] = focus.patterns.flatMap((id) => {
    const p = patterns.get(id);
    return p ? [{ id, title: p.name, href: patternHref(id), detail: `${p.solved}/${p.target} solved`, done: p.covered, kind: "pattern" as const }] : [];
  });
  const nextProblem = focus.patterns
    .flatMap((id) => patterns.get(id)?.items ?? [])
    .find((p) => p.status.state === "unsolved" && !p.premium);

  const concepts = new Map([...(sd?.sections ?? []), ...(lld?.sections ?? [])].flatMap((s) => s.concepts).map((c) => [c.id, c]));
  const exercises = new Map([...(sd?.exercises ?? []), ...(lld?.exercises ?? [])].map((e) => [e.id, e]));
  const items = (ids: string[]) => ids.flatMap((id) => studyItem(id, concepts, exercises) ?? []);
  const sdItems = items(focus.sd);
  const lldItems = items(focus.lld);

  return {
    weekNo: n,
    week: PLAN_WEEKS[n - 1],
    dsa: {
      items: dsaItems,
      href: focus.patterns.length ? patternHref(focus.patterns[0]) : `/dsa?${focus.dsaFilter ?? ""}`,
      next: nextProblem
        ? { id: nextProblem.id, title: `${nextProblem.number ? `${nextProblem.number}. ` : ""}${nextProblem.title}`, href: `/dsa/${encodeURIComponent(nextProblem.id)}`, difficulty: nextProblem.difficulty }
        : null,
    },
    sd: { items: sdItems, next: sdItems.find((i) => !i.done) ?? null },
    lld: { items: lldItems, next: lldItems.find((i) => !i.done) ?? null },
  };
}

export interface TaskLink {
  href: string;
  label: string;
}

/** Where a task's "Start" button goes: the specific problem, concept or design for this week where possible. */
export function taskLink(
  task: Pick<Task, "templateKey" | "category">,
  focus: WeekFocusView,
  due: { resolve: number; reviews?: number },
): TaskLink | null {
  const dsaNext: TaskLink = focus.dsa.next ? { href: focus.dsa.next.href, label: `Next: ${focus.dsa.next.title}` } : { href: focus.dsa.href, label: "Open problems" };
  const sdNext = (prefer?: FocusItem["kind"]): TaskLink => {
    const item = (prefer && focus.sd.items.find((i) => !i.done && i.kind === prefer)) || focus.sd.next;
    return item ? { href: item.href, label: item.title } : { href: "/study/sd", label: "System design" };
  };
  switch (parseWeekKey(task.templateKey)?.key ?? task.templateKey) {
    case "dsa-warmup":
      return due.resolve > 0 ? { href: "/dsa?tab=resolve", label: `${due.resolve} re-solve${due.resolve === 1 ? "" : "s"} due` } : dsaNext;
    case "timed-set":
      return { href: "/dsa/boss", label: "Start boss fight" };
    case "deep-block":
      return sdNext();
    case "design-session":
      return sdNext("exercise");
    case "review":
      if (due.reviews) return { href: "/review", label: `${due.reviews} review${due.reviews === 1 ? "" : "s"} due` };
      return { href: "/dsa?has=notes", label: "Your notes" };
    case "week-dsa":
      return { href: focus.dsa.href, label: "Patterns" };
    case "week-sd":
      return sdNext();
    case "week-other":
      return focus.lld.next ? { href: focus.lld.next.href, label: focus.lld.next.title } : null;
    case null:
      return task.category === "dsa"
        ? { href: "/dsa", label: "DSA" }
        : task.category === "sd"
          ? { href: "/study/sd", label: "System design" }
          : task.category === "beh_lld"
            ? { href: "/study/lld", label: "LLD" }
            : null;
    default:
      return null;
  }
}
