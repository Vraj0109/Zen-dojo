import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getWorkerUrl, verifyAccessToken } from "./jwks";
import type { AccessTokenClaims, Session } from "./types";

export type { Session } from "./types";

const ACCESS_COOKIE = "zd_at";
const REFRESH_COOKIE = "zd_rt";
const USER_COOKIE = "zd_u";

export function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
}

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    admin: boolean;
  };
  claims: AccessTokenClaims | null;
}

const refreshFlights = new Map<string, Promise<RefreshResult | null>>();

export function clearRefreshFlightsForTest(): void {
  refreshFlights.clear();
}

async function doRefresh(refreshToken: string): Promise<RefreshResult | null> {
  const existing = refreshFlights.get(refreshToken);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const workerUrl = getWorkerUrl();
      const tokenUrl = new URL("/auth/token", workerUrl).toString();
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        user?: {
          id: string;
          name: string | null;
          avatar_url: string | null;
          admin: boolean;
        };
      };

      if (!data.access_token || !data.refresh_token) {
        return null;
      }

      const claims = await verifyAccessToken(data.access_token);
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in ?? 900,
        user: data.user,
        claims,
      };
    } catch {
      return null;
    } finally {
      refreshFlights.delete(refreshToken);
    }
  })();

  refreshFlights.set(refreshToken, promise);
  return promise;
}

/**
 * Refresh tokens rotate: the Worker invalidates the old one as soon as it hands out a new one. A Server Component
 * cannot store the new cookies, so refreshing there would leave the browser holding a spent token, and the next
 * request would look like token theft and revoke the device. So only route handlers and server actions refresh.
 */
function canWriteCookies(store: Awaited<ReturnType<typeof cookies>>): boolean {
  try {
    store.set("zd_probe", "", { path: "/", maxAge: 0 });
    return true;
  } catch {
    return false;
  }
}

/** True when there is a refresh cookie, so a signed-out-looking page can ask /auth/refresh to renew the session. */
export async function hasRefreshCookie(): Promise<boolean> {
  return Boolean((await cookies()).get(REFRESH_COOKIE)?.value);
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const at = cookieStore.get(ACCESS_COOKIE)?.value;

  if (at) {
    const claims = await verifyAccessToken(at);
    if (claims) {
      let name = claims.sub;
      let avatarUrl: string | null = null;
      const uCookie = cookieStore.get(USER_COOKIE)?.value;
      if (uCookie) {
        try {
          const u = JSON.parse(decodeURIComponent(uCookie)) as {
            name?: string;
            avatarUrl?: string | null;
          };
          if (typeof u.name === "string" && u.name) name = u.name;
          if (typeof u.avatarUrl === "string") avatarUrl = u.avatarUrl;
        } catch {
          // ignore corrupted user cookie
        }
      }

      return {
        userId: claims.sub,
        name,
        avatarUrl,
        admin: claims.adm,
        expiresAt: claims.exp * 1000,
        sessionId: claims.sid,
      };
    }
  }

  // Token missing or invalid/expired, check refresh token
  const rt = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!rt) {
    return null;
  }

  if (!canWriteCookies(cookieStore)) {
    // Read-only context (Server Component): do not rotate the token here. The caller redirects to /auth/refresh.
    return null;
  }

  const refreshed = await doRefresh(rt);
  if (!refreshed) {
    // Refresh failed or revoked; clear cookies if possible
    try {
      cookieStore.delete(ACCESS_COOKIE);
      cookieStore.delete(REFRESH_COOKIE);
      cookieStore.delete(USER_COOKIE);
    } catch {
      // Ignore if called in pure Server Component
    }
    return null;
  }

  // Save new cookies (may throw in pure Server Component)
  try {
    cookieStore.set(ACCESS_COOKIE, refreshed.accessToken, getCookieOptions(900));
    cookieStore.set(REFRESH_COOKIE, refreshed.refreshToken, getCookieOptions(30 * 86400));
    if (refreshed.user) {
      cookieStore.set(
        USER_COOKIE,
        encodeURIComponent(
          JSON.stringify({
            name: refreshed.user.name ?? refreshed.user.id,
            avatarUrl: refreshed.user.avatar_url ?? null,
          }),
        ),
        getCookieOptions(30 * 86400),
      );
    }
  } catch {
    // In pure server components, cookies().set may throw in Next.js; catch and return session
  }

  const userId = refreshed.user?.id ?? refreshed.claims?.sub ?? "";
  const name = refreshed.user?.name ?? refreshed.user?.id ?? refreshed.claims?.sub ?? userId;
  const avatarUrl = refreshed.user?.avatar_url ?? null;
  const admin = refreshed.user?.admin ?? refreshed.claims?.adm ?? false;
  const sessionId = refreshed.claims?.sid ?? "";
  const expiresAt = refreshed.claims?.exp
    ? refreshed.claims.exp * 1000
    : Date.now() + refreshed.expiresIn * 1000;

  return {
    userId,
    name,
    avatarUrl,
    admin,
    expiresAt,
    sessionId,
  };
}

export async function requireSession(next?: string): Promise<Session> {
  const session = await getSession();
  if (!session) {
    if (await hasRefreshCookie()) redirect(`/auth/refresh?next=${encodeURIComponent(next ?? "/")}`);
    const target = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
    redirect(target);
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    if (await hasRefreshCookie()) redirect("/auth/refresh?next=%2Fadmin");
    redirect("/login?next=/admin");
  }
  if (!session.admin) {
    notFound();
  }
  return session;
}

export async function workerFetch(path: string, init?: RequestInit): Promise<Response> {
  const workerUrl = getWorkerUrl();
  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : new URL(path, workerUrl).toString();

  const cookieStore = await cookies();
  let at = cookieStore.get(ACCESS_COOKIE)?.value;
  const rt = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!at && rt) {
    const refreshed = await doRefresh(rt);
    if (refreshed) {
      at = refreshed.accessToken;
      try {
        cookieStore.set(ACCESS_COOKIE, refreshed.accessToken, getCookieOptions(900));
        cookieStore.set(REFRESH_COOKIE, refreshed.refreshToken, getCookieOptions(30 * 86400));
        if (refreshed.user) {
          cookieStore.set(
            USER_COOKIE,
            encodeURIComponent(
              JSON.stringify({
                name: refreshed.user.name ?? refreshed.user.id,
                avatarUrl: refreshed.user.avatar_url ?? null,
              }),
            ),
            getCookieOptions(30 * 86400),
          );
        }
      } catch {
        // Server component
      }
    }
  }

  const headers = new Headers(init?.headers);
  if (at) {
    headers.set("Authorization", `Bearer ${at}`);
  }

  let res = await fetch(url, {
    ...init,
    headers,
  });

  if (res.status === 401 && rt) {
    // Attempt token refresh and retry once
    const refreshed = await doRefresh(rt);
    if (refreshed) {
      try {
        cookieStore.set(ACCESS_COOKIE, refreshed.accessToken, getCookieOptions(900));
        cookieStore.set(REFRESH_COOKIE, refreshed.refreshToken, getCookieOptions(30 * 86400));
        if (refreshed.user) {
          cookieStore.set(
            USER_COOKIE,
            encodeURIComponent(
              JSON.stringify({
                name: refreshed.user.name ?? refreshed.user.id,
                avatarUrl: refreshed.user.avatar_url ?? null,
              }),
            ),
            getCookieOptions(30 * 86400),
          );
        }
      } catch {
        // Server component
      }
      headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
      res = await fetch(url, {
        ...init,
        headers,
      });
    } else {
      try {
        cookieStore.delete(ACCESS_COOKIE);
        cookieStore.delete(REFRESH_COOKIE);
        cookieStore.delete(USER_COOKIE);
      } catch {
        // Server component
      }
    }
  }

  return res;
}
