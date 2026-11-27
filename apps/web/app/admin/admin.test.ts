import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteProblemAction,
  previewAction,
  runDraftAction,
  saveProblemAction,
  updateProblemAction,
  verifyProblemAction,
} from "./actions";
import { runCode } from "@/lib/judge/run";
import { AdminDeniedError, requireAdminAction } from "@/lib/auth/admin";
import { mintAdminProof } from "@/lib/auth/admin-proof";
import { getItem } from "@/lib/content";
import type { ProblemDraft } from "@habit/shared";

vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {},
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({
  AdminDeniedError: class AdminDeniedError extends Error {
    constructor(message = "Not allowed.") {
      super(message);
      this.name = "AdminDeniedError";
    }
  },
  requireAdminAction: vi.fn(),
}));

vi.mock("@/lib/judge/run", () => ({ runCode: vi.fn() }));

const mockAdminProof = mintAdminProof("admin-1", "Admin User");

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  delete (globalThis as { habitContentDb?: unknown }).habitContentDb;
  vi.clearAllMocks();
  vi.mocked(requireAdminAction).mockResolvedValue(mockAdminProof as never);
});

function createValidFormData(overrides: Record<string, string | null> = {}): FormData {
  const fd = new FormData();
  const defaults: Record<string, string> = {
    title: "Double the Number",
    slug: "double-the-number",
    difficulty: "easy",
    source: "custom",
    category: "Math",
    description: "Write a function that doubles the input integer.\n\nReturns the doubled value.",
    constraints: "1 <= x <= 1000",
    fnName: "doubleIt",
    params: "x:int",
    returns: "int",
    code: "int doubleIt(int x) { return x * 2; }",
    tests: JSON.stringify([
      { input: [2], output: 4 },
      { input: [5], output: 10 },
    ]),
  };

  for (const [k, v] of Object.entries(defaults)) {
    if (overrides[k] === null) continue;
    fd.set(k, overrides[k] ?? v);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== null && !(k in defaults)) {
      fd.set(k, v);
    }
  }
  return fd;
}

describe("Admin problem actions", () => {
  describe("requireAdminAction authentication guard", () => {
    it("saveProblemAction refuses when requireAdminAction throws AdminDeniedError", async () => {
      vi.mocked(requireAdminAction).mockRejectedValueOnce(new AdminDeniedError());

      const fd = createValidFormData();
      const res = await saveProblemAction(null, fd);
      expect(res).toEqual({ ok: false, errors: ["Not allowed."] });
      expect(requireAdminAction).toHaveBeenCalled();
      expect(await getItem("problem:double-the-number")).toBeNull();
    });

    it("updateProblemAction refuses when requireAdminAction throws AdminDeniedError", async () => {
      vi.mocked(requireAdminAction).mockRejectedValueOnce(new AdminDeniedError());

      const fd = createValidFormData({ originalId: "double-the-number" });
      const res = await updateProblemAction(null, fd);
      expect(res).toEqual({ ok: false, errors: ["Not allowed."] });
      expect(requireAdminAction).toHaveBeenCalled();
    });
  });

  describe("slug validation", () => {
    const invalidSlugs = [
      "",
      "-starts-with-dash",
      "HasUpperCase",
      "has space",
      "under_score",
      "special$char",
      "a".repeat(41), // max 40 chars
    ];

    for (const slug of invalidSlugs) {
      it(`refuses invalid slug: "${slug}"`, async () => {
        const fd = createValidFormData({ slug });
        const result = await saveProblemAction(null, fd);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors).toContain(
            "Slug must be lowercase letters, digits and hyphens, starting with a letter or digit (up to 40 characters)."
          );
        }
      });
    }

    it("accepts valid slug formats", async () => {
      const validSlugs = ["a", "123", "two-sum", "problem-42-test"];
      for (const slug of validSlugs) {
        const fd = createValidFormData({ slug });
        const result = await saveProblemAction(null, fd);
        expect(result.ok).toBe(true);
      }
    });
  });

  describe("difficulty validation", () => {
    const invalidDifficulties = ["", "extreme", "Easy", "HARD", "medium-hard"];

    for (const diff of invalidDifficulties) {
      it(`refuses invalid difficulty: "${diff}"`, async () => {
        const fd = createValidFormData({ difficulty: diff });
        const result = await saveProblemAction(null, fd);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors).toContain("Difficulty must be easy, medium or hard.");
        }
      });
    }

    it("accepts valid difficulties (easy, medium, hard)", async () => {
      for (const diff of ["easy", "medium", "hard"] as const) {
        const fd = createValidFormData({ slug: `slug-${diff}`, difficulty: diff });
        const result = await saveProblemAction(null, fd);
        expect(result.ok).toBe(true);
      }
    });
  });

  describe("test cases JSON shape validation", () => {
    it("refuses empty test cases", async () => {
      const fd = createValidFormData({ tests: "" });
      const result = await saveProblemAction(null, fd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain("Test cases are required.");
      }
    });

    it("refuses invalid JSON syntax", async () => {
      const fd = createValidFormData({ tests: "{ bad json }" });
      const result = await saveProblemAction(null, fd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("Test cases are not valid JSON"))).toBe(true);
      }
    });

    it("refuses JSON that is not an array", async () => {
      const fd = createValidFormData({ tests: JSON.stringify({ input: [1], output: 2 }) });
      const result = await saveProblemAction(null, fd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain("Test cases must be a JSON array with at least one case.");
      }
    });

    it("refuses an empty array of test cases", async () => {
      const fd = createValidFormData({ tests: "[]" });
      const result = await saveProblemAction(null, fd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain("Test cases must be a JSON array with at least one case.");
      }
    });

    it("refuses test case array containing non-object element", async () => {
      const fd = createValidFormData({ tests: JSON.stringify([42]) });
      const result = await saveProblemAction(null, fd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain(
          'Test case 1 must be an object { "input": [one value per parameter], "output": value }.'
        );
      }
    });

    it("refuses test case array containing null element", async () => {
      const fd = createValidFormData({ tests: JSON.stringify([null]) });
      const result = await saveProblemAction(null, fd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain(
          'Test case 1 must be an object { "input": [one value per parameter], "output": value }.'
        );
      }
    });

    it("refuses test case where input is not an array", async () => {
      const fd = createValidFormData({
        tests: JSON.stringify([{ input: "not-an-array", output: 1 }]),
      });
      const result = await saveProblemAction(null, fd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain(
          'Test case 1 must be an object { "input": [one value per parameter], "output": value }.'
        );
      }
    });

    it("refuses test case where output is missing", async () => {
      const fd = createValidFormData({
        tests: JSON.stringify([{ input: [2] }]),
      });
      const result = await saveProblemAction(null, fd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain(
          'Test case 1 must be an object { "input": [one value per parameter], "output": value }.'
        );
      }
    });
  });

  describe("content store integration (create and update)", () => {
    it("saves a valid problem to the content store", async () => {
      const fd = createValidFormData();
      const result = await saveProblemAction(null, fd);

      expect(result).toMatchObject({
        ok: true,
        id: "problem:double-the-number",
        message: expect.stringContaining("Saved."),
      });

      const stored = await getItem("problem:double-the-number");
      expect(stored).not.toBeNull();
      expect(stored?.type).toBe("problem");
      expect(stored?.source).toBe("admin");
      expect(stored?.item).toMatchObject({
        type: "problem",
        id: "double-the-number",
        title: "Double the Number",
        difficulty: "easy",
        fn: {
          name: "doubleIt",
          returns: "int",
        },
      });
    });

    it("refuses creating when a problem with the same slug already exists", async () => {
      const fd = createValidFormData();
      const first = await saveProblemAction(null, fd);
      expect(first.ok).toBe(true);

      const duplicate = await saveProblemAction(null, fd);
      expect(duplicate.ok).toBe(false);
      if (!duplicate.ok) {
        expect(duplicate.errors).toContain(
          'A stored problem with slug "double-the-number" already exists. Open it with Edit instead.'
        );
      }
    });

    it("updates an existing problem when originalId matches", async () => {
      const createFd = createValidFormData();
      const first = await saveProblemAction(null, createFd);
      expect(first.ok).toBe(true);

      const updateFd = createValidFormData({
        originalId: "double-the-number",
        title: "Updated Title for Doubling",
        difficulty: "medium",
      });
      const updateResult = await updateProblemAction(null, updateFd);

      expect(updateResult).toMatchObject({
        ok: true,
        id: "problem:double-the-number",
        message: expect.stringContaining("Saved."),
      });

      const stored = await getItem("problem:double-the-number");
      expect(stored?.item).toMatchObject({
        id: "double-the-number",
        title: "Updated Title for Doubling",
        difficulty: "medium",
      });
    });

    it("refuses update when originalId does not match slug", async () => {
      const fd = createValidFormData({ originalId: "different-slug" });
      const result = await updateProblemAction(null, fd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain(
          "The slug cannot be changed when editing. Create a new problem for a new slug."
        );
      }
    });

    it("refuses update when problem does not exist in content store", async () => {
      const fd = createValidFormData({
        slug: "non-existent-problem",
        originalId: "non-existent-problem",
      });
      const result = await updateProblemAction(null, fd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain("That stored problem no longer exists.");
      }
    });
  });

  describe("hints", () => {
    it("stores one hint per line and shows them again on edit", async () => {
      const result = await saveProblemAction(null, createValidFormData({ hints: "Think about x.\n\n  Multiply it.  \n" }));
      expect(result.ok).toBe(true);
      expect((await getItem("problem:double-the-number"))?.item).toMatchObject({ hints: ["Think about x.", "Multiply it."] });
    });

    it("refuses too many hints", async () => {
      const result = await saveProblemAction(null, createValidFormData({ hints: Array.from({ length: 21 }, (_, i) => `hint ${i}`).join("\n") }));
      expect(result.ok).toBe(false);
    });
  });

  describe("verify with the judge", () => {
    it("refuses non-admins with 'Not allowed.' and runs nothing", async () => {
      vi.mocked(requireAdminAction).mockRejectedValueOnce(new AdminDeniedError());
      const res = await verifyProblemAction(null, createValidFormData());
      expect(res).toEqual({ ok: false, errors: ["Not allowed."] });
      expect(runCode).not.toHaveBeenCalled();
    });

    it("runs the code on every case without saving", async () => {
      vi.mocked(runCode).mockResolvedValueOnce({
        status: "done",
        passed: 1,
        total: 2,
        results: [
          { index: 0, kind: "example", pass: true, input: "2", expected: "4", actual: "4", elapsedMs: 3 },
          { index: 1, kind: "test", pass: false, input: "5", expected: "10", actual: "11", elapsedMs: 5 },
        ],
      });
      const result = await verifyProblemAction(null, createValidFormData());
      expect(result).toEqual({ ok: true, passed: 1, total: 2, maxMs: 5, failures: ["Case 2: expected 10, got 11"] });
      expect(vi.mocked(runCode).mock.calls[0][1]).toBe("cpp");
      expect(await getItem("problem:double-the-number")).toBeNull();
    });

    it("reports a compile error and needs code and valid cases first", async () => {
      vi.mocked(runCode).mockResolvedValueOnce({ status: "compile_error", message: "expected ';'" });
      expect(await verifyProblemAction(null, createValidFormData())).toEqual({ ok: false, errors: ["expected ';'"] });
      const noCode = await verifyProblemAction(null, createValidFormData({ code: "" }));
      expect(noCode.ok).toBe(false);
      const badTests = await verifyProblemAction(null, createValidFormData({ tests: "nope" }));
      expect(badTests.ok).toBe(false);
      expect(runCode).toHaveBeenCalledTimes(1);
    });
  });

  describe("delete a stored problem", () => {
    const idForm = (id: string) => {
      const fd = new FormData();
      fd.set("id", id);
      return fd;
    };

    it("refuses non-admins with 'Not allowed.' and keeps the problem", async () => {
      await saveProblemAction(null, createValidFormData());
      vi.mocked(requireAdminAction).mockRejectedValueOnce(new AdminDeniedError());
      const res = await deleteProblemAction(null, idForm("double-the-number"));
      expect(res).toEqual({ ok: false, errors: ["Not allowed."] });
      expect(await getItem("problem:double-the-number")).not.toBeNull();
    });

    it("removes a stored problem and refuses one that does not exist", async () => {
      await saveProblemAction(null, createValidFormData());
      expect((await deleteProblemAction(null, idForm("double-the-number"))).ok).toBe(true);
      expect(await getItem("problem:double-the-number")).toBeNull();
      expect((await deleteProblemAction(null, idForm("double-the-number"))).ok).toBe(false);
      expect((await deleteProblemAction(null, idForm("../x"))).ok).toBe(false);
    });
  });

  describe("runDraftAction and previewAction", () => {
    const sampleDraft: ProblemDraft = {
      row: {
        id: "test-problem",
        title: "Test Problem",
        difficulty: "easy",
        source: "custom",
        pattern: null,
        kind: "function",
        url: null,
        unordered: false,
        complexity: null,
        constraints: ["1 <= x <= 10"],
        inputFormatMd: null,
        outputFormatMd: null,
        fn: {
          name: "testFn",
          params: [{ name: "x", type: "int" }],
          returns: "int",
        },
        design: null,
        extra: {},
      },
      cases: [{ ord: 0, role: "example", input: [2], output: 4, explanationMd: null }],
      hints: [],
      statement: { template: "problem", sections: [] },
      solution: { template: "problem", sections: [] },
    };

    it("runDraftAction refuses non-admins with 'Not allowed.'", async () => {
      vi.mocked(requireAdminAction).mockRejectedValueOnce(new AdminDeniedError());
      const res = await runDraftAction(sampleDraft, "cpp", "int testFn(int x) { return x * 2; }");
      expect(res).toEqual({ ok: false, errors: ["Not allowed."] });
      expect(runCode).not.toHaveBeenCalled();
    });

    it("runDraftAction on hosted returns the no-run message and does not call runCode", async () => {
      const oldHosted = process.env.HABIT_HOSTED;
      process.env.HABIT_HOSTED = "1";
      try {
        const res = await runDraftAction(sampleDraft, "cpp", "int testFn(int x) { return x * 2; }");
        expect(res).toEqual({ ok: false, errors: ["Run tests in the desktop app"] });
        expect(runCode).not.toHaveBeenCalled();
      } finally {
        process.env.HABIT_HOSTED = oldHosted;
      }
    });

    it("previewAction refuses non-admins with 'Not allowed.'", async () => {
      vi.mocked(requireAdminAction).mockRejectedValueOnce(new AdminDeniedError());
      const res = await previewAction({ template: "problem", page: { template: "problem", sections: [] } });
      expect(res).toEqual({ ok: false, errors: ["Not allowed."] });
    });

    it("previewAction accepts admins and returns the page rendered by the reader component", async () => {
      const res = await previewAction({ template: "problem", page: { template: "problem", sections: [] } });
      expect(res.ok).toBe(true);
      // The node is the shared ContentPage element (same renderer as the public pages), with the draft passed through.
      expect(res.ok && (res.node as { props?: { page?: unknown } }).props?.page).toEqual({ template: "problem", sections: [] });
    });
  });
});
