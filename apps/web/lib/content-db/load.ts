import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { BlockRow, BlockType, CodeLang, CodeVariant, ContentCourse, ContentDoc, ContentLesson, ContentProblem, CourseRow, LessonRow, ProblemRow, SectionRow, TemplateId, TestCaseRow } from "@habit/shared";
import type { ContentDb, ContentTx } from "./client";
import { blockCode, blocks, courses, docs, hints, lessons, pageSections, problems, testCases } from "./schema";

type Queryable = ContentDb | ContentTx;

/** Sections of one owner (optionally one slot) with their blocks and code, in stored order. */
async function loadSections(db: Queryable, ownerKind: string, ownerId: string, slot?: string): Promise<SectionRow[]> {
  const where = and(
    eq(pageSections.ownerKind, ownerKind),
    eq(pageSections.ownerId, ownerId),
    slot === undefined ? undefined : eq(pageSections.slot, slot),
  );
  const sectionRows = await db.select().from(pageSections).where(where).orderBy(asc(pageSections.ord));
  const blockRows = await db
    .select({ b: blocks })
    .from(blocks)
    .innerJoin(pageSections, eq(pageSections.id, blocks.sectionId))
    .where(where)
    .orderBy(asc(blocks.ord));
  const codeRows = await db
    .select({ blockId: blockCode.blockId, lang: blockCode.lang, code: blockCode.code })
    .from(blockCode)
    .innerJoin(blocks, eq(blocks.id, blockCode.blockId))
    .innerJoin(pageSections, eq(pageSections.id, blocks.sectionId))
    .where(where)
    .orderBy(asc(blockCode.ord));

  const codeByBlock = new Map<string, Partial<Record<CodeLang, string>>>();
  for (const r of codeRows) {
    let code = codeByBlock.get(r.blockId);
    if (!code) {
      code = {};
      codeByBlock.set(r.blockId, code);
    }
    code[r.lang as CodeLang] = r.code;
  }

  const blocksBySection = new Map<string, BlockRow[]>();
  for (const { b } of blockRows) {
    const block: BlockRow = {
      id: b.id,
      ord: b.ord,
      type: b.type as BlockType,
      body: b.body,
      caption: b.caption,
      variant: b.variant as CodeVariant | null,
      label: b.label,
      timeComplexity: b.timeComplexity,
      spaceComplexity: b.spaceComplexity,
      assetId: b.assetId,
      code: codeByBlock.get(b.id) ?? {},
    };
    const list = blocksBySection.get(b.sectionId) ?? [];
    list.push(block);
    blocksBySection.set(b.sectionId, list);
  }

  return sectionRows.map((s) => ({
    id: s.id,
    slot: s.slot,
    ord: s.ord,
    title: s.title,
    blocks: blocksBySection.get(s.id) ?? [],
  }));
}

/** A problem as written, or null when it does not exist or is soft-deleted. */
export async function loadProblem(db: Queryable, id: string): Promise<ContentProblem | null> {
  const [r] = await db.select().from(problems).where(eq(problems.id, id));
  if (!r || r.deleted !== 0) return null;
  const caseRows = await db.select().from(testCases).where(eq(testCases.problemId, id)).orderBy(asc(testCases.ord));
  const hintRows = await db.select().from(hints).where(eq(hints.problemId, id)).orderBy(asc(hints.ord));
  const row: ProblemRow = {
    id: r.id,
    source: r.source,
    title: r.title,
    difficulty: r.difficulty as ProblemRow["difficulty"],
    pattern: r.pattern,
    url: r.url,
    kind: r.kind as ProblemRow["kind"],
    constraints: JSON.parse(r.constraintsJson) as string[],
    inputFormatMd: r.inputFormatMd,
    outputFormatMd: r.outputFormatMd,
    fn: JSON.parse(r.fnJson) as ProblemRow["fn"],
    design: r.designJson === null ? null : JSON.parse(r.designJson),
    unordered: r.unordered === 1,
    complexity: r.complexity,
    extra: JSON.parse(r.extraJson) as Record<string, unknown>,
  };
  return {
    row,
    cases: caseRows.map(
      (c): TestCaseRow => ({
        ord: c.ord,
        role: c.role as TestCaseRow["role"],
        input: JSON.parse(c.inputJson) as unknown[],
        output: JSON.parse(c.outputJson),
        explanationMd: c.explanationMd,
      }),
    ),
    hints: hintRows.map((h) => ({ ord: h.ord, bodyMd: h.bodyMd })),
    statement: { template: "problem", sections: await loadSections(db, "problem", id, "statement") },
    solution: { template: "problem", sections: await loadSections(db, "problem", id, "solution") },
  };
}

/** A lesson (row and page), or null when missing or soft-deleted. */
export async function loadLesson(db: Queryable, id: string): Promise<ContentLesson | null> {
  const [r] = await db.select().from(lessons).where(eq(lessons.id, id));
  if (!r || r.deleted !== 0) return null;
  const row: LessonRow = {
    id: r.id,
    courseId: r.courseId,
    ord: r.ord,
    title: r.title,
    template: r.template as TemplateId,
    meta: JSON.parse(r.metaJson) as Record<string, unknown>,
  };
  return { row, page: { template: row.template, sections: await loadSections(db, "lesson", id) } };
}

/** A course row, or null when missing or soft-deleted. */
export async function loadCourse(db: Queryable, id: string): Promise<ContentCourse | null> {
  const [r] = await db.select().from(courses).where(eq(courses.id, id));
  if (!r || r.deleted !== 0) return null;
  const row: CourseRow = {
    id: r.id,
    area: r.area,
    title: r.title,
    summaryMd: r.summaryMd,
    ord: r.ord,
    data: JSON.parse(r.dataJson) as Record<string, unknown>,
  };
  return { row };
}

/** A doc, or null when missing or soft-deleted. `kind` and `id` are the doc's primary key. */
export async function loadDoc(db: Queryable, kind: string, id: string): Promise<ContentDoc | null> {
  const [r] = await db
    .select()
    .from(docs)
    .where(and(eq(docs.kind, kind), eq(docs.id, id)));
  if (!r || r.deleted !== 0) return null;
  return { row: { kind: r.kind, id: r.id, body: JSON.parse(r.bodyJson) } };
}
