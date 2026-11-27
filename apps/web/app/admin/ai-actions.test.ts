import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAiPromptAction, checkAiAnswerAction } from "./ai-actions";
import { AdminDeniedError, requireAdminAction } from "@/lib/auth/admin";

vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {}, refresh: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/content-repo/courses", () => ({ getCourse: vi.fn(async () => null), getLesson: vi.fn(async () => null) }));
vi.mock("@/lib/auth/admin", () => ({
  AdminDeniedError: class AdminDeniedError extends Error {
    constructor(message = "Not allowed.") {
      super(message);
      this.name = "AdminDeniedError";
    }
  },
  requireAdminAction: vi.fn(),
}));

const UNSAVED_HINT = "Track the seen values in a map from value to index before the loop ends";

function draftWithUnsavedHint() {
  return {
    row: {
      id: "two-sum",
      source: "custom",
      title: "Two Sum",
      difficulty: "easy",
      pattern: "hash-map",
      url: null,
      kind: "function",
      constraints: ["2 <= nums.length <= 10^4"],
      inputFormatMd: null,
      outputFormatMd: null,
      fn: { name: "twoSum", params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }], returns: "int[]" },
      design: null,
      unordered: false,
      complexity: "O(n)",
    },
    cases: [{ ord: 0, role: "example", input: [[2, 7, 11, 15], 9], output: [0, 1], explanationMd: null }],
    hints: [
      { ord: 0, bodyMd: "Think about what you need to remember while scanning." },
      { ord: 1, bodyMd: UNSAVED_HINT },
    ],
    statement: { template: "problem", sections: [] },
    solution: { template: "problem", sections: [] },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdminAction).mockResolvedValue({} as never);
});

describe("buildAiPromptAction", () => {
  it("refuses a non-admin with 'Not allowed.' and returns no prompt", async () => {
    vi.mocked(requireAdminAction).mockRejectedValue(new AdminDeniedError());
    const res = await buildAiPromptAction({
      target: "hints",
      mode: "improve",
      entity: "problem",
      id: "two-sum",
      field: "hints",
      draft: draftWithUnsavedHint(),
    });
    expect(res).toEqual({ ok: false, errors: ["Not allowed."] });
    expect(res).not.toHaveProperty("prompt");
  });

  it("builds a prompt from the unsaved draft for an admin", async () => {
    const res = await buildAiPromptAction({
      target: "hints",
      mode: "improve",
      entity: "problem",
      id: "two-sum",
      field: "hints",
      draft: draftWithUnsavedHint(),
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.prompt).toContain(UNSAVED_HINT);
    expect(res.prompt).toContain("## Answer format");
    expect(res.chars).toBe(res.prompt.length);
  });

  it("uses the unsaved text of a statement block", async () => {
    const draft = draftWithUnsavedHint();
    const blockText = "UNSAVED-BLOCK-TEXT-91c2 explains the input format";
    const statement = {
      template: "problem" as const,
      sections: [
        {
          id: "sec-1",
          slot: "statement",
          ord: 0,
          title: null,
          blocks: [
            { id: "blk-1", ord: 0, type: "markdown", body: blockText, caption: null, variant: null, label: null, timeComplexity: null, spaceComplexity: null, assetId: null, code: {} },
          ],
        },
      ],
    };
    const res = await buildAiPromptAction({
      target: "text-block",
      mode: "improve",
      entity: "problem",
      id: "two-sum",
      field: "statement/block:blk-1",
      draft: { ...draft, statement },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.prompt).toContain(blockText);
    expect(res.prompt).not.toContain("Lesson: ");
  });

  it("reports a missing draft field as an error, not a crash", async () => {
    const res = await buildAiPromptAction({ target: "hints", mode: "write", entity: "problem", id: "x", field: "hints", draft: null });
    expect(res.ok).toBe(false);
  });
});

describe("checkAiAnswerAction", () => {
  it("refuses a non-admin with 'Not allowed.'", async () => {
    vi.mocked(requireAdminAction).mockRejectedValue(new AdminDeniedError());
    const res = await checkAiAnswerAction({
      target: "hints",
      mode: "write",
      entity: "problem",
      id: "two-sum",
      field: "hints",
      draft: draftWithUnsavedHint(),
      answer: "1. one\n2. two",
    });
    expect(res).toEqual({ ok: false, errors: ["Not allowed."] });
  });

  it("parses a numbered hint list into hint rows for an admin", async () => {
    const res = await checkAiAnswerAction({
      target: "hints",
      mode: "write",
      entity: "problem",
      id: "two-sum",
      field: "hints",
      draft: draftWithUnsavedHint(),
      answer: "Here you go:\n```markdown\n1. Scan once.\n2. Remember what you saw.\n```",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value).toEqual([
      { ord: 0, bodyMd: "Scan once." },
      { ord: 1, bodyMd: "Remember what you saw." },
    ]);
  });
});
