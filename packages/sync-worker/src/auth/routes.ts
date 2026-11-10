import { jwks, verifyAccessToken as verifyJwt } from "./jwt";
import { callback, start, token } from "./oauth";
import { deleteDevice, listDevices, logout } from "./sessions";
import type { AuthCtx, AuthDeps, AuthEnv } from "./types";
import { clientIp, fail, json } from "./util";

export type { AuthCtx, AuthDeps, AuthEnv } from "./types";

export async function verifyAccessToken(
  token: string,
  env: AuthEnv,
): Promise<{ sub: string; sid: string; adm: boolean } | null> {
  return verifyJwt(token, env);
}

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer ([A-Za-z0-9._-]+)$/i.exec(h);
  return m ? m[1] : null;
}

/**
 * Handles /auth/* and /.well-known/jwks.json. Returns null for any other path.
 * `deps.noteAuthFailure` is guard's noteAuthFailure, injected by the integrator (index.ts).
 */
export async function handleAuth(
  req: Request,
  env: AuthEnv,
  ctx: AuthCtx,
  deps: AuthDeps = {},
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  if (path !== "/.well-known/jwks.json" && !path.startsWith("/auth/")) return null;
  const now = (deps.now ?? Date.now)();
  const method = req.method;

  try {
    if (path === "/.well-known/jwks.json") {
      if (method !== "GET") return fail(405, "method_not_allowed");
      return json(await jwks(env), 200, { "cache-control": "public, max-age=300" });
    }
    if (path === "/auth/github/start") return method === "GET" ? await start(req, env, ctx, now) : fail(405, "method_not_allowed");
    if (path === "/auth/github/callback") {
      return method === "GET" ? await callback(req, env, ctx, deps, now) : fail(405, "method_not_allowed");
    }
    if (path === "/auth/token") return method === "POST" ? await token(req, env, ctx, deps, now) : fail(405, "method_not_allowed");
    if (path === "/auth/logout") return method === "POST" ? await logout(env, req, now) : fail(405, "method_not_allowed");

    const devices = /^\/auth\/devices(?:\/([A-Za-z0-9_-]{1,64}))?$/.exec(path);
    if (devices) {
      const id = devices[1];
      if ((id && method !== "DELETE") || (!id && method !== "GET")) return fail(405, "method_not_allowed");
      const raw = bearer(req);
      const claims = raw ? await verifyJwt(raw, env, now) : null;
      if (!claims) {
        if (deps.noteAuthFailure) ctx.waitUntil(deps.noteAuthFailure(env, clientIp(req), "token"));
        return fail(401, "unauthorized");
      }
      return id ? await deleteDevice(env, claims.sub, id, now) : await listDevices(env, claims.sub, claims.sid, now);
    }
    return fail(404, "not_found");
  } catch {
    // No details leave the Worker: no stack traces, no secrets.
    return fail(500, "server_error");
  }
}
