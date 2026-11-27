import "server-only";
import { existsSync } from "node:fs";
import { asc, eq } from "drizzle-orm";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import {
  CONTENT_SCHEMA_VERSION,
  JUDGE_LANGS,
  verifyContent,
  type AssetRow,
  type CodeVariant,
  type ContentEntity,
  type ContentProblem,
  type ContentSnapshot,
  type Issue,
  type JudgeLang,
} from "@habit/shared";
import type { ContentDb } from "./client";
import { getContentVersion } from "./meta";
import { loadCourse, loadDoc, loadLesson, loadProblem } from "./load";
import * as schema from "./schema";
import { assets, courses, docs, lessons, problems } from "./schema";

/** The first line of a Python solution that opts out of the stress (large input) checks. */
export const SKIP_STRESS_LINE = "# verify: skip-stress";
/** Brute force blocks get this many times the normal time limit per case. */
export const BRUTE_TIME_MULTIPLIER = 5;

/** Every live problem of the database, by id. Soft-deleted problems are left out. */
export async function loadLiveProblems(db: ContentDb): Promise<ContentProblem[]> {
  const ids = await db.select({ id: problems.id }).from(problems).where(eq(problems.deleted, 0)).orderBy(asc(problems.id));
  const out: ContentProblem[] = [];
  for (const { id } of ids) {
    const p = await loadProblem(db, id);
    if (p) out.push(p);
  }
  return out;
}

/**
 * The whole live content of a database as one snapshot: every course, lesson, problem and doc that is not soft-deleted,
 * and every stored image. Ids are sorted so the same database always gives the same snapshot.
 */
export async function loadSnapshotFromDb(db: ContentDb): Promise<ContentSnapshot> {
  const entities: ContentEntity[] = [];

  for (const c of await db.select({ id: courses.id }).from(courses).where(eq(courses.deleted, 0)).orderBy(asc(courses.id))) {
    const course = await loadCourse(db, c.id);
    if (course) entities.push({ kind: "course", value: course });
  }
  for (const l of await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.deleted, 0)).orderBy(asc(lessons.id))) {
    const lesson = await loadLesson(db, l.id);
    if (lesson) entities.push({ kind: "lesson", value: lesson });
  }
  for (const p of await loadLiveProblems(db)) entities.push({ kind: "problem", value: p });
  for (const d of await db.select({ kind: docs.kind, id: docs.id }).from(docs).where(eq(docs.deleted, 0)).orderBy(asc(docs.kind), asc(docs.id))) {
    const doc = await loadDoc(db, d.kind, d.id);
    if (doc) entities.push({ kind: "doc", value: doc });
  }

  const assetRows: AssetRow[] = (await db.select().from(assets).orderBy(asc(assets.id))).map((a) => ({
    id: a.id,
    mime: a.mime as AssetRow["mime"],
    base64: Buffer.from(a.bytes).toString("base64"),
    width: a.width ?? null,
    height: a.height ?? null,
  }));

  return {
    schema: CONTENT_SCHEMA_VERSION,
    version: await getContentVersion(db),
    entities,
    assets: assetRows,
  };
}

/** Every issue of the database's live content (plan 0117 step 2: verifyContent on the database). */
export async function verifyDb(db: ContentDb): Promise<Issue[]> {
  return verifyContent(await loadSnapshotFromDb(db));
}

/**
 * Opens a content database file for reading without running migrations or writing anything. Throws when the file does
 * not exist. Callers close the returned client.
 */
export function openContentFile(file: string): { db: ContentDb; close: () => void } {
  if (!existsSync(file)) throw new Error(`no content database at ${file}`);
  const client = createClient({ url: `file:${file.replaceAll("\\", "/")}` });
  return { db: drizzle(client, { schema }), close: () => client.close() };
}

// ------------------------------------------------------------------------------------------------
// Solution selection (content:verify-solutions). Pure: no judge, no I/O.
// ------------------------------------------------------------------------------------------------

export interface SolutionSelection {
  /** Only these problem ids. Omitted: every problem. */
  ids?: readonly string[];
  /** Only these languages. Omitted: every judge language. */
  langs?: readonly JudgeLang[];
  /** Only brute force blocks (no stress, time limit x5). Omitted: every code block (brute with x5, the rest with stress). */
  brute?: boolean;
}

export interface SolutionJob {
  problemId: string;
  lang: JudgeLang;
  variant: CodeVariant;
  blockId: string;
  code: string;
  /** Run the problem's large inputs (stress). False for brute force blocks and Python blocks with the skip line. */
  stress: boolean;
  /** Multiplies the time limit of each case. */
  timeMultiplier: number;
}

/** The judge languages a block can be run in. */
function judgeLangsOf(langs: readonly JudgeLang[] | undefined): JudgeLang[] {
  const wanted = langs ?? JUDGE_LANGS;
  return JUDGE_LANGS.filter((l) => wanted.includes(l));
}

/**
 * Which code blocks to run, in order: problems, then blocks, then languages. A block needs a variant (brute, optimal,
 * semi or custom); blocks without one are display only and are skipped. Brute blocks run without stress and with the
 * time limit times five; every other block runs with stress.
 */
export function selectSolutionJobs(problems: readonly ContentProblem[], sel: SolutionSelection = {}): SolutionJob[] {
  const ids = sel.ids ? new Set(sel.ids) : null;
  const langs = judgeLangsOf(sel.langs);
  const jobs: SolutionJob[] = [];

  for (const p of problems) {
    const id = p.row.id;
    if (ids && !ids.has(id)) continue;
    for (const section of p.solution.sections) {
      for (const block of section.blocks) {
        if (block.type !== "code" || !block.variant) continue;
        if (sel.brute && block.variant !== "brute") continue;
        for (const lang of langs) {
          const code = block.code[lang];
          if (code === undefined) continue;
          const brute = block.variant === "brute";
          const skipStress = brute || (lang === "python" && firstLine(code) === SKIP_STRESS_LINE);
          jobs.push({
            problemId: id,
            lang,
            variant: block.variant,
            blockId: block.id,
            code,
            stress: !skipStress,
            timeMultiplier: brute ? BRUTE_TIME_MULTIPLIER : 1,
          });
        }
      }
    }
  }
  return jobs;
}

/** Ids in `ids` that no problem has. The script refuses to run with unknown ids. */
export function missingSolutionIds(problems: readonly ContentProblem[], ids: readonly string[]): string[] {
  const known = new Set(problems.map((p) => p.row.id));
  return ids.filter((id) => !known.has(id));
}

function firstLine(code: string): string {
  return code.replace(/\r\n?/g, "\n").split("\n")[0].trim();
}
