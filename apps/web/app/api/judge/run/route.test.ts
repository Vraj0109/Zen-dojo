import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProblemSpec } from "@habit/shared";

const mockRunCode = vi.fn();
const mockRunCustom = vi.fn();
const mockSaveRun = vi.fn();
const mockRecordJudgePass = vi.fn();
const mockSaveSolution = vi.fn();
const mockSetPackItemDone = vi.fn();
const mockRevalidatePath = vi.fn();

const mockSpec: ProblemSpec = {
  id: "lc-1",
  source: "leetcode",
  title: "Two Sum",
  statement: ["Find two numbers"],
  constraints: ["2 <= n <= 10^4"],
  fn: {
    name: "twoSum",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returns: "int[]",
  },
  examples: [
    { input: [[2, 7, 11, 15], 9], output: [0, 1] },
    { input: [[3, 2, 4], 6], output: [1, 2] },
  ],
  tests: [{ input: [[3, 3], 6], output: [0, 1] }],
  hints: [],
  solution: { idea: [], complexity: "O(n)", cpp: "" },
};

vi.mock("@/lib/judge/run", () => ({
  JUDGE_LIMITS: { code: 100_000 },
  runCode: (...args: unknown[]) => mockRunCode(...args),
  runCustom: (...args: unknown[]) => mockRunCustom(...args),
}));

vi.mock("@/lib/hosted/no-run", () => ({
  hostedNoRun: () => null,
}));

vi.mock("@/lib/content", () => ({
  resolveProblemSpec: async (id: string) => (id === "lc-1" ? mockSpec : undefined),
}));

vi.mock("@/lib/content-repo/problems", () => ({
  getProblemSpec: async (id: string) => (id === "lc-1" ? mockSpec : null),
}));

vi.mock("@/lib/dsa", () => ({
  recordJudgePass: (...args: unknown[]) => mockRecordJudgePass(...args),
}));

vi.mock("@/lib/notes", () => ({
  saveSolution: (...args: unknown[]) => mockSaveSolution(...args),
}));

vi.mock("@/lib/solution-runs", () => ({
  getRuns: vi.fn(),
  saveRun: (...args: unknown[]) => mockSaveRun(...args),
}));

vi.mock("@/lib/packs", () => ({
  getPackProblemSpec: vi.fn(),
  setPackItemDone: (...args: unknown[]) => mockSetPackItemDone(...args),
}));

vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {},
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

import { POST } from "./route";

function makeReq(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/judge/run", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRunCode.mockResolvedValue({
    status: "done",
    results: [
      { index: 0, kind: "example", pass: true, input: "[[2,7],9]", expected: "[0,1]" },
    ],
    passed: 1,
    total: 1,
  });
  mockRunCustom.mockResolvedValue({ status: "done", output: "[0,1]" });
  mockRecordJudgePass.mockResolvedValue(true);
  mockSaveSolution.mockResolvedValue({ ok: true });
  mockSaveRun.mockResolvedValue(undefined);
});

describe("POST /api/judge/run", () => {
  it("rejects cross-origin requests", async () => {
    const res = await POST(makeReq({ id: "lc-1", lang: "javascript", code: "code" }, { origin: "https://evil.com" }));
    expect(res.status).toBe(403);
    expect(mockRunCode).not.toHaveBeenCalled();
  });

  it("rejects non-json content type", async () => {
    const res = await POST(makeReq("hello", { "content-type": "text/plain" }));
    expect(res.status).toBe(403);
  });

  it("rejects unknown problems or languages", async () => {
    const r1 = await POST(makeReq({ id: "unknown-id", lang: "javascript", code: "code" }));
    expect(r1.status).toBe(400);

    const r2 = await POST(makeReq({ id: "lc-1", lang: "ruby", code: "code" }));
    expect(r2.status).toBe(400);
  });

  describe("mode: run", () => {
    it("runs only examples when cases are not passed", async () => {
      const res = await POST(
        makeReq({ id: "lc-1", lang: "javascript", code: "function twoSum() {}", mode: "run" }),
      );
      expect(res.status).toBe(200);
      expect(mockRunCode).toHaveBeenCalledWith(
        mockSpec,
        "javascript",
        "function twoSum() {}",
        { only: "examples", extra: undefined },
      );
      // Run mode must NEVER save runs, record judge pass, or save solutions
      expect(mockSaveRun).not.toHaveBeenCalled();
      expect(mockRecordJudgePass).not.toHaveBeenCalled();
      expect(mockSaveSolution).not.toHaveBeenCalled();
    });

    it("runs examples plus extra custom cases", async () => {
      const customCases = [
        [[1, 2, 3], 5],
        [[10, 20], 30],
      ];
      const res = await POST(
        makeReq({
          id: "lc-1",
          lang: "javascript",
          code: "function twoSum() {}",
          mode: "run",
          cases: customCases,
        }),
      );
      expect(res.status).toBe(200);
      expect(mockRunCode).toHaveBeenCalledWith(
        mockSpec,
        "javascript",
        "function twoSum() {}",
        { only: "examples", extra: customCases },
      );
      expect(mockSaveRun).not.toHaveBeenCalled();
      expect(mockRecordJudgePass).not.toHaveBeenCalled();
      expect(mockSaveSolution).not.toHaveBeenCalled();
    });

    it("returns 400 when more than 10 custom cases are provided", async () => {
      const tooManyCases = Array.from({ length: 11 }, () => [[1, 2], 3]);
      const res = await POST(
        makeReq({
          id: "lc-1",
          lang: "javascript",
          code: "function twoSum() {}",
          mode: "run",
          cases: tooManyCases,
        }),
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("At most 10 custom cases are allowed.");
      expect(mockRunCode).not.toHaveBeenCalled();
    });

    it("returns 400 when cases is not an array", async () => {
      const res = await POST(
        makeReq({
          id: "lc-1",
          lang: "javascript",
          code: "function twoSum() {}",
          mode: "run",
          cases: "not-an-array",
        }),
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Cases must be a list.");
    });

    it("returns 400 with checkInput error when a custom case is invalid", async () => {
      const res = await POST(
        makeReq({
          id: "lc-1",
          lang: "javascript",
          code: "function twoSum() {}",
          mode: "run",
          cases: [[[1, 2]]], // missing 2nd parameter (target)
        }),
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("The function takes 2 values, one per line.");

      const res2 = await POST(
        makeReq({
          id: "lc-1",
          lang: "javascript",
          code: "function twoSum() {}",
          mode: "run",
          cases: [["not an array", 5]],
        }),
      );
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.error).toBe("nums must be an int[].");
    });
  });

  describe("mode: submit (and default)", () => {
    it("defaults to submit mode when mode is omitted, running all cases and saving", async () => {
      const res = await POST(
        makeReq({ id: "lc-1", lang: "javascript", code: "function twoSum() {}", save: true }),
      );
      expect(res.status).toBe(200);
      // Submit calls runCode with all cases (no options)
      expect(mockRunCode).toHaveBeenCalledWith(mockSpec, "javascript", "function twoSum() {}");
      expect(mockSaveRun).toHaveBeenCalled();
      expect(mockRecordJudgePass).toHaveBeenCalledWith("lc-1");
      expect(mockSaveSolution).toHaveBeenCalledWith("lc-1", "function twoSum() {}", "JavaScript");
      const json = await res.json();
      expect(json.saved).toBe(true);
      expect(json.solved).toBe(true);
    });

    it("explicit mode: submit runs all cases and saves", async () => {
      const res = await POST(
        makeReq({ id: "lc-1", lang: "javascript", code: "function twoSum() {}", mode: "submit" }),
      );
      expect(res.status).toBe(200);
      expect(mockRunCode).toHaveBeenCalledWith(mockSpec, "javascript", "function twoSum() {}");
      expect(mockSaveRun).toHaveBeenCalled();
      expect(mockRecordJudgePass).toHaveBeenCalledWith("lc-1");
    });
  });

  describe("legacy input parameter", () => {
    it("runs runCustom and saves nothing", async () => {
      const res = await POST(
        makeReq({
          id: "lc-1",
          lang: "javascript",
          code: "function twoSum() {}",
          input: [[1, 2], 3],
        }),
      );
      expect(res.status).toBe(200);
      expect(mockRunCustom).toHaveBeenCalledWith(mockSpec, "javascript", "function twoSum() {}", [[1, 2], 3]);
      expect(mockRunCode).not.toHaveBeenCalled();
      expect(mockSaveRun).not.toHaveBeenCalled();
      expect(mockRecordJudgePass).not.toHaveBeenCalled();
    });
  });
});
