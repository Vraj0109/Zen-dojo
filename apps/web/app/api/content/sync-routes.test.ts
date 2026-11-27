import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { getContentDb, resetContentDbForTests, type ContentDb } from "@/lib/content-db/client";
import { getContentVersion } from "@/lib/content-db/meta";
import { changes } from "@/lib/content-db/schema";
import { isLocalRequest } from "@/lib/content-sync/local";
import { upsertProblem } from "@/lib/content-db/write";
import { fakeSite, makeDb, problemIn, seedSite } from "@/lib/content-sync/test-helpers";
import { GET as unitsGET } from "./units/route";
import { GET as unitGET } from "./unit/[unit]/route";
import { GET as changesGET } from "./changes/route";
import { POST as syncPOST } from "./sync/route";

const revalidated = vi.hoisted(() => [] as string[]);

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
  after: vi.fn(),
}));

vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {},
  revalidateTag: (tag: string) => {
    revalidated.push(tag);
  },
}));

const BASE = "http://localhost:3000";
let db: ContentDb;
let version: number;

beforeEach(async () => {
  process.env.CONTENT_DATABASE_URL = ":memory:";
  db = await getContentDb();
  await seedSite(db);
  version = await getContentVersion(db);
  revalidated.length = 0;
});

afterEach(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
  delete process.env.HABIT_HOSTED;
  delete process.env.HABIT_DESKTOP;
  delete process.env.PUBLIC_SITE_URL;
  vi.unstubAllGlobals();
});

const ctx = (unit: string) => ({ params: Promise.resolve({ unit }) });

describe("GET /api/content/units", () => {
  it("without the current v, redirects to it and does not cache the redirect", async () => {
    const res = await unitsGET(new Request(`${BASE}/api/content/units`));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`/api/content/units?v=${version}`);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("with the current v, lists the units as immutable JSON", async () => {
    const res = await unitsGET(new Request(`${BASE}/api/content/units?v=${version}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    const list = (await res.json()) as { unit: string }[];
    expect(list.map((u) => u.unit)).toContain("course:sd");
  });
});

describe("GET /api/content/unit/<unit>", () => {
  it("redirects an old or missing v", async () => {
    const res = await unitGET(new Request(`${BASE}/api/content/unit/course%3Asd?page=0&v=1`), ctx("course:sd"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`/api/content/unit/course%3Asd?page=0&v=${version}`);
  });

  it("returns a page as immutable JSON with entities and images", async () => {
    const res = await unitGET(new Request(`${BASE}/api/content/unit/course%3Asd?v=${version}&page=0`), ctx("course:sd"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    const body = (await res.json()) as { entities: unknown[]; assets: unknown[]; next?: number };
    expect(body.entities).toHaveLength(2);
    expect(body.assets).toHaveLength(1);
    expect(body.next).toBeUndefined();
  });

  it("answers 404 for a page past the end, 400 for a bad page, 404 for a bad unit", async () => {
    const past = await unitGET(new Request(`${BASE}/api/content/unit/course%3Asd?v=${version}&page=3`), ctx("course:sd"));
    expect(past.status).toBe(404);
    const bad = await unitGET(new Request(`${BASE}/api/content/unit/course%3Asd?v=${version}&page=x`), ctx("course:sd"));
    expect(bad.status).toBe(400);
    const unknown = await unitGET(new Request(`${BASE}/api/content/unit/nope%3Ax?v=${version}`), ctx("nope:x"));
    expect(unknown.status).toBe(404);
  });
});

describe("GET /api/content/changes", () => {
  it("returns changes with a 30 second cache", async () => {
    const res = await changesGET(new Request(`${BASE}/api/content/changes?since=0&units=all`));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=30");
    const body = (await res.json()) as { to: number; changes: unknown[] };
    expect(body.to).toBe(version);
    expect(body.changes.length).toBeGreaterThan(0);
  });

  it("filters by unit", async () => {
    const res = await changesGET(new Request(`${BASE}/api/content/changes?since=6&units=docs`));
    const body = (await res.json()) as { changes: unknown[] };
    expect(body.changes).toEqual([]);
  });

  it("requires since", async () => {
    const res = await changesGET(new Request(`${BASE}/api/content/changes`));
    expect(res.status).toBe(400);
  });

  it("answers 410 when since is older than the oldest kept change", async () => {
    await db.delete(changes).where(sql`version < 4`);
    const res = await changesGET(new Request(`${BASE}/api/content/changes?since=0&units=all`));
    expect(res.status).toBe(410);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("POST /api/content/sync", () => {
  it("is not there on the hosted site", async () => {
    process.env.HABIT_HOSTED = "1";
    process.env.HABIT_DESKTOP = "1";
    const res = await syncPOST(new Request("http://127.0.0.1:3000/api/content/sync", { method: "POST" }));
    expect(res.status).toBe(404);
  });

  it("refuses outside the desktop app", async () => {
    const res = await syncPOST(new Request("http://127.0.0.1:3000/api/content/sync", { method: "POST" }));
    expect(res.status).toBe(403);
  });

  it("refuses a request that is not local", async () => {
    process.env.HABIT_DESKTOP = "1";
    const res = await syncPOST(new Request("http://example.com/api/content/sync", { method: "POST" }));
    expect(res.status).toBe(403);
  });

  it("from the desktop, syncs from the site and expires the tags of what changed", async () => {
    process.env.HABIT_DESKTOP = "1";
    process.env.PUBLIC_SITE_URL = "https://site.test";
    const server = await makeDb();
    await seedSite(server);
    await server.transaction((tx) => upsertProblem(tx, problemIn("p-new", "stacks"), "admin:1"));
    vi.stubGlobal("fetch", fakeSite(server).fetch);
    const res = await syncPOST(new Request("http://127.0.0.1:3000/api/content/sync", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; applied: number };
    expect(body.status).toBe("updated");
    expect(body.applied).toBeGreaterThan(0);
    expect(revalidated).toContain("content-version");
    expect(revalidated).toContain("problem:p-new");
  });
});

describe("isLocalRequest", () => {
  it("accepts a local host without proxy headers", () => {
    expect(isLocalRequest(new Request("http://127.0.0.1:3000/x"))).toBe(true);
    expect(isLocalRequest(new Request("http://localhost:3000/x"))).toBe(true);
  });

  it("refuses a forwarded request or a cross-site one", () => {
    expect(isLocalRequest(new Request("http://127.0.0.1:3000/x", { headers: { "x-forwarded-for": "203.0.113.5" } }))).toBe(false);
    expect(isLocalRequest(new Request("http://127.0.0.1:3000/x", { headers: { "sec-fetch-site": "cross-site" } }))).toBe(false);
  });
});

