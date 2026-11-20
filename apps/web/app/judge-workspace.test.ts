import { describe, expect, it } from "vitest";
import {
  formatInputs,
  parseMyCases,
  serializeMyCases,
  shortcutFor,
  verdictText,
} from "./judge-workspace";

describe("judge-workspace helpers: formatInputs", () => {
  it("formats standard parameters zipped with input array", () => {
    const params = [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ];
    const input = [[2, 7, 11, 15], 9];
    expect(formatInputs(params, input)).toEqual([
      "nums = [2,7,11,15]",
      "target = 9",
    ]);
  });

  it("handles input passed as JSON string", () => {
    const params = [
      { name: "strs", type: "string[]" },
    ];
    const input = JSON.stringify([["eat", "tea", "tan"]]);
    expect(formatInputs(params, input)).toEqual([
      'strs = ["eat","tea","tan"]',
    ]);
  });

  it("formats design problems with ops and args", () => {
    const params = [
      { name: "ops", type: "string[]" },
      { name: "args", type: "any[]" },
    ];
    const input = [
      ["LRUCache", "put", "get"],
      [[2], [1, 1], [1]],
    ];
    expect(formatInputs(params, input)).toEqual([
      'ops = ["LRUCache","put","get"]',
      "args = [[2],[1,1],[1]]",
    ]);
  });

  it("preserves large input strings wrapped in parentheses", () => {
    const params = [{ name: "s", type: "string" }];
    const label = "(10,000 random words, 100 letters each)";
    expect(formatInputs(params, label)).toEqual([label]);
  });
});

describe("judge-workspace helpers: verdictText", () => {
  it("covers accepted cases with timing", () => {
    expect(verdictText({ pass: true, micros: 500 })).toBe("Accepted · 500 µs");
    expect(verdictText({ pass: true, micros: 14000 })).toBe("Accepted · 14 ms");
    expect(verdictText({ pass: true, elapsedMs: 12 })).toBe("Accepted · 12 ms");
    expect(verdictText({ pass: true })).toBe("Accepted");
  });

  it("covers time limit exceeded / timeout", () => {
    expect(verdictText({ pass: false, problem: "tle", elapsedMs: 1000 })).toBe(
      "Time limit: stopped at 1,000 ms",
    );
    expect(verdictText({ pass: false, problem: "timeout", timeLimitMs: 2000 })).toBe(
      "Time limit: 2,000 ms",
    );
    expect(verdictText({ pass: false, problem: "tle" })).toBe("Time limit exceeded");
  });

  it("covers crashes and exceptions", () => {
    expect(verdictText({ pass: false, problem: "crash", error: "segmentation fault" })).toBe(
      "Crashed: segmentation fault",
    );
    expect(verdictText({ pass: false, problem: "exception", error: "NullPointerException" })).toBe(
      "Exception: NullPointerException",
    );
  });

  it("covers memory limit and not-run", () => {
    expect(verdictText({ pass: false, problem: "memory", error: "Out of memory" })).toBe(
      "Out of memory",
    );
    expect(verdictText({ pass: false, problem: "not-run", error: "time budget exceeded" })).toBe(
      "Not run: time budget exceeded",
    );
  });

  it("covers wrong answer with or without note", () => {
    expect(verdictText({ pass: false })).toBe("Wrong answer");
    expect(verdictText({ pass: false, note: "differ at index 3" })).toBe(
      "Wrong answer: differ at index 3",
    );
  });
});

describe("judge-workspace helpers: parseMyCases and serializeMyCases", () => {
  it("round trips valid cases", () => {
    const original = [[[1, 2], 3], [["a", "b"], 1]];
    const serialized = serializeMyCases(original);
    expect(parseMyCases(serialized)).toEqual(original);
  });

  it("caps cases at 10", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => [i]);
    const serialized = serializeMyCases(eleven);
    const parsed = parseMyCases(serialized);
    expect(parsed.length).toBe(10);
  });

  it("gracefully handles invalid JSON and non-arrays", () => {
    expect(parseMyCases(null)).toEqual([]);
    expect(parseMyCases("not json")).toEqual([]);
    expect(parseMyCases('{"a":1}')).toEqual([]);
    expect(parseMyCases("[1, 2, 3]")).toEqual([]);
  });
});

describe("judge-workspace helpers: shortcutFor", () => {
  it("maps Run: Ctrl+' on Windows and Cmd+' on Mac", () => {
    expect(shortcutFor({ key: "'", ctrlKey: true }, false)).toBe("run");
    expect(shortcutFor({ key: "'", metaKey: true }, true)).toBe("run");
    expect(shortcutFor({ key: "'", ctrlKey: true }, true)).toBeNull();
  });

  it("maps Submit: Ctrl+Enter on Windows and Cmd+Enter on Mac", () => {
    expect(shortcutFor({ key: "Enter", ctrlKey: true }, false)).toBe("submit");
    expect(shortcutFor({ key: "Enter", metaKey: true }, true)).toBe("submit");
  });

  it("maps Save: Ctrl+S", () => {
    expect(shortcutFor({ key: "s", ctrlKey: true }, false)).toBe("save");
    expect(shortcutFor({ key: "S", metaKey: true }, true)).toBe("save");
  });

  it("maps case navigation: Alt+ArrowRight, Alt+ArrowLeft, Alt+1..9", () => {
    expect(shortcutFor({ key: "ArrowRight", altKey: true }, false)).toBe("next-case");
    expect(shortcutFor({ key: "ArrowLeft", altKey: true }, false)).toBe("prev-case");
    expect(shortcutFor({ key: "1", altKey: true }, false)).toBe("jump-case-1");
    expect(shortcutFor({ key: "5", altKey: true }, false)).toBe("jump-case-5");
    expect(shortcutFor({ key: "9", altKey: true }, false)).toBe("jump-case-9");
  });

  it("maps pane toggles: Ctrl+B and Ctrl+J", () => {
    expect(shortcutFor({ key: "b", ctrlKey: true }, false)).toBe("toggle-problem");
    expect(shortcutFor({ key: "j", ctrlKey: true }, false)).toBe("toggle-results");
    expect(shortcutFor({ key: "B", metaKey: true }, true)).toBe("toggle-problem");
    expect(shortcutFor({ key: "J", metaKey: true }, true)).toBe("toggle-results");
  });

  it("maps shortcuts sheet: ?", () => {
    expect(shortcutFor({ key: "?" }, false)).toBe("shortcuts");
  });
});
