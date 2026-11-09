import { DESIGN_DEEP, LESSON_EXTRA, LLD_DEEP, PATTERN_ARTICLES } from "./index";
import type { Section } from "./types";

/** Every diagram in the learning content, with where it lives (used by the diagram tests). Plans 0013-0015 add sources. */
export function allDiagrams(): { where: string; source: string }[] {
  const out: { where: string; source: string }[] = [];
  const fromSections = (prefix: string, sections: Section[]) => {
    for (const s of sections) if (s.diagram !== undefined) out.push({ where: `${prefix}/${s.title}`, source: s.diagram });
  };
  for (const [id, x] of Object.entries(LESSON_EXTRA)) fromSections(`lesson ${id}`, x.deeper);
  for (const [id, a] of Object.entries(PATTERN_ARTICLES)) fromSections(`pattern ${id}`, a.sections);
  for (const [id, d] of Object.entries(LLD_DEEP)) {
    out.push({ where: `lld ${id}/class`, source: d.classDiagram }, { where: `lld ${id}/sequence`, source: d.sequenceDiagram });
    for (const x of d.extraDiagrams ?? []) out.push({ where: `lld ${id}/${x.title}`, source: x.source });
    if (d.stateDiagram) out.push({ where: `lld ${id}/state`, source: d.stateDiagram });
    fromSections(`lld ${id}`, d.walkthrough);
  }
  for (const [id, d] of Object.entries(DESIGN_DEEP)) {
    for (const x of d.diagrams) out.push({ where: `design ${id}/${x.title}`, source: x.source });
    fromSections(`design ${id}`, d.sections);
  }
  return out;
}
