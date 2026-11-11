import { describe, expect, it } from "vitest";
import { MAX_CODE_CHARS, MAX_STATEMENT_CHARS, buildHintPrompt, buildReviewPrompt, buildSolutionPrompt, clip } from "./ai-prompts";

const problem = { title: "Two Sum", statement: ["Find two numbers."], constraints: ["n <= 1e5"], hints: ["Use a map.", "Store complements."] };
const SECRET = "REFERENCE_SOLUTION_MARKER";

describe("ai prompts", () => {
  it("clips long text and leaves short text alone", () => {
    expect(clip("abc", 10)).toBe("abc");
    const c = clip("x".repeat(500), 100);
    expect(c.length).toBeLessThanOrEqual(100);
    expect(c).toContain("cut for length");
  });

  it("clips code and statement", () => {
    const msgs = buildReviewPrompt({ ...problem, statement: ["s".repeat(20000)] }, "c".repeat(50000));
    const user = msgs[1].content;
    expect(user.length).toBeLessThan(MAX_CODE_CHARS + MAX_STATEMENT_CHARS + 500);
  });

  it("review and hint prompts never contain the reference solution", () => {
    const p = { ...problem } as typeof problem & { solution?: unknown };
    p.solution = { cpp: SECRET };
    for (const m of [...buildReviewPrompt(p, "my code"), ...buildHintPrompt(p, 0)]) expect(m.content).not.toContain(SECRET);
  });

  it("the solution prompt includes the reference", () => {
    const m = buildSolutionPrompt(problem, { idea: ["map"], complexity: "O(n)", cpp: SECRET });
    expect(m[1].content).toContain(SECRET);
  });

  it("picks a valid hint and survives bad indexes and missing hints", () => {
    expect(buildHintPrompt(problem, 1)[1].content).toContain("Store complements.");
    expect(buildHintPrompt(problem, 99)[1].content).toContain("Store complements.");
    expect(buildHintPrompt(problem, -3)[1].content).toContain("Use a map.");
    expect(() => buildHintPrompt({ title: "x", statement: [] }, 0)).not.toThrow();
  });
});
