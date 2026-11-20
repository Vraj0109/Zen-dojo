import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteProblemAction, saveProblemAction, updateProblemAction, verifyProblemAction } from "./actions";
import { runCode } from "@/lib/judge/run";
import { DELETE as apiDelete, GET as apiGet, POST as apiPost } from "@/app/api/admin/content/route";
import { requireAdmin, type Session } from "@/lib/auth/session";
import { getItem } from "@/lib/content";

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/judge/run", () => ({ runCode: vi.fn() }));

const mockAdminSession: Session = {
  userId: "admin-1",
  name: "Admin User",
  avatarUrl: null,
  admin: true,
  expiresAt: Date.now() + 3600000,
  sessionId: "session-1",
};

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession);
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
  describe("requireAdmin authentication guard", () => {
    it("saveProblemAction refuses when requireAdmin rejects with unauthorized error", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Unauthorized: not an admin"));

      const fd = createValidFormData();
      await expect(saveProblemAction(null, fd)).rejects.toThrow("Unauthorized: not an admin");
      expect(requireAdmin).toHaveBeenCalled();
      expect(await getItem("problem:double-the-number")).toBeNull();
    });

    it("saveProblemAction refuses when requireAdmin throws redirect/notFound", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("NEXT_REDIRECT"));

      const fd = createValidFormData();
      await expect(saveProblemAction(null, fd)).rejects.toThrow("NEXT_REDIRECT");
      expect(requireAdmin).toHaveBeenCalled();
    });

    it("updateProblemAction refuses when requireAdmin rejects with unauthorized error", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Unauthorized: not an admin"));

      const fd = createValidFormData({ originalId: "double-the-number" });
      await expect(updateProblemAction(null, fd)).rejects.toThrow("Unauthorized: not an admin");
      expect(requireAdmin).toHaveBeenCalled();
    });

    it("updateProblemAction refuses when requireAdmin throws redirect/notFound", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("NEXT_NOT_FOUND"));

      const fd = createValidFormData({ originalId: "double-the-number" });
      await expect(updateProblemAction(null, fd)).rejects.toThrow("NEXT_NOT_FOUND");
      expect(requireAdmin).toHaveBeenCalled();
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
    it("refuses non-admins and runs nothing", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
      await expect(verifyProblemAction(null, createValidFormData())).rejects.toThrow("NEXT_REDIRECT");
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

    it("refuses non-admins and keeps the problem", async () => {
      await saveProblemAction(null, createValidFormData());
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
      await expect(deleteProblemAction(null, idForm("double-the-number"))).rejects.toThrow("NEXT_REDIRECT");
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
});

describe("/api/admin/content", () => {
  const OLD = process.env.CONTENT_ADMIN_TOKEN;
  afterEach(() => {
    if (OLD === undefined) delete process.env.CONTENT_ADMIN_TOKEN;
    else process.env.CONTENT_ADMIN_TOKEN = OLD;
  });
  const req = (method: string, auth?: string) => new Request("http://localhost/api/admin/content?id=problem:x", { method, headers: auth ? { authorization: auth } : {}, ...(method === "POST" ? { body: "[]" } : {}) });

  it("does not exist (404) without a configured token, for every method", async () => {
    delete process.env.CONTENT_ADMIN_TOKEN;
    for (const call of [apiGet, apiPost, apiDelete]) expect((await call(req("GET"))).status).toBe(404);
  });

  it("answers 401 without the right token, for every method", async () => {
    process.env.CONTENT_ADMIN_TOKEN = "secret-token";
    for (const call of [apiGet, apiPost, apiDelete]) {
      expect((await call(req("GET"))).status).toBe(401);
      expect((await call(req("GET", "Bearer wrong-token"))).status).toBe(401);
    }
  });
});
