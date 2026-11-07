import "server-only";
import { eq } from "drizzle-orm";
import {
  ALL_CONCEPTS,
  ALL_PATTERNS,
  COVERED_CONFIDENCE,
  DSA_GROUPS,
  LESSON_EXTRA,
  LLD_EXTRA,
  PATTERN_GUIDES,
  PROBLEMS,
  STUDY_AREAS,
  WALKTHROUGH_EXTRA,
  currentPhase,
  daysUntil,
  practiceState,
  toLocalDate,
  type StudyAreaId,
} from "@habit/shared";
import { getDb } from "./db";
import { getDsaView } from "./dsa";
import { conceptProgress, practiceSessions, settings } from "./schema";
import { openStruggles } from "./struggles";

// Quick revise: the interview date, and your weak spots across DSA, design, LLD and core CS.

const INTERVIEW_KEY = "interview_date";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  return { date, daysLeft, phase: currentPhase(daysLeft) };
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

/** Per-area revision lists with your confidence and scores. */
export async function getReviseAreas() {
  const db = await getDb();
  const today = toLocalDate();
  const [progressRows, sessions] = await Promise.all([db.select().from(conceptProgress), db.select().from(practiceSessions).orderBy(practiceSessions.practicedOn, practiceSessions.id)]);
  const confidence = new Map(progressRows.map((r) => [r.conceptId, r.confidence]));
  const last = new Map<string, { on: string; score: number }>();
  for (const s of sessions) last.set(s.itemId, { on: s.practicedOn, score: s.score });

  const areas = STUDY_AREAS.map((a) => ({
    id: a.id as StudyAreaId,
    title: a.title,
    concepts: a.sections.flatMap((s) =>
      s.concepts.map(
        (c): ReviseConcept => ({ id: c.id, title: c.title, section: s.title, confidence: confidence.get(c.id) ?? 0, recap: LESSON_EXTRA[c.id]?.recap ?? [] }),
      ),
    ),
    exercises: (a.exercises?.items ?? []).map((e): ReviseExercise => {
      const p = practiceState(last.get(e.id), today);
      return {
        id: e.id,
        title: e.title,
        lastScore: p.state === "practiced" ? p.score : null,
        recap: WALKTHROUGH_EXTRA[e.id]?.recap ?? LLD_EXTRA[e.id]?.recap ?? [],
      };
    }),
  }));
  return areas;
}

export async function getRevisePatterns(): Promise<RevisePattern[]> {
  const [view, struggles] = await Promise.all([getDsaView(), openStruggles()]);
  const stuckByPattern = new Map<string, number>();
  for (const p of ALL_PATTERNS) stuckByPattern.set(p.id, p.problems.filter((id) => struggles.has(id)).length);
  return view.groups.flatMap((g) =>
    g.patterns.map((p) => ({
      id: p.id,
      name: p.name,
      group: DSA_GROUPS.find((x) => x.id === g.id)!.title,
      recognize: p.recognize,
      solved: p.solved,
      target: p.target,
      stuck: stuckByPattern.get(p.id) ?? 0,
      recap: PATTERN_GUIDES[p.id]?.recap ?? [],
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
  const [areas, patterns, struggles] = await Promise.all([getReviseAreas(), getRevisePatterns(), openStruggles()]);
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
    .map((s) => ({ id: s.problemId, title: PROBLEMS[s.problemId]?.title ?? s.problemId.replace(/^lcx-/, ""), reason: s.reason, count: s.count }));
  return { concepts, exercises, patterns: weakPatterns, stuck };
}

/** Concept ids below "covered", for a quiz on weak spots only. */
export async function weakConceptIds(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.select().from(conceptProgress);
  const strong = new Set(rows.filter((r) => r.confidence >= COVERED_CONFIDENCE).map((r) => r.conceptId));
  return new Set(Object.keys(ALL_CONCEPTS).filter((id) => !strong.has(id)));
}
