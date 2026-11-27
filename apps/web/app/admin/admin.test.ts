import { beforeEach, describe, expect, it, vi } from "vitest";
import { previewAction, runDraftAction } from "./actions";
import { runCode } from "@/lib/judge/run";
import { AdminDeniedError, requireAdminAction } from "@/lib/auth/admin";
import { mintAdminProof } from "@/lib/auth/admin-proof";
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

describe("Admin problem actions", () => {
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
