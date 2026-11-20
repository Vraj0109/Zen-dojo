import { describe, expect, it } from "vitest";
import {
  formatInputs,
  parseMyCases,
  serializeMyCases,
  shortcutFor,
  verdictText,
} from "./workspace-helpers";

describe("formatInputs", () => {
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
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ];
    const input = JSON.stringify([[2, 7, 11, 15], 9]);
    expect(formatInputs(params, input)).toEqual([
      "nums = [2,7,11,15]",
      "target = 9",
    ]);
  });

  it("preserves large input labels", () => {
    const params = [{ name: "s", type: "string" }];
    const label = "(large input: 10,000 random words, 100 letters each)";
    expect(formatInputs(params, label)).toEqual([label]);
  });

  it("formats design problems with ops and args lines", () => {
    const params = [
      { name: "ops", type: "string[]" },
      { name: "args", type: "string[][]" },
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

  it("formats design problems even when params is undefined", () => {
    const input = [
      ["LRUCache", "put", "get"],
      [[2], [1, 1], [1]],
    ];
    expect(formatInputs(undefined, input)).toEqual([
      'ops = ["LRUCache","put","get"]',
      "args = [[2],[1,1],[1]]",
    ]);
  });

  it("handles missing params by using generic param names", () => {
    expect(formatInputs(undefined, [1, "two", true])).toEqual([
      "param1 = 1",
      'param2 = "two"',
      "param3 = true",
    ]);
  });
});

describe("verdictText", () => {
  it("formats accepted verdict with timing", () => {
    expect(verdictText({ pass: true, micros: 450 })).toBe("Accepted · 450 µs");
    expect(verdictText({ pass: true, micros: 12000 })).toBe("Accepted · 12 ms");
    expect(verdictText({ pass: true, elapsedMs: 15 })).toBe("Accepted · 15 ms");
    expect(verdictText({ pass: true })).toBe("Accepted");
  });

  it("formats time limit exceeded", () => {
    expect(verdictText({ pass: false, problem: "tle", elapsedMs: 1000 })).toBe(
      "Time limit: stopped at 1,000 ms",
    );
    expect(verdictText({ pass: false, problem: "timeout", timeLimitMs: 2500 })).toBe(
      "Time limit: 2,500 ms",
    );
  });

  it("formats crashes", () => {
    expect(verdictText({ pass: false, problem: "crash", error: "segmentation fault" })).toBe(
      "Crashed: segmentation fault",
    );
    expect(verdictText({ pass: false, problem: "crash", error: "Crashed: killed by SIGSEGV" })).toBe(
      "Crashed: killed by SIGSEGV",
    );
  });

  it("formats exceptions", () => {
    expect(verdictText({ pass: false, problem: "exception", error: "NullPointerException" })).toBe(
      "Exception: NullPointerException",
    );
  });

  it("formats memory limit", () => {
    expect(verdictText({ pass: false, problem: "memory" })).toBe(
      "Memory limit exceeded",
    );
  });

  it("formats not-run cases", () => {
    expect(verdictText({ pass: false, problem: "not-run", error: "an earlier case used the time budget" })).toBe(
      "Not run: an earlier case used the time budget",
    );
  });

  it("formats wrong answer", () => {
    expect(verdictText({ pass: false })).toBe("Wrong answer");
    expect(verdictText({ pass: false, note: "failed at op 3 put(1,2)" })).toBe(
      "Wrong answer: failed at op 3 put(1,2)",
    );
  });
});

describe("parseMyCases & serializeMyCases", () => {
  it("handles null, invalid JSON, or non-arrays gracefully", () => {
    expect(parseMyCases(null)).toEqual([]);
    expect(parseMyCases("")).toEqual([]);
    expect(parseMyCases("invalid-json")).toEqual([]);
    expect(parseMyCases("123")).toEqual([]);
    expect(parseMyCases('{"a":1}')).toEqual([]);
  });

  it("filters out non-array items and caps at 10", () => {
    const raw = JSON.stringify([
      [1],
      "not an array",
      [2],
      null,
      [3],
      [4],
      [5],
      [6],
      [7],
      [8],
      [9],
      [10],
      [11],
      [12],
    ]);
    const parsed = parseMyCases(raw);
    expect(parsed).toHaveLength(10);
    expect(parsed).toEqual([[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]]);
  });

  it("round trips cases up to 10", () => {
    const cases = [
      [[1, 2], 3],
      [[4, 5], 9],
    ];
    const serialized = serializeMyCases(cases);
    expect(parseMyCases(serialized)).toEqual(cases);
  });

  it("serializeMyCases filters non-arrays and caps at 10", () => {
    const items = Array.from({ length: 15 }, (_, i) => [i]) as unknown[][];
    // @ts-expect-error test non-array element
    items[3] = "invalid";
    const serialized = serializeMyCases(items);
    const parsed = JSON.parse(serialized);
    expect(parsed).toHaveLength(10);
    expect(parsed.every(Array.isArray)).toBe(true);
  });
});

describe("shortcutFor", () => {
  it("maps Run and Submit on Windows/Linux (Ctrl) and macOS (Cmd)", () => {
    // Windows / Linux
    expect(shortcutFor({ key: "'", ctrlKey: true }, false)).toBe("run");
    expect(shortcutFor({ key: '"', ctrlKey: true }, false)).toBe("run");
    expect(shortcutFor({ key: "Enter", ctrlKey: true }, false)).toBe("submit");
    expect(shortcutFor({ key: "s", ctrlKey: true }, false)).toBe("save");
    expect(shortcutFor({ key: "b", ctrlKey: true }, false)).toBe("toggle-problem");
    expect(shortcutFor({ key: "j", ctrlKey: true }, false)).toBe("toggle-results");

    // macOS
    expect(shortcutFor({ key: "'", metaKey: true }, true)).toBe("run");
    expect(shortcutFor({ key: "Enter", metaKey: true }, true)).toBe("submit");
    expect(shortcutFor({ key: "s", metaKey: true }, true)).toBe("save");
    expect(shortcutFor({ key: "b", metaKey: true }, true)).toBe("toggle-problem");
    expect(shortcutFor({ key: "j", metaKey: true }, true)).toBe("toggle-results");

    // Cross modifier rejection (e.g. Ctrl on Mac when expecting Cmd)
    expect(shortcutFor({ key: "'", ctrlKey: true }, true)).toBeNull();
    expect(shortcutFor({ key: "'", metaKey: true }, false)).toBeNull();
  });

  it("maps Alt navigation shortcuts", () => {
    expect(shortcutFor({ key: "ArrowRight", altKey: true }, false)).toBe("next-case");
    expect(shortcutFor({ key: "ArrowLeft", altKey: true }, false)).toBe("prev-case");
    expect(shortcutFor({ key: "1", altKey: true }, false)).toBe("jump-case-1");
    expect(shortcutFor({ key: "9", altKey: true }, false)).toBe("jump-case-9");
    expect(shortcutFor({ key: "0", altKey: true }, false)).toBeNull();
  });

  it("maps shortcuts sheet (?)", () => {
    expect(shortcutFor({ key: "?" }, false)).toBe("shortcuts");
    expect(shortcutFor({ key: "?", ctrlKey: true }, false)).toBeNull();
  });

  it("returns null for unrecognized keys", () => {
    expect(shortcutFor({ key: "x" }, false)).toBeNull();
    expect(shortcutFor({ key: "Enter" }, false)).toBeNull();
  });
});
