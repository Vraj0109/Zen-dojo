import "server-only";
import { eq, isNotNull } from "drizzle-orm";
import {
  ALL_CONCEPTS,
  ALL_EXERCISES,
  CATEGORIES,
  PROBLEMS,
  addDays,
  bestStreak,
  currentStreak,
  evaluateBadges,
  heatmap,
  levelInfo,
  perfectWeeks,
  toLocalDate,
  type Category,
  type StudyAreaId,
} from "@habit/shared";
import { getDb } from "./db";
import { focusByDay } from "./timer";
import { getDsaView } from "./dsa";
import { conceptProgress, leetcodeProblems, practiceSessions, problemSolves, tasks } from "./schema";

/** Which plan category a study area's XP counts toward. Core CS isn't a plan category, so it's "other". */
const AREA_CATEGORY: Record<StudyAreaId, Category> = { sd: "sd", lld: "beh_lld", core: "other" };

/** Days of history the balance meter looks at. */
export const BALANCE_DAYS = 28;

interface Event {
  on: string;
  xp: number;
  category: Category;
  minutes: number;
}

async function events(): Promise<Event[]> {
  const db = await getDb();
  const [t, s, p, c] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.status, "done")),
    db.select().from(problemSolves),
    db.select().from(practiceSessions),
    db.select().from(conceptProgress).where(isNotNull(conceptProgress.coveredOn)),
  ]);
  return [
    ...t.flatMap((r) => (r.doneOn ? [{ on: r.doneOn, xp: r.xp, category: r.category as Category, minutes: r.minutes ?? 0 }] : [])),
    ...s.map((r) => ({ on: r.solvedOn, xp: r.xp, category: "dsa" as Category, minutes: 0 })),
    ...p.map((r) => ({ on: r.practicedOn, xp: r.xp, category: AREA_CATEGORY[ALL_EXERCISES[r.itemId]?.area ?? "core"], minutes: r.minutes ?? 0 })),
    ...c.map((r) => ({ on: r.coveredOn!, xp: r.xp, category: AREA_CATEGORY[ALL_CONCEPTS[r.conceptId]?.area ?? "core"], minutes: 0 })),
  ];
}

export async function getStats() {
  const today = toLocalDate();
  const db = await getDb();
  const [ev, dsa, solves, extras, practice, covered, allTasks, focus] = await Promise.all([
    events(),
    getDsaView(),
    db.select({ problemId: problemSolves.problemId, kind: problemSolves.kind }).from(problemSolves),
    db.select({ slug: leetcodeProblems.slug, difficulty: leetcodeProblems.difficulty }).from(leetcodeProblems),
    db.selectDistinct({ itemId: practiceSessions.itemId }).from(practiceSessions),
    db.select({ id: conceptProgress.conceptId }).from(conceptProgress).where(isNotNull(conceptProgress.coveredOn)),
    db.select({ date: tasks.date, scope: tasks.scope, status: tasks.status }).from(tasks),
    focusByDay(),
  ]);

  const xpByDay = new Map<string, number>();
  for (const e of ev) xpByDay.set(e.on, (xpByDay.get(e.on) ?? 0) + e.xp);
  const activeDays = [...new Set(ev.map((e) => e.on))];
  const totalXp = ev.reduce((a, e) => a + e.xp, 0);
  const level = levelInfo(totalXp);

  // Balance: share of recent XP per plan category, against the plan's targets.
  const since = addDays(today, -(BALANCE_DAYS - 1));
  const recent = ev.filter((e) => e.on >= since && e.on <= today);
  const recentXp = recent.reduce((a, e) => a + e.xp, 0);
  const balance = (Object.keys(CATEGORIES) as Category[])
    .map((cat) => {
      const xp = recent.filter((e) => e.category === cat).reduce((a, e) => a + e.xp, 0);
      return { category: cat, label: cat === "other" ? "Core CS + other" : CATEGORIES[cat].label, xp, share: recentXp ? xp / recentXp : 0, target: CATEGORIES[cat].target };
    })
    .filter((b) => b.target > 0 || b.xp > 0);

  const extraDifficulty = new Map(extras.map((e) => [`lcx-${e.slug}`, e.difficulty]));
  const firstSolves = new Set(solves.filter((s) => s.kind === "solve").map((s) => s.problemId));
  const hardSolved = [...firstSolves].filter((id) => (PROBLEMS[id]?.difficulty ?? extraDifficulty.get(id)) === "hard").length;
  const practicedIn = (area: StudyAreaId) => practice.filter((p) => ALL_EXERCISES[p.itemId]?.area === area).length;

  const badges = evaluateBadges({
    solved: firstSolves.size,
    hardSolved,
    resolved: solves.filter((s) => s.kind === "resolve").length,
    bestStreak: bestStreak(activeDays),
    groupsCovered: dsa.groups.filter((g) => g.covered === g.patterns.length).length,
    designsPracticed: practicedIn("sd"),
    lldPracticed: practicedIn("lld"),
    conceptsCovered: covered.filter((c) => ALL_CONCEPTS[c.id]).length,
    perfectWeeks: perfectWeeks(allTasks),
    level: level.level,
  });

  return {
    today,
    totals: {
      totalXp,
      level,
      streak: currentStreak(activeDays, today),
      bestStreak: bestStreak(activeDays),
      activeDays: activeDays.filter((d) => d <= today).length,
      hours: Math.round(((ev.reduce((a, e) => a + e.minutes, 0) + focus.reduce((a, f) => a + f.minutes, 0)) / 60) * 10) / 10,
    },
    heatmap: heatmap(xpByDay, today, 16),
    balance,
    recentXp,
    badges,
  };
}
