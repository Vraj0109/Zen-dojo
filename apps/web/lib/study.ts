import "server-only";
import { and, desc, eq } from "drizzle-orm";
import {
  CONCEPT_XP,
  COVERED_CONFIDENCE,
  averageScore,
  conceptReviewDue,
  lessonToShape,
  practiceState,
  toLocalDate,
  type Lesson,
  type LessonExtra,
  type PracticeState,
  type StudyArea,
} from "@habit/shared";
import { getDb } from "./db";
import { getNote, getNotedIds } from "./notes";
import { getLesson } from "./content-repo/courses";
import { getAllConcepts, getAllExercises, getStudyArea, getStudyAreas } from "./content-repo/lookups";
import { conceptProgress, practiceSessions } from "./schema";

export const PRACTICE_LIMITS = { notes: 5000, link: 500, minutes: 600 } as const;

export type ConceptRow = typeof conceptProgress.$inferSelect;
export type PracticeRow = typeof practiceSessions.$inferSelect;

/** A lesson from the content database in its learn/ shape: a concept, a design, an LLD or a pattern value. */
export type LessonShape = ReturnType<typeof lessonToShape>;
export type ConceptShape = Extract<LessonShape, { lesson: unknown }>;
export type DesignShape = Extract<LessonShape, { walkthrough: unknown }>;
export type LldShape = Extract<LessonShape, { guide: { entities: unknown } }>;

/** Narrow a lesson shape to one kind (the value from getLessonValue, or null). */
export const asConceptShape = (v: LessonShape | null): ConceptShape | undefined => (v && "lesson" in v ? v : undefined);
export const asDesignShape = (v: LessonShape | null): DesignShape | undefined => (v && "walkthrough" in v ? v : undefined);
export const asLldShape = (v: LessonShape | null): LldShape | undefined => (v && "guide" in v && "entities" in v.guide ? (v as LldShape) : undefined);

/** One lesson from the content database in its learn/ shape, or null. Pages read the old fields from it. */
export async function getLessonValue(id: string): Promise<LessonShape | null> {
  const lesson = await getLesson(id);
  if (!lesson || lesson.row.template === "problem") return null;
  return lessonToShape(lesson);
}

/** Go-deeper section titles for each concept id, read from the content database. */
export async function deeperTitlesFor(ids: string[]): Promise<Record<string, string[]>> {
  const pairs = await Promise.all(
    ids.map(async (id) => {
      const v = asConceptShape(await getLessonValue(id));
      return [id, v?.extra?.deeper.map((s) => s.title) ?? []] as const;
    }),
  );
  return Object.fromEntries(pairs);
}

/** Minutes to read a concept (same formula as the shared readingMinutes, but given the lesson text as an argument). */
export function readingMinutesOf(lesson: Lesson | undefined, extra: LessonExtra | undefined): number {
  if (!lesson) return 0;
  const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
  const prose = [lesson.overview, ...lesson.explain, ...(extra?.recap ?? []), ...(extra?.deeper.map((s) => s.body) ?? []), ...lesson.questions, ...(lesson.pitfalls ?? [])];
  const code = extra?.deeper.map((s) => s.code ?? "") ?? [];
  return Math.max(1, Math.round((prose.reduce((a, t) => a + words(t), 0) + code.reduce((a, t) => a + words(t), 0) * 2) / 200));
}

/** Latest practice per item (date + score), and session counts/minutes. */
async function practiceIndex() {
  const db = await getDb();
  const rows = await db.select().from(practiceSessions).orderBy(practiceSessions.practicedOn, practiceSessions.id);
  const last = new Map<string, { on: string; score: number }>();
  const count = new Map<string, number>();
  for (const r of rows) {
    last.set(r.itemId, { on: r.practicedOn, score: r.score });
    count.set(r.itemId, (count.get(r.itemId) ?? 0) + 1);
  }
  return { rows, last, count };
}

async function conceptIndex() {
  const db = await getDb();
  return new Map((await db.select().from(conceptProgress)).map((r) => [r.conceptId, r]));
}

export interface ConceptView {
  id: string;
  title: string;
  points: string[];
  confidence: number;
  checked: number;
  reviewDue: boolean;
  hasNotes: boolean;
}

export interface ExerciseView {
  id: string;
  title: string;
  focus: string;
  tag?: string;
  sessions: number;
  practice: PracticeState;
  noted: boolean;
}

/** Everything the area page needs. */
export async function getStudyView(areaId: string) {
  const area = await getStudyArea(areaId);
  if (!area) return null;
  const today = toLocalDate();
  const [concepts, practice, noted] = await Promise.all([conceptIndex(), practiceIndex(), getNotedIds()]);

  const sections = area.sections.map((s) => ({
    ...s,
    concepts: s.concepts.map((concept): ConceptView => {
      const p = concepts.get(concept.id);
      return {
        ...concept,
        confidence: p?.confidence ?? 0,
        checked: p?.checked.filter((i) => i >= 0 && i < concept.points.length).length ?? 0,
        reviewDue: conceptReviewDue(p?.confidence ?? 0, p?.updatedOn, today),
        hasNotes: !!p?.notes.trim(),
      };
    }),
  }));
  const exercises = (area.exercises?.items ?? []).map(
    (e): ExerciseView => ({
      ...e,
      sessions: practice.count.get(e.id) ?? 0,
      practice: practiceState(practice.last.get(e.id), today),
      noted: noted.has(e.id),
    }),
  );

  const allConcepts = sections.flatMap((s) => s.concepts);
  const rated = allConcepts.filter((x) => x.confidence > 0);
  const ids = new Set([...allConcepts.map((x) => x.id), ...exercises.map((e) => e.id)]);
  const areaRows = practice.rows.filter((r) => ids.has(r.itemId));

  return {
    area,
    sections,
    exercises,
    due: {
      concepts: allConcepts.filter((x) => x.reviewDue),
      exercises: exercises.filter((e) => e.practice.state === "practiced" && e.practice.due),
    },
    totals: {
      concepts: allConcepts.length,
      points: allConcepts.reduce((a, x) => a + x.points.length, 0),
      pointsChecked: allConcepts.reduce((a, x) => a + x.checked, 0),
      covered: allConcepts.filter((x) => x.confidence >= COVERED_CONFIDENCE).length,
      avgConfidence: rated.length ? Math.round((rated.reduce((a, x) => a + x.confidence, 0) / rated.length) * 10) / 10 : 0,
      exercises: exercises.length,
      practiced: exercises.filter((e) => e.sessions > 0).length,
      sessions: areaRows.length,
      minutes: areaRows.reduce((a, r) => a + (r.minutes ?? 0), 0),
      xp:
        areaRows.reduce((a, r) => a + r.xp, 0) +
        allConcepts.reduce((a, x) => a + (concepts.get(x.id)?.xp ?? 0), 0),
    },
  };
}

export async function getConceptDetail(id: string) {
  const concept = (await getAllConcepts())[id];
  if (!concept) return null;
  const db = await getDb();
  const progress = (await db.query.conceptProgress.findFirst({ where: eq(conceptProgress.conceptId, id) })) ?? null;
  return { kind: "concept" as const, concept, area: (await getStudyArea(concept.area))!, progress };
}

/** Save confidence, ticked points and notes. Reaching "covered" the first time earns CONCEPT_XP. */
export async function saveConcept(id: string, input: { confidence: number; checked: number[]; notes: string }) {
  const concept = (await getAllConcepts())[id];
  if (!concept) return;
  const db = await getDb();
  const today = toLocalDate();
  const confidence = Number.isInteger(input.confidence) ? Math.min(5, Math.max(0, input.confidence)) : 0;
  const checked = [...new Set(input.checked)].filter((i) => Number.isInteger(i) && i >= 0 && i < concept.points.length).sort((a, b) => a - b);
  const notes = input.notes.slice(0, 20_000);
  const existing = await db.query.conceptProgress.findFirst({ where: eq(conceptProgress.conceptId, id) });
  const newlyCovered = confidence >= COVERED_CONFIDENCE && !existing?.coveredOn;
  const row = {
    confidence,
    checked,
    notes,
    updatedOn: today,
    ...(newlyCovered ? { coveredOn: today, xp: CONCEPT_XP } : {}),
  };
  await db.insert(conceptProgress).values({ conceptId: id, ...row }).onConflictDoUpdate({ target: conceptProgress.conceptId, set: row });
}

/** Change only the confidence (from the review queue), keeping ticked points and notes. */
export async function rateConcept(id: string, confidence: number) {
  if (!(await getAllConcepts())[id]) return;
  const db = await getDb();
  const existing = await db.query.conceptProgress.findFirst({ where: eq(conceptProgress.conceptId, id) });
  await saveConcept(id, { confidence, checked: existing?.checked ?? [], notes: existing?.notes ?? "" });
}

export async function getExerciseDetail(id: string) {
  const exercise = (await getAllExercises())[id];
  if (!exercise) return null;
  const db = await getDb();
  const area = (await getStudyArea(exercise.area))!;
  const [sessions, note] = await Promise.all([
    db.select().from(practiceSessions).where(eq(practiceSessions.itemId, id)).orderBy(desc(practiceSessions.practicedOn), desc(practiceSessions.id)),
    getNote(id),
  ]);
  const latest = sessions[0];
  return {
    kind: "exercise" as const,
    exercise,
    area: area as StudyArea & { exercises: NonNullable<StudyArea["exercises"]> },
    sessions,
    practice: practiceState(latest && { on: latest.practicedOn, score: latest.score }, toLocalDate()),
    note,
  };
}

/**
 * Log a practice session. Needs at least one step score (1-5). XP is given for the first session of
 * an item on a day, so logging twice doesn't double it. Returns false if nothing was saved.
 */
export async function logPractice(
  id: string,
  input: { minutes: number | null; scores: Record<string, number>; notes: string; link: string },
): Promise<boolean> {
  const exercise = (await getAllExercises())[id];
  const area = exercise && (await getStudyArea(exercise.area));
  if (!exercise || !area?.exercises) return false;
  const stepIds = new Set(area.exercises.steps.map((s) => s.id));
  const scores = Object.fromEntries(Object.entries(input.scores).filter(([k, v]) => stepIds.has(k) && Number.isInteger(v) && v >= 1 && v <= 5));
  const score = averageScore(scores);
  if (score === null) return false;

  const db = await getDb();
  const today = toLocalDate();
  const already = await db.query.practiceSessions.findFirst({
    where: and(eq(practiceSessions.itemId, id), eq(practiceSessions.practicedOn, today)),
  });
  const minutes = input.minutes !== null && Number.isInteger(input.minutes) && input.minutes > 0 ? Math.min(input.minutes, PRACTICE_LIMITS.minutes) : null;
  const link = /^https?:\/\//i.test(input.link.trim()) ? input.link.trim().slice(0, PRACTICE_LIMITS.link) : null;
  await db.insert(practiceSessions).values({
    itemId: id,
    practicedOn: today,
    minutes,
    scores,
    score,
    notes: input.notes.slice(0, PRACTICE_LIMITS.notes),
    link,
    xp: already ? 0 : area.exercises.xp,
  });
  return true;
}

export async function deletePractice(sessionId: number) {
  const db = await getDb();
  await db.delete(practiceSessions).where(eq(practiceSessions.id, sessionId));
}

/** Study items waiting for review, per area (shown on the Today page). */
export async function getStudyDue(): Promise<{ area: StudyArea; count: number }[]> {
  const today = toLocalDate();
  const [concepts, practice, allConcepts, allExercises, areas] = await Promise.all([conceptIndex(), practiceIndex(), getAllConcepts(), getAllExercises(), getStudyAreas()]);
  const counts = new Map<string, number>();
  const bump = (area: string) => counts.set(area, (counts.get(area) ?? 0) + 1);
  for (const [id, r] of concepts) if (allConcepts[id] && conceptReviewDue(r.confidence, r.updatedOn, today)) bump(allConcepts[id].area);
  for (const [id, last] of practice.last) {
    const s = practiceState(last, today);
    if (allExercises[id] && s.state === "practiced" && s.due) bump(allExercises[id].area);
  }
  return areas.flatMap((area) => (counts.get(area.id) ? [{ area, count: counts.get(area.id)! }] : []));
}
