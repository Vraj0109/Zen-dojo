import { describe, expect, it, vi } from "vitest";
import { ALL_CONCEPTS, ALL_EXERCISES, buildLessonChatMessages, starterMessage, MAX_LESSON_CHARS } from "@habit/shared";

vi.mock("server-only", () => ({}));
import { parseChatRequest } from "./context";
import { lessonSource } from "./lesson";

describe("lessonSource", () => {
  it("returns the title, area and text of a concept lesson", () => {
    const id = Object.keys(ALL_CONCEPTS)[0];
    const s = lessonSource(id);
    expect(s?.title).toBe(ALL_CONCEPTS[id].title);
    expect(s?.material).toContain("What to know:");
  });

  it("returns text for a system design or LLD exercise", () => {
    const id = Object.keys(ALL_EXERCISES)[0];
    const s = lessonSource(id);
    expect(s?.title).toBe(ALL_EXERCISES[id].title);
    expect(s?.material.length).toBeGreaterThan(10);
  });

  it("is null for an unknown id", () => {
    expect(lessonSource("no-such-lesson")).toBeNull();
  });
});

describe("lesson chat prompts", () => {
  it("puts the lesson in one system message, then the conversation", () => {
    const m = buildLessonChatMessages({ title: "Caching", area: "System design", material: "Cache aside means...", history: [{ role: "user", content: "hi" }] });
    expect(m[0].role).toBe("system");
    expect(m[0].content).toContain("Lesson: Caching (System design)");
    expect(m[0].content).toContain("Cache aside means...");
    expect(m.slice(1)).toEqual([{ role: "user", content: "hi" }]);
  });

  it("clips a very long lesson", () => {
    const m = buildLessonChatMessages({ title: "T", material: "x".repeat(MAX_LESSON_CHARS * 3), history: [{ role: "user", content: "hi" }] });
    expect(m[0].content.length).toBeLessThan(MAX_LESSON_CHARS + 1500);
  });

  it("has visible starter texts for the lesson chips", () => {
    for (const i of ["explain", "quiz", "example", "interview"] as const) expect(starterMessage(i).length).toBeGreaterThan(5);
  });
});

describe("parseChatRequest with a lesson", () => {
  const msgs = [{ role: "user", content: "hi" }];
  it("accepts lessonId alone and a lesson intent", () => {
    const r = parseChatRequest({ lessonId: "sd-caching", messages: msgs, intent: "quiz" });
    expect(r?.lessonId).toBe("sd-caching");
    expect(r?.problemId).toBeUndefined();
    expect(r?.intent).toBe("quiz");
  });
  it("rejects both ids or neither", () => {
    expect(parseChatRequest({ lessonId: "a", problemId: "b", messages: msgs })).toBeNull();
    expect(parseChatRequest({ messages: msgs })).toBeNull();
  });
});
