// One-time copy of the content files into the content database (plan 0112 steps 5 to 7). It reads the shared exports
// through the wave 1 mappers and writes them with the write helpers, 50 entities per transaction. Running it again
// changes nothing: every write is skipped when the rev is the same. Pure data in, database writes out; no app code.
//
// Used by scripts/content-seed-db.mjs (the command) and seed.test.ts (parity). Not imported by any page.
import {
  ALL_PATTERNS,
  CP_ALGO_ARTICLES,
  CLUES,
  COMPLEXITY_TABLE,
  CONSTRAINT_HINTS,
  DESIGN_DEEP,
  DOC_KINDS,
  INTERVIEW,
  JUDGE_PROBLEMS,
  KEY_NUMBERS,
  LAST_DAYS_PLAN,
  LEETCODE_TAGS,
  LESSONS,
  LESSON_EXTRA,
  LLD_DEEP,
  LLD_EXTRA,
  LLD_GUIDES,
  LLD_PROJECTS,
  OPTIMIZE_MOVES,
  PATTERN_ARTICLES,
  PATTERN_COURSE_ID,
  PATTERN_GUIDES,
  PROBLEMS,
  QUIZ_DECK,
  READING,
  READING_ROUTINE,
  STUDY_AREAS,
  THINK_PATTERNS,
  THINK_SIGNALS,
  WALKTHROUGHS,
  WALKTHROUGH_EXTRA,
  WORKED_EXAMPLES,
  docFromFile,
  lessonFromFile,
  problemFromSpec,
  type ContentCourse,
  type ContentDoc,
  type ContentLesson,
  type ContentProblem,
  type ProblemExtra,
  type TemplateId,
  courseFromStudyArea,
  DSA_GROUPS,
} from "@habit/shared";
// Not in the barrel: the bundles (Java, Python, brute force) are read through the solutions entry point, as the app does.
import { BRUTE, SOLUTIONS } from "@habit/shared/solutions";
import type { ContentDb } from "./client";
import { getContentVersion, setMeta } from "./meta";
import { upsertCourse, upsertDoc, upsertLesson, upsertProblem } from "./write";

export interface SeedOptions {
  /** Recorded in `changes.actor`. */
  actor?: string;
  /** Entities per transaction. */
  batch?: number;
  /** Write nothing: every batch is rolled back, but the counts say what a real run would change. */
  dryRun?: boolean;
  /** Stored as `content_meta.seeded_from` (the git commit the files came from). Not set on a dry run. */
  seededFrom?: string;
}

export type EntityKindName = "course" | "lesson" | "problem" | "doc";

export interface SeedCounts {
  courses: number;
  lessons: number;
  page_sections: number;
  blocks: number;
  block_code: number;
  problems: number;
  test_cases: number;
  hints: number;
  docs: number;
  assets: number;
}

export interface SeedReport {
  dryRun: boolean;
  /** Rows each table gets from the files (before any rev check). */
  counts: SeedCounts;
  /** Entities written (or that would be written on a real run). */
  changed: number;
  unchanged: number;
  changedByKind: Record<EntityKindName, number>;
  /** The content version after the run (on a dry run: the version a real run would reach). */
  version: number;
}

/** A lesson as it is read from the files: enough to rebuild the lesson and to compare it with the database. */
export interface LessonSource {
  kind: TemplateId;
  id: string;
  value: Parameters<typeof lessonFromFile>[2];
  ctx: Parameters<typeof lessonFromFile>[3];
}

/** A list-like constant as it is read from the files. `body` is the value the doc row holds. */
export interface DocSource {
  kind: string;
  id: string;
  body: unknown;
}

export interface SeedEntities {
  courses: ContentCourse[];
  lessons: ContentLesson[];
  problems: ContentProblem[];
  docs: ContentDoc[];
}

type DocKind = keyof typeof DOC_KINDS;

export const PATTERN_COURSE_TITLE = "DSA patterns";
const PATTERN_COURSE_SUMMARY = "Pattern guides and full articles for the DSA roadmap. Each pattern has a short guide and, where written, an article.";

/** Roadmap pattern of each problem id (dsa.ts DSA_GROUPS). A problem listed twice keeps its first pattern. */
export function roadmapPatternOf(): Map<string, string> {
  const out = new Map<string, string>();
  for (const pattern of ALL_PATTERNS) {
    for (const id of pattern.problems) if (!out.has(id)) out.set(id, pattern.id);
  }
  return out;
}

/** The interview walkthrough says "brute: same" when the direct approach is already optimal. */
function bruteSameOf(md: string | undefined): boolean {
  return md !== undefined && /brute:\s*same/i.test(md);
}

/** The extra inputs of one problem, read from the generated bundles (Java, Python, brute force, walkthrough). */
export function problemExtraOf(id: string): ProblemExtra {
  const sol = SOLUTIONS[id] ?? {};
  const brute = BRUTE[id];
  const md = INTERVIEW[id]?.md;
  return {
    java: sol.java,
    python: sol.python,
    brute: brute as ProblemExtra["brute"],
    interviewMd: md,
    bruteSame: bruteSameOf(md),
  };
}

/** Every built-in problem, with the roadmap pattern filled in where the spec has none. */
export function problemEntities(): ContentProblem[] {
  const roadmap = roadmapPatternOf();
  return Object.keys(JUDGE_PROBLEMS).map((id) => {
    const p = problemFromSpec(JUDGE_PROBLEMS[id], problemExtraOf(id));
    if (p.row.pattern === null && roadmap.has(id)) p.row.pattern = roadmap.get(id) ?? null;
    return p;
  });
}

/** The 89 concept lessons, 27 design, 24 LLD, 76 pattern guides and 71 articles, with the course and order each one gets. */
export function lessonSources(): LessonSource[] {
  const out: LessonSource[] = [];

  const concept = new Map<string, { area: string; ord: number; title: string; points: string[] }>();
  for (const area of STUDY_AREAS) {
    let ord = 0;
    for (const section of area.sections) {
      for (const c of section.concepts) concept.set(c.id, { area: area.id, ord: ord++, title: c.title, points: c.points });
    }
  }
  for (const id of Object.keys(LESSONS)) {
    const info = concept.get(id);
    if (!info) throw new Error(`concept lesson "${id}" is not in any study area`);
    out.push({
      kind: "concept",
      id,
      value: { lesson: LESSONS[id], extra: LESSON_EXTRA[id] },
      ctx: { courseId: info.area, ord: info.ord, title: info.title, points: info.points },
    });
  }

  // Exercises come after the area's concepts, so their ord continues the concept numbering (no duplicate ord per course).
  const exercise = new Map<string, { area: string; ord: number; title: string }>();
  for (const area of STUDY_AREAS) {
    const conceptCount = area.sections.reduce((n, s) => n + s.concepts.length, 0);
    (area.exercises?.items ?? []).forEach((e, i) => exercise.set(e.id, { area: area.id, ord: conceptCount + i, title: e.title }));
  }
  for (const id of Object.keys(WALKTHROUGHS)) {
    const info = exercise.get(id);
    if (!info) throw new Error(`design walkthrough "${id}" is not a study exercise`);
    out.push({
      kind: "design",
      id,
      value: { walkthrough: WALKTHROUGHS[id], deep: DESIGN_DEEP[id], extra: WALKTHROUGH_EXTRA[id] },
      ctx: { courseId: info.area, ord: info.ord, title: info.title },
    });
  }
  for (const id of Object.keys(LLD_GUIDES)) {
    const info = exercise.get(id);
    if (!info) throw new Error(`LLD guide "${id}" is not a study exercise`);
    out.push({
      kind: "lld",
      id,
      value: { guide: LLD_GUIDES[id], deep: LLD_DEEP[id], extra: LLD_EXTRA[id] },
      ctx: { courseId: info.area, ord: info.ord, title: info.title },
    });
  }

  const patternOrd = new Map(ALL_PATTERNS.map((p, i) => [p.id, i]));
  const patternName = (id: string) => ALL_PATTERNS.find((p) => p.id === id)?.name ?? id;
  for (const id of Object.keys(PATTERN_GUIDES)) {
    out.push({
      kind: "pattern",
      id: `pattern-${id}`,
      value: { guide: PATTERN_GUIDES[id] },
      ctx: { courseId: PATTERN_COURSE_ID, ord: patternOrd.get(id) ?? 999, title: patternName(id) },
    });
  }
  for (const id of Object.keys(PATTERN_ARTICLES)) {
    out.push({
      kind: "article",
      id: `article-${id}`,
      value: { article: PATTERN_ARTICLES[id] },
      ctx: { courseId: PATTERN_COURSE_ID, ord: 1000 + (patternOrd.get(id) ?? 999), title: `${patternName(id)} (article)` },
    });
  }
  return out;
}

/** The lessons as lesson rows and pages, built from the sources. */
export function lessonEntities(): ContentLesson[] {
  const seen = new Set<string>();
  return lessonSources().map((s) => {
    if (seen.has(s.id)) throw new Error(`duplicate lesson id "${s.id}"`);
    seen.add(s.id);
    return lessonFromFile(s.kind, s.id, s.value, s.ctx);
  });
}

/**
 * Every list-like constant as one doc each (plan 0112 step 1). Doc ids are "main" for single constants, and the lesson
 * id for LLD projects. `dsa-problems` is the roadmap list (dsa.ts PROBLEMS).
 */
export function docSources(): DocSource[] {
  const single: [DocKind, unknown][] = [
    ["reading", READING],
    ["revise-plan", LAST_DAYS_PLAN],
    ["key-numbers", KEY_NUMBERS],
    ["complexity-table", COMPLEXITY_TABLE],
    ["quiz-deck", QUIZ_DECK],
    ["constraint-hints", CONSTRAINT_HINTS],
    ["leetcode-tags", LEETCODE_TAGS],
    ["think-patterns", THINK_PATTERNS],
    ["think-signals", THINK_SIGNALS],
    ["reading-routine", READING_ROUTINE],
    ["clues", CLUES],
    ["worked-examples", WORKED_EXAMPLES],
    ["optimize-moves", OPTIMIZE_MOVES],
    ["cp-algorithms", CP_ALGO_ARTICLES],
  ];
  const out: DocSource[] = single.map(([kind, value]) => ({ kind, id: "main", body: docFromFile(kind, "main", value).row.body }));
  for (const id of Object.keys(LLD_PROJECTS)) {
    out.push({ kind: "lld-project", id, body: docFromFile("lld-project", id, LLD_PROJECTS[id]).row.body });
  }
  // Not a DOC_KINDS entry: the roadmap list is not a lesson constant. Built here as a plain doc.
  out.push({ kind: "dsa-problems", id: "main", body: PROBLEMS });
  out.push({ kind: "dsa-groups", id: "main", body: DSA_GROUPS });
  return out;
}

export function docEntities(): ContentDoc[] {
  return docSources().map((d) => ({ row: { kind: d.kind, id: d.id, body: d.body } }));
}

/** Course rows: the three study areas and the pattern course (which has no file of its own). */
export function courseEntities(): ContentCourse[] {
  const areas = STUDY_AREAS.map((area, ord) => courseFromStudyArea(area, ord));
  areas.push({
    row: { id: PATTERN_COURSE_ID, area: "dsa", title: PATTERN_COURSE_TITLE, summaryMd: PATTERN_COURSE_SUMMARY, ord: areas.length, data: {} },
  });
  return areas;
}

/** Everything the seed writes, built from the files. Pure: no database. */
export function buildSeedEntities(): SeedEntities {
  return { courses: courseEntities(), lessons: lessonEntities(), problems: problemEntities(), docs: docEntities() };
}

/** Rows per table, as the files produce them. */
export function countTables(e: SeedEntities): SeedCounts {
  const counts: SeedCounts = {
    courses: e.courses.length,
    lessons: e.lessons.length,
    page_sections: 0,
    blocks: 0,
    block_code: 0,
    problems: e.problems.length,
    test_cases: 0,
    hints: 0,
    docs: e.docs.length,
    assets: 0,
  };
  const addPage = (sections: { blocks: { code: Record<string, unknown> }[] }[]) => {
    counts.page_sections += sections.length;
    for (const s of sections) {
      counts.blocks += s.blocks.length;
      for (const b of s.blocks) counts.block_code += Object.keys(b.code).length;
    }
  };
  for (const l of e.lessons) addPage(l.page.sections);
  for (const p of e.problems) {
    counts.test_cases += p.cases.length;
    counts.hints += p.hints.length;
    addPage(p.statement.sections);
    addPage(p.solution.sections);
  }
  return counts;
}

type Item = { kind: EntityKindName; value: ContentCourse | ContentLesson | ContentProblem | ContentDoc };

const DRY_RUN_ROLLBACK = Symbol("dry-run rollback");

/**
 * Writes every entity through the write helpers, `batch` per transaction. Returns the counts and what changed. Re-running
 * on a seeded database reports `changed: 0`.
 */
export async function seedContent(db: ContentDb, opts: SeedOptions = {}): Promise<SeedReport> {
  const actor = opts.actor ?? "seed";
  const batch = Math.max(1, opts.batch ?? 50);
  const dryRun = opts.dryRun === true;
  const entities = buildSeedEntities();

  const items: Item[] = [
    ...entities.courses.map((value) => ({ kind: "course" as const, value })),
    ...entities.lessons.map((value) => ({ kind: "lesson" as const, value })),
    ...entities.problems.map((value) => ({ kind: "problem" as const, value })),
    ...entities.docs.map((value) => ({ kind: "doc" as const, value })),
  ];

  const changedByKind: Record<EntityKindName, number> = { course: 0, lesson: 0, problem: 0, doc: 0 };
  let changed = 0;

  for (let i = 0; i < items.length; i += batch) {
    const slice = items.slice(i, i + batch);
    const written: { kind: EntityKindName; changed: boolean }[] = [];
    const work = async (tx: Parameters<Parameters<ContentDb["transaction"]>[0]>[0]) => {
      for (const it of slice) {
        const r =
          it.kind === "course"
            ? await upsertCourse(tx, it.value as ContentCourse, actor)
            : it.kind === "lesson"
              ? await upsertLesson(tx, it.value as ContentLesson, actor)
              : it.kind === "problem"
                ? await upsertProblem(tx, it.value as ContentProblem, actor)
                : await upsertDoc(tx, it.value as ContentDoc, actor);
        written.push({ kind: it.kind, changed: r.changed });
      }
    };

    if (dryRun) {
      // A rollback keeps the database as it was, but the write helpers still say what they would change.
      try {
        await db.transaction(async (tx) => {
          await work(tx);
          throw DRY_RUN_ROLLBACK;
        });
      } catch (err) {
        if (err !== DRY_RUN_ROLLBACK) throw err;
      }
    } else {
      await db.transaction(work);
    }

    for (const w of written) {
      if (!w.changed) continue;
      changed++;
      changedByKind[w.kind]++;
    }
  }

  if (!dryRun && opts.seededFrom !== undefined) {
    const from = opts.seededFrom;
    await db.transaction((tx) => setMeta(tx, "seeded_from", from));
  }

  // Each changed entity adds one `changes` row, so a real run ends at the current version plus the number of changes.
  const current = await getContentVersion(db);
  const version = dryRun ? current + changed : await getContentVersion(db);
  return {
    dryRun,
    counts: countTables(entities),
    changed,
    unchanged: items.length - changed,
    changedByKind,
    version,
  };
}
