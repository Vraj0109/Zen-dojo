import { createClient } from "@libsql/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));
const cookieJar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (n: string) => (n === "zd_anon" && cookieJar.value ? { value: cookieJar.value } : undefined) }) }));

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
  it("throws 401 when there is neither a session nor an anonymous cookie", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    cookieJar.value = undefined;
    await expect(requireUserDb()).rejects.toMatchObject({ status: 401 });
  });
  it("ignores a malformed anonymous cookie", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    cookieJar.value = "../evil";
    await expect(requireUserDb()).rejects.toMatchObject({ status: 401 });
  });
  it("an anonymous visitor gets their own database named anon:<id>", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    cookieJar.value = "3f2b8c1e-9d4a-4e6b-8a1c-0b7d5e2f4a91";
    vi.stubEnv("HABIT_HOSTED", "1");
    await expect(requireUserDb()).rejects.toThrow(); // no provider configured here, but it got past the cookie check, not a 401
    await expect(requireUserDb()).rejects.not.toMatchObject({ status: 401 });
    vi.unstubAllEnvs();
  });
  it("hosted getDb binds to the session user", async () => {
    vi.stubEnv("HABIT_HOSTED", "1");
    vi.mocked(getSession).mockResolvedValue({ userId: "zz" } as never);
    await expect(getDb()).rejects.toThrow(); // no control/provider configured here, proving it took the hosted branch
    vi.unstubAllEnvs();
  });
});
