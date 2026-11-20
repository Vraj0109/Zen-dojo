import { describe, expect, it } from "vitest";
import type { CaseResult } from "./run";
import { RUN_DETAIL_LIMIT, SAVED_OUTPUT_LIMIT, compactRunCases, parseRunCases, serializeRunCases, toSavedCase } from "./saved-run";

const pass = (index: number, extra: Partial<CaseResult> = {}): CaseResult => ({
  index,
  kind: "example",
  pass: true,
  input: "[1,2]",
  expected: "3",
  actual: "3",
  micros: 120,
  ...extra,
});
const fail = (index: number, extra: Partial<CaseResult> = {}): CaseResult => ({
  index,
  kind: "test",
  pass: false,
  input: "[5,6]",
  expected: "11",
  actual: "10",
  elapsedMs: 4,
  output: "debug line\n",
  ...extra,
});

describe("saved run cases", () => {
  it("keeps only the summary for a passed case", () => {
    expect(toSavedCase(pass(0))).toEqual({ kind: "example", index: 0, pass: true, micros: 120 });
  });

  it("keeps input, expected, actual, error and output for a failed case", () => {
    const saved = toSavedCase(fail(3, { problem: "tle", error: "Time Limit Exceeded: 4ms", elapsedMs: 4 }));
    expect(saved).toEqual({
      kind: "test",
      index: 3,
      pass: false,
      elapsedMs: 4,
      problem: "tle",
      input: [5, 6],
      expected: "11",
      actual: "10",
      error: "Time Limit Exceeded: 4ms",
      output: "debug line\n",
    });
  });

  it("cuts a failed case's printed output to 2 KB", () => {
    const saved = toSavedCase(fail(0, { output: "x".repeat(SAVED_OUTPUT_LIMIT + 500) }));
    expect(saved.output).toHaveLength(SAVED_OUTPUT_LIMIT);
  });

  it("keeps large inputs by label and never stores their data", () => {
    const saved = toSavedCase({ ...fail(9), kind: "stress", label: "100000 random numbers", input: "(large input: 100000 random numbers)" });
    expect(saved).toMatchObject({ kind: "stress", label: "100000 random numbers" });
    expect(saved.input).toBeUndefined();
  });

  it("lists every case of a small run in order, with its verdict", () => {
    const { cases, omitted } = compactRunCases([pass(0), fail(1), pass(2, { kind: "test", micros: undefined, elapsedMs: 9 })]);
    expect(omitted).toBe(0);
    expect(cases.map((c) => [c.index, c.pass])).toEqual([
      [0, true],
      [1, false],
      [2, true],
    ]);
    expect(cases[2]).toEqual({ kind: "test", index: 2, pass: true, elapsedMs: 9 });
  });

  it("keeps the whole payload within 64 KB: details of the last failed cases go first, no case is left out", () => {
    const results: CaseResult[] = [];
    for (let i = 0; i < 300; i++) results.push(fail(i, { input: JSON.stringify(["y".repeat(400)]), actual: "z".repeat(400), output: "o".repeat(2000) }));
    for (let i = 300; i < 400; i++) results.push(pass(i, { kind: "test" }));
    const data = compactRunCases(results);
    expect(Buffer.byteLength(serializeRunCases(data))).toBeLessThanOrEqual(RUN_DETAIL_LIMIT);
    expect(data.omitted).toBe(0);
    expect(data.cases).toHaveLength(400);
    expect(data.cases[0].output).toBeDefined();
    expect(data.cases[299].output).toBeUndefined();
    expect(data.cases[299]).toMatchObject({ pass: false, index: 299 });
  });

  it("leaves out the last cases only when even the bare verdicts do not fit", () => {
    const results: CaseResult[] = [];
    for (let i = 0; i < 1500; i++) results.push(fail(i));
    const data = compactRunCases(results);
    expect(Buffer.byteLength(serializeRunCases(data))).toBeLessThanOrEqual(RUN_DETAIL_LIMIT);
    expect(data.omitted).toBeGreaterThan(0);
    expect(data.cases.length + data.omitted).toBe(1500);
    expect(data.cases.every((c) => c.output === undefined)).toBe(true);
  });

  it("round-trips through the stored text and reads an empty or damaged value as unknown", () => {
    const data = compactRunCases([pass(0), fail(1)]);
    expect(parseRunCases(serializeRunCases(data))).toEqual(data);
    expect(parseRunCases("")).toBeUndefined();
    expect(parseRunCases(null)).toBeUndefined();
    expect(parseRunCases("{not json")).toBeUndefined();
    expect(parseRunCases(JSON.stringify({ v: 1 }))).toBeUndefined();
  });

  it("skips entries that are not cases", () => {
    const text = JSON.stringify({ v: 1, cases: [{ kind: "test", index: 1, pass: false }, { nope: true }, null], omitted: 2 });
    expect(parseRunCases(text)).toEqual({ cases: [{ kind: "test", index: 1, pass: false }], omitted: 2 });
  });
});
