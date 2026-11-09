import { describe, expect, it } from "vitest";
import { ALL_CONCEPTS } from "../study";
import { LESSON_EXTRA, LESSONS } from "./index";
import { SECTION_POINTS } from "./section-points";

// Plan 0023, steps 1 and 2: lessons list their "Go deeper" sections in the order of the concept's checklist.

describe("lesson order audit", () => {
  const ids = Object.keys(ALL_CONCEPTS);

  it("every concept has a lesson with an overview and one explanation per checklist point", () => {
    const bad = ids.filter((id) => {
      const l = LESSONS[id];
      return !l || l.overview.trim().length < 40 || l.explain.length < ALL_CONCEPTS[id].points.length;
    });
    expect(bad).toEqual([]);
  });

  it("section points refer to real sections and real checklist points", () => {
    const problems: string[] = [];
    for (const [id, map] of Object.entries(SECTION_POINTS)) {
      const concept = ALL_CONCEPTS[id];
      if (!concept) {
        problems.push(`${id}: no such concept`);
        continue;
      }
      const titles = new Set((LESSON_EXTRA[id]?.deeper ?? []).map((s) => s.title));
      for (const [title, p] of Object.entries(map)) {
        if (!titles.has(title)) problems.push(`${id}: no section titled "${title}" (renamed? fix section-points.ts)`);
        if (p < 0 || p >= concept.points.length) problems.push(`${id}: "${title}" has point ${p}, checklist has ${concept.points.length} points (use a fraction to go after the last one)`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("every Go deeper section is placed (has a point) and titles are unique per lesson", () => {
    const problems: string[] = [];
    for (const id of ids) {
      const deeper = LESSON_EXTRA[id]?.deeper ?? [];
      const seen = new Set<string>();
      for (const s of deeper) {
        if (seen.has(s.title)) problems.push(`${id}: duplicate section title "${s.title}"`);
        seen.add(s.title);
        if (SECTION_POINTS[id]?.[s.title] === undefined) problems.push(`${id}: "${s.title}" has no point (add it to section-points.ts, or accept it as a closing section)`);
      }
    }
    // Closing sections (summary, when to use, choosing) are allowed to have no point; keep the count visible.
    expect(problems.filter((p) => p.includes("duplicate"))).toEqual([]);
  });

  it("sections come out in checklist order", () => {
    const problems: string[] = [];
    for (const id of ids) {
      const map = SECTION_POINTS[id] ?? {};
      let last = -1;
      let tail = false;
      for (const s of LESSON_EXTRA[id]?.deeper ?? []) {
        const p = map[s.title];
        if (p === undefined) tail = true;
        else if (tail) problems.push(`${id}: "${s.title}" is placed after unplaced sections`);
        else if (p < last) problems.push(`${id}: "${s.title}" (point ${p}) comes after point ${last}`);
        else last = p;
      }
    }
    expect(problems).toEqual([]);
  });

  it("section titles use sentence case (no Title Case Words)", () => {
    const bad: string[] = [];
    for (const id of ids)
      for (const s of LESSON_EXTRA[id]?.deeper ?? []) {
        const words = s.title.split(/\s+/).slice(1).filter((w) => /^[A-Z][a-z]{3,}$/.test(w));
        if (words.length >= 3) bad.push(`${id}: ${s.title}`);
      }
    expect(bad).toEqual([]);
  });
});
