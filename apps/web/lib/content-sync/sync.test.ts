import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { CONTENT_SCHEMA_VERSION } from "@habit/shared";
import type { ContentDb } from "../content-db/client";
import { getContentVersion, getMeta, getSyncedEpoch, setContentEpoch } from "../content-db/meta";
import { loadLesson, loadProblem } from "../content-db/load";
import { changes } from "../content-db/schema";
import { softDelete, upsertLesson, upsertProblem } from "../content-db/write";
import { lessonWithImage, makeDb, problemIn, fakeSite, seedSite, type FakeSite } from "./test-helpers";
import { syncContent, SYNC_META } from "./sync";

let server: ContentDb;
let client: ContentDb;
let site: FakeSite;

const ORIGIN = "https://site.test";

function run(units: "all" | string[] = "all", now = Date.now()) {
  return syncContent({ db: client, fetch: site.fetch, origin: ORIGIN, units, now });
}

function resetLog() {
  site.log.length = 0;
  site.pages.length = 0;
}

beforeEach(async () => {
  server = await makeDb();
  client = await makeDb();
  await seedSite(server);
  site = fakeSite(server);
});

describe("syncContent", () => {
  it("a fresh copy arrives through the changes feed, images included", async () => {
    const r = await run();
    expect(r.status).toBe("updated");
    expect(r.version).toBe(await getContentVersion(server));
    expect(await loadProblem(client, "p-one")).toEqual(await loadProblem(server, "p-one"));
    expect(await loadLesson(client, "sd-caching")).toEqual(await loadLesson(server, "sd-caching"));
    const asset = await client.run(sql`SELECT count(*) AS n FROM assets`);
    expect(asset.rows[0][0]).toBe(1);
    expect(site.log.some((l) => l.startsWith("/api/content/unit/"))).toBe(false);
    expect(await getMeta(client, SYNC_META.status)).toBe("updated");
  });

  it("when up to date, only the version is asked", async () => {
    await run();
    resetLog();
    const r = await run();
    expect(r.status).toBe("up-to-date");
    expect(site.log).toEqual(["/api/content/version"]);
  });

  it("one hint edited: only the hints are sent and applied", async () => {
    await run();
    resetLog();
    const edited = problemIn("p-one", "hash-map");
    edited.hints = [{ ord: 0, bodyMd: "Clearer hint." }];
    await server.transaction((tx) => upsertProblem(tx, edited, "admin:1", undefined, { note: "Clearer hint 1" }));
    const r = await run();
    expect(r.applied).toBe(1);
    expect(site.log).toEqual(["/api/content/version", "/api/content/changes?since=6&units=all"]);
    const sent = site.pages[0].changes;
    expect(sent.map((c) => c.parts)).toEqual([["hints"]]);
    expect(Object.keys(sent[0].data ?? {})).toEqual(["hints"]);
    expect(await loadProblem(client, "p-one")).toEqual(await loadProblem(server, "p-one"));
  });

  it("a section edit sends and applies only that section", async () => {
    await run();
    resetLog();
    const assetId = (await client.run(sql`SELECT id FROM assets`)).rows[0][0] as string;
    const lesson = lessonWithImage(assetId);
    lesson.page.sections[0].blocks[1].body = "A diagram changed.";
    await server.transaction((tx) => upsertLesson(tx, lesson, "admin:1"));
    await run();
    const entry = site.pages[0].changes[0];
    expect(entry.parts).toEqual(["section:sd-caching-overview"]);
    expect(Object.keys(entry.data ?? {})).toEqual(["section:sd-caching-overview"]);
    expect(await loadLesson(client, "sd-caching")).toEqual(await loadLesson(server, "sd-caching"));
  });

  it("a unit filter leaves other units' changes out and still moves the version", async () => {
    await run();
    const edited = problemIn("p-one", "hash-map");
    edited.hints = [{ ord: 0, bodyMd: "Filtered out." }];
    await server.transaction((tx) => upsertProblem(tx, edited, "admin:1"));
    const r = await run(["problems:two-pointers"]);
    expect(r.applied).toBe(0);
    expect(await getContentVersion(client)).toBe(await getContentVersion(server));
    expect((await loadProblem(client, "p-one"))?.hints[0].bodyMd).not.toBe("Filtered out.");
  });

  it("a delete removes the entity on the client", async () => {
    await run();
    await server.transaction((tx) => softDelete(tx, "problem", "p-two", "admin:1"));
    await run();
    expect(await loadProblem(client, "p-two")).toBeNull();
  });

  it("a rev that does not match is repaired by downloading the unit again", async () => {
    await run();
    const edited = problemIn("p-one", "hash-map");
    edited.hints = [{ ord: 0, bodyMd: "Repaired." }];
    await server.transaction((tx) => upsertProblem(tx, edited, "admin:1"));
    site = fakeSite(server, {
      badChanges: (page) => ({ ...page, changes: page.changes.map((c) => ({ ...c, rev: "0000000000000000" })) }),
    });
    const r = await run();
    expect(r.status).toBe("updated");
    expect(site.log.some((l) => l.startsWith("/api/content/unit/"))).toBe(true);
    expect(await loadProblem(client, "p-one")).toEqual(await loadProblem(server, "p-one"));
    expect(await getContentVersion(client)).toBe(await getContentVersion(server));
  });

  it("too far behind (410): every followed unit is downloaded again", async () => {
    await run();
    await server.transaction((tx) => upsertProblem(tx, problemIn("p-three", "stacks"), "admin:1"));
    await server.delete(changes).where(sql`version < 8`);
    client = await makeDb();
    site = fakeSite(server);
    const r = await run(["problems:hash-map", "problems:stacks"]);
    expect(r.status).toBe("updated");
    expect(site.log.some((l) => l.startsWith("/api/content/unit/problems%3Ahash-map"))).toBe(true);
    expect(await loadProblem(client, "p-one")).toEqual(await loadProblem(server, "p-one"));
    expect(await loadProblem(client, "p-three")).toEqual(await loadProblem(server, "p-three"));
    expect(await getContentVersion(client)).toBe(await getContentVersion(server));
  });

  it("a network error during a unit download leaves the old copy untouched", async () => {
    await run();
    const before = await loadProblem(client, "p-one");
    const version = await getContentVersion(client);
    await server.transaction((tx) => upsertProblem(tx, problemIn("p-one", "hash-map", "more"), "admin:1"));
    await server.transaction((tx) => upsertProblem(tx, problemIn("p-one", "hash-map", "more2"), "admin:1"));
    await server.delete(changes).where(sql`version < 8`);
    site = fakeSite(server, { failOn: (p) => p.startsWith("/api/content/unit/") });
    const r = await run(["problems:hash-map"]);
    expect(r.status).toBe("offline");
    expect(await getContentVersion(client)).toBe(version);
    expect(await loadProblem(client, "p-one")).toEqual(before);
  });

  it("a network error on the changes request writes nothing", async () => {
    await run();
    const version = await getContentVersion(client);
    await server.transaction((tx) => upsertProblem(tx, problemIn("p-one", "hash-map", "x"), "admin:1"));
    site = fakeSite(server, { failOn: (p) => p.startsWith("/api/content/changes") });
    const r = await run();
    expect(r.status).toBe("offline");
    expect(await getContentVersion(client)).toBe(version);
  });

  it("a server schema newer than this app: app-too-old and nothing written", async () => {
    site = fakeSite(server, { schema: CONTENT_SCHEMA_VERSION + 1 });
    const r = await run();
    expect(r.status).toBe("app-too-old");
    expect(await getContentVersion(client)).toBe(0);
    expect(await loadProblem(client, "p-one")).toBeNull();
    expect(await getMeta(client, SYNC_META.status)).toBe("app-too-old");
  });

  it("malformed changes data is an error and writes nothing", async () => {
    site = fakeSite(server, { badChanges: () => ({ nope: true }) });
    const r = await run();
    expect(r.status).toBe("error");
    expect(await getContentVersion(client)).toBe(0);
    expect(await loadProblem(client, "p-one")).toBeNull();
    expect(await getMeta(client, SYNC_META.error)).toContain("changes");
  });

  it("stores when it last checked", async () => {
    await run("all", 1_700_000_000_000);
    expect(await getMeta(client, SYNC_META.checkedAt)).toBe("1700000000000");
  });
});

describe("full resync by epoch (plan 0115 rule 6)", () => {
  it("a different epoch downloads every followed unit again, in full, and reports refreshed", async () => {
    await run();
    await server.transaction((tx) => setContentEpoch(tx, 2));
    resetLog();
    const r = await run();
    expect(r.status).toBe("updated");
    expect(r.refreshed).toBe(true);
    expect(site.log.some((l) => l.startsWith("/api/content/units?"))).toBe(true);
    expect(site.log.some((l) => l.startsWith("/api/content/unit/"))).toBe(true);
    expect(site.log.some((l) => l.startsWith("/api/content/changes"))).toBe(false);
    expect(await getSyncedEpoch(client)).toBe(2);
    expect(await getContentVersion(client)).toBe(await getContentVersion(server));
    expect(await loadProblem(client, "p-one")).toEqual(await loadProblem(server, "p-one"));
    expect(await loadLesson(client, "sd-caching")).toEqual(await loadLesson(server, "sd-caching"));
  });

  it("a full resync removes what the server no longer has", async () => {
    await run();
    await server.transaction((tx) => softDelete(tx, "problem", "p-two", "admin:1"));
    await server.transaction((tx) => setContentEpoch(tx, 2));
    const r = await run();
    expect(r.refreshed).toBe(true);
    expect(await loadProblem(client, "p-two")).toBeNull();
    expect(await loadProblem(client, "p-one")).toEqual(await loadProblem(server, "p-one"));
  });

  it("a server version lower than the copy's (restored database) downloads everything", async () => {
    await run();
    resetLog();
    site = fakeSite(server, { version: 1 });
    const r = await run();
    expect(r.refreshed).toBe(true);
    expect(site.log.some((l) => l.startsWith("/api/content/unit/"))).toBe(true);
    expect(site.log.some((l) => l.startsWith("/api/content/changes"))).toBe(false);
    expect(await getContentVersion(client)).toBe(1);
  });

  it("the same epoch and version downloads nothing and does not report refreshed", async () => {
    await run();
    resetLog();
    const r = await run();
    expect(r.status).toBe("up-to-date");
    expect(r.refreshed).toBe(false);
    expect(site.log).toEqual(["/api/content/version"]);
  });

  it("an empty copy takes the server's epoch and fills through the changes feed", async () => {
    const r = await run();
    expect(r.refreshed).toBe(false);
    expect(site.log.some((l) => l.startsWith("/api/content/unit/"))).toBe(false);
    expect(await getSyncedEpoch(client)).toBe(1);
  });

  it("a copy with content but no recorded epoch (installer or seeded copy) downloads everything once, silently", async () => {
    await run();
    await client.run(sql`DELETE FROM content_meta WHERE k = 'synced_epoch'`);
    const r = await run();
    // Not a "refresh" the learner should hear about: this copy never synced before. It must not repeat either.
    expect(r.refreshed).toBe(false);
    expect(await getSyncedEpoch(client)).toBe(1);
    const again = await run();
    expect(again.refreshed).toBe(false);
    expect(again.status).toBe("up-to-date");
  });
});

