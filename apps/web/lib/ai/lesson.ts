import { ALL_CONCEPTS, ALL_EXERCISES, LESSONS, LESSON_EXTRA, LLD_GUIDES, WALKTHROUGHS, getStudyArea } from "@habit/shared";

/** What the chat knows about a course lesson: title, area and the lesson text (concept lessons, system designs, LLD problems). Null if unknown. */
export function lessonSource(id: string): { title: string; area: string; material: string } | null {
  const concept = ALL_CONCEPTS[id];
  const exercise = ALL_EXERCISES[id];
  const item = concept ?? exercise;
  if (!item) return null;
  const area = getStudyArea(item.area)?.title ?? item.area;
  const parts: string[] = [];

  if (concept) {
    parts.push("What to know:", ...concept.points.map((p) => `- ${p}`));
    const lesson = LESSONS[id];
    if (lesson) {
      if (lesson.overview) parts.push("", "Overview:", lesson.overview);
      if (lesson.explain.length) parts.push("", "Explanations:", ...lesson.explain);
      if (lesson.pitfalls?.length) parts.push("", "Common mistakes:", ...lesson.pitfalls.map((p) => `- ${p}`));
    }
    for (const s of LESSON_EXTRA[id]?.deeper ?? []) parts.push("", `${s.title}:`, s.body);
  } else if (exercise) {
    parts.push(`Focus: ${exercise.focus}`);
    const w = WALKTHROUGHS[id];
    if (w) {
      parts.push("", "Requirements:", ...w.requirements, "", "Estimates:", ...w.estimates, "", "API:", ...w.api, "", "Data:", ...w.data, "", "Design:", ...w.design);
      for (const d of w.deepDives) parts.push("", `${d.title}:`, d.body);
      parts.push("", "Trade-offs:", ...w.tradeoffs);
    }
    const g = LLD_GUIDES[id];
    if (g) parts.push("", "Requirements:", ...g.requirements, "", "Entities:", ...g.entities, "", "Patterns:", ...g.patterns, "", "Extensions:", ...g.extensions);
  }
  return { title: item.title, area, material: parts.join("\n") };
}
