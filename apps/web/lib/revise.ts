import "server-only";
import { eq } from "drizzle-orm";
import { COVERED_CONFIDENCE, currentPhase, daysUntil, lessonToShape, practiceState, toLocalDate, type PlanPhase, type QuizCard, type StudyAreaId } from "@habit/shared";
import { getDoc } from "@/lib/content-repo/docs";
import { getLesson, listCourses } from "@/lib/content-repo/courses";
import { getAllConcepts, getAllPatterns, getDsaGroups, getRoadmapProblems, getStudyAreas } from "@/lib/content-repo/lookups";
import { getDb } from "./db";
import { getDsaView } from "./dsa";
import { conceptProgress, practiceSessions, settings } from "./schema";
import { openStruggles } from "./struggles";

// Quick revise: the interview date, and your weak spots across DSA, design, LLD and core CS.

const INTERVIEW_KEY = "interview_date";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A single-value content doc (id "main") as its old constant's value, or the fallback when the doc is missing. */
export async function docValue<T>(kind: string, fallback: T): Promise<T> {
  const doc = await getDoc(kind, "main");
  return doc ? (doc.row.body as T) : fallback;
}

export async function getInterviewDate(): Promise<string | null> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(settings.key, INTERVIEW_KEY) });
  return row && DATE_RE.test(row.value) ? row.value : null;
}

/** Set (YYYY-MM-DD) or clear (empty string) the interview date. Returns false for bad input. */
export async function setInterviewDate(input: string): Promise<boolean> {
  const db = await getDb();
  if (input === "") {
    await db.delete(settings).where(eq(settings.key, INTERVIEW_KEY));
    return true;
  }
  if (!DATE_RE.test(input) || Number.isNaN(new Date(input).getTime())) return false;
  await db.insert(settings).values({ key: INTERVIEW_KEY, value: input }).onConflictDoUpdate({ target: settings.key, set: { value: input } });
  return true;
}

/** Days left and the current phase of the last-days plan, or null without a date. */
export async function getCountdown() {
  const date = await getInterviewDate();
  if (!date) return null;
  const daysLeft = daysUntil(toLocalDate(), date);
  return { date, daysLeft, phase: currentPhase(daysLeft, await docValue<PlanPhase[]>("revise-plan", [])) };
}

export interface ReviseConcept {
  id: string;
  title: string;
  section: string;
  confidence: number;
  recap: string[];
}

export interface ReviseExercise {
  id: string;
  title: string;
  lastScore: number | null;
  recap: string[];
  /** The LLD guide's patterns, for LLD exercises; null otherwise */
  lldPatterns: string[] | null;
}

export interface RevisePattern {
  id: string;
  name: string;
  group: string;
  recognize: string;
  solved: number;
  target: number;
  stuck: number;
  recap: string[];
  /** Your saved template, if any */
  template: string | null;
  language: string | null;
}

/** What a lesson page holds that Quick revise shows. */
export interface LessonFacts {
  recap: string[];
  lldPatterns: string[] | null;
}

type ShapeLike = { extra?: { recap?: string[] }; guide?: { recap?: string[]; patterns?: string[] } };

/**
 * Recap lines and LLD patterns per lesson id (concepts, designs, LLD problems and DSA pattern guides). Lesson ids are the
 * keys the old LESSON_EXTRA, WALKTHROUGH_EXTRA, LLD_EXTRA, LLD_GUIDES and PATTERN_GUIDES were keyed by.
 */
export async function getLessonFacts(): Promise<Map<string, LessonFacts>> {
  const outlines = await listCourses();
  const ids = outlines.flatMap((o) => o.lessons.filter((l) => l.template !== "problem").map((l) => l.id));
  const lessons = await Promise.all(ids.map((id) => getLesson(id)));
  const facts = new Map<string, LessonFacts>();
  for (const lesson of lessons) {
    if (!lesson) continue;
    const shape = lessonToShape(lesson) as ShapeLike;
    facts.set(lesson.row.id, {
      recap: shape.extra?.recap ?? shape.guide?.recap ?? [],
      lldPatterns: lesson.row.template === "lld" ? (shape.guide?.patterns ?? null) : null,
    });
  }
  return facts;
}

/** Per-area revision lists with your confidence and scores. */
export async function getReviseAreas() {
  const db = await getDb();
  const today = toLocalDate();
  const [progressRows, sessions, studyAreas, facts] = await Promise.all([
    db.select().from(conceptProgress),
    db.select().from(practiceSessions).orderBy(practiceSessions.practicedOn, practiceSessions.id),
    getStudyAreas(),
    getLessonFacts(),
  ]);
  const confidence = new Map(progressRows.map((r) => [r.conceptId, r.confidence]));
  const last = new Map<string, { on: string; score: number }>();
  for (const s of sessions) last.set(s.itemId, { on: s.practicedOn, score: s.score });

  const areas = studyAreas.map((a) => ({
    id: a.id as StudyAreaId,
    title: a.title,
    concepts: a.sections.flatMap((s) =>
      s.concepts.map(
        (c): ReviseConcept => ({ id: c.id, title: c.title, section: s.title, confidence: confidence.get(c.id) ?? 0, recap: facts.get(c.id)?.recap ?? [] }),
      ),
    ),
    exercises: (a.exercises?.items ?? []).map((e): ReviseExercise => {
      const p = practiceState(last.get(e.id), today);
      const f = facts.get(e.id);
      return {
        id: e.id,
        title: e.title,
        lastScore: p.state === "practiced" ? p.score : null,
        recap: f?.recap ?? [],
        lldPatterns: f?.lldPatterns ?? null,
      };
    }),
  }));
  return areas;
}

export async function getRevisePatterns(): Promise<RevisePattern[]> {
  const [view, struggles, allPatterns, groups, facts] = await Promise.all([getDsaView(), openStruggles(), getAllPatterns(), getDsaGroups(), getLessonFacts()]);
  const stuckByPattern = new Map<string, number>();
  for (const p of allPatterns) stuckByPattern.set(p.id, p.problems.filter((id) => struggles.has(id)).length);
  return view.groups.flatMap((g) =>
    g.patterns.map((p) => ({
      id: p.id,
      name: p.name,
      group: groups.find((x) => x.id === g.id)!.title,
      recognize: p.recognize,
      solved: p.solved,
      target: p.target,
      stuck: stuckByPattern.get(p.id) ?? 0,
      recap: facts.get(p.id)?.recap ?? [],
      template: p.note?.template || null,
      language: p.note?.language || null,
    })),
  );
}

export interface WeakSpots {
  concepts: (ReviseConcept & { area: StudyAreaId })[];
  exercises: (ReviseExercise & { area: StudyAreaId })[];
  patterns: RevisePattern[];
  stuck: { id: string; title: string; reason: string; count: number }[];
}

/** What to revise first: low confidence, low or missing practice scores, uncovered patterns, the stuck list. */
export async function getWeakSpots(): Promise<WeakSpots> {
  const [areas, patterns, struggles, roadmap] = await Promise.all([getReviseAreas(), getRevisePatterns(), openStruggles(), getRoadmapProblems()]);
  const concepts = areas
    .flatMap((a) => a.concepts.map((c) => ({ ...c, area: a.id })))
    .filter((c) => c.confidence < COVERED_CONFIDENCE)
    .sort((x, y) => x.confidence - y.confidence);
  const exercises = areas
    .flatMap((a) => a.exercises.map((e) => ({ ...e, area: a.id })))
    .filter((e) => e.lastScore === null || e.lastScore <= 3)
    .sort((x, y) => (x.lastScore ?? -1) - (y.lastScore ?? -1));
  const weakPatterns = patterns
    .filter((p) => p.solved < p.target || p.stuck > 0)
    .sort((x, y) => y.stuck - x.stuck || x.solved / x.target - y.solved / y.target);
  const stuck = [...struggles.values()]
    .sort((x, y) => y.count - x.count)
    .map((s) => ({ id: s.problemId, title: roadmap[s.problemId]?.title ?? s.problemId.replace(/^lcx-/, ""), reason: s.reason, count: s.count }));
  return { concepts, exercises, patterns: weakPatterns, stuck };
}

/** Concept ids below "covered", for a quiz on weak spots only. */
export async function weakConceptIds(): Promise<Set<string>> {
  const db = await getDb();
  const [rows, concepts] = await Promise.all([db.select().from(conceptProgress), getAllConcepts()]);
  const strong = new Set(rows.filter((r) => r.confidence >= COVERED_CONFIDENCE).map((r) => r.conceptId));
  return new Set(Object.keys(concepts).filter((id) => !strong.has(id)));
}

/**
 * Quiz cards for an area ("all" for every area), optionally only those about the given item ids. Same rule as the shared
 * quizCards(), but over the deck read from the database (the shared helper reads its own constant).
 */
export async function quizCardsFor(area: StudyAreaId | "all", onlyItems?: Set<string>): Promise<QuizCard[]> {
  const deck = await docValue<QuizCard[]>("quiz-deck", []);
  return deck.filter((c) => (area === "all" || c.area === area) && (!onlyItems || onlyItems.has(c.itemId)));
}
