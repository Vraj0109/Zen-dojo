import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getWorkerUrl } from "@/lib/auth/jwks";
import { hubUrl } from "@/lib/hub/url";
import { getCookieOptions } from "@/lib/auth/session";
import { requestOrigin, safeNext } from "@/lib/auth/util";
import { takeDesktopPkce } from "@/lib/auth/desktop-pkce";

/** One log line per failure (the code and an HTTP status, never the code, state, verifier or tokens), then /login. */
function fail(origin: string, reason: string, status?: number): NextResponse {
  console.error(`auth callback: ${reason}${status ? ` (HTTP ${status})` : ""}`);
  return NextResponse.redirect(new URL(`/login?error=${reason}`, origin), 302);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  // Never trust req.url for redirects: the callback may be loaded by the desktop window on any local port.
  const origin = requestOrigin(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, origin),
      302,
    );
  }

  if (!state || !code) return fail(origin, "missing");

  const cookieStore = await cookies();
  const pkceCookie = cookieStore.get("zd_pkce")?.value;
  let cookieData: { state?: string; verifier?: string; next?: string } | null = null;
  if (pkceCookie) {
    try {
      cookieData = JSON.parse(pkceCookie) as { state?: string; verifier?: string; next?: string };
    } catch {
      cookieData = null;
    }
  }

  const desktop = process.env.HABIT_DESKTOP === "1";
  // Desktop: the cookie may be lost because the window cancels the redirect that set it; the local server keeps a
  // copy (single use). The hosted site never uses this map.
  const fromMap = desktop ? takeDesktopPkce(state) : null;
  let pkceData: { verifier: string; next?: string };
  if (cookieData?.state === state && cookieData.verifier) {
    pkceData = { verifier: cookieData.verifier, next: cookieData.next };
  } else if (fromMap) {
    pkceData = fromMap;
  } else if (cookieData?.state && cookieData.verifier) {
    return fail(origin, "state_mismatch");
  } else {
    return fail(origin, "no_pkce");
  }

  const workerUrl = getWorkerUrl();
  const tokenUrl = hubUrl("/auth/token", workerUrl);

  const userAgent = req.headers.get("user-agent") ?? "";
  const deviceName = userAgent ? userAgent.slice(0, 64) : "Web browser";

  let tokenRes: Response;
  try {
    tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        code_verifier: pkceData.verifier,
        device_name: deviceName,
      }),
    });
  } catch {
    return fail(origin, "token_unreachable");
  }

  if (!tokenRes.ok) {
    if (tokenRes.status === 429) return fail(origin, "rate_limited", 429);
    return fail(origin, "token_refused", tokenRes.status);
  }

  const data = (await tokenRes.json().catch(() => ({}))) as {
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

  if (!data.access_token || !data.refresh_token) return fail(origin, "token_bad", tokenRes.status);

  const destination = safeNext(pkceData.next);
  const res = NextResponse.redirect(new URL(destination, origin), 302);

  res.cookies.set("zd_at", data.access_token, getCookieOptions(900));
  res.cookies.set("zd_rt", data.refresh_token, getCookieOptions(30 * 86400));
  if (data.user) {
    res.cookies.set(
      "zd_u",
      encodeURIComponent(
        JSON.stringify({
          name: data.user.name ?? data.user.id,
          avatarUrl: data.user.avatar_url ?? null,
        }),
      ),
      getCookieOptions(30 * 86400),
    );
  }
  res.cookies.delete("zd_pkce");

  return res;
}
