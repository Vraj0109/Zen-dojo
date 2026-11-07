import { describe, expect, it } from "vitest";
import { READING } from "../reading";
import { ALL_CONCEPTS, ALL_EXERCISES, STUDY_AREAS } from "../study";
import { LESSONS, LLD_GUIDES, WALKTHROUGHS } from "./index";

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
});
