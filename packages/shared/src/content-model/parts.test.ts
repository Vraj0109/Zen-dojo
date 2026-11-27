import { describe, expect, it } from "vitest";
import { canonicalJson, revOf } from "./rev";
import { diffParts, extractParts, mergeChanges, patchEntity } from "./parts";
import { unitsFor } from "./units";
import type {
  BlockRow,
  ChangeEntry,
  ContentCourse,
  ContentDoc,
  ContentEntity,
  ContentLesson,
  ContentProblem,
  ProblemRow,
  SectionRow,
} from "./types";

function block(id: string, ord: number, over: Partial<BlockRow> = {}): BlockRow {
  return {
    id,
    ord,
    type: "markdown",
    body: `text ${id}`,
    caption: null,
    variant: null,
    label: null,
    timeComplexity: null,
    spaceComplexity: null,
    assetId: null,
    code: {},
    ...over,
  };
}

function section(id: string, slot: string, ord: number, blocks: BlockRow[], title: string | null = null): SectionRow {
  return { id, slot, ord, title, blocks };
}

/** Two pages: statement (3 sections, 2 slots) and solution (1 section with code). */
function makeProblem(): ContentProblem {
  const row: ProblemRow = {
    id: "lc-1",
    source: "leetcode",
    title: "Two Sum",
    difficulty: "easy",
    pattern: "hash-map",
    url: null,
    kind: "function",
    constraints: ["2 <= n"],
    inputFormatMd: null,
    outputFormatMd: null,
    fn: { name: "twoSum", params: [{ name: "nums", type: "int[]" }], returns: "int[]" },
    design: null,
    unordered: false,
    complexity: null,
    extra: { description: "Find two numbers." },
  };
  return {
    row,
    cases: [{ ord: 0, role: "example", input: [[2, 7, 11, 15], 9], output: [0, 1], explanationMd: null }],
    hints: [
      { ord: 0, bodyMd: "Hint one" },
      { ord: 1, bodyMd: "Hint two" },
    ],
    statement: {
      template: "problem",
      sections: [
        section("st-a", "statement", 0, [block("b1", 0)]),
        section("st-b", "point:0", 1, [block("b2", 0), block("b5", 1)], "Idea"),
      ],
    },
    solution: {
      template: "problem",
      sections: [
        section("so-a", "solution", 0, [
          block("b3", 0, {
            type: "code",
            body: "",
            variant: "brute",
            label: "Brute force",
            code: { cpp: "int main(){}", python: "pass" },
          }),
        ]),
      ],
    },
  };
}

function problem(p: ContentProblem): ContentEntity {
  return { kind: "problem", value: p };
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

/** Diff, extract and patch, then check the rev guarantee. Returns the parts used. */
function assertPatchGuarantee(before: ContentEntity, after: ContentEntity): string[] {
  const parts = diffParts(before, after);
  const patched = patchEntity(before, parts, extractParts(after, parts));
  expect(revOf(patched)).toBe(revOf(after));
  expect(canonicalJson(patched)).toBe(canonicalJson(after));
  return parts;
}

function entryFor(
  version: number,
  before: ContentEntity | null,
  after: ContentEntity,
  note: string | null = null,
  notify = false,
): ChangeEntry {
  const parts = diffParts(before, after);
  return {
    version,
    entity: after.kind,
    id: after.value.row.id,
    op: "upsert",
    rev: revOf(after),
    parts,
    units: unitsFor(after),
    note,
    notify,
    data: extractParts(after, parts),
  };
}

describe("diffParts", () => {
  it("returns no parts for identical entities", () => {
    const e = problem(makeProblem());
    expect(diffParts(e, clone(e))).toEqual([]);
  });

  it("one changed hint gives only hints", () => {
    const before = makeProblem();
    const after = clone(before);
    after.hints[1].bodyMd = "Hint two, revised";
    expect(assertPatchGuarantee(problem(before), problem(after))).toEqual(["hints"]);
  });

  it("a changed test case gives only cases", () => {
    const before = makeProblem();
    const after = clone(before);
    after.cases[0].output = [1, 2];
    expect(assertPatchGuarantee(problem(before), problem(after))).toEqual(["cases"]);
  });

  it("a changed title gives meta", () => {
    const before = makeProblem();
    const after = clone(before);
    after.row.title = "Two Sum (revised)";
    expect(assertPatchGuarantee(problem(before), problem(after))).toEqual(["meta"]);
  });

  it("a block added to one section gives that section only", () => {
    const before = makeProblem();
    const after = clone(before);
    after.statement.sections[1].blocks.push(block("b9", 2));
    expect(assertPatchGuarantee(problem(before), problem(after))).toEqual(["section:st-b"]);
  });

  it("a block moved inside a section gives that section", () => {
    const before = makeProblem();
    const after = clone(before);
    const blocks = after.statement.sections[1].blocks;
    [blocks[0], blocks[1]] = [blocks[1], blocks[0]];
    blocks[0].ord = 0;
    blocks[1].ord = 1;
    expect(assertPatchGuarantee(problem(before), problem(after))).toEqual(["section:st-b"]);
  });

  it("a changed section title gives that section", () => {
    const before = makeProblem();
    const after = clone(before);
    after.statement.sections[1].title = "Approach";
    expect(assertPatchGuarantee(problem(before), problem(after))).toEqual(["section:st-b"]);
  });

  it("a moved section gives section-order for its slots, not the section itself", () => {
    const before = makeProblem();
    const after = clone(before);
    const [a, b] = after.statement.sections;
    after.statement.sections = [b, a];
    b.ord = 0;
    a.ord = 1;
    const parts = assertPatchGuarantee(problem(before), problem(after));
    expect(parts.sort()).toEqual(["section-order:point:0", "section-order:statement"]);
  });

  it("an image block with a new asset gives the section and the asset", () => {
    const before = makeProblem();
    const after = clone(before);
    after.solution.sections[0].blocks.push(block("b7", 1, { type: "image", body: "alt", assetId: "as-new" }));
    expect(assertPatchGuarantee(problem(before), problem(after))).toEqual(["section:so-a", "asset:as-new"]);
  });

  it("an image block that reuses an asset the entity already had gives no asset part", () => {
    const before = makeProblem();
    before.statement.sections[0].blocks[0] = block("b1", 0, { type: "image", body: "alt", assetId: "as-old" });
    const after = clone(before);
    after.statement.sections[0].blocks[0].body = "new alt";
    expect(assertPatchGuarantee(problem(before), problem(after))).toEqual(["section:st-a"]);
  });

  it("moving a section to the other page gives the section and both pages' order", () => {
    const before = makeProblem();
    const after = clone(before);
    const moved = after.statement.sections.pop() as SectionRow;
    moved.ord = 1;
    after.solution.sections.push(moved);
    const parts = assertPatchGuarantee(problem(before), problem(after));
    expect(parts).toContain("section:st-b");
    expect(parts).toContain("section-order:statement");
    expect(parts).toContain("section-order:point:0");
    expect(parts).toContain("section-order:solution");
  });

  it("several changes at once keep the guarantee", () => {
    const before = makeProblem();
    const after = clone(before);
    after.hints.push({ ord: 2, bodyMd: "Hint three" });
    after.statement.sections[0].title = "Setup";
    after.solution.sections[0].blocks[0].code.java = "class A {}";
    after.row.difficulty = "medium";
    assertPatchGuarantee(problem(before), problem(after));
  });

  it("create and delete are all, and nothing against nothing is empty", () => {
    const e = problem(makeProblem());
    expect(diffParts(null, e)).toEqual(["all"]);
    expect(diffParts(e, null)).toEqual(["all"]);
    expect(diffParts(null, null)).toEqual([]);
  });

  it("course, doc and lesson rows give meta; a lesson section gives its section", () => {
    const course: ContentCourse = { row: { id: "sd", area: "study", title: "System design", summaryMd: "", ord: 1, data: {} } };
    const courseAfter: ContentCourse = { row: { ...course.row, title: "System design 2" } };
    expect(assertPatchGuarantee({ kind: "course", value: course }, { kind: "course", value: courseAfter })).toEqual(["meta"]);

    const doc: ContentDoc = { row: { kind: "reading", id: "r1", body: { items: [1] } } };
    const docAfter: ContentDoc = { row: { kind: "reading", id: "r1", body: { items: [1, 2] } } };
    expect(assertPatchGuarantee({ kind: "doc", value: doc }, { kind: "doc", value: docAfter })).toEqual(["meta"]);

    const lesson = makeLesson();
    const lessonAfter = clone(lesson);
    lessonAfter.page.sections[1].blocks[0].body = "changed";
    expect(assertPatchGuarantee({ kind: "lesson", value: lesson }, { kind: "lesson", value: lessonAfter })).toEqual([
      "section:ls-b",
    ]);
  });

  it("a lesson moved to another course gives meta", () => {
    const lesson = makeLesson();
    const moved = clone(lesson);
    moved.row.courseId = "sys";
    expect(assertPatchGuarantee({ kind: "lesson", value: lesson }, { kind: "lesson", value: moved })).toEqual(["meta"]);
  });

  it("different entities are all", () => {
    const a = problem(makeProblem());
    const other = makeProblem();
    other.row.id = "lc-2";
    expect(diffParts(a, problem(other))).toEqual(["all"]);
  });
});

function makeLesson(): ContentLesson {
  return {
    row: { id: "sd-cache", courseId: "sd", ord: 2, title: "Caching", template: "concept", meta: {} },
    page: {
      template: "concept",
      sections: [section("ls-a", "summary", 0, [block("lb1", 0)]), section("ls-b", "checklist", 1, [block("lb2", 0)])],
    },
  };
}

describe("extractParts and patchEntity", () => {
  it("extracts the listed parts only", () => {
    const e = problem(makeProblem());
    expect(Object.keys(extractParts(e, ["hints"]))).toEqual(["hints"]);
    expect(extractParts(e, ["meta"]).meta).toEqual(makeProblem().row);
    expect(extractParts(e, ["all"])).toEqual({ all: e });
  });

  it("returns the section with its page, or deleted for an unknown section", () => {
    const e = problem(makeProblem());
    expect(extractParts(e, ["section:st-b"])["section:st-b"]).toEqual({
      page: "statement",
      section: makeProblem().statement.sections[1],
    });
    expect(extractParts(e, ["section:nope"])["section:nope"]).toEqual({ deleted: true });
  });

  it("returns the layout of every page for section-order, and null for assets", () => {
    const e = problem(makeProblem());
    const out = extractParts(e, ["section-order:statement", "asset:as1"]);
    expect(out["section-order:statement"]).toMatchObject({
      statement: { template: "problem", sections: [{ id: "st-a", slot: "statement", ord: 0 }, { id: "st-b", slot: "point:0", ord: 1 }] },
      solution: { sections: [{ id: "so-a", slot: "solution", ord: 0 }] },
    });
    expect(out["asset:as1"]).toBeNull();
  });

  it("patching with hints replaces only hints and keeps the other parts", () => {
    const e = makeProblem();
    const after = clone(e);
    after.hints = [{ ord: 0, bodyMd: "Only" }];
    const patched = patchEntity(problem(e), ["hints"], extractParts(problem(after), ["hints"]));
    expect(patched.kind === "problem" && patched.value.hints).toEqual([{ ord: 0, bodyMd: "Only" }]);
    expect(patched.kind === "problem" && patched.value.statement).toEqual(e.statement);
  });

  it("a missing part in the data is left as it was (the rev check then catches it)", () => {
    const e = problem(makeProblem());
    expect(patchEntity(e, ["hints"], {})).toEqual(e);
  });

  it("all replaces the whole entity", () => {
    const e = makeProblem();
    const after = clone(e);
    after.row.title = "Other";
    const next = problem(after);
    expect(patchEntity(problem(e), ["all"], { all: next })).toEqual(next);
  });
});

describe("mergeChanges", () => {
  it("unions parts across changes to one entity, keeps the latest data, joins notes", () => {
    const s0 = makeProblem();
    const s1 = clone(s0);
    s1.hints[0].bodyMd = "Better hint";
    const s2 = clone(s1);
    s2.statement.sections[1].blocks.push(block("b9", 2));
    const s3 = clone(s2);
    s3.row.title = "Two Sum v2";

    const merged = mergeChanges([
      entryFor(1, problem(s0), problem(s1), "hint fix"),
      entryFor(2, problem(s1), problem(s2), "new block", true),
      entryFor(3, problem(s2), problem(s3)),
    ]);
    expect(merged).toHaveLength(1);
    const m = merged[0];
    expect([...m.parts].sort()).toEqual(["hints", "meta", "section:st-b"]);
    expect(m.version).toBe(3);
    expect(m.rev).toBe(revOf(problem(s3)));
    expect(m.note).toBe("hint fix; new block");
    expect(m.notify).toBe(true);
    expect(m.op).toBe("upsert");
    expect(revOf(patchEntity(problem(s0), m.parts, m.data ?? {}))).toBe(revOf(problem(s3)));
  });

  it("keeps the layout of the latest move when a section's content changed earlier", () => {
    const s0 = makeProblem();
    const s1 = clone(s0);
    s1.statement.sections[1].title = "Approach";
    const s2 = clone(s1);
    const [a, b] = s2.statement.sections;
    s2.statement.sections = [b, a];
    b.ord = 0;
    a.ord = 1;

    const merged = mergeChanges([entryFor(1, problem(s0), problem(s1)), entryFor(2, problem(s1), problem(s2))]);
    expect(revOf(patchEntity(problem(s0), merged[0].parts, merged[0].data ?? {}))).toBe(revOf(problem(s2)));
  });

  it("an upsert with all as the base gives one full entity", () => {
    const s0 = makeProblem();
    const s1 = clone(s0);
    s1.hints.push({ ord: 2, bodyMd: "Hint three" });
    const merged = mergeChanges([entryFor(1, null, problem(s0)), entryFor(2, problem(s0), problem(s1))]);
    expect(merged[0].parts).toEqual(["all"]);
    expect(canonicalJson(merged[0].data?.all)).toBe(canonicalJson(problem(s1)));
    expect(merged[0].rev).toBe(revOf(problem(s1)));
  });

  it("a latest delete gives one delete with no data", () => {
    const s0 = makeProblem();
    const del: ChangeEntry = { version: 2, entity: "problem", id: "lc-1", op: "delete", rev: "x", parts: ["all"], units: ["problems:hash-map"], note: null, notify: false };
    const merged = mergeChanges([entryFor(1, null, problem(s0)), del]);
    expect(merged).toHaveLength(1);
    expect(merged[0].op).toBe("delete");
    expect(merged[0].data).toBeUndefined();
  });

  it("delete then restore gives the restored entity as all", () => {
    const s0 = makeProblem();
    const s1 = clone(s0);
    s1.hints.push({ ord: 2, bodyMd: "Back" });
    const del: ChangeEntry = { version: 1, entity: "problem", id: "lc-1", op: "delete", rev: "x", parts: ["all"], units: ["problems:hash-map"], note: null, notify: false };
    const merged = mergeChanges([del, entryFor(2, null, problem(s1))]);
    expect(merged[0].parts).toEqual(["all"]);
    expect(canonicalJson(merged[0].data?.all)).toBe(canonicalJson(problem(s1)));
  });

  it("delete then a partial change drops all (the client refetches on rev mismatch)", () => {
    const s0 = makeProblem();
    const s1 = clone(s0);
    s1.hints[0].bodyMd = "Changed";
    const del: ChangeEntry = { version: 1, entity: "problem", id: "lc-1", op: "delete", rev: "x", parts: ["all"], units: ["problems:hash-map"], note: null, notify: false };
    const merged = mergeChanges([del, entryFor(2, problem(s0), problem(s1))]);
    expect(merged[0].op).toBe("upsert");
    expect(merged[0].parts).toEqual(["hints"]);
  });

  it("keeps one entry per entity in first-appearance order and unions units", () => {
    const a = makeProblem();
    const b = makeProblem();
    b.row.id = "lc-2";
    const b1 = clone(b);
    b1.hints[0].bodyMd = "x";
    const e1 = { ...entryFor(1, problem(a), problem(clone(a))), units: ["problems:hash-map"] };
    const e2 = { ...entryFor(2, problem(b), problem(b1)), units: ["problems:hash-map"] };
    const e3 = { ...entryFor(3, problem(a), problem(a)), units: ["problems:other"] };
    const merged = mergeChanges([e1, e2, e3]);
    expect(merged.map((m) => m.id)).toEqual(["lc-1", "lc-2"]);
    expect(merged[0].units).toEqual(["problems:hash-map", "problems:other"]);
  });

  it("an all entry keeps the asset parts of the group, with the latest data", () => {
    const s0 = makeProblem();
    const s1 = clone(s0);
    s1.statement.sections[0].blocks.push(block("b-img", 9, { type: "image", body: "alt", assetId: "as-new" }));
    const row = (id: string) => ({ id, mime: "image/png" as const, base64: "AAAA", width: 1, height: 1 });
    const e1: ChangeEntry = {
      ...entryFor(1, null, problem(s0)),
      parts: ["all", "asset:as-old"],
      data: { all: problem(s0), "asset:as-old": row("as-old") },
    };
    const e2 = entryFor(2, problem(s0), problem(s1));
    e2.data = { ...(e2.data ?? {}), "asset:as-new": row("as-new") };

    const merged = mergeChanges([e1, e2]);
    expect(merged[0].op).toBe("upsert");
    expect(merged[0].parts).toEqual(["all", "asset:as-old", "asset:as-new"]);
    expect(merged[0].data?.["asset:as-old"]).toEqual(row("as-old"));
    expect(merged[0].data?.["asset:as-new"]).toEqual(row("as-new"));
    expect(revOf(merged[0].data?.all as ContentEntity)).toBe(revOf(problem(s1)));
  });
});
