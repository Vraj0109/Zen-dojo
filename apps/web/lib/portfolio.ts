import "server-only";
import { inArray, isNotNull } from "drizzle-orm";
import { ALL_CONCEPTS, STUDY_AREAS, TOTAL_WEEKS, toLocalDate, type CourseProgress, type PortfolioData } from "@habit/shared";
import { getDb } from "./db";
import { getDsaView } from "./dsa";
import { getStats } from "./stats";
import { getPlanPosition } from "./tasks";
import { getProfileName } from "./ui-prefs";
import { conceptProgress, problemSolves } from "./schema";

const latest = (dates: (string | null | undefined)[]): string | null => dates.reduce<string | null>((a, d) => (d && (!a || d > a) ? d : a), null);

/**
 * Public-safe snapshot of progress: name, numbers, course titles and dates only.
 * Never include notes, code, emails or keys here: this object is exported and shown on the public page.
 */
export async function getPortfolio(): Promise<PortfolioData> {
  const db = await getDb();
  const [name, stats, dsa, position, concepts] = await Promise.all([
    getProfileName(),
    getStats(),
    getDsaView(),
    getPlanPosition(),
    db.select({ id: conceptProgress.conceptId, on: conceptProgress.coveredOn }).from(conceptProgress).where(isNotNull(conceptProgress.coveredOn)),
  ]);

  const coveredOn = new Map(concepts.map((c) => [c.id, c.on]));
  const areaCourses: CourseProgress[] = STUDY_AREAS.map((area) => {
    const ids = area.sections.flatMap((s) => s.concepts.map((c) => c.id)).filter((id) => ALL_CONCEPTS[id]);
    const covered = ids.filter((id) => coveredOn.has(id));
    return {
      id: area.id,
      title: area.title,
      kind: "area" as const,
      done: covered.length,
      total: ids.length,
      completedOn: ids.length > 0 && covered.length >= ids.length ? latest(covered.map((id) => coveredOn.get(id))) : null,
    };
  });

  // DSA patterns with problems: done = solved roadmap problems of the pattern; date = latest solve when complete.
  const patterns = dsa.groups.flatMap((g) => g.patterns).filter((p) => p.items.length > 0);
  const problemIds = [...new Set(patterns.flatMap((p) => p.items.map((i) => i.id)))];
  const solveRows = problemIds.length
    ? await db.select({ id: problemSolves.problemId, on: problemSolves.solvedOn, kind: problemSolves.kind }).from(problemSolves).where(inArray(problemSolves.problemId, problemIds))
    : [];
  const solvedDates = new Map<string, string[]>();
  for (const r of solveRows) if (r.kind === "solve") solvedDates.set(r.id, [...(solvedDates.get(r.id) ?? []), r.on]);

  const patternCourses: CourseProgress[] = patterns.map((p) => {
    const solved = p.items.filter((i) => i.status.state !== "unsolved");
    const complete = solved.length >= p.items.length;
    return {
      id: `pattern-${p.id}`,
      title: `DSA: ${p.name}`,
      kind: "pattern" as const,
      done: solved.length,
      total: p.items.length,
      completedOn: complete ? latest(p.items.flatMap((i) => solvedDates.get(i.id) ?? [])) : null,
    };
  });

  const planWeeksDone = position.finished ? TOTAL_WEEKS : position.history.length;
  const planCourse: CourseProgress = {
    id: "plan",
    title: `${TOTAL_WEEKS}-week interview plan`,
    kind: "plan",
    done: planWeeksDone,
    total: TOTAL_WEEKS,
    completedOn: position.finished ? (position.history.find((h) => h.week === TOTAL_WEEKS)?.end ?? latest(position.history.map((h) => h.end))) : null,
  };

  // Difficulty split over every distinct solved problem (roadmap items, then extras from LeetCode).
  const split = { easy: 0, medium: 0, hard: 0 };
  const seen = new Set<string>();
  for (const i of patterns.flatMap((p) => p.items)) {
    if (i.status.state === "unsolved" || seen.has(i.id)) continue;
    seen.add(i.id);
    if (i.difficulty) split[i.difficulty]++;
  }
  for (const e of dsa.extras) if (e.difficulty === "easy" || e.difficulty === "medium" || e.difficulty === "hard") split[e.difficulty]++;

  return {
    name,
    level: stats.totals.level.level,
    xp: stats.totals.totalXp,
    streak: stats.totals.streak,
    bestStreak: stats.totals.bestStreak,
    totalSolved: dsa.totals.allSolvedAnywhere,
    solvedByDifficulty: split,
    planWeeksDone,
    courses: [planCourse, ...areaCourses, ...patternCourses],
    generatedOn: toLocalDate(),
  };
}
