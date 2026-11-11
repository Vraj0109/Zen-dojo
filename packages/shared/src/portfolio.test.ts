import { describe, expect, it } from "vitest";
import { certificateCourses, certificateId, cleanPortfolioName, isCourseComplete, longDate, renderPortfolioHtml, type PortfolioData } from "./portfolio";

const course = (over: Partial<Parameters<typeof isCourseComplete>[0]> = {}) => ({ id: "sd", title: "System design", kind: "area" as const, done: 3, total: 3, completedOn: "2026-11-01", ...over });

describe("portfolio", () => {
  it("completes only when total > 0 and done >= total", () => {
    expect(isCourseComplete(course())).toBe(true);
    expect(isCourseComplete(course({ done: 2 }))).toBe(false);
    expect(isCourseComplete(course({ total: 0, done: 0 }))).toBe(false);
  });

  it("certificate ids are stable, 12 uppercase hex, and depend on every input", () => {
    const a = certificateId("Ada", "sd", "2026-11-01");
    expect(a).toMatch(/^[0-9A-F]{12}$/);
    expect(certificateId("Ada", "sd", "2026-11-01")).toBe(a);
    expect(certificateId("Bob", "sd", "2026-11-01")).not.toBe(a);
    expect(certificateId("Ada", "lld", "2026-11-01")).not.toBe(a);
    expect(certificateId("Ada", "sd", "2026-11-02")).not.toBe(a);
  });

  it("only complete, dated courses get certificates", () => {
    const list = [course(), course({ id: "x", done: 1 }), course({ id: "y", completedOn: null })];
    expect(certificateCourses(list).map((c) => c.id)).toEqual(["sd"]);
  });

  it("cleans names", () => {
    expect(cleanPortfolioName("  A\u0000da \n Lovelace ")).toBe("A da Lovelace");
    expect(cleanPortfolioName("")).toBe("Learner");
    expect(cleanPortfolioName("x".repeat(200))).toHaveLength(60);
  });

  it("formats dates without timezone shifts", () => {
    expect(longDate("2026-11-01")).toBe("1 November 2026");
    expect(longDate("nope")).toBe("nope");
  });

  it("renders a script-free page and escapes text", () => {
    const d: PortfolioData = {
      name: "<script>alert(1)</script>",
      level: 3,
      xp: 120,
      streak: 4,
      bestStreak: 9,
      totalSolved: 12,
      solvedByDifficulty: { easy: 5, medium: 6, hard: 1 },
      planWeeksDone: 2,
      courses: [course({ title: "A & <b>B</b>" })],
      generatedOn: "2026-11-11",
    };
    const html = renderPortfolioHtml(d);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Certificates");
    expect(html).toContain("12");
  });
});
