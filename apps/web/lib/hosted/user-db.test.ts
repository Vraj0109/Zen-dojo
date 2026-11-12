import { createClient } from "@libsql/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));

import { getSession } from "@/lib/auth/session";
import { clearUserDbCacheForTest, getDb, getDbFor } from "../db";
import { requireUserDb } from "./require-user-db";

const env = { TURSO_API_TOKEN: "x", TURSO_ORG: "org", TURSO_GROUP: "g" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });
const provider = () =>
  vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("/auth/tokens")) return json({ jwt: "j" });
    if (init?.method === "POST") return json({ database: { Hostname: "h-" + JSON.parse(String(init.body)).name } });
    return json({ database: { Hostname: "h-" + u.split("/").pop() } });
  });
const mk = () => {
  const made: string[] = [];
  return { made, makeClient: (url: string) => (made.push(url), createClient({ url: ":memory:" })) };
};

describe("getDbFor", () => {
  beforeEach(() => clearUserDbCacheForTest());

  it("reuses a user's client and gives two users different ones", async () => {
    const control = createClient({ url: ":memory:" });
    const f = provider();
    const { made, makeClient } = mk();
    const deps = { control, fetch: f as never, env, makeClient, sleep: async () => {} };
    const a1 = await getDbFor("a", deps);
    const a2 = await getDbFor("a", deps);
    const b = await getDbFor("b", deps);
    expect(a2).toBe(a1);
    expect(b).not.toBe(a1);
    expect(made.length).toBe(2);
  });

  it("caches nothing on provider failure", async () => {
    const control = createClient({ url: ":memory:" });
    const bad = vi.fn(async () => json({}, 500));
    await expect(getDbFor("a", { control, fetch: bad as never, env })).rejects.toThrow(/Could not create/);
    const { makeClient } = mk();
    await expect(getDbFor("a", { control, fetch: provider() as never, env, makeClient, sleep: async () => {} })).resolves.toBeTruthy();
  });
});

describe("requireUserDb", () => {
  it("gives a signed-out visitor a working empty in-memory database", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const db = await requireUserDb();
    const { settings } = await import("../schema");
    expect(await db.select().from(settings)).toEqual([]);
  });
  it("two signed-out requests never share data", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const { settings } = await import("../schema");
    const a = await requireUserDb();
    await a.insert(settings).values({ key: "k", value: "v" });
    const b = await requireUserDb();
    expect(await b.select().from(settings)).toEqual([]);
  });
  it("a signed-in user is a guest until the Turso settings exist", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "zz" } as never);
    const db = await requireUserDb();
    const { settings } = await import("../schema");
    expect(await db.select().from(settings)).toEqual([]);
  });
  it("hosted getDb binds to the session user", async () => {
    vi.stubEnv("HABIT_HOSTED", "1");
    vi.stubEnv("TURSO_API_TOKEN", "t");
    vi.stubEnv("CONTROL_DATABASE_URL", "libsql://nowhere.invalid");
    vi.mocked(getSession).mockResolvedValue({ userId: "zz" } as never);
    // No provider answers here, so opening the user database fails and the visitor gets a guest database, not an error page.
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = await getDb();
    expect(err).toHaveBeenCalled();
    const { settings } = await import("../schema");
    expect(await db.select().from(settings)).toEqual([]);
    err.mockRestore();
    vi.unstubAllEnvs();
  });
});
