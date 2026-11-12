import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { MIGRATIONS } from "../db";
import { runSync, linkAccount } from "../sync-engine";
import { pkcePair } from "../../../../packages/sync-worker/src/auth/test-helpers";
import { resetGuardState } from "../../../../packages/sync-worker/src/guard/guard";
import { hubFetch } from "./handler";
import { getHubDb, resetHubDb } from "./db";

// End to end through hubFetch on a temporary libSQL hub (plan 0073 D4): sign in (GitHub stubbed), push, pull, tombstone,
// delete cloud data, public profile. No network, no real database: the hub is a file in a temp folder.

const SITE = "https://site.test";
const REDIRECT = "http://localhost:3000/auth/callback";
const SAVED = { ...process.env };

let ghUser = { id: 4242, login: "alice", name: "Alice", avatar_url: "https://avatars.test/a.png" };

const GOOD_PROFILE = {
  name: "Ada",
  level: 3,
  xp: 1200,
  streak: 4,
  bestStreak: 9,
  totalSolved: 42,
  solvedByDifficulty: { easy: 20, medium: 18, hard: 4 },
  planWeeksDone: 2,
  courses: [{ id: "pattern-two-pointers", title: "DSA: Two pointers", kind: "pattern", done: 3, total: 5, completedOn: null }],
  generatedOn: "2026-11-12",
  activeDays: 30,
  hours: 12.5,
  totalProblems: 201,
  heatmap: [[{ date: "2026-11-09", xp: 20, level: 2, future: false }]],
  badges: [{ id: "first", title: "First", description: "Solve one", earned: true, value: 1, target: 1 }],
};

async function newDevice(): Promise<Client> {
  const client = createClient({ url: ":memory:" });
  for (const m of MIGRATIONS) await client.executeMultiple(m);
  return client;
}

/** Calls the hub as a browser or app would: absolute URL under /hub. */
function hub(p: string, init: RequestInit & { token?: string; json?: unknown } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  let body = init.body;
  if (init.json !== undefined) {
    body = JSON.stringify(init.json);
    headers.set("Content-Type", "application/json");
  }
  return hubFetch(new Request(`${SITE}/hub${p}`, { ...init, headers, body }));
}

/** Full PKCE sign-in against the hub; returns the access token of a new device session. */
async function signIn(device: string): Promise<string> {
  const pkce = await pkcePair();
  const state = `state-${device.replace(/\W/g, "")}-aaaaaaaa`;
  const start = await hub(`/auth/github/start?redirect_uri=${encodeURIComponent(REDIRECT)}&state=${state}&code_challenge=${pkce.challenge}`, {
    redirect: "manual",
  });
  expect(start.status).toBe(302);
  expect(new URL(start.headers.get("location")!).origin).toBe("https://github.com");
  const cb = await hub(`/auth/github/callback?code=ghcode&state=${state}`, { redirect: "manual" });
  expect(cb.status).toBe(302);
  const back = new URL(cb.headers.get("location")!);
  expect(back.origin + back.pathname).toBe(REDIRECT);
  const code = back.searchParams.get("code")!;
  const tok = await hub("/auth/token", {
    method: "POST",
    json: { grant_type: "authorization_code", code, code_verifier: pkce.verifier, device_name: device },
  });
  expect(tok.status).toBe(200);
  const body = (await tok.json()) as { access_token: string; user: { id: string } };
  expect(body.user.id).toBe("gh:4242");
  return body.access_token;
}

/** The fetcher the sync engine expects: relative path in, hub response out. */
function fetcherFor(token: string) {
  return (p: string, init: RequestInit) => hub(p, { ...init, token });
}

async function count(sql: string, args: unknown[] = []): Promise<number> {
  const hubDb = await getHubDb();
  return Number((await hubDb.execute({ sql, args: args as never[] })).rows[0].n);
}

beforeEach(async () => {
  resetGuardState();
  await resetHubDb();
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  process.env.HUB_DATABASE_URL = ":memory:"; // a file database was very slow on the Windows CI runner
  delete process.env.HUB_DATABASE_AUTH_TOKEN;
  process.env.GITHUB_CLIENT_ID = "test-client";
  process.env.GITHUB_CLIENT_SECRET = "test-secret";
  process.env.JWT_PRIVATE_JWK = JSON.stringify(await crypto.subtle.exportKey("jwk", kp.privateKey));
  process.env.JWT_PUBLIC_JWK = JSON.stringify(await crypto.subtle.exportKey("jwk", kp.publicKey));
  process.env.ALLOWED_REDIRECTS = REDIRECT;
  process.env.ALLOWED_ORIGIN = "*";
  process.env.ADMIN_USER_IDS = "gh:nobody";
  ghUser = { id: 4242, login: "alice", name: "Alice", avatar_url: "https://avatars.test/a.png" };
  const realFetch = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u === "https://github.com/login/oauth/access_token") return Response.json({ access_token: "gho_test" });
    if (u === "https://api.github.com/user") return Response.json(ghUser);
    return realFetch(url, init);
  });
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await resetHubDb();
  process.env = { ...SAVED };
});

describe("hub end to end", () => {
  it("serves the signing key and signs a desktop device in through GitHub", async () => {
    const jwks = (await (await hub("/.well-known/jwks.json")).json()) as { keys: Array<{ x: string }> };
    expect(jwks.keys[0].x).toBe(JSON.parse(process.env.JWT_PUBLIC_JWK!).x);
    const token = await signIn("Desktop");
    expect(token.length).toBeGreaterThan(20);
    expect(await count("SELECT COUNT(*) AS n FROM users WHERE id = 'gh:4242'")).toBe(1);
    expect(await count("SELECT COUNT(*) AS n FROM sessions WHERE user_id = 'gh:4242'")).toBe(1);
  });

  it("pushes rows from one device and a second device pulls them", async () => {
    const userId = "gh:4242";
    const desktop = await newDevice();
    const phone = await newDevice();
    await linkAccount(userId, desktop);
    await linkAccount(userId, phone);
    const tokenA = await signIn("Desktop");
    const tokenB = await signIn("Phone");

    await desktop.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["two-sum", "editorial", "2026-11-10", 10, "manual"],
    });
    const a = await runSync({ db: desktop, fetch: fetcherFor(tokenA), getUserId: async () => userId });
    expect(a.state).toBe("synced");
    expect(a.pushed).toBe(1);
    expect(await count("SELECT COUNT(*) AS n FROM problem_solves WHERE user_id = ?", [userId])).toBe(1);

    const b = await runSync({ db: phone, fetch: fetcherFor(tokenB), getUserId: async () => userId });
    expect(b.state).toBe("synced");
    expect(b.pulled).toBe(1);
    const rows = (await phone.execute("SELECT kind, xp FROM problem_solves WHERE problem_id = 'two-sum'")).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("editorial");
    expect(rows[0].xp).toBe(10);
  });

  it("propagates a delete (tombstone) to the other device", async () => {
    const userId = "gh:4242";
    const desktop = await newDevice();
    const phone = await newDevice();
    await linkAccount(userId, desktop);
    await linkAccount(userId, phone);
    const fa = fetcherFor(await signIn("Desktop"));
    const fb = fetcherFor(await signIn("Phone"));
    const syncA = () => runSync({ db: desktop, fetch: fa, getUserId: async () => userId });
    const syncB = () => runSync({ db: phone, fetch: fb, getUserId: async () => userId });

    await desktop.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["lru-cache", "solution", "2026-11-10", 20, "manual"],
    });
    await syncA();
    await syncB();
    expect((await phone.execute("SELECT 1 FROM problem_solves WHERE problem_id = 'lru-cache'")).rows).toHaveLength(1);

    await desktop.execute("DELETE FROM problem_solves WHERE problem_id = 'lru-cache'");
    expect((await syncA()).pushed).toBe(1);
    expect((await syncB()).pulled).toBe(1);
    expect((await phone.execute("SELECT 1 FROM problem_solves WHERE problem_id = 'lru-cache'")).rows).toHaveLength(0);
  });

  it("delete cloud data empties the user's rows and leaves the devices alone", async () => {
    const userId = "gh:4242";
    const desktop = await newDevice();
    await linkAccount(userId, desktop);
    const token = await signIn("Desktop");
    await desktop.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["two-sum", "editorial", "2026-11-10", 10, "manual"],
    });
    await runSync({ db: desktop, fetch: fetcherFor(token), getUserId: async () => userId });
    expect((await hub("/api/profile/public", { method: "PUT", token, json: { data: GOOD_PROFILE } })).status).toBe(200);
    expect(await count("SELECT COUNT(*) AS n FROM problem_solves WHERE user_id = ?", [userId])).toBe(1);

    const noConfirm = await hub("/api/account/delete-data", { method: "POST", token, json: { scope: "data" } });
    expect(noConfirm.status).toBe(400);
    expect(await count("SELECT COUNT(*) AS n FROM problem_solves WHERE user_id = ?", [userId])).toBe(1);

    const del = await hub("/api/account/delete-data", { method: "POST", token, json: { scope: "data", confirm: "DELETE" } });
    expect(del.status).toBe(200);
    expect(await count("SELECT COUNT(*) AS n FROM problem_solves WHERE user_id = ?", [userId])).toBe(0);
    expect(await count("SELECT COUNT(*) AS n FROM public_profiles WHERE user_id = ?", [userId])).toBe(0);
    // scope "data" keeps the account; the local copy is untouched.
    expect(await count("SELECT COUNT(*) AS n FROM users WHERE id = ?", [userId])).toBe(1);
    expect((await desktop.execute("SELECT 1 FROM problem_solves")).rows).toHaveLength(1);
  });

  it("publishes and unpublishes the public profile", async () => {
    const token = await signIn("Desktop");
    expect((await hub("/api/profile/public", { method: "PUT", token, json: { data: GOOD_PROFILE } })).status).toBe(200);
    const status = (await (await hub("/api/profile/public", { token })).json()) as { enabled: boolean; id: string };
    expect(status.enabled).toBe(true);

    // No token: anyone can read the public page.
    const pub = await hub(`/api/public/u/${status.id}`);
    expect(pub.status).toBe(200);
    const text = await pub.text();
    expect(text).toContain("Ada");
    expect(text).not.toContain("gh:4242");

    expect((await hub("/api/profile/public", { method: "DELETE", token })).status).toBe(200);
    expect((await hub(`/api/public/u/${status.id}`)).status).toBe(404);
    const after = (await (await hub("/api/profile/public", { token })).json()) as { enabled: boolean };
    expect(after.enabled).toBe(false);
  });
});
