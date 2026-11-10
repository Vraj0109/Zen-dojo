import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleAuth, verifyAccessToken } from "./routes";
import { ctx, makeEnv, pkcePair } from "./test-helpers";
import type { AuthDeps } from "./types";

const REDIRECT = "http://127.0.0.1:4567/auth/callback";
const STATE = "state-abcdefghijklmnop";
const ORIGIN = "https://worker.test";

let now = Date.now();
let ghUser = { id: 1, login: "alice", name: "Alice", avatar_url: "https://avatars.test/a.png" };
let ghFail = false;
const failures: string[] = [];

const fakeFetch = vi.fn(async (url: string | URL | Request) => {
  const u = String(url);
  if (ghFail) return new Response("nope", { status: 500 });
  if (u === "https://github.com/login/oauth/access_token") return Response.json({ access_token: "gho_secret" });
  if (u === "https://api.github.com/user") return Response.json(ghUser);
  throw new Error("unexpected fetch " + u);
}) as unknown as typeof fetch;

function deps(): AuthDeps {
  return {
    fetch: fakeFetch,
    now: () => now,
    noteAuthFailure: async (_e, _ip, kind) => void failures.push(kind),
  };
}

type Env = Awaited<ReturnType<typeof makeEnv>>;

function call(env: Env, path: string, init?: RequestInit & { json?: unknown }) {
  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) {
    body = JSON.stringify(init.json);
    headers.set("content-type", "application/json");
  }
  return handleAuth(new Request(ORIGIN + path, { ...init, headers, body }), env, ctx, deps());
}

/** Runs start + callback and returns the one-time code. */
async function signIn(env: Env, pkce: { challenge: string }, state = STATE): Promise<string> {
  const s = await call(env, `/auth/github/start?redirect_uri=${encodeURIComponent(REDIRECT)}&state=${state}&code_challenge=${pkce.challenge}`);
  expect(s!.status).toBe(302);
  const cb = await call(env, `/auth/github/callback?code=ghcode&state=${state}`);
  expect(cb!.status).toBe(302);
  const loc = new URL(cb!.headers.get("Location")!);
  expect(loc.origin + loc.pathname).toBe(REDIRECT);
  expect(loc.searchParams.get("state")).toBe(state);
  return loc.searchParams.get("code")!;
}

async function exchange(env: Env, code: string, verifier: string, device = "Laptop") {
  return call(env, "/auth/token", {
    method: "POST",
    json: { grant_type: "authorization_code", code, code_verifier: verifier, device_name: device },
  });
}

beforeEach(() => {
  now = Date.now();
  ghUser = { id: 1, login: "alice", name: "Alice", avatar_url: "https://avatars.test/a.png" };
  ghFail = false;
  failures.length = 0;
});

describe("routing", () => {
  it("returns null for other paths and 404 for unknown /auth paths", async () => {
    const env = await makeEnv();
    expect(await call(env, "/api/sync", { method: "POST" })).toBeNull();
    expect((await call(env, "/auth/nope"))!.status).toBe(404);
    expect((await call(env, "/auth/token"))!.status).toBe(405);
  });

  it("serves the JWKS", async () => {
    const env = await makeEnv();
    const res = await call(env, "/.well-known/jwks.json");
    const body = (await res!.json()) as { keys: unknown[] };
    expect(res!.status).toBe(200);
    expect(body.keys).toHaveLength(1);
  });

  it("hides errors behind a generic 500", async () => {
    const env = await makeEnv({ JWT_PUBLIC_JWK: "not json" });
    const res = await call(env, "/.well-known/jwks.json");
    expect(res!.status).toBe(500);
    expect(await res!.json()).toEqual({ ok: false, error: "server_error" });
  });
});

describe("start", () => {
  const start = (env: Env, redirect: string, state = STATE, challenge = "A".repeat(43)) =>
    call(env, `/auth/github/start?redirect_uri=${encodeURIComponent(redirect)}&state=${state}&code_challenge=${challenge}`);

  it("redirects to GitHub and stores the state", async () => {
    const env = await makeEnv();
    const res = await start(env, REDIRECT);
    expect(res!.status).toBe(302);
    const loc = new URL(res!.headers.get("Location")!);
    expect(loc.origin + loc.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(loc.searchParams.get("client_id")).toBe("client-id");
    expect(loc.searchParams.get("state")).toBe(STATE);
    expect(env.DB.oauth_states).toHaveLength(1);
  });

  it.each([
    "https://evil.test/auth/callback",
    "http://127.0.0.1:4567/other",
    "http://127.0.0.1:4567/auth/callback/",
    "http://127.0.0.1:4567/auth/callback?x=1",
    "http://127.0.0.1:4567/auth/callback#frag",
    "http://user:pw@127.0.0.1:4567/auth/callback",
    "http://127.0.0.1.evil.test/auth/callback",
    "http://localhost@evil.test/auth/callback",
    "http://127.0.0.1:4567\\@evil.test/auth/callback",
    "http://127.0.0.1:4567//auth/callback",
    "https://127.0.0.1:4567/auth/callback",
    "javascript:alert(1)",
    "zendojo://auth/callback/x",
    "zendojo://evil/callback",
    "zendojo://auth/callback?x=1",
    "zendojo://auth/callback#f",
    "zendojo2://auth/callback",
    "ZENDOJO://auth/callback",
    "zendojo://user@auth/callback",
    "zendojo://auth:1/callback",
    "",
  ])("rejects redirect_uri %s", async (uri) => {
    const env = await makeEnv();
    const res = await start(env, uri);
    expect(res!.status).toBe(400);
    expect(env.DB.oauth_states).toHaveLength(0);
  });

  it("accepts localhost and exact ALLOWED_REDIRECTS entries only", async () => {
    const env = await makeEnv({ ALLOWED_REDIRECTS: "https://app.example.com/auth/callback" });
    expect((await start(env, "http://localhost:3000/auth/callback"))!.status).toBe(302);
    expect((await start(env, "https://app.example.com/auth/callback", "state-bbbbbbbbbbbbbbbb"))!.status).toBe(302);
    expect((await start(env, "https://app.example.com/auth/callback2", "state-cccccccccccccccc"))!.status).toBe(400);
  });

  it("accepts the desktop deep link and hands code and state back in Location", async () => {
    // No new secret or var is needed for this: the rule is code in oauth.ts, live once the Worker is deployed.
    const DEEP = "zendojo://auth/callback";
    const env = await makeEnv();
    const pkce = await pkcePair();
    expect((await start(env, DEEP, STATE, pkce.challenge))!.status).toBe(302);
    const cb = await call(env, `/auth/github/callback?code=ghcode&state=${STATE}`);
    expect(cb!.status).toBe(302);
    const location = cb!.headers.get("location")!;
    expect(location.startsWith("zendojo://auth/callback?")).toBe(true);
    const loc = new URL(location);
    expect(loc.searchParams.get("state")).toBe(STATE);
    const code = loc.searchParams.get("code")!;
    expect(code.length).toBeGreaterThan(20);
    expect((await exchange(env, code, pkce.verifier))!.status).toBe(200);
  });

  it("rejects bad state, challenge and duplicate state", async () => {
    const env = await makeEnv();
    expect((await start(env, REDIRECT, "short"))!.status).toBe(400);
    expect((await start(env, REDIRECT, STATE, "tooshort"))!.status).toBe(400);
    expect((await start(env, REDIRECT))!.status).toBe(302);
    expect((await start(env, REDIRECT))!.status).toBe(400);
  });
});

describe("callback", () => {
  it("rejects an unknown state and reports it", async () => {
    const env = await makeEnv();
    const res = await call(env, "/auth/github/callback?code=x&state=unknown-state-1234567");
    expect(res!.status).toBe(400);
    expect(failures).toEqual(["oauth-state"]);
  });

  it("rejects an expired state", async () => {
    const env = await makeEnv();
    const p = await pkcePair();
    await call(env, `/auth/github/start?redirect_uri=${encodeURIComponent(REDIRECT)}&state=${STATE}&code_challenge=${p.challenge}`);
    now += 10 * 60 * 1000 + 1;
    const res = await call(env, `/auth/github/callback?code=x&state=${STATE}`);
    expect(res!.status).toBe(400);
    expect(failures).toEqual(["oauth-state"]);
  });

  it("uses a state only once", async () => {
    const env = await makeEnv();
    const p = await pkcePair();
    await signIn(env, p);
    const again = await call(env, `/auth/github/callback?code=x&state=${STATE}`);
    expect(again!.status).toBe(400);
  });

  it("sends the app back with an error when GitHub fails", async () => {
    const env = await makeEnv();
    const p = await pkcePair();
    await call(env, `/auth/github/start?redirect_uri=${encodeURIComponent(REDIRECT)}&state=${STATE}&code_challenge=${p.challenge}`);
    ghFail = true;
    const res = await call(env, `/auth/github/callback?code=x&state=${STATE}`);
    const loc = new URL(res!.headers.get("Location")!);
    expect(loc.searchParams.get("error")).toBe("github_failed");
    expect(loc.searchParams.get("code")).toBeNull();
    expect(env.DB.users).toHaveLength(0);
  });

  it("does not store the GitHub token or the plain one-time code", async () => {
    const env = await makeEnv();
    const code = await signIn(env, await pkcePair());
    expect(JSON.stringify(env.DB)).not.toContain("gho_secret");
    expect(JSON.stringify(env.DB.auth_codes)).not.toContain(code);
  });
});

describe("token (authorization code)", () => {
  it("creates a new user and returns tokens", async () => {
    const env = await makeEnv();
    const p = await pkcePair();
    const code = await signIn(env, p);
    const res = await exchange(env, code, p.verifier, "Work PC");
    expect(res!.status).toBe(200);
    const body = (await res!.json()) as { access_token: string; refresh_token: string; expires_in: number; user: Record<string, unknown> };
    expect(body.expires_in).toBe(900);
    expect(body.user).toEqual({ id: "gh:1", name: "Alice", avatar_url: "https://avatars.test/a.png", admin: true });
    expect(await verifyAccessToken(body.access_token, env)).toMatchObject({ sub: "gh:1", adm: true });
    expect(env.DB.users).toHaveLength(1);
    expect(env.DB.sessions).toHaveLength(1);
    expect(env.DB.sessions[0].device_name).toBe("Work PC");
    expect(JSON.stringify(env.DB.sessions)).not.toContain(body.refresh_token);
  });

  it("handles a returning user and non-admin flag", async () => {
    const env = await makeEnv({ ADMIN_USER_IDS: "gh:999" });
    const p1 = await pkcePair();
    await exchange(env, await signIn(env, p1), p1.verifier);
    ghUser = { ...ghUser, name: "Alice B" };
    const p2 = await pkcePair();
    const res = await exchange(env, await signIn(env, p2, "state-second-aaaaaaaa"), p2.verifier);
    const body = (await res!.json()) as { user: { name: string; admin: boolean } };
    expect(env.DB.users).toHaveLength(1);
    expect(body.user).toMatchObject({ name: "Alice B", admin: false });
    expect(env.DB.sessions).toHaveLength(2);
  });

  it("rejects a replayed code", async () => {
    const env = await makeEnv();
    const p = await pkcePair();
    const code = await signIn(env, p);
    expect((await exchange(env, code, p.verifier))!.status).toBe(200);
    const again = await exchange(env, code, p.verifier);
    expect(again!.status).toBe(400);
    expect(failures).toContain("token");
    expect(env.DB.sessions).toHaveLength(1);
  });

  it("rejects a wrong verifier and burns the code", async () => {
    const env = await makeEnv();
    const p = await pkcePair();
    const other = await pkcePair();
    const code = await signIn(env, p);
    expect((await exchange(env, code, other.verifier))!.status).toBe(400);
    expect((await exchange(env, code, p.verifier))!.status).toBe(400);
    expect(env.DB.sessions).toHaveLength(0);
  });

  it("rejects an expired code", async () => {
    const env = await makeEnv();
    const p = await pkcePair();
    const code = await signIn(env, p);
    now += 61_000;
    expect((await exchange(env, code, p.verifier))!.status).toBe(400);
  });

  it("rejects malformed requests", async () => {
    const env = await makeEnv();
    expect((await call(env, "/auth/token", { method: "POST", body: "not json" }))!.status).toBe(400);
    expect((await call(env, "/auth/token", { method: "POST", json: { grant_type: "password" } }))!.status).toBe(400);
    expect((await exchange(env, "short", "short"))!.status).toBe(400);
  });
});

describe("refresh, devices and logout", () => {
  async function login(env: Env, device = "Laptop", state = STATE) {
    const p = await pkcePair();
    const res = await exchange(env, await signIn(env, p, state), p.verifier, device);
    return (await res!.json()) as { access_token: string; refresh_token: string };
  }
  const refresh = (env: Env, t: string) => call(env, "/auth/token", { method: "POST", json: { grant_type: "refresh_token", refresh_token: t } });
  const auth = (t: string) => ({ headers: { authorization: `Bearer ${t}` } });

  it("rotates the refresh token on every use", async () => {
    const env = await makeEnv();
    const first = await login(env);
    now += 5000;
    const res = await refresh(env, first.refresh_token);
    expect(res!.status).toBe(200);
    const second = (await res!.json()) as { refresh_token: string; access_token: string };
    expect(second.refresh_token).not.toBe(first.refresh_token);
    expect(await verifyAccessToken(second.access_token, env)).toMatchObject({ sub: "gh:1" });
    expect(env.DB.sessions).toHaveLength(1);
    expect(env.DB.sessions[0].prev_refresh_hash).not.toBeNull();
    expect((await refresh(env, second.refresh_token))!.status).toBe(200);
  });

  it("recomputes the admin flag at refresh", async () => {
    const env = await makeEnv();
    const first = await login(env);
    env.ADMIN_USER_IDS = "";
    const body = (await (await refresh(env, first.refresh_token))!.json()) as { user: { admin: boolean } };
    expect(body.user.admin).toBe(false);
  });

  it("revokes the session when an old refresh token is reused", async () => {
    const env = await makeEnv();
    const first = await login(env);
    const second = (await (await refresh(env, first.refresh_token))!.json()) as { refresh_token: string };
    const reuse = await refresh(env, first.refresh_token);
    expect(reuse!.status).toBe(401);
    expect(failures).toEqual(["refresh-reuse"]);
    expect(env.DB.sessions[0].revoked_at).not.toBeNull();
    expect((await refresh(env, second.refresh_token))!.status).toBe(401);
  });

  it("rejects unknown, revoked and expired refresh tokens", async () => {
    const env = await makeEnv();
    expect((await refresh(env, "x".repeat(43)))!.status).toBe(401);
    expect(failures).toEqual(["token"]);
    const a = await login(env);
    now += 30 * 24 * 60 * 60 * 1000 + 1;
    expect((await refresh(env, a.refresh_token))!.status).toBe(401);
    now -= 30 * 24 * 60 * 60 * 1000;
    const b = await login(env, "Phone", "state-phone-aaaaaaaa");
    await call(env, "/auth/logout", { method: "POST", json: { refresh_token: b.refresh_token } });
    expect((await refresh(env, b.refresh_token))!.status).toBe(401);
  });

  it("lists devices and flags the current one", async () => {
    const env = await makeEnv();
    const a = await login(env, "Laptop");
    now += 1000;
    const b = await login(env, "Phone", "state-phone-aaaaaaaa");
    const res = await call(env, "/auth/devices", auth(a.access_token));
    const list = (await res!.json()) as { id: string; name: string; current: boolean }[];
    expect(list).toHaveLength(2);
    expect(list.filter((d) => d.current).map((d) => d.name)).toEqual(["Laptop"]);
    const listB = (await (await call(env, "/auth/devices", auth(b.access_token)))!.json()) as typeof list;
    expect(listB.filter((d) => d.current).map((d) => d.name)).toEqual(["Phone"]);
    expect(Object.keys(list[0]).sort()).toEqual(["created_at", "current", "id", "last_seen_at", "name"]);
  });

  it("requires a valid Bearer token for devices", async () => {
    const env = await makeEnv();
    expect((await call(env, "/auth/devices"))!.status).toBe(401);
    expect((await call(env, "/auth/devices", auth("garbage")))!.status).toBe(401);
    expect(failures).toEqual(["token", "token"]);
  });

  it("deletes only your own devices", async () => {
    const env = await makeEnv();
    const alice = await login(env, "Laptop");
    ghUser = { id: 2, login: "bob", name: "Bob", avatar_url: "https://avatars.test/b.png" };
    const bob = await login(env, "Bob PC", "state-bob-aaaaaaaaaa");
    const aliceSid = env.DB.sessions[0].id as string;
    const bobSid = env.DB.sessions[1].id as string;

    const cross = await call(env, `/auth/devices/${aliceSid}`, { method: "DELETE", ...auth(bob.access_token) });
    expect(cross!.status).toBe(404);
    expect(env.DB.sessions[0].revoked_at).toBeNull();

    expect((await call(env, `/auth/devices/${bobSid}`, { method: "DELETE", ...auth(bob.access_token) }))!.status).toBe(200);
    expect(env.DB.sessions[1].revoked_at).not.toBeNull();
    expect((await call(env, `/auth/devices/${bobSid}`, { method: "DELETE", ...auth(bob.access_token) }))!.status).toBe(404);
    expect((await refresh(env, bob.refresh_token))!.status).toBe(401);
    expect((await refresh(env, alice.refresh_token))!.status).toBe(200);
  });

  it("logout is quiet about unknown tokens", async () => {
    const env = await makeEnv();
    const res = await call(env, "/auth/logout", { method: "POST", json: { refresh_token: "y".repeat(43) } });
    expect(res!.status).toBe(200);
    expect(await res!.json()).toEqual({ ok: true });
  });
});
