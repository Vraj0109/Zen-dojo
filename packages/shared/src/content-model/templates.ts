// Page templates (plan 0112, "Page format"). A template lists the slots of one page kind in display order. The page
// renderer walks the slots, so headings always come out in this order whatever the admin stores inside a slot.
// Headings follow docs/content-editing.md. Pure data; no I/O.
import type { BlockType, ContentPage, SlotDef, TemplateDef, TemplateId } from "./types";

const TEXT: BlockType[] = ["markdown"];
const RICH: BlockType[] = ["markdown", "code", "diagram", "image"];
const DIAGRAM: BlockType[] = ["diagram"];
const CODE: BlockType[] = ["code"];

function slot(
  key: string,
  heading: string,
  purpose: string,
  required: boolean,
  sections: SlotDef["sections"],
  allowedBlocks: BlockType[],
  rules: string[],
): SlotDef {
  return { key, heading, purpose, required, sections, allowedBlocks, rules };
}

/** Every page kind. Keys are the slot keys stored in page_sections.slot ("point" is stored as "point:N"). */
export const TEMPLATES: Record<TemplateId, TemplateDef> = {
  concept: {
    id: "concept",
    title: "Concept lesson",
    slots: [
      slot("overview", "Overview", "What this is and what an interviewer wants to hear.", true, "one", TEXT, [
        "Two to four sentences.",
      ]),
      slot("point", "What to know", "One explanation per checklist point of the concept, in checklist order.", true, "indexed", TEXT, [
        "One section per checklist point; the section title is the checklist text.",
        "A second paragraph is a second Markdown block.",
      ]),
      slot("recap", "Recap", "Lines worth remembering the night before.", false, "one", TEXT, ["3-6 short lines."]),
      slot("deeper", "Go deeper", "Worked examples, comparisons and mechanisms, each with a title.", false, "many", RICH, [
        "Prose first, then at most one diagram, then at most one code block (house style).",
      ]),
      slot("questions", "Interview questions", "Questions an interviewer might ask; answer them out loud.", true, "one", TEXT, [
        "One question per block.",
      ]),
      slot("mistakes", "Common mistakes", "Gotchas and common mistakes.", false, "one", TEXT, ["One gotcha per block."]),
    ],
  },

  design: {
    id: "design",
    title: "System design walkthrough",
    slots: [
      slot("requirements", "Requirements", "Functional and non-functional requirements.", true, "one", TEXT, ["One requirement per block."]),
      slot("estimates", "Estimates", "Back-of-the-envelope numbers.", true, "one", TEXT, ["Show the arithmetic."]),
      slot("api", "API", "The main calls.", true, "one", TEXT, ["One endpoint or call per block."]),
      slot("data", "Data model", "Storage choices and the main records.", true, "one", TEXT, ["One decision per block."]),
      slot("design", "High-level design", "Components and the main read and write paths.", true, "one", TEXT, [
        "One component or path per block.",
      ]),
      slot("diagrams", "Diagrams", "Mermaid diagrams of the design.", false, "many", DIAGRAM, ["Each diagram has a title."]),
      slot("dives", "Deep dives", "Short deep dives, each with a title.", false, "many", TEXT, ["Each dive has a title."]),
      slot("deep", "Deep sections", "Longer sections: reasoning, failure modes, numbers.", false, "many", RICH, [
        "Include a failure-modes section.",
      ]),
      slot("tradeoffs", "Trade-offs", "What was given up and why.", true, "one", TEXT, ["One trade-off per block."]),
      slot("recap", "Recap", "Key numbers and decisions to remember.", false, "one", TEXT, ["2-6 short lines."]),
      slot("follow-ups", "Follow-up questions", "Interviewer follow-ups, each with a short answer.", false, "many", TEXT, [
        "Title is the question; the block is the answer.",
      ]),
    ],
  },

  lld: {
    id: "lld",
    title: "Low-level design answer",
    slots: [
      slot("requirements", "Requirements", "What the system must do.", true, "one", TEXT, ["One requirement per block."]),
      slot("entities", "Entities", "The main classes and their roles.", true, "one", TEXT, ["One entity per block."]),
      slot("patterns", "Patterns", "Design patterns used and why.", true, "one", TEXT, ["One pattern per block."]),
      slot("code", "Reference code", "Java sketch of the core classes.", true, "one", CODE, ["One code block, Java."]),
      slot("extensions", "Extensions", "How the design grows.", true, "one", TEXT, ["One extension per block."]),
      slot("walkthrough", "Walkthrough", "The long explanation around the project.", false, "many", RICH, [
        "Each section has a title.",
      ]),
      slot("diagrams", "Diagrams", "Class, sequence and state diagrams.", false, "many", DIAGRAM, [
        "Titles are class, sequence or state.",
      ]),
      slot("extra-diagrams", "More diagrams", "Decision flows, extra sequences, extension maps.", false, "many", DIAGRAM, [
        "Each diagram has a title.",
      ]),
      slot("concurrency", "Concurrency", "Thread safety and locking.", false, "one", TEXT, ["One point per block."]),
      slot("recap", "Recap", "Lines to remember.", false, "one", TEXT, ["2-6 short lines."]),
      slot("flow", "Traced flow", "One main use case traced step by step.", false, "one", TEXT, ["One step per block."]),
      slot("edge-cases", "Edge cases and tests", "Edge cases and tests worth naming.", false, "one", TEXT, ["One case per block."]),
    ],
  },

  pattern: {
    id: "pattern",
    title: "DSA pattern guide",
    slots: [
      slot("idea", "Idea", "The idea of the pattern in a few sentences.", true, "one", TEXT, ["Say what it trades."]),
      slot("signals", "Signals", "Words and constraints that point to the pattern.", true, "one", TEXT, ["One signal per block."]),
      slot("steps", "Steps", "The steps of the pattern.", true, "one", TEXT, ["One step per block."]),
      slot("template", "Template", "C++ template of the pattern.", true, "one", CODE, ["One C++ code block."]),
      slot("complexity", "Complexity", "Time and space of the template.", true, "one", TEXT, ["One line."]),
      slot("variations", "Variations", "Twists on the pattern, naming problems.", false, "one", TEXT, ["One variation per block."]),
      slot("pitfalls", "Pitfalls and edge cases", "Gotchas.", false, "one", TEXT, ["One pitfall per block."]),
      slot("recap", "Recap", "2-4 lines for Quick revise.", false, "one", TEXT, ["2-4 short lines."]),
    ],
  },

  article: {
    id: "article",
    title: "DSA pattern article",
    slots: [
      slot("intro", "Intro", "2-4 sentences: what the pattern solves and when to reach for it.", true, "one", TEXT, [
        "Two to four sentences.",
      ]),
      slot("sections", "Sections", "The fixed outline: intuition, why it works, worked example, implementation, variants, complexity, pitfalls, practice order.", false, "many", RICH, [
        "Titles follow the outline in learn/types.ts (PatternArticle).",
        "Code is C++17 and self-contained.",
      ]),
    ],
  },

  problem: {
    id: "problem",
    title: "Practice problem",
    slots: [
      slot("statement", "Problem statement", "What the problem asks, with its examples written in the statement text.", true, "one", RICH, [
        "Plain text paragraphs; no backticks.",
      ]),
      slot("solution", "Solution", "Walkthrough sections, the brute force code and the optimal code.", true, "many", RICH, [
        "Walkthrough sections keep their order; code blocks are language tabs.",
      ]),
    ],
  },
};

/** The template for a page kind (the name templateFor is taken by judge/templates.ts). */
export function pageTemplate(id: TemplateId): TemplateDef {
  return TEMPLATES[id];
}

/** The slot key of a stored slot: "point:3" → "point", "deeper" → "deeper". */
export function slotKey(stored: string): string {
  const i = stored.indexOf(":");
  return i < 0 ? stored : stored.slice(0, i);
}

/** Problems with the page against the template. An empty list means the page fits. */
export function validatePageAgainstTemplate(template: TemplateDef, page: ContentPage): string[] {
  const errors: string[] = [];
  if (page.template !== template.id) errors.push(`page is ${page.template}, template is ${template.id}`);
  const byKey = new Map(template.slots.map((s) => [s.key, s]));
  const counts = new Map<string, number>();
  for (const sec of page.sections) {
    const key = slotKey(sec.slot);
    const def = byKey.get(key);
    if (!def) {
      errors.push(`unknown slot "${sec.slot}"`);
      continue;
    }
    if (def.sections === "indexed") {
      if (!new RegExp(`^${key}:\\d+$`).test(sec.slot)) errors.push(`slot "${sec.slot}" must be "${key}:N"`);
    } else if (sec.slot !== key) {
      errors.push(`slot "${sec.slot}" must be "${key}"`);
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
    for (const b of sec.blocks) {
      if (!def.allowedBlocks.includes(b.type)) errors.push(`${sec.slot}: block type "${b.type}" is not allowed`);
    }
  }
  for (const def of template.slots) {
    const n = counts.get(def.key) ?? 0;
    if (def.required && n === 0) errors.push(`required slot "${def.key}" is missing`);
    if (def.sections === "one" && n > 1) errors.push(`slot "${def.key}" takes one section, has ${n}`);
  }
  return errors;
}
