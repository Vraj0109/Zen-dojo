/**
 * Public profile (plan 0069). Opt-in: the owner PUTs a PortfolioData snapshot, DELETE removes it.
 * GET /api/public/u/:publicId is unauthenticated and returns only that snapshot.
 * The snapshot is rebuilt field by field from a whitelist: unknown fields are rejected, never stored.
 * The public id is random; it is not the account id (which contains the GitHub numeric id).
 */

import type { Env } from "./index";
import { readBodyLimited, securityHeaders } from "./guard/headers";

export const MAX_PROFILE_BYTES = 60_000;
const PUBLIC_ID_RE = /^[A-Za-z0-9_-]{16,40}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[A-Za-z0-9:_.-]{1,80}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

export class InvalidProfile extends Error {}
const fail = (msg: string): never => {
  throw new InvalidProfile(msg);
};

function onlyKeys(o: Obj, allowed: readonly string[], where: string): void {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(`${where}: unknown field "${k.slice(0, 30)}"`);
}
function str(v: unknown, max: number, where: string, min = 1): string {
  if (typeof v !== "string") return fail(`${where}: must be a string`);
  const s = v.trim();
  if (s.length < min || s.length > max || CONTROL_RE.test(s)) return fail(`${where}: invalid text`);
  return s;
}
function num(v: unknown, where: string, opts: { int?: boolean; max?: number } = {}): number {
  const max = opts.max ?? 10_000_000;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max) return fail(`${where}: invalid number`);
  if (opts.int && !Number.isInteger(v)) return fail(`${where}: must be a whole number`);
  return v;
}
function date(v: unknown, where: string): string {
  if (typeof v !== "string" || !DATE_RE.test(v)) return fail(`${where}: must be YYYY-MM-DD`);
  return v;
}
function arr(v: unknown, max: number, where: string): unknown[] {
  if (!Array.isArray(v) || v.length > max) return fail(`${where}: invalid list`);
  return v;
}
function id(v: unknown, where: string): string {
  if (typeof v !== "string" || !ID_RE.test(v)) return fail(`${where}: invalid id`);
  return v;
}
function bool(v: unknown, where: string): boolean {
  if (typeof v !== "boolean") return fail(`${where}: must be true or false`);
  return v;
}

const TOP_KEYS = [
  "name", "level", "xp", "streak", "bestStreak", "totalSolved", "solvedByDifficulty", "planWeeksDone", "courses",
  "generatedOn", "activeDays", "hours", "totalProblems", "heatmap", "badges",
] as const;

/** Validates and rebuilds a PortfolioData snapshot. Throws InvalidProfile (the message is safe to return). */
export function sanitizePortfolio(input: unknown): Obj {
  if (!isObj(input)) return fail("data must be an object");
  onlyKeys(input, TOP_KEYS, "data");
  const out: Obj = {
    name: str(input.name, 60, "name"),
    level: num(input.level, "level", { int: true, max: 1000 }),
    xp: num(input.xp, "xp", { int: true }),
    streak: num(input.streak, "streak", { int: true, max: 100_000 }),
    bestStreak: num(input.bestStreak, "bestStreak", { int: true, max: 100_000 }),
    totalSolved: num(input.totalSolved, "totalSolved", { int: true, max: 100_000 }),
    planWeeksDone: num(input.planWeeksDone, "planWeeksDone", { int: true, max: 1000 }),
    generatedOn: date(input.generatedOn, "generatedOn"),
  };
  const d = input.solvedByDifficulty;
  if (!isObj(d)) return fail("solvedByDifficulty: must be an object");
  onlyKeys(d, ["easy", "medium", "hard"], "solvedByDifficulty");
  out.solvedByDifficulty = {
    easy: num(d.easy, "easy", { int: true, max: 100_000 }),
    medium: num(d.medium, "medium", { int: true, max: 100_000 }),
    hard: num(d.hard, "hard", { int: true, max: 100_000 }),
  };
  out.courses = arr(input.courses, 200, "courses").map((c, i) => {
    const w = `courses[${i}]`;
    if (!isObj(c)) return fail(`${w}: must be an object`);
    onlyKeys(c, ["id", "title", "kind", "done", "total", "completedOn"], w);
    if (c.kind !== "area" && c.kind !== "pattern" && c.kind !== "plan") return fail(`${w}.kind: invalid`);
    return {
      id: id(c.id, `${w}.id`),
      title: str(c.title, 120, `${w}.title`),
      kind: c.kind,
      done: num(c.done, `${w}.done`, { int: true, max: 100_000 }),
      total: num(c.total, `${w}.total`, { int: true, max: 100_000 }),
      completedOn: c.completedOn === null ? null : date(c.completedOn, `${w}.completedOn`),
    };
  });
  if (input.activeDays !== undefined) out.activeDays = num(input.activeDays, "activeDays", { int: true, max: 100_000 });
  if (input.hours !== undefined) out.hours = num(input.hours, "hours", { max: 1_000_000 });
  if (input.totalProblems !== undefined) out.totalProblems = num(input.totalProblems, "totalProblems", { int: true, max: 100_000 });
  if (input.heatmap !== undefined) {
    out.heatmap = arr(input.heatmap, 20, "heatmap").map((wk, i) =>
      arr(wk, 7, `heatmap[${i}]`).map((cell, j) => {
        const w = `heatmap[${i}][${j}]`;
        if (!isObj(cell)) return fail(`${w}: must be an object`);
        onlyKeys(cell, ["date", "xp", "level", "future"], w);
        return {
          date: date(cell.date, `${w}.date`),
          xp: num(cell.xp, `${w}.xp`, { int: true }),
          level: num(cell.level, `${w}.level`, { int: true, max: 4 }),
          future: bool(cell.future, `${w}.future`),
        };
      }),
    );
  }
  if (input.badges !== undefined) {
    out.badges = arr(input.badges, 60, "badges").map((b, i) => {
      const w = `badges[${i}]`;
      if (!isObj(b)) return fail(`${w}: must be an object`);
      onlyKeys(b, ["id", "title", "description", "earned", "value", "target"], w);
      return {
        id: id(b.id, `${w}.id`),
        title: str(b.title, 80, `${w}.title`),
        description: str(b.description, 240, `${w}.description`, 0),
        earned: bool(b.earned, `${w}.earned`),
        value: num(b.value, `${w}.value`, { max: 1_000_000 }),
        target: num(b.target, `${w}.target`, { max: 1_000_000 }),
      };
    });
  }
  return out;
}

function newPublicId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function reply(body: unknown, status: number, pathname: string, cors: Headers, extra?: Record<string, string>): Response {
  const h = securityHeaders(pathname, cors);
  h.set("Content-Type", "application/json");
  for (const [k, v] of Object.entries(extra ?? {})) h.set(k, v);
  return new Response(JSON.stringify(body), { status, headers: h });
}

export type ProfileAuth = () => Promise<{ userId: string } | { reject: Response }>;

/** Handles /api/profile/public (owner, authenticated) and /api/public/u/:id (public). Returns null for other paths. */
export async function handleProfile(
  req: Request,
  env: Env,
  pathname: string,
  cors: Headers,
  authenticate: ProfileAuth,
): Promise<Response | null> {
  if (pathname.startsWith("/api/public/u/")) {
    if (req.method !== "GET") return reply({ ok: false, error: "method_not_allowed" }, 405, pathname, cors);
    const publicId = pathname.slice("/api/public/u/".length);
    if (!PUBLIC_ID_RE.test(publicId)) return reply({ ok: false, error: "not_found" }, 404, pathname, cors);
    const row = await env.DB.prepare("SELECT data, updated_at FROM public_profiles WHERE public_id = ?")
      .bind(publicId)
      .first<{ data: string; updated_at: number }>();
    if (!row) return reply({ ok: false, error: "not_found" }, 404, pathname, cors);
    let data: unknown;
    try {
      data = JSON.parse(row.data);
    } catch {
      return reply({ ok: false, error: "not_found" }, 404, pathname, cors);
    }
    return reply({ ok: true, data, updatedAt: row.updated_at }, 200, pathname, cors, {
      "Cache-Control": "public, max-age=60, s-maxage=60",
      "X-Robots-Tag": "noindex, nofollow",
    });
  }
  if (pathname !== "/api/profile/public") return null;

  const auth = await authenticate();
  if ("reject" in auth) return auth.reject;
  const userId = auth.userId;

  if (req.method === "GET") {
    const row = await env.DB.prepare("SELECT public_id, updated_at FROM public_profiles WHERE user_id = ?")
      .bind(userId)
      .first<{ public_id: string; updated_at: number }>();
    return reply(row ? { ok: true, enabled: true, id: row.public_id, updatedAt: row.updated_at } : { ok: true, enabled: false }, 200, pathname, cors);
  }

  if (req.method === "DELETE") {
    await env.DB.prepare("DELETE FROM public_profiles WHERE user_id = ?").bind(userId).run();
    return reply({ ok: true, enabled: false }, 200, pathname, cors);
  }

  if (req.method === "PUT") {
    const body = await readBodyLimited(req, MAX_PROFILE_BYTES);
    if (!body.ok) return reply({ ok: false, error: "request_body_too_large" }, body.reason === "too_large" ? 413 : 400, pathname, cors);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body.text);
    } catch {
      return reply({ ok: false, error: "malformed_json" }, 400, pathname, cors);
    }
    let clean: Obj;
    try {
      if (!isObj(parsed)) return reply({ ok: false, error: "invalid_profile", detail: "body must be an object" }, 400, pathname, cors);
      onlyKeys(parsed, ["data"], "body");
      clean = sanitizePortfolio(parsed.data);
    } catch (e) {
      if (e instanceof InvalidProfile) return reply({ ok: false, error: "invalid_profile", detail: e.message }, 400, pathname, cors);
      throw e;
    }
    const json = JSON.stringify(clean);
    const existing = await env.DB.prepare("SELECT public_id FROM public_profiles WHERE user_id = ?")
      .bind(userId)
      .first<{ public_id: string }>();
    const publicId = existing?.public_id ?? newPublicId();
    const now = Date.now();
    await env.DB.prepare(
      "INSERT INTO public_profiles (user_id, public_id, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
    )
      .bind(userId, publicId, json, now)
      .run();
    return reply({ ok: true, enabled: true, id: publicId, updatedAt: now }, 200, pathname, cors);
  }

  return reply({ ok: false, error: "method_not_allowed" }, 405, pathname, cors);
}
