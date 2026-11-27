import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getContentDb, resetContentDbForTests } from "@/lib/content-db/client";
import { bumpContentEpoch } from "@/lib/content-sync/resync";
import { GET } from "./route";

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
  updateTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

// connection() only works inside a real request; tests have none.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));

const get = (headers: Record<string, string> = {}) => new Request("http://localhost/api/content/version", { headers });

beforeEach(() => {
  process.env.CONTENT_DATABASE_URL = ":memory:";
});

afterEach(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
});

describe("GET /api/content/version", () => {
  it("returns the version, the schema and the content epoch", async () => {
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: 0, schema: 1, epoch: 1 });
  });

  it("the ETag carries the epoch, so a raised epoch is never answered 304 from an old copy", async () => {
    const db = await getContentDb();
    const first = (await GET(get())).headers.get("ETag");
    expect(first).toBe('"v0-s1-e1"');
    await bumpContentEpoch(db, 1);
    const res = await GET(get({ "If-None-Match": first ?? "" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("ETag")).toBe('"v0-s1-e2"');
    expect(await res.json()).toEqual({ version: 0, schema: 1, epoch: 2 });
  });
});
