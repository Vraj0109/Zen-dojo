import { describe, expect, it } from "vitest";
import { ALL_PATTERNS, PROBLEMS } from "../dsa";
import { PATTERN_ARTICLES } from "./index";

// The outline every pattern article follows (plan 0007). Extra "Implementation: ..." and "Variants: ..." sections
// may follow their parent, but the eight required titles must appear in this order.
export const REQUIRED_SECTIONS = [
  "The intuition",
  "Why it works",
  "A worked example",
  "Implementation",
  "Variants",
  "Complexity",
  "Pitfalls and edge cases",
  "Practice order",
] as const;

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

describe("pattern articles", () => {
  it("only exist for real patterns", () => {
    const ids = new Set(ALL_PATTERNS.map((p) => p.id));
    for (const id of Object.keys(PATTERN_ARTICLES)) expect(ids.has(id), id).toBe(true);
  });

  for (const [id, article] of Object.entries(PATTERN_ARTICLES)) {
    describe(id, () => {
      it("follows the required outline, in order", () => {
        const titles = article.sections.map((s) => s.title);
        let from = 0;
        for (const required of REQUIRED_SECTIONS) {
          const at = titles.findIndex((t, i) => i >= from && t === required);
          expect(at, `${id}: missing "${required}" after position ${from} in ${JSON.stringify(titles)}`).toBeGreaterThanOrEqual(0);
          from = at + 1;
        }
        // anything else must be an "Implementation: ..." or "Variants: ..." sub-section, placed after its parent
        titles.forEach((t, i) => {
          if ((REQUIRED_SECTIONS as readonly string[]).includes(t)) return;
          const parent = t.startsWith("Implementation: ") ? "Implementation" : t.startsWith("Variants: ") ? "Variants" : null;
          expect(parent, `${id}: unexpected section "${t}"`).not.toBeNull();
          expect(titles.indexOf(parent!), `${id}: "${t}" must come after "${parent}"`).toBeLessThan(i);
        });
        expect(new Set(titles).size, `${id}: duplicate section titles`).toBe(titles.length);
      });

      it("is a full article, not a summary", () => {
        const prose = [article.intro, ...article.sections.map((s) => s.body)].join("\n");
        expect(words(prose), `${id} prose words`).toBeGreaterThanOrEqual(900);
        expect(words(article.intro), `${id} intro`).toBeGreaterThanOrEqual(25);
        const withCode = article.sections.filter((s) => s.code !== undefined);
        expect(withCode.length, `${id}: sections with code`).toBeGreaterThanOrEqual(2);
        for (const s of withCode) expect(s.code!.trim().length, `${id}: ${s.title} code`).toBeGreaterThan(40);
        for (const s of article.sections) expect(s.body.trim().length, `${id}: ${s.title} body`).toBeGreaterThan(150);
      });

      it("has no placeholders", () => {
        const all = [article.intro, ...article.sections.flatMap((s) => [s.title, s.body, s.code ?? ""])].join("\n");
        expect(all).not.toMatch(/TODO|FIXME|lorem ipsum|…/i);
      });

      it("practice order names at least three of this pattern's problems (or all of them when it has fewer)", () => {
        const pattern = ALL_PATTERNS.find((p) => p.id === id)!;
        const practice = article.sections.find((s) => s.title === "Practice order")!.body;
        const named = pattern.problems.map((pid) => PROBLEMS[pid]).filter((p) => p && practice.includes(p.title));
        expect(named.length, `${id}: problems named in Practice order`).toBeGreaterThanOrEqual(Math.min(3, pattern.problems.length));
      });
    });
  }

  it("reports how many patterns still lack an article", () => {
    const missing = ALL_PATTERNS.map((p) => p.id).filter((id) => !PATTERN_ARTICLES[id]);
    console.info(`pattern articles: ${ALL_PATTERNS.length - missing.length} of ${ALL_PATTERNS.length} written; missing: ${missing.join(", ")}`);
    expect(missing.length).toBeLessThanOrEqual(ALL_PATTERNS.length);
  });
});
