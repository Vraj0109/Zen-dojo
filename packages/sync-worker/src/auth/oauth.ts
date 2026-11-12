import type { AuthCtx, AuthDeps, AuthEnv } from "./types";
import { CODE_TTL_MS, STATE_TTL_MS } from "./types";
import { cleanDeviceName, refreshGrant, startSession, type UserRow } from "./sessions";
import { clientIp, fail, randomToken, readJsonObject, sha256B64url, sha256Hex, timingSafeEqual } from "./util";

const B64URL = /^[A-Za-z0-9_-]+$/;
const GITHUB_TIMEOUT_MS = 5000;
const UA = "zen-dojo-sync";
const DESKTOP_REDIRECT = "zendojo://auth/callback";

/**
 * Exact redirect rule: http://127.0.0.1:<port>/auth/callback or http://localhost:<port>/auth/callback,
 * or an exact string from ALLOWED_REDIRECTS. Never userinfo, query or fragment, never backslashes.
 */
export function isAllowedRedirect(env: AuthEnv, raw: string): boolean {
  if (raw.length > 512 || /[\\\s\u0000-\u001f]/.test(raw)) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.username || u.password || u.hash || raw.includes("#") || u.search || raw.includes("?")) return false;
  const extra = (env.ALLOWED_REDIRECTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (extra.includes(raw)) return u.protocol === "https:" || u.protocol === "http:";
  // The desktop app's deep link: exactly this string, case-exact. It is a rule in code, not config, so no new
  // secret or var is needed; it goes live when the Worker is deployed (by pushing).
  if (raw === DESKTOP_REDIRECT) return true;
  if (u.protocol !== "http:") return false;
  if (u.hostname !== "127.0.0.1" && u.hostname !== "localhost") return false;
  if (u.pathname !== "/auth/callback") return false;
  // Rebuild and compare so odd forms (extra slashes, encoded dots, default ports) are not accepted.
  const rebuilt = `http://${u.hostname}${u.port ? ":" + u.port : ""}/auth/callback`;
  return rebuilt === raw;
}

export async function start(req: Request, env: AuthEnv, ctx: AuthCtx, now: number): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const redirectUri = q.get("redirect_uri") ?? "";
  const state = q.get("state") ?? "";
  const challenge = q.get("code_challenge") ?? "";
  if (!isAllowedRedirect(env, redirectUri)) return fail(400, "invalid_redirect_uri");
  if (state.length < 16 || state.length > 128 || !B64URL.test(state)) return fail(400, "invalid_state");
  if (challenge.length !== 43 || !B64URL.test(challenge)) return fail(400, "invalid_code_challenge");

  try {
    await env.DB.prepare("INSERT INTO oauth_states (state, redirect_uri, code_challenge, created_at) VALUES (?, ?, ?, ?)")
      .bind(state, redirectUri, challenge, now)
      .run();
  } catch (e) {
    // A duplicate state, or the database refused: say which (never the state itself or any other value).
    console.error("oauth start: could not store the state:", e instanceof Error ? e.message.slice(0, 200) : "unknown error");
    return fail(400, "invalid_state");
  }
  // Housekeeping off the request path.
  ctx.waitUntil(
    Promise.all([
      env.DB.prepare("DELETE FROM oauth_states WHERE created_at < ?").bind(now - STATE_TTL_MS).run(),
      env.DB.prepare("DELETE FROM auth_codes WHERE expires_at < ?").bind(now - 60 * 60 * 1000).run(),
    ]).catch(() => undefined),
  );

  const gh = new URL("https://github.com/login/oauth/authorize");
  gh.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  gh.searchParams.set("state", state);
  return new Response(null, { status: 302, headers: { Location: gh.toString(), "cache-control": "no-store" } });
}

function backToApp(redirectUri: string, params: Record<string, string>): Response {
  const u = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  // Plain location header (not Response.redirect) so custom schemes such as zendojo:// work on every runtime.
  return new Response(null, { status: 302, headers: { location: u.toString(), "cache-control": "no-store" } });
}

async function timedFetch(f: typeof fetch, url: string, init: RequestInit): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), GITHUB_TIMEOUT_MS);
  try {
    return await f(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

interface GithubUser {
  id: number;
  name: string | null;
  avatar_url: string | null;
}

async function fetchGithubUser(env: AuthEnv, f: typeof fetch, code: string): Promise<GithubUser | null> {
  try {
    const tokRes = await timedFetch(f, "https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", "user-agent": UA },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
    });
    if (!tokRes.ok) return null;
    const tok = (await tokRes.json()) as { access_token?: unknown };
    if (typeof tok.access_token !== "string" || !tok.access_token) return null;
    const userRes = await timedFetch(f, "https://api.github.com/user", {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${tok.access_token}`,
        "user-agent": UA,
      },
    });
    if (!userRes.ok) return null;
    const u = (await userRes.json()) as { id?: unknown; login?: unknown; name?: unknown; avatar_url?: unknown };
    if (typeof u.id !== "number" || !Number.isSafeInteger(u.id) || u.id <= 0) return null;
    const name = typeof u.name === "string" && u.name ? u.name : typeof u.login === "string" ? u.login : null;
    const avatar = typeof u.avatar_url === "string" && u.avatar_url.startsWith("https://") ? u.avatar_url : null;
    // The GitHub access token is dropped here; it is never stored or logged.
    return { id: u.id, name: name ? name.slice(0, 100) : null, avatar_url: avatar };
  } catch {
    return null;
  }
}

export async function callback(
  req: Request,
  env: AuthEnv,
  ctx: AuthCtx,
  deps: AuthDeps,
  now: number,
): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const code = q.get("code") ?? "";
  const state = q.get("state") ?? "";
  const row =
    state.length >= 16 && state.length <= 128 && B64URL.test(state)
      ? await env.DB.prepare("DELETE FROM oauth_states WHERE state = ? RETURNING redirect_uri, code_challenge, created_at")
          .bind(state)
          .first<{ redirect_uri: string; code_challenge: string; created_at: number }>()
      : null;
  if (!row || now - row.created_at > STATE_TTL_MS) {
    console.error("oauth callback: state " + (!row ? "not found (already used, never stored, or removed)" : "expired"));
    if (deps.noteAuthFailure) ctx.waitUntil(deps.noteAuthFailure(env, clientIp(req), "oauth-state"));
    return fail(400, "invalid_state");
  }
  if (!code || code.length > 200 || q.get("error")) return backToApp(row.redirect_uri, { error: "access_denied", state });

  const gh = await fetchGithubUser(env, deps.fetch ?? fetch, code);
  if (!gh) return backToApp(row.redirect_uri, { error: "github_failed", state });

  const userId = `gh:${gh.id}`;
  if (deps.checkAccountCreation) {
    const existing = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first<{ id: string }>();
    if (!existing) {
      const blocked = await deps.checkAccountCreation(env, clientIp(req));
      if (blocked) return backToApp(row.redirect_uri, { error: "rate_limited", state });
    }
  }
  await env.DB.prepare(
    "INSERT INTO users (id, github_id, name, avatar_url, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, avatar_url = excluded.avatar_url, last_login_at = excluded.last_login_at",
  )
    .bind(userId, gh.id, gh.name, gh.avatar_url, now, now)
    .run();

  const oneTime = randomToken(32);
  await env.DB.prepare(
    "INSERT INTO auth_codes (code_hash, user_id, redirect_uri, code_challenge, expires_at, used_at) VALUES (?, ?, ?, ?, ?, NULL)",
  )
    .bind(await sha256Hex(oneTime), userId, row.redirect_uri, row.code_challenge, now + CODE_TTL_MS)
    .run();
  return backToApp(row.redirect_uri, { code: oneTime, state });
}

export async function token(
  req: Request,
  env: AuthEnv,
  ctx: AuthCtx,
  deps: AuthDeps,
  now: number,
): Promise<Response> {
  const ip = clientIp(req);
  const body = await readJsonObject(req);
  if (!body) return fail(400, "invalid_request");

  if (body.grant_type === "refresh_token") return refreshGrant(env, ctx, deps, ip, body, now);
  if (body.grant_type !== "authorization_code") return fail(400, "unsupported_grant_type");

  const note = () => {
    if (deps.noteAuthFailure) ctx.waitUntil(deps.noteAuthFailure(env, ip, "token"));
  };
  const code = body.code;
  const verifier = body.code_verifier;
  if (
    typeof code !== "string" ||
    code.length < 20 ||
    code.length > 200 ||
    typeof verifier !== "string" ||
    verifier.length < 43 ||
    verifier.length > 128 ||
    !B64URL.test(verifier)
  ) {
    note();
    return fail(400, "invalid_grant");
  }

  // Atomic single use: the first request flips used_at, any replay finds no row.
  const row = await env.DB.prepare(
    "UPDATE auth_codes SET used_at = ? WHERE code_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING user_id, code_challenge",
  )
    .bind(now, await sha256Hex(code), now)
    .first<{ user_id: string; code_challenge: string }>();
  // The code is spent even when the verifier is wrong, so it cannot be brute-forced.
  if (!row || !timingSafeEqual(await sha256B64url(verifier), row.code_challenge)) {
    note();
    return fail(400, "invalid_grant");
  }

  const user = await env.DB.prepare("SELECT id, name, avatar_url FROM users WHERE id = ?").bind(row.user_id).first<UserRow>();
  if (!user) return fail(400, "invalid_grant");
  return startSession(env, user, cleanDeviceName(body.device_name), now);
}
