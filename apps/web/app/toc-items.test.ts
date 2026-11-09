import { describe, expect, it } from "vitest";
import { ALL_CONCEPTS, COVERED_CONFIDENCE, LESSON_EXTRA, STUDY_AREAS } from "@habit/shared";
import { conceptToc, courseOutline, deeperIds, flattenToc, markdownToc, slug } from "./toc-items";

describe("slug and ids", () => {
  it("makes readable anchors", () => {
    expect(slug("Open/closed + dependency inversion in one example")).toBe("open-closed-dependency-inversion-in-one-example");
    expect(slug("  CDNs, proxies & gateways: what sits where ")).toBe("cdns-proxies-and-gateways-what-sits-where");
  });
  it("keeps ids unique", () => {
    expect(deeperIds(["Same", "Same", "Other"])).toEqual(["deeper-same", "deeper-same-2", "deeper-other"]);
  });
});

describe("conceptToc", () => {
  it("lists every Go deeper sub-section as a child, in lesson order", () => {
    const titles = LESSON_EXTRA["lld-solid"].deeper.map((s) => s.title);
    const toc = conceptToc({ hasOverview: true, deeperTitles: titles, hasQuestions: true, hasPitfalls: true, hasReading: false });
    const deeper = toc.find((t) => t.id === "deeper");
    expect(deeper?.children?.map((c) => c.title)).toEqual(titles);
    expect(deeper?.children?.[0].title).toMatch(/Single responsibility/);
    expect(toc.map((t) => t.id)).toEqual(["overview", "what-to-know", "deeper", "interview-questions", "common-mistakes", "your-turn"]);
  });
  it("has no Go deeper entry when there are no sub-sections", () => {
    const toc = conceptToc({ hasOverview: false, deeperTitles: [], hasQuestions: false, hasPitfalls: false, hasReading: true });
    expect(toc.map((t) => t.id)).toEqual(["what-to-know", "your-turn", "reading"]);
  });
  it("flattens in page order", () => {
    const toc = conceptToc({ hasOverview: true, deeperTitles: ["A", "B"], hasQuestions: false, hasPitfalls: false, hasReading: false });
    expect(flattenToc(toc)).toEqual(["overview", "what-to-know", "deeper", "deeper-a", "deeper-b", "your-turn"]);
  });
});

describe("markdownToc", () => {
  it("turns ## into entries and ### into their children", () => {
    const md = "## One\n\ntext\n\n### One a\n\n### One b\n\n## Two\n\n```\n## not a heading\n```\n";
    const toc = markdownToc(md);
    expect(toc.map((t) => t.title)).toEqual(["One", "Two"]);
    expect(toc[0].children?.map((c) => c.title)).toEqual(["One a", "One b"]);
    expect(toc[0].id).toBe("md-one");
  });
});

describe("courseOutline", () => {
  const area = STUDY_AREAS.find((a) => a.id === "lld")!;
  const sections = area.sections.map((s) => ({ id: s.id, title: s.title, concepts: s.concepts.map((c) => ({ id: c.id, title: c.title, confidence: c.id === "lld-oop" ? COVERED_CONFIDENCE : 0 })) }));
  const tree = courseOutline({ areaId: "lld", currentId: "lld-solid", sections, coveredAt: COVERED_CONFIDENCE, deeper: (id) => LESSON_EXTRA[id]?.deeper.map((s) => s.title) ?? [] });
  const lessons = tree.flatMap((s) => s.lessons);

  it("has every lesson of the area as a real link", () => {
    expect(lessons.map((l) => l.id)).toEqual(Object.keys(ALL_CONCEPTS).filter((id) => ALL_CONCEPTS[id].area === "lld"));
    expect(lessons.every((l) => l.href === `/study/lld/${l.id}`)).toBe(true);
  });
  it("marks the current lesson, opens its section and marks covered lessons", () => {
    expect(lessons.filter((l) => l.current).map((l) => l.id)).toEqual(["lld-solid"]);
    expect(tree.filter((s) => s.open).length).toBe(1);
    expect(lessons.find((l) => l.id === "lld-oop")?.covered).toBe(true);
    expect(lessons.find((l) => l.id === "lld-solid")?.covered).toBe(false);
  });
  it("gives each lesson sub-section links that match the page anchors", () => {
    const solid = lessons.find((l) => l.id === "lld-solid")!;
    expect(solid.children[0].href).toMatch(/^\/study\/lld\/lld-solid#deeper-single-responsibility/);
    expect(solid.children.map((c) => c.id)).toEqual(deeperIds(LESSON_EXTRA["lld-solid"].deeper.map((s) => s.title)));
  });
});

describe("designDeepToc", () => {
  it("lists diagrams, the depth sections as children, and code", async () => {
    const { designDeepToc } = await import("./toc-items");
    const toc = designDeepToc({ diagrams: [{ title: "A" }], sections: [{ title: "Sizing, with the arithmetic" }, { title: "Failure modes" }], code: [{ name: "X.java" }] });
    expect(toc.map((t) => t.id)).toEqual(["design-diagrams", "design-depth", "design-code"]);
    expect(toc[1].children?.map((c) => c.id)).toEqual(["deeper-sizing-with-the-arithmetic", "deeper-failure-modes"]);
  });
});
