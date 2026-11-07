import { describe, expect, it } from "vitest";
import { ALL_PATTERNS } from "../dsa";
import { READING } from "../reading";
import { ALL_CONCEPTS, ALL_EXERCISES, STUDY_AREAS } from "../study";
import { LESSON_EXTRA, LESSONS, LLD_EXTRA, LLD_GUIDES, PATTERN_GUIDES, WALKTHROUGH_EXTRA, WALKTHROUGHS } from "./index";

describe("learning content", () => {
  it("has a lesson for every concept, with one explanation per checklist point", () => {
    for (const [id, concept] of Object.entries(ALL_CONCEPTS)) {
      const l = LESSONS[id];
      expect(l, `lesson for ${id}`).toBeDefined();
      expect(l.explain.length, `${id}: ${concept.points.length} points`).toBe(concept.points.length);
      expect(l.overview.length).toBeGreaterThan(80);
      expect(l.questions.length).toBeGreaterThan(0);
    }
    expect(Object.keys(LESSONS).sort()).toEqual(Object.keys(ALL_CONCEPTS).sort());
  });

  it("has a walkthrough for every design and a guide for every LLD problem", () => {
    const sd = STUDY_AREAS.find((a) => a.id === "sd")!.exercises!.items.map((e) => e.id);
    const lld = STUDY_AREAS.find((a) => a.id === "lld")!.exercises!.items.map((e) => e.id);
    expect(Object.keys(WALKTHROUGHS).sort()).toEqual([...sd].sort());
    expect(Object.keys(LLD_GUIDES).sort()).toEqual([...lld].sort());
    for (const w of Object.values(WALKTHROUGHS)) {
      expect(w.requirements.length && w.design.length && w.deepDives.length && w.tradeoffs.length).toBeTruthy();
    }
    for (const g of Object.values(LLD_GUIDES)) expect(g.code).toContain("class ");
  });

  it("reading list entries are unique, https, and point at real items", () => {
    const ids = READING.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of READING) {
      expect(r.url, r.id).toMatch(/^https:\/\//);
      for (const item of r.items) expect(item in ALL_CONCEPTS || item in ALL_EXERCISES, `${r.id} → ${item}`).toBe(true);
    }
  });

  it("has a complete guide for every DSA pattern", () => {
    expect(Object.keys(PATTERN_GUIDES).sort()).toEqual(ALL_PATTERNS.map((p) => p.id).sort());
    for (const [id, g] of Object.entries(PATTERN_GUIDES)) {
      expect(g.idea.length, id).toBeGreaterThan(80);
      expect(g.signals.length, id).toBeGreaterThanOrEqual(2);
      expect(g.steps.length, id).toBeGreaterThanOrEqual(2);
      expect(g.template.split("\n").length, id).toBeGreaterThanOrEqual(8);
      expect(g.variations.length, id).toBeGreaterThanOrEqual(2);
      expect(g.recap.length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it("has deeper material and recap lines for every concept, design and LLD problem", () => {
    expect(Object.keys(LESSON_EXTRA).sort()).toEqual(Object.keys(ALL_CONCEPTS).sort());
    for (const [id, x] of Object.entries(LESSON_EXTRA)) {
      expect(x.recap.length, id).toBeGreaterThanOrEqual(3);
      expect(x.deeper.length, id).toBeGreaterThanOrEqual(2);
      for (const s of x.deeper) expect(s.body.length + (s.code?.length ?? 0), `${id}: ${s.title}`).toBeGreaterThan(200);
    }
    expect(Object.keys(WALKTHROUGH_EXTRA).sort()).toEqual(Object.keys(WALKTHROUGHS).sort());
    for (const [id, x] of Object.entries(WALKTHROUGH_EXTRA)) {
      expect(x.recap.length, id).toBeGreaterThanOrEqual(3);
      expect(x.followUps.length, id).toBeGreaterThanOrEqual(3);
    }
    expect(Object.keys(LLD_EXTRA).sort()).toEqual(Object.keys(LLD_GUIDES).sort());
    for (const [id, x] of Object.entries(LLD_EXTRA)) {
      expect(x.recap.length && x.flow.length >= 3 && x.edgeCases.length >= 3, id).toBeTruthy();
    }
  });
});
