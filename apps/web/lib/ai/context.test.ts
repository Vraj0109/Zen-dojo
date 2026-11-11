import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { parseChatRequest } from "./context";

const ok = { problemId: "lc-1", messages: [{ role: "user", content: "hi" }] };

describe("parseChatRequest", () => {
  it("fills defaults", () => {
    expect(parseChatRequest(ok)).toEqual({
      problemId: "lc-1",
      messages: [{ role: "user", content: "hi" }],
      intent: "free",
      hintIndex: 0,
      revealSolution: false,
      includeCode: false,
    });
  });

  it("only a literal true turns on revealSolution or includeCode", () => {
    expect(parseChatRequest({ ...ok, revealSolution: true, includeCode: true })).toMatchObject({ revealSolution: true, includeCode: true });
    expect(parseChatRequest({ ...ok, revealSolution: "true" })).toBeNull();
    expect(parseChatRequest({ ...ok, includeCode: 1 })).toBeNull();
  });

  it("rejects non-objects, bad roles, empty or assistant-last conversations and unknown intents", () => {
    expect(parseChatRequest(null)).toBeNull();
    expect(parseChatRequest({ ...ok, messages: [] })).toBeNull();
    expect(parseChatRequest({ ...ok, messages: [{ role: "system", content: "x" }, ...ok.messages] })).toBeNull();
    expect(parseChatRequest({ ...ok, messages: [...ok.messages, { role: "assistant", content: "yo" }] })).toBeNull();
    expect(parseChatRequest({ ...ok, messages: [{ role: "user", content: "   " }] })).toBeNull();
    expect(parseChatRequest({ ...ok, intent: "root" })).toBeNull();
    expect(parseChatRequest({ ...ok, problemId: "" })).toBeNull();
  });
});
