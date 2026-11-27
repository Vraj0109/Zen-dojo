import "server-only";

import { notFound, redirect } from "next/navigation";
import { type AdminProof, mintAdminProof } from "./admin-proof";
import { getSession, hasRefreshCookie } from "./session";
import { verifyAccessToken } from "./jwks";

export type { AdminProof } from "./admin-proof";

export class AdminDeniedError extends Error {
  constructor(message = "Not allowed.") {
    super(message);
    this.name = "AdminDeniedError";
  }
}

/** Pure decision: claims.adm === true and, if ADMIN_USER_IDS is set, sub is in that trimmed list. */
export function isAdminClaims(
  claims: { adm?: unknown; sub?: unknown } | null | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!claims || claims.adm !== true) return false;
  const rawList = env.ADMIN_USER_IDS;
  if (!rawList || !rawList.trim()) return true;
  const allowed = rawList
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length === 0) return true;
  return typeof claims.sub === "string" && allowed.includes(claims.sub);
}

/** For pages and layouts. Signed out -> redirect; not admin -> 404. Returns AdminProof. */
export async function requireAdminPage(next = "/admin"): Promise<AdminProof> {
  const session = await getSession();
  if (!session) {
    if (await hasRefreshCookie()) {
      redirect(`/auth/refresh?next=${encodeURIComponent(next)}`);
    }
    const loginTarget = next.startsWith("/") && !next.includes("?") && !next.includes("&") ? `/login?next=${next}` : `/login?next=${encodeURIComponent(next)}`;
    redirect(loginTarget);
  }
  if (!session.admin) {
    notFound();
  }
  return mintAdminProof(session.userId, session.name);
}

/** For server actions. Not admin -> throws AdminDeniedError. Returns AdminProof. */
export async function requireAdminAction(): Promise<AdminProof> {
  const session = await getSession();
  if (!session || !session.admin) {
    throw new AdminDeniedError();
  }
  return mintAdminProof(session.userId, session.name);
}

function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(";")) {
    const [k, ...v] = part.split("=");
    if (k) {
      result[k.trim()] = v.join("=").trim();
    }
  }
  return result;
}

/**
 * For route handlers. Reads Bearer token first, else zd_at cookie.
 * Cookie-authenticated requests other than GET/HEAD require matching Origin (CSRF).
 * Returns { ok: true, proof } | { ok: false, response }.
 */
export async function requireAdminRequest(
  request: Request,
): Promise<{ ok: true; proof: AdminProof } | { ok: false; response: Response }> {
  const authHeader = request.headers.get("authorization");
  const bearerMatch = authHeader ? /^Bearer\s+(.+)$/i.exec(authHeader) : null;
  let token = bearerMatch ? bearerMatch[1].trim() : null;
  let isCookieAuth = false;
  let cookieName: string | null = null;

  if (!token) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const cookies = parseCookies(cookieHeader);
    if (cookies.zd_at) {
      token = cookies.zd_at;
      isCookieAuth = true;
      if (cookies.zd_u) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookies.zd_u)) as { name?: string };
          if (typeof parsed.name === "string" && parsed.name) {
            cookieName = parsed.name;
          }
        } catch {
          // ignore corrupted user cookie
        }
      }
    }
  }

  if (!token) {
    return {
      ok: false,
      response: Response.json({ error: "sign-in-required" }, { status: 401 }),
    };
  }

  if (isCookieAuth) {
    const method = request.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      const envUrl = process.env.PUBLIC_SITE_URL?.trim();
      const siteOrigin = envUrl
        ? new URL(envUrl.startsWith("http") ? envUrl : `https://${envUrl}`).origin
        : new URL(request.url).origin;
      const originHeader = request.headers.get("origin");
      if (!originHeader || originHeader !== siteOrigin) {
        return {
          ok: false,
          response: Response.json({ error: "not-admin" }, { status: 403 }),
        };
      }
    }
  }

  const claims = await verifyAccessToken(token);
  if (!claims) {
    return {
      ok: false,
      response: Response.json({ error: "sign-in-required" }, { status: 401 }),
    };
  }

  if (!isAdminClaims(claims)) {
    return {
      ok: false,
      response: Response.json({ error: "not-admin" }, { status: 403 }),
    };
  }

  const name = cookieName ?? claims.sub;
  const proof = mintAdminProof(claims.sub, name);
  return { ok: true, proof };
}
