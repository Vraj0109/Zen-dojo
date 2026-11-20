import { describe, expect, it } from "vitest";
import { buildChatMessages, clip, foldSystemIntoUser, starterMessage, trimChatHistory, MAX_CHAT_MESSAGE_CHARS, MAX_CHAT_TOTAL_CHARS, type ChatMessage } from "./ai-prompts";

describe("foldSystemIntoUser (plan 0078)", () => {
  it("moves the system text to the start of the first user message and keeps the history", () => {
    const input: ChatMessage[] = [
      { role: "system", content: "Guide with questions." },
      { role: "user", content: "How do I start?" },
      { role: "assistant", content: "What do you know?" },
      { role: "user", content: "A map?" },
    ];
    const copy = JSON.parse(JSON.stringify(input));
    const out = foldSystemIntoUser(input);
    expect(out).toEqual([
      { role: "user", content: "Guide with questions.\n\n---\n\nHow do I start?" },
      { role: "assistant", content: "What do you know?" },
      { role: "user", content: "A map?" },
    ]);
    expect(input).toEqual(copy);
  });

  it("returns the input unchanged without a system or a user message", () => {
    const noSystem: ChatMessage[] = [{ role: "user", content: "hi" }];
    expect(foldSystemIntoUser(noSystem)).toBe(noSystem);
    const noUser: ChatMessage[] = [{ role: "system", content: "s" }, { role: "assistant", content: "a" }];
    expect(foldSystemIntoUser(noUser)).toBe(noUser);
  });
});

const problem = { title: "Two Sum", statement: ["Find two numbers."], constraints: ["n <= 1e5"], hints: ["Use a map.", "Store complements."] };
const SECRET = "REFERENCE_SOLUTION_MARKER";

describe("ai prompts", () => {
  it("clips long text and leaves short text alone", () => {
    expect(clip("abc", 10)).toBe("abc");
    const c = clip("x".repeat(500), 100);
    expect(c.length).toBeLessThanOrEqual(100);
    expect(c).toContain("cut for length");
  });
});

describe("chat messages", () => {
  const solution = { idea: ["use a map"], complexity: "O(n)", cpp: SECRET };
  const history = [{ role: "user" as const, content: "hi" }];
  const system = (m: { role: string; content: string }[]) => m[0].content;

  it("never includes the reference solution unless revealSolution is true", () => {
    for (const intent of ["question", "hint", "review", "solution", "free"] as const) {
      const m = buildChatMessages({ problem, solution, code: "my code", includeCode: true, intent, history });
      expect(JSON.stringify(m)).not.toContain(SECRET);
      expect(system(m)).toContain("Do not give the full solution");
    }
    expect(JSON.stringify(buildChatMessages({ problem, solution, revealSolution: false, intent: "solution", history }))).not.toContain(SECRET);
    const m = buildChatMessages({ problem, solution, revealSolution: true, intent: "solution", history });
    expect(system(m)).toContain(SECRET);
    expect(system(m)).not.toContain("Do not give the full solution");
  });

  it("revealSolution without a solution adds nothing", () => {
    expect(system(buildChatMessages({ problem, revealSolution: true, intent: "free", history }))).toContain("Do not give the full solution");
  });

  it("includes interview walkthrough only when reveal is requested", () => {
    const interviewWalkthrough = "WALKTHROUGH_SECRET_CONTENT";
    const withoutReveal = buildChatMessages({ problem, interviewWalkthrough, revealSolution: false, intent: "free", history });
    expect(system(withoutReveal)).not.toContain(interviewWalkthrough);
    expect(system(withoutReveal)).toContain("Do not give the full solution");

    const withReveal = buildChatMessages({ problem, interviewWalkthrough, revealSolution: true, intent: "free", history });
    expect(system(withReveal)).toContain(interviewWalkthrough);
    expect(system(withReveal)).not.toContain("Do not give the full solution");
  });

  it("hint intent contains the chosen hint and clamps the index", () => {
    expect(system(buildChatMessages({ problem, intent: "hint", hintIndex: 1, history }))).toContain("Store complements.");
    expect(system(buildChatMessages({ problem, intent: "hint", hintIndex: 99, history }))).toContain("Store complements.");
    expect(system(buildChatMessages({ problem, intent: "free", hintIndex: 1, history }))).not.toContain("Store complements.");
    expect(() => buildChatMessages({ problem: { title: "x", statement: [] }, intent: "hint", history })).not.toThrow();
  });

  it("includes code only for review or includeCode", () => {
    expect(system(buildChatMessages({ problem, code: "MY_CODE", intent: "review", history }))).toContain("MY_CODE");
    expect(system(buildChatMessages({ problem, code: "MY_CODE", includeCode: true, intent: "free", history }))).toContain("MY_CODE");
    expect(system(buildChatMessages({ problem, code: "MY_CODE", intent: "free", history }))).not.toContain("MY_CODE");
    expect(system(buildChatMessages({ problem, code: "MY_CODE", includeCode: false, intent: "hint", history }))).not.toContain("MY_CODE");
  });

  it("keeps the newest 20 messages and clips long ones", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content: `m${i}` }));
    const m = buildChatMessages({ problem, intent: "free", history: many });
    expect(m).toHaveLength(21);
    expect(m[1].content).toBe("m10");
    expect(m[20].content).toBe("m29");
    const long = trimChatHistory([{ role: "user", content: "x".repeat(10000) }]);
    expect(long[0].content.length).toBeLessThanOrEqual(MAX_CHAT_MESSAGE_CHARS);
  });

  it("keeps the total under the cap, dropping the oldest", () => {
    const big = Array.from({ length: 10 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content: `${i}${"y".repeat(3500)}` }));
    const t = trimChatHistory(big);
    expect(t.reduce((n, x) => n + x.content.length, 0)).toBeLessThanOrEqual(MAX_CHAT_TOTAL_CHARS);
    expect(t[t.length - 1].content.startsWith("9")).toBe(true);
    expect(t.length).toBeLessThan(10);
  });

  it("starter messages are visible text", () => {
    const h = starterMessage("hint", { hintIndex: 1, hintText: "x" });
    expect(h).toContain("hint 2");
    expect(h).toContain("x");
    expect(starterMessage("question")).toBe("Explain the question to me.");
    expect(starterMessage("review")).toBe("Review my code.");
    expect(starterMessage("solution")).toBe("Explain the solution.");
  });
});
