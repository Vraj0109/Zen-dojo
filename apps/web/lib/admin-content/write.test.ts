import { beforeEach, describe, expect, it, vi } from "vitest";
import { mintAdminProof } from "../auth/admin-proof";
import type { ContentDb } from "../content-db/client";
import { sampleProblem } from "../content-db/fixtures";
import { loadProblem } from "../content-db/load";
import * as writeDb from "../content-db/write";
import { makeDb } from "../content-sync/test-helpers";
import type { ContentProblem } from "@habit/shared";
import { deleteProblem, saveProblem } from "./write";

// The hosted write path runs against an in-memory database. The change-log prune is spied on: it must run once after
// each committed write, and not at all when nothing was written.
const hoisted = vi.hoisted(() => ({ db: null as unknown }));

vi.mock("../content-db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../content-db/client")>()),
  getContentWriteDb: vi.fn(async () => hoisted.db),
}));

vi.mock("../content-db/write", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../content-db/write")>();
  return { ...actual, pruneChanges: vi.fn(actual.pruneChanges) };
});

vi.mock("../content-repo/invalidate", () => ({
  contentTagsFor: () => ["content"],
  expireContentTagsInAction: () => ["content"],
}));

vi.mock("../auth/session", () => ({ fetchWithAccessToken: vi.fn() }));

const proof = mintAdminProof("owner-1", "Owner");

// The shared sample has content-check issues (2 hints, no def in the Python block, no brute note). This version has
// none, so the tests below only see the issue they add.
function passingProblem(): ContentProblem {
  const base = sampleProblem();
  const sections = base.solution.sections.map((s) => ({
    ...s,
    blocks: s.blocks.map((b) => (b.code.python ? { ...b, code: { ...b.code, python: b.code.python.replace("def two_sum(", "def twoSum(") } } : b)),
  }));
  return {
    ...base,
    row: { ...base.row, extra: { ...base.row.extra, brute: "same" } },
    hints: [...base.hints, { ord: 2, bodyMd: "Sort the values first." }, { ord: 3, bodyMd: "Count what you still need." }],
    solution: { ...base.solution, sections },
  };
}
const prune = vi.mocked(writeDb.pruneChanges);
let db: ContentDb;

beforeEach(async () => {
  delete process.env.HABIT_DESKTOP;
  db = await makeDb();
  hoisted.db = db;
  prune.mockClear();
});

describe("admin content writes prune the change log", () => {
  it("a committed save prunes once", async () => {
    const r = await saveProblem(proof, passingProblem(), null);
    expect(r).toMatchObject({ ok: true, changed: true });
    expect(prune).toHaveBeenCalledTimes(1);
  });

  it("a save that is refused by a conflict writes nothing and does not prune", async () => {
    await saveProblem(proof, passingProblem(), null);
    prune.mockClear();
    const r = await saveProblem(proof, passingProblem(), "not-the-current-rev");
    expect(r).toMatchObject({ ok: false, conflict: true });
    expect(prune).not.toHaveBeenCalled();
  });

  it("a save of an unchanged entity writes nothing and does not prune", async () => {
    await saveProblem(proof, passingProblem(), null);
    prune.mockClear();
    const r = await saveProblem(proof, passingProblem(), null);
    expect(r).toMatchObject({ ok: true, changed: false });
    expect(prune).not.toHaveBeenCalled();
  });

  it("a committed delete prunes once", async () => {
    await saveProblem(proof, passingProblem(), null);
    prune.mockClear();
    const r = await deleteProblem(proof, sampleProblem().row.id, null);
    expect(r).toMatchObject({ ok: true, changed: true });
    expect(prune).toHaveBeenCalledTimes(1);
  });
});

describe("content checks on save", () => {
  it("a draft with content-check issues still saves and returns them as warnings", async () => {
    const draft = passingProblem();
    draft.row = { ...draft.row, extra: {} };
    const r = await saveProblem(proof, draft, null);
    expect(r).toMatchObject({ ok: true, changed: true });
    expect(r.ok && r.warnings).toEqual(['Problem missing brute force solution or "already optimal" / "brute: same" note']);
    expect(await loadProblem(db, draft.row.id)).not.toBeNull();
  });

  it("a warning does not stop the save and comes back with the result", async () => {
    const draft = passingProblem();
    draft.hints = [...draft.hints, { ord: 4, bodyMd: "Use a fence ``` around the code" }];
    const r = await saveProblem(proof, draft, null);
    expect(r).toMatchObject({ ok: true, changed: true });
    expect(r.ok && r.warnings).toEqual(["Hint ord 4 contains code fence; hints should be conceptual without code"]);
    expect(await loadProblem(db, draft.row.id)).not.toBeNull();
  });
});
