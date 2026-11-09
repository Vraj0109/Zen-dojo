import { describe, expect, it } from "vitest";
import { generatedIsCurrent, parseLesson } from "../../../../../scripts/build-content.mjs";
import { ALL_CONCEPTS } from "../../study";
import { LESSON_EXTRA, LESSONS, TS_EXTRA, TS_LESSONS } from "../index";
import { GENERATED_LESSONS } from "./lessons";

const F = "`".repeat(3);

const SAMPLE = `---
id: demo-concept
title: Demo
area: lld
section: Topics
---

## Overview

One line about the topic.

## What to know

1. First point :: Its explanation.

   A second paragraph of the explanation.

2. Second point :: Another explanation.

## Recap

- Remember this.

## Go deeper

### Later section {point: 1}

Text about the second point.

### Early section {point: 0}

Text about the first point.

${F}mermaid
flowchart LR
  A --> B
${F}
Diagram caption: A to B

${F}java
class A {}
// ## not a heading
${F}

### Closing section

No point, so it comes last.

## Interview questions

- What is it?
- Why?

## Common mistakes

- Doing it wrong,
  over two lines.
`;

describe("parseLesson", () => {
  const l = parseLesson(SAMPLE, "demo.md");

  it("reads front matter, points and explanations", () => {
    expect([l.id, l.title, l.area, l.section]).toEqual(["demo-concept", "Demo", "lld", "Topics"]);
    expect(l.points).toEqual(["First point", "Second point"]);
    expect(l.lesson.explain[0]).toBe("Its explanation.\n\n   A second paragraph of the explanation.");
    expect(l.lesson.overview).toBe("One line about the topic.");
  });

  it("orders sub-sections by point, then file order, with unpointed ones last", () => {
    expect(l.deeper.map((s: { title: string }) => s.title)).toEqual(["Early section", "Later section", "Closing section"]);
    expect(l.deeper[0].point).toBe(0);
  });

  it("reads the diagram, caption and code block of a section", () => {
    const early = l.deeper[0];
    expect(early.diagram).toBe("flowchart LR\n  A --> B");
    expect(early.diagramCaption).toBe("A to B");
    expect(early.lang).toBe("java");
    expect(early.code).toBe("class A {}\n// ## not a heading");
    expect(early.body).toBe("Text about the first point.");
  });

  it("reads lists and joins continuation lines", () => {
    expect(l.recap).toEqual(["Remember this."]);
    expect(l.lesson.questions).toEqual(["What is it?", "Why?"]);
    expect(l.lesson.pitfalls).toEqual(["Doing it wrong, over two lines."]);
  });
});

describe("parseLesson errors name the file, the line and the fix", () => {
  const bad = (src: string) => {
    try {
      parseLesson(src, "x.md");
    } catch (e) {
      return (e as Error).message;
    }
    return "no error";
  };

  it("missing front matter", () => expect(bad("## Overview\n")).toMatch(/^x\.md:1: .*front matter.*How to fix/s));
  it("unknown heading", () => expect(bad(SAMPLE.replace("## Recap", "## Summary"))).toMatch(/x\.md:\d+: unknown section "## Summary".*How to fix/s));
  it("point without ' :: '", () => expect(bad(SAMPLE.replace("First point :: ", "First point "))).toMatch(/has no " :: ".*How to fix/s));
  it("point number out of range", () => expect(bad(SAMPLE.replace("{point: 1}", "{point: 5}"))).toMatch(/\{point: 5\} but the lesson has only 2 points/));
  it("text after a code block", () => expect(bad(SAMPLE.replace("class A {}", "class A {}\n" + F + "\nstray text\n" + F + "java"))).toMatch(/two code blocks|text after/));
  it("duplicate section titles", () => expect(bad(SAMPLE.replace("### Closing section", "### Early section"))).toMatch(/two sections are titled "Early section"/));
  it("unclosed fence", () => expect(bad(SAMPLE + "\n" + F + "java\nx\n")).toMatch(/never closed/));
});

describe("generated lessons", () => {
  it("the generated file matches the .md files (run pnpm content:build if this fails)", () => {
    expect(generatedIsCurrent()).toBe(true);
  });

  it("every generated lesson matches its concept in study.ts", () => {
    for (const [id, g] of Object.entries(GENERATED_LESSONS)) {
      const c = ALL_CONCEPTS[id];
      expect(c, `${id} is not a concept in study.ts`).toBeDefined();
      expect(g.points, `${id}: points differ from study.ts`).toEqual(c.points);
      expect(g.lesson.explain.length).toBe(c.points.length);
      expect(g.area).toBe(c.area);
      expect(g.title).toBe(c.title);
    }
  });

  it("generated lessons win over the TypeScript ones", () => {
    for (const [id, g] of Object.entries(GENERATED_LESSONS)) {
      expect(LESSONS[id]).toEqual(g.lesson);
      expect(LESSON_EXTRA[id].deeper.map((s) => s.title)).toEqual(g.deeper.map((s) => s.title));
    }
  });

  // Temporary guard (plan 0023 step 4): while a migrated lesson still has its old TypeScript entry, the two must say the
  // same thing, otherwise a later edit of the TypeScript text would be hidden by the Markdown. Delete this test together
  // with the old entries once the TypeScript copies are removed.
  it("migrated lessons still match their old TypeScript entries", () => {
    const stale: string[] = [];
    for (const [id, g] of Object.entries(GENERATED_LESSONS)) {
      const ts = TS_LESSONS[id];
      if (!ts) continue;
      const tsx = TS_EXTRA[id];
      const same =
        JSON.stringify({ ...g.lesson, pitfalls: g.lesson.pitfalls ?? [] }) === JSON.stringify({ overview: ts.overview.trim(), explain: ts.explain.map((e) => e.trim()), questions: ts.questions, pitfalls: ts.pitfalls ?? [] }) &&
        JSON.stringify(g.recap) === JSON.stringify(tsx?.recap ?? []) &&
        JSON.stringify(g.deeper.map((d) => [d.title, d.body, d.code, d.lang || undefined, d.diagram, d.diagramCaption || undefined])) ===
          JSON.stringify((tsx?.deeper ?? []).map((d) => [d.title, d.body.trim(), d.code, d.lang || undefined, d.diagram, d.diagramCaption || undefined]));
      if (!same) stale.push(id);
    }
    expect(stale, "these lessons differ from their old TypeScript entry: copy the TypeScript change into content/<area>/<id>.md (re-run MIGRATE=<id>), or delete the old entry").toEqual([]);
  });
});
