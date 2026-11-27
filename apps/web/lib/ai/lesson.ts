import { lessonToShape } from "@habit/shared";
import { getLesson } from "../content-repo/courses";
import { getAllConcepts, getAllExercises, getStudyArea } from "../content-repo/lookups";

/**
 * What the chat knows about a course lesson: title, area and the lesson text (concept lessons, system designs, LLD problems).
 * Reads the content database. Null if unknown. (Async since round B of plan 0114: callers must await it.)
 */
export async function lessonSource(id: string): Promise<{ title: string; area: string; material: string } | null> {
  const concept = (await getAllConcepts())[id];
  const exercise = (await getAllExercises())[id];
  const item = concept ?? exercise;
  if (!item) return null;
  const area = (await getStudyArea(item.area))?.title ?? item.area;
  const parts: string[] = [];

  const stored = await getLesson(id);
  const value = stored && stored.row.template !== "problem" ? lessonToShape(stored) : null;

  if (concept) {
    parts.push("What to know:", ...concept.points.map((p) => `- ${p}`));
    const lesson = value && "lesson" in value ? value.lesson : undefined;
    if (lesson) {
      if (lesson.overview) parts.push("", "Overview:", lesson.overview);
      if (lesson.explain.length) parts.push("", "Explanations:", ...lesson.explain);
      if (lesson.pitfalls?.length) parts.push("", "Common mistakes:", ...lesson.pitfalls.map((p) => `- ${p}`));
    }
    for (const s of (value && "lesson" in value ? value.extra?.deeper : undefined) ?? []) parts.push("", `${s.title}:`, s.body);
  } else if (exercise) {
    parts.push(`Focus: ${exercise.focus}`);
    const w = value && "walkthrough" in value ? value.walkthrough : undefined;
    if (w) {
      parts.push("", "Requirements:", ...w.requirements, "", "Estimates:", ...w.estimates, "", "API:", ...w.api, "", "Data:", ...w.data, "", "Design:", ...w.design);
      for (const d of w.deepDives) parts.push("", `${d.title}:`, d.body);
      parts.push("", "Trade-offs:", ...w.tradeoffs);
    }
    const g = value && "guide" in value && "entities" in value.guide ? value.guide : undefined; // LLD guides (not pattern guides)
    if (g) parts.push("", "Requirements:", ...g.requirements, "", "Entities:", ...g.entities, "", "Patterns:", ...g.patterns, "", "Extensions:", ...g.extensions);
  }
  return { title: item.title, area, material: parts.join("\n") };
}
