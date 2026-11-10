import { signAccessToken } from "./jwt";
import type { AuthCtx, AuthDeps, AuthEnv } from "./types";
import { REFRESH_TTL_MS } from "./types";
import { fail, json, randomToken, readJsonObject, sha256Hex, timingSafeEqual } from "./util";

export interface UserRow {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

export function isAdmin(env: AuthEnv, userId: string): boolean {
  return (env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(userId);
}

export function cleanDeviceName(v: unknown): string {
  if (typeof v !== "string") return "Unknown device";
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 64);
  return s || "Unknown device";
}

async function tokenResponse(env: AuthEnv, user: UserRow, sid: string, refresh: string, now: number): Promise<Response> {
  const adm = isAdmin(env, user.id);
  const { token, expiresIn } = await signAccessToken(env, { sub: user.id, sid, adm }, now);
  return json({
    access_token: token,
    refresh_token: refresh,
    expires_in: expiresIn,
    user: { id: user.id, name: user.name, avatar_url: user.avatar_url, admin: adm },
  });
}

/** Creates a device session and returns the token response. Only the refresh hash is stored. */
export async function startSession(env: AuthEnv, user: UserRow, deviceName: string, now: number): Promise<Response> {
  const sid = randomToken(16);
  const refresh = randomToken(32);
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, refresh_hash, prev_refresh_hash, device_name, created_at, last_seen_at, expires_at, revoked_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, NULL)",
  )
    .bind(sid, user.id, await sha256Hex(refresh), deviceName, now, now, now + REFRESH_TTL_MS)
    .run();
  return tokenResponse(env, user, sid, refresh, now);
}

interface SessionRow {
  id: string;
  user_id: string;
  refresh_hash: string;
  prev_refresh_hash: string | null;
  expires_at: number;
  revoked_at: number | null;
}

const INVALID = () => fail(401, "invalid_grant");

export async function refreshGrant(
  env: AuthEnv,
  ctx: AuthCtx,
  deps: AuthDeps,
  ip: string,
  body: Record<string, unknown>,
  now: number,
): Promise<Response> {
  const refresh = body.refresh_token;
  if (typeof refresh !== "string" || refresh.length < 20 || refresh.length > 200) return INVALID();
  const hash = await sha256Hex(refresh);
  const row = await env.DB.prepare(
    "SELECT id, user_id, refresh_hash, prev_refresh_hash, expires_at, revoked_at FROM sessions WHERE refresh_hash = ? OR prev_refresh_hash = ? LIMIT 1",
  )
    .bind(hash, hash)
    .first<SessionRow>();
  if (!row) {
    if (deps.noteAuthFailure) ctx.waitUntil(deps.noteAuthFailure(env, ip, "token"));
    return INVALID();
  }
  const isCurrent = timingSafeEqual(row.refresh_hash, hash);
  if (!isCurrent) {
    // An already-rotated token was presented again: assume it leaked, kill the device session.
    await env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").bind(now, row.id).run();
    if (deps.noteAuthFailure) ctx.waitUntil(deps.noteAuthFailure(env, ip, "refresh-reuse"));
    return INVALID();
  }
  if (row.revoked_at !== null || row.expires_at <= now) return INVALID();

  const user = await env.DB.prepare("SELECT id, name, avatar_url FROM users WHERE id = ?").bind(row.user_id).first<UserRow>();
  if (!user) return INVALID();

  const next = randomToken(32);
  const res = await env.DB.prepare(
    "UPDATE sessions SET prev_refresh_hash = refresh_hash, refresh_hash = ?, last_seen_at = ?, expires_at = ? WHERE id = ? AND refresh_hash = ? AND revoked_at IS NULL",
  )
    .bind(await sha256Hex(next), now, now + REFRESH_TTL_MS, row.id, hash)
    .run();
  if (res.meta?.changes === 0) return INVALID(); // lost a race with another refresh of the same token
  return tokenResponse(env, user, row.id, next, now);
}

export async function logout(env: AuthEnv, req: Request, now: number): Promise<Response> {
  const body = await readJsonObject(req);
  const refresh = body?.refresh_token;
  if (typeof refresh === "string" && refresh.length >= 20 && refresh.length <= 200) {
    const hash = await sha256Hex(refresh);
    await env.DB.prepare(
      "UPDATE sessions SET revoked_at = ? WHERE (refresh_hash = ? OR prev_refresh_hash = ?) AND revoked_at IS NULL",
    )
      .bind(now, hash, hash)
      .run();
  }
  return json({ ok: true }); // same answer whether or not the token existed
}

export async function listDevices(env: AuthEnv, userId: string, currentSid: string, now: number): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT id, device_name, created_at, last_seen_at FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY last_seen_at DESC",
  )
    .bind(userId, now)
    .all<{ id: string; device_name: string | null; created_at: number; last_seen_at: number }>();
  return json(
    (results ?? []).map((r) => ({
      id: r.id,
      name: r.device_name ?? "Unknown device",
      created_at: r.created_at,
      last_seen_at: r.last_seen_at,
      current: r.id === currentSid,
    })),
  );
}

export async function deleteDevice(env: AuthEnv, userId: string, id: string, now: number): Promise<Response> {
  const res = await env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL")
    .bind(now, id, userId)
    .run();
  if (!res.meta?.changes) return fail(404, "not_found");
  return json({ ok: true });
}
