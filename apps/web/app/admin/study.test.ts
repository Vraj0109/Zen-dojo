import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_CONCEPTS, LESSONS } from "@habit/shared";
import { revertLessonAction, saveLessonAction } from "./study-actions";
import { AdminDeniedError, requireAdminAction } from "@/lib/auth/admin";
import { mintAdminProof } from "@/lib/auth/admin-proof";
import { getItem } from "@/lib/content";
import { resolveLesson } from "@/lib/packs";

vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {}, refresh: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/admin", () => ({
  AdminDeniedError: class AdminDeniedError extends Error {
    constructor(message = "Not allowed.") {
      super(message);
      this.name = "AdminDeniedError";
    }
  },
  requireAdminAction: vi.fn(),
}));
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const ID = "lld-solid";
const mockAdminProof = mintAdminProof("a", "Admin");

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  delete (globalThis as { habitContentDb?: unknown }).habitContentDb;
  vi.clearAllMocks();
  vi.mocked(requireAdminAction).mockResolvedValue(mockAdminProof as never);
});

function form(over: Record<string, string | string[]> = {}): FormData {
  const fd = new FormData();
  const points = ALL_CONCEPTS[ID].points;
  const v: Record<string, string | string[]> = {
    concept: ID,
    overview: "New **overview**.",
    explain: points.map((_, i) => `Explanation ${i + 1}`),
    questions: ["Q one?", "Q two?"],
    pitfalls: [],
    ...over,
  };
  for (const [k, val] of Object.entries(v)) for (const x of Array.isArray(val) ? val : [val]) fd.append(k, x);
  return fd;
}

describe("admin lesson editing", () => {
  it("refuses non-admins with 'Not allowed.' and stores nothing", async () => {
    vi.mocked(requireAdminAction).mockRejectedValueOnce(new AdminDeniedError());
    expect(await saveLessonAction(null, form())).toEqual({ ok: false, errors: ["Not allowed."] });
    expect(await getItem(`patch:${ID}`)).toBeNull();

    vi.mocked(requireAdminAction).mockRejectedValueOnce(new AdminDeniedError());
    expect(await revertLessonAction(null, form())).toEqual({ ok: false, errors: ["Not allowed."] });
  });

  it("saves a patch that resolveLesson returns, keeping the order of questions", async () => {
    const r = await saveLessonAction(null, form({ questions: ["Second?", "First?"] }));
    expect(r.ok).toBe(true);
    const lesson = await resolveLesson(ID, LESSONS[ID]);
    expect(lesson?.overview).toBe("New **overview**.");
    expect(lesson?.questions).toEqual(["Second?", "First?"]);
    expect((await getItem(`patch:${ID}`))?.source).toBe("admin");
  });

  it("rejects bad input", async () => {
    expect((await saveLessonAction(null, form({ concept: "nope" }))).ok).toBe(false);
    expect((await saveLessonAction(null, form({ overview: " " }))).ok).toBe(false);
    expect((await saveLessonAction(null, form({ explain: [""] }))).ok).toBe(false);
    expect(await getItem(`patch:${ID}`)).toBeNull();
  });

  it("reverts to the built-in lesson", async () => {
    await saveLessonAction(null, form());
    const r = await revertLessonAction(null, form());
    expect(r.ok).toBe(true);
    expect(await getItem(`patch:${ID}`)).toBeNull();
    expect(await resolveLesson(ID, LESSONS[ID])).toEqual(LESSONS[ID]);
  });
});
