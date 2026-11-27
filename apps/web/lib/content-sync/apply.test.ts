import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { ContentDb } from "../content-db/client";
import { getContentVersion } from "../content-db/meta";
import { loadProblem } from "../content-db/load";
import { changes } from "../content-db/schema";
import { softDelete, upsertProblem } from "../content-db/write";
import { applyChanges, applyUnits, type ChangePage } from "./apply";
import { buildChanges, unitPages } from "./serve";
import { makeDb, problemIn, seedSite } from "./test-helpers";

let server: ContentDb;
let client: ContentDb;

beforeEach(async () => {
  server = await makeDb();
  client = await makeDb();
  await seedSite(server);
});

async function fullCopy(units: string[]) {
  const pages = [];
  for (const unit of units) {
    for (const p of await unitPages(server, unit)) pages.push({ unit, entities: p.entities, assets: p.assets });
  }
  return applyUnits(client, pages, { version: await getContentVersion(server) });
}

async function changesSince(since: number): Promise<ChangePage> {
  const r = await buildChanges(server, { since, units: null });
  if (r.gone) throw new Error("unexpected 410");
  return r.page;
}

async function clientChangeRows(): Promise<number> {
  return (await client.select().from(changes)).length;
}

describe("applyUnits", () => {
  it("copies whole units, writes no change rows and sets the version", async () => {
    const r = await fullCopy(["course:sd", "problems:hash-map", "problems:two-pointers", "problems:other", "docs"]);
    expect(r.tags).toContain("content");
    expect(await loadProblem(client, "p-one")).toEqual(await loadProblem(server, "p-one"));
    expect(await clientChangeRows()).toBe(0);
    expect(await getContentVersion(client)).toBe(await getContentVersion(server));
  });

  it("an entity moved to another unit ends in the new one, once", async () => {
    await fullCopy(["problems:hash-map", "problems:two-pointers"]);
    await server.transaction((tx) => upsertProblem(tx, problemIn("p-one", "two-pointers"), "admin:1"));
    const moved = await unitPages(server, "problems:two-pointers");
    await applyUnits(client, [
      { unit: "problems:hash-map", entities: [], assets: [] },
      { unit: "problems:two-pointers", entities: moved[0].entities, assets: moved[0].assets },
    ]);
    expect((await loadProblem(client, "p-one"))?.row.pattern).toBe("two-pointers");
    const count = await client.run(sql`SELECT count(*) AS n FROM problems WHERE id = 'p-one'`);
    expect(count.rows[0][0]).toBe(1);
  });
});

describe("applyChanges", () => {
  it("patches only the listed parts and matches the server copy", async () => {
    await fullCopy(["problems:hash-map"]);
    const edited = problemIn("p-one", "hash-map");
    edited.hints = [{ ord: 0, bodyMd: "Only the hints changed." }];
    await server.transaction((tx) => upsertProblem(tx, edited, "admin:1"));
    const r = await applyChanges(client, await changesSince(await getContentVersion(client)));
    expect(r.mismatches).toEqual([]);
    expect(r.applied).toHaveLength(1);
    expect(r.versionAdvanced).toBe(true);
    expect(await loadProblem(client, "p-one")).toEqual(await loadProblem(server, "p-one"));
  });

  it("a wrong rev is not written, is reported, and the version stays", async () => {
    await fullCopy(["problems:hash-map"]);
    const before = await loadProblem(client, "p-one");
    const edited = problemIn("p-one", "hash-map");
    edited.hints = [{ ord: 0, bodyMd: "Changed." }];
    await server.transaction((tx) => upsertProblem(tx, edited, "admin:1"));
    const page = await changesSince(await getContentVersion(client));
    page.changes[0].rev = "0000000000000000";
    const version = await getContentVersion(client);
    const r = await applyChanges(client, page);
    expect(r.mismatches).toEqual([{ entity: "problem", id: "p-one", units: ["problems:hash-map"] }]);
    expect(r.versionAdvanced).toBe(false);
    expect(await getContentVersion(client)).toBe(version);
    expect(await loadProblem(client, "p-one")).toEqual(before);
  });

  it("applying the same page twice changes nothing the second time", async () => {
    await fullCopy(["problems:hash-map"]);
    const edited = problemIn("p-one", "hash-map");
    edited.hints = [{ ord: 0, bodyMd: "Again." }];
    await server.transaction((tx) => upsertProblem(tx, edited, "admin:1"));
    const page = await changesSince(await getContentVersion(client));
    await applyChanges(client, page);
    const once = await loadProblem(client, "p-one");
    const r = await applyChanges(client, page);
    expect(r.mismatches).toEqual([]);
    expect(await loadProblem(client, "p-one")).toEqual(once);
    expect(await clientChangeRows()).toBe(0);
  });

  it("a delete is a soft delete on the client", async () => {
    await fullCopy(["problems:hash-map"]);
    await server.transaction((tx) => softDelete(tx, "problem", "p-one", "admin:1"));
    await applyChanges(client, await changesSince(await getContentVersion(client)));
    expect(await loadProblem(client, "p-one")).toBeNull();
  });
});
