import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveProblemAction, updateProblemAction } from "./actions";
import { requireAdmin, type Session } from "@/lib/auth/session";
import { getItem } from "@/lib/content";

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(),
}));

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
});
