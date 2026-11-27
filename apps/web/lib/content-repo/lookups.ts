import "server-only";
import type { Concept, Exercise, PatternGroup, Pattern, Problem, StudyArea, StudyAreaId } from "@habit/shared";
import { getDoc } from "./docs";
import { listCourses } from "./courses";

// Shared lookups for round B of plan 0114 (written by the lead). They return the SAME shapes as the old constants in
// @habit/shared (STUDY_AREAS, ALL_CONCEPTS, ALL_EXERCISES, PROBLEMS, DSA_GROUPS, ALL_PATTERNS), rebuilt from the content
// database, so a caller changes `CONST` to `await getX()` and nothing else. The underlying reads are cached with tags
// (courses.ts, docs.ts); these functions only reshape them, so they are not cached again.

/** STUDY_AREAS: the study areas with their sections, concepts (title + checklist points) and exercises. */
export async function getStudyAreas(): Promise<StudyArea[]> {
  const courses = await listCourses();
  const areas: StudyArea[] = [];
  for (const { row, lessons } of courses) {
    const data = row.data as {
      short?: string;
      sections?: { id: string; title: string; weeks: string | null; concepts: string[] }[];
      exercises?: StudyArea["exercises"] | null;
    };
    if (!data.sections) continue; // the dsa-patterns course and any course that is not a study area
    const byId = new Map(lessons.map((l) => [l.id, l]));
    const area: StudyArea = {
      id: row.id as StudyAreaId,
      title: row.title,
      short: data.short ?? row.title,
      intro: row.summaryMd,
      sections: data.sections.map((s) => ({
        id: s.id,
        title: s.title,
        ...(s.weeks ? { weeks: s.weeks } : {}),
        concepts: s.concepts.map((cid): Concept => {
          const l = byId.get(cid);
          return { id: cid, title: l?.title ?? cid, points: ((l?.meta as { points?: string[] } | undefined)?.points ?? []) as string[] };
        }),
      })),
      ...(data.exercises ? { exercises: data.exercises } : {}),
    };
    areas.push(area);
  }
  return areas;
}

export async function getStudyArea(id: string): Promise<StudyArea | undefined> {
  return (await getStudyAreas()).find((a) => a.id === id);
}

/** ALL_CONCEPTS: every concept by id, with its area and its section's title (as in study.ts). */
export async function getAllConcepts(): Promise<Record<string, Concept & { area: StudyAreaId; section: string }>> {
  const out: Record<string, Concept & { area: StudyAreaId; section: string }> = {};
  for (const a of await getStudyAreas()) for (const s of a.sections) for (const c of s.concepts) out[c.id] = { ...c, area: a.id, section: s.title };
  return out;
}

/** ALL_EXERCISES: every practice exercise by id, with its area. */
export async function getAllExercises(): Promise<Record<string, Exercise & { area: StudyAreaId }>> {
  const out: Record<string, Exercise & { area: StudyAreaId }> = {};
  for (const a of await getStudyAreas()) for (const e of a.exercises?.items ?? []) out[e.id] = { ...e, area: a.id };
  return out;
}

/** PROBLEMS: the DSA roadmap list by id (doc kind "dsa-problems"). */
export async function getRoadmapProblems(): Promise<Record<string, Problem>> {
  const doc = await getDoc("dsa-problems", "main");
  return ((doc?.row.body as Record<string, Problem> | undefined) ?? {}) as Record<string, Problem>;
}

/** DSA_GROUPS: pattern groups with their patterns, in order (doc kind "dsa-groups"). */
export async function getDsaGroups(): Promise<PatternGroup[]> {
  const doc = await getDoc("dsa-groups", "main");
  return (doc?.row.body as PatternGroup[] | undefined) ?? [];
}

/** ALL_PATTERNS: every pattern, in group order. */
export async function getAllPatterns(): Promise<Pattern[]> {
  return (await getDsaGroups()).flatMap((g) => g.patterns);
}
