import { describe, expect, it } from "vitest";
import { parseStoredChat, splitFences, starterText, storageKey, trimHistory, type ChatMsg } from "./ai-chat";

const msg = (i: number, n = 5): ChatMsg => ({ role: i % 2 ? "assistant" : "user", content: "x".repeat(n) + i });

describe("trimHistory", () => {
  it("keeps the newest 20 messages", () => {
    const all = Array.from({ length: 30 }, (_, i) => msg(i));
    const out = trimHistory(all);
    expect(out).toHaveLength(20);
    expect(out[19].content).toBe(all[29].content);
    expect(out[0].content).toBe(all[10].content);
  });
  it("clips long messages to 4000 characters", () => {
    expect(trimHistory([{ role: "user", content: "a".repeat(9000) }])[0].content).toHaveLength(4000);
  });
  it("drops old messages when the total passes 16000", () => {
    const all = Array.from({ length: 8 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "a".repeat(4000) }) as ChatMsg);
    const out = trimHistory(all);
    expect(out).toHaveLength(4);
  });
  it("strips extra fields", () => {
    const out = trimHistory([{ role: "user", content: "hi", extra: 1 } as ChatMsg]);
    expect(Object.keys(out[0]).sort()).toEqual(["content", "role"]);
  });
});

describe("parseStoredChat", () => {
  it("returns an empty chat for null, junk or wrong shapes", () => {
    expect(parseStoredChat(null)).toEqual([]);
    expect(parseStoredChat("not json")).toEqual([]);
    expect(parseStoredChat('{"a":1}')).toEqual([]);
  });
  it("keeps valid messages and drops bad roles and empty answers", () => {
    const raw = JSON.stringify([
      { role: "user", content: "hi" },
      { role: "system", content: "no" },
      { role: "assistant", content: "  " },
      { role: "assistant", content: "ok" },
      { role: "user", content: 5 },
    ]);
    expect(parseStoredChat(raw)).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "ok" },
    ]);
  });
});

describe("starterText", () => {
  it("quotes the hint and numbers it from 1", () => {
    const t = starterText("hint", { hintIndex: 1, hintText: "Keep indices in a deque" });
    expect(t).toContain("hint 2");
    expect(t).toContain("Keep indices in a deque");
  });
  it("has text for the other starters", () => {
    expect(starterText("question")).toMatch(/question/);
    expect(starterText("review")).toMatch(/code/);
    expect(starterText("solution")).toMatch(/solution/);
  });
});

describe("splitFences", () => {
  it("separates code from text and drops the language tag", () => {
    expect(splitFences("a\n```cpp\nint x;\n```\nb")).toEqual([
      { code: false, text: "a\n" },
      { code: true, text: "int x;\n" },
      { code: false, text: "\nb" },
    ]);
  });
  it("leaves markup as plain text", () => {
    expect(splitFences("<b>hi</b>")).toEqual([{ code: false, text: "<b>hi</b>" }]);
  });
});

describe("storageKey", () => {
  it("is per problem", () => {
    expect(storageKey("two-sum")).toBe("ai-chat:two-sum");
  });
});
