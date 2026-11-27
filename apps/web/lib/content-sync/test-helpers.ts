// Test helpers for the content sync (plan 0115 step 8). Not imported by app code.
// Two databases are needed at once (the hosted "server" and the local copy), so tests build their own :memory: clients
// instead of using client.ts's single cached connection.
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { CONTENT_SCHEMA_VERSION, type BlockRow, type ContentPage, type ContentProblem } from "@habit/shared";
import { sampleCourse, sampleDoc, sampleLesson, sampleProblem } from "../content-db/fixtures";
import { migrateContent, type ContentDb } from "../content-db/client";
import { getContentEpoch, getContentVersion } from "../content-db/meta";
import * as schema from "../content-db/schema";
import { putAsset, upsertCourse, upsertDoc, upsertLesson, upsertProblem } from "../content-db/write";
import { buildChanges, listUnits, unitPages, type ChangesPageBody } from "./serve";

/** A fresh, migrated, empty in-memory content database. */
export async function makeDb(): Promise<ContentDb> {
  const client = createClient({ url: ":memory:" });
  await migrateContent(client, false);
  return drizzle(client, { schema });
}

/** A copy of the sample problem with its own id and pattern. Section and block ids get the id as a prefix (they are global). */
export function problemIn(id: string, pattern: string | null, bodyPadding = ""): ContentProblem {
  const base = sampleProblem();
  const fixPage = (page: ContentPage): ContentPage => ({
    ...page,
    sections: page.sections.map((s) => ({
      ...s,
      id: `${id}:${s.id}`,
      blocks: s.blocks.map((b) => ({ ...b, id: `${id}:${b.id}`, body: b.body + bodyPadding })),
    })),
  });
  return {
    ...base,
    row: { ...base.row, id, pattern, title: `Problem ${id}` },
    statement: fixPage(base.statement),
    solution: fixPage(base.solution),
  };
}

/** The sample lesson with one image block that uses `assetId`. */
export function lessonWithImage(assetId: string) {
  const l = sampleLesson();
  const image: BlockRow = {
    id: "sd-caching-img",
    ord: 2,
    type: "image",
    body: "",
    caption: "Cache layers",
    variant: null,
    label: null,
    timeComplexity: null,
    spaceComplexity: null,
    assetId,
    code: {},
  };
  l.page.sections[0].blocks.push(image);
  return l;
}

/** A small valid PNG-like byte array; the database does not check image headers. */
export const SAMPLE_IMAGE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);

/**
 * Writes the sample content to the "server" database: one course with a lesson, one doc, three problems (two patterns
 * and one with no pattern), and one image. Every write is a change row, so the server version is the number of writes.
 */
export async function seedSite(db: ContentDb): Promise<{ assetId: string }> {
  const asset = await db.transaction((tx) => putAsset(tx, SAMPLE_IMAGE, "image/png", "seed", { width: 1, height: 1 }));
  await db.transaction((tx) => upsertCourse(tx, sampleCourse(), "seed"));
  await db.transaction((tx) => upsertLesson(tx, lessonWithImage(asset.id), "seed"));
  await db.transaction((tx) => upsertDoc(tx, sampleDoc(), "seed"));
  await db.transaction((tx) => upsertProblem(tx, problemIn("p-one", "hash-map"), "seed"));
  await db.transaction((tx) => upsertProblem(tx, problemIn("p-two", "two-pointers"), "seed"));
  await db.transaction((tx) => upsertProblem(tx, problemIn("p-other", null), "seed"));
  return { assetId: asset.id };
}

export type FakeSiteOptions = {
  /** Schema the "server" reports from /api/content/version. */
  schema?: number;
  /** Version the "server" reports, instead of the real one (for "server behind the copy" tests). */
  version?: number;
  /** Epoch the "server" reports, instead of the real one (for "epoch changed" tests). */
  epoch?: number;
  /** Throws a network error (a TypeError, as fetch does) for requests whose path+query matches. */
  failOn?: (pathAndQuery: string) => boolean;
  /** Edits a changes page before it is sent (for example to corrupt a rev). */
  badChanges?: (page: ChangesPageBody) => unknown;
};

export type FakeSite = {
  fetch: typeof fetch;
  /** Every request the client made: path and query. */
  log: string[];
  /** Every changes page sent, in order. */
  pages: ChangesPageBody[];
};

/** A fetch that answers like the hosted site, using the real server functions on `server`. */
export function fakeSite(server: ContentDb, opts: FakeSiteOptions = {}): FakeSite {
  const log: string[] = [];
  const pages: ChangesPageBody[] = [];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  const f = (async (input: RequestInfo | URL) => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href);
    const key = url.pathname + url.search;
    log.push(key);
    if (opts.failOn?.(key)) throw new TypeError("fetch failed");

    if (url.pathname === "/api/content/version") {
      return json({
        version: opts.version ?? (await getContentVersion(server)),
        schema: opts.schema ?? CONTENT_SCHEMA_VERSION,
        epoch: opts.epoch ?? (await getContentEpoch(server)),
      });
    }
    if (url.pathname === "/api/content/changes") {
      const since = Number(url.searchParams.get("since"));
      const raw = url.searchParams.get("units");
      const units = raw === null || raw === "all" ? null : raw.split(",");
      const result = await buildChanges(server, { since, units });
      if (result.gone) return json({ error: "gone", oldest: result.oldest }, 410);
      pages.push(result.page);
      return json(opts.badChanges ? opts.badChanges(result.page) : result.page);
    }
    if (url.pathname === "/api/content/units") return json(await listUnits(server));
    const m = /^\/api\/content\/unit\/(.+)$/.exec(url.pathname);
    if (m) {
      const pagesOfUnit = await unitPages(server, decodeURIComponent(m[1]));
      const page = pagesOfUnit[Number(url.searchParams.get("page") ?? 0)];
      return page ? json(page) : json({ error: "no such page" }, 404);
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  return { fetch: f, log, pages };
}

/** The whole content of a database, for "unchanged" checks: entity keys and their canonical JSON. */
export async function snapshotOf(db: ContentDb): Promise<string[]> {
  const { unitEntities } = await import("./serve");
  const units = ["course:sd", "problems:hash-map", "problems:two-pointers", "problems:other", "docs"];
  const out: string[] = [];
  for (const u of units) {
    for (const e of await unitEntities(db, u)) out.push(`${u} ${JSON.stringify(e)}`);
  }
  return out.sort();
}
