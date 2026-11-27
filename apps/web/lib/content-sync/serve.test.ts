import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { ContentDb } from "../content-db/client";
import { getContentVersion } from "../content-db/meta";
import { changes } from "../content-db/schema";
import { putAsset, softDelete, upsertLesson, upsertProblem } from "../content-db/write";
import { lessonWithImage, makeDb, problemIn, SAMPLE_IMAGE, seedSite } from "./test-helpers";
import { buildChanges, CHANGE_ENTITY_LIMIT, CHANGE_PAGE_BYTES, listUnits, UNIT_PAGE_BYTES, unitKind, unitPages } from "./serve";

let db: ContentDb;

beforeEach(async () => {
  db = await makeDb();
});

// seedSite writes 6 changes: course (1), lesson (2), doc (3), three problems (4, 5, 6). The image adds no change.
const SEEDED = 6;

describe("unitKind", () => {
  it("accepts course, problems and docs units only", () => {
    expect(unitKind("course:sd")).toBe("course");
    expect(unitKind("problems:two-pointers")).toBe("problems");
    expect(unitKind("problems:other")).toBe("problems");
    expect(unitKind("docs")).toBe("docs");
    expect(unitKind("../etc")).toBeNull();
    expect(unitKind("course:")).toBeNull();
  });
});

describe("listUnits", () => {
  it("lists every unit with its count, size and a stable rev", async () => {
    await seedSite(db);
    const units = await listUnits(db);
    expect(units.map((u) => u.unit)).toEqual(["course:sd", "problems:hash-map", "problems:other", "problems:two-pointers", "docs"]);
    const course = units.find((u) => u.unit === "course:sd");
    expect(course?.count).toBe(2); // the course row and its one lesson
    expect(course?.bytes).toBeGreaterThan(0);
    expect(course?.kind).toBe("course");
    expect(units.find((u) => u.unit === "problems:hash-map")?.count).toBe(1);

    const again = await listUnits(db);
    expect(again.map((u) => u.rev)).toEqual(units.map((u) => u.rev));
  });

  it("leaves soft-deleted entities out", async () => {
    await seedSite(db);
    await db.transaction((tx) => softDelete(tx, "problem", "p-one", "admin:1"));
    const units = await listUnits(db);
    expect(units.find((u) => u.unit === "problems:hash-map")).toBeUndefined();
  });
});

describe("unitPages", () => {
  it("returns no pages for a unit with nothing in it", async () => {
    expect(await unitPages(db, "problems:none-here")).toEqual([]);
  });

  it("returns one page with entities and the images they use", async () => {
    const { assetId } = await seedSite(db);
    const pages = await unitPages(db, "course:sd");
    expect(pages).toHaveLength(1);
    expect(pages[0].next).toBeUndefined();
    expect(pages[0].entities.map((e) => e.kind)).toEqual(["course", "lesson"]);
    expect(pages[0].assets).toEqual([
      { id: assetId, mime: "image/png", base64: Buffer.from(SAMPLE_IMAGE).toString("base64"), width: 1, height: 1 },
    ]);
  });

  it("splits a unit into pages of at most 3 MB and keeps every entity once", async () => {
    const padding = "x".repeat(150_000);
    for (let i = 0; i < 30; i++) {
      await db.transaction((tx) => upsertProblem(tx, problemIn(`big-${String(i).padStart(2, "0")}`, "sliding-window", padding), "seed"));
    }
    const pages = await unitPages(db, "problems:sliding-window");
    expect(pages.length).toBeGreaterThan(1);
    const ids = pages.flatMap((p) => p.entities.map((e) => (e.kind === "problem" ? e.value.row.id : "")));
    expect(ids).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    for (const [i, p] of pages.entries()) {
      expect(new TextEncoder().encode(JSON.stringify(p)).length).toBeLessThanOrEqual(UNIT_PAGE_BYTES);
      expect(p.next).toBe(i < pages.length - 1 ? i + 1 : undefined);
    }
  });
});

describe("buildChanges", () => {
  it("returns the changes after since with the current state, rev and note", async () => {
    await seedSite(db);
    const edited = problemIn("p-one", "hash-map");
    edited.hints = [{ ord: 0, bodyMd: "A new first hint." }];
    await db.transaction((tx) => upsertProblem(tx, edited, "admin:1", undefined, { note: "Clearer hint" }));

    const result = await buildChanges(db, { since: SEEDED, units: null });
    if (result.gone) throw new Error("unexpected 410");
    expect(result.page.changes).toHaveLength(1);
    const entry = result.page.changes[0];
    expect(entry).toMatchObject({ op: "upsert", id: "p-one", parts: ["hints"], note: "Clearer hint", notify: false });
    expect(Object.keys(entry.data ?? {})).toEqual(["hints"]);
    expect(result.page.to).toBe(SEEDED + 1);
    expect(result.page.next).toBeUndefined();
    expect(result.page.schema).toBe(1);
  });

  it("merges several changes of one entity into one entry with the union of parts", async () => {
    await seedSite(db);
    const base = problemIn("p-one", "hash-map");
    const hinted = { ...base, hints: [{ ord: 0, bodyMd: "Hint A." }] };
    const cased = { ...hinted, cases: [...base.cases, { ord: 2, role: "test" as const, input: [1, 2], output: 3, explanationMd: null }] };
    await db.transaction((tx) => upsertProblem(tx, hinted, "admin:1"));
    await db.transaction((tx) => upsertProblem(tx, cased, "admin:1"));
    const result = await buildChanges(db, { since: SEEDED, units: null });
    if (result.gone) throw new Error("unexpected 410");
    expect(result.page.changes).toHaveLength(1);
    expect(result.page.changes[0].parts.sort()).toEqual(["cases", "hints"]);
    expect(result.page.changes[0].version).toBe(SEEDED + 2);
  });

  it("sends a delete as an op delete with no data", async () => {
    await seedSite(db);
    await db.transaction((tx) => softDelete(tx, "problem", "p-two", "admin:1"));
    const result = await buildChanges(db, { since: SEEDED, units: null });
    if (result.gone) throw new Error("unexpected 410");
    expect(result.page.changes).toHaveLength(1);
    expect(result.page.changes[0]).toMatchObject({ op: "delete", id: "p-two", parts: ["all"] });
    expect(result.page.changes[0].data).toBeUndefined();
  });

  it("filters by unit", async () => {
    await seedSite(db);
    const edited = problemIn("p-one", "hash-map");
    edited.hints = [{ ord: 0, bodyMd: "Changed." }];
    await db.transaction((tx) => upsertProblem(tx, edited, "admin:1"));

    const docsOnly = await buildChanges(db, { since: SEEDED, units: ["docs"] });
    if (docsOnly.gone) throw new Error("unexpected 410");
    expect(docsOnly.page.changes).toEqual([]);
    expect(docsOnly.page.to).toBe(await getContentVersion(db));

    const hashMap = await buildChanges(db, { since: 0, units: ["problems:hash-map"] });
    if (hashMap.gone) throw new Error("unexpected 410");
    expect(hashMap.page.changes.map((c) => c.id)).toEqual(["p-one"]);
  });

  it("sends a new image with the section that uses it, as an asset part", async () => {
    const { assetId } = await seedSite(db);
    const second = await db.transaction((tx) => putAsset(tx, new Uint8Array([1, 2, 3, 4]), "image/webp", "admin:1", { width: 2, height: 2 }));
    const lesson = lessonWithImage(assetId);
    lesson.page.sections[0].blocks.push({ ...lesson.page.sections[0].blocks[2], id: "sd-caching-img2", ord: 3, assetId: second.id, caption: "New" });
    await db.transaction((tx) => upsertLesson(tx, lesson, "admin:1"));

    const result = await buildChanges(db, { since: SEEDED, units: null });
    if (result.gone) throw new Error("unexpected 410");
    const entry = result.page.changes[0];
    expect(entry.parts.sort()).toEqual([`asset:${second.id}`, "section:sd-caching-overview"].sort());
    const asset = entry.data?.[`asset:${second.id}`] as { base64: string; mime: string } | null;
    expect(asset?.mime).toBe("image/webp");
    expect(Buffer.from(asset?.base64 ?? "", "base64")).toEqual(Buffer.from([1, 2, 3, 4]));
  });

  it("pages at 200 entities and gives a next cursor", async () => {
    for (let i = 0; i < CHANGE_ENTITY_LIMIT + 1; i++) {
      await db.transaction((tx) => upsertProblem(tx, problemIn(`many-${String(i).padStart(3, "0")}`, "stacks"), "seed"));
    }
    const first = await buildChanges(db, { since: 0, units: null });
    if (first.gone) throw new Error("unexpected 410");
    expect(first.page.changes).toHaveLength(CHANGE_ENTITY_LIMIT);
    expect(first.page.next).toBe(CHANGE_ENTITY_LIMIT);
    expect(first.page.to).toBe(first.page.next);

    const second = await buildChanges(db, { since: first.page.next as number, units: null });
    if (second.gone) throw new Error("unexpected 410");
    expect(second.page.changes).toHaveLength(1);
    expect(second.page.next).toBeUndefined();
    expect(second.page.to).toBe(await getContentVersion(db));
  });

  it("answers 410 when since is older than the oldest kept change", async () => {
    await seedSite(db);
    await db.delete(changes).where(sql`version < 4`);
    expect((await buildChanges(db, { since: 0, units: null })).gone).toBe(true);
    expect((await buildChanges(db, { since: 2, units: null })).gone).toBe(true);
    expect((await buildChanges(db, { since: 3, units: null })).gone).toBe(false);
  });

  it("splits changes pages at 3 MB and keeps every entity once, with the cursor exact", async () => {
    const padding = "x".repeat(400_000);
    for (let i = 0; i < 6; i++) {
      await db.transaction((tx) => upsertProblem(tx, problemIn(`heavy-${i}`, "stacks", padding), "seed"));
    }
    const seen: string[] = [];
    let since = 0;
    let pages = 0;
    for (;;) {
      const r = await buildChanges(db, { since, units: null });
      if (r.gone) throw new Error("unexpected 410");
      pages++;
      expect(new TextEncoder().encode(JSON.stringify(r.page)).length).toBeLessThanOrEqual(CHANGE_PAGE_BYTES);
      for (const c of r.page.changes) seen.push(c.id);
      if (r.page.next === undefined) break;
      expect(r.page.to).toBe(r.page.next);
      since = r.page.next;
    }
    expect(pages).toBeGreaterThan(1);
    expect(seen.sort()).toEqual(["heavy-0", "heavy-1", "heavy-2", "heavy-3", "heavy-4", "heavy-5"]);
  });
});
