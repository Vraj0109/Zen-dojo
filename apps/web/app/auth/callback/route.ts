import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getWorkerUrl } from "@/lib/auth/jwks";
import { hubUrl } from "@/lib/hub/url";
import { getCookieOptions } from "@/lib/auth/session";
import { requestOrigin, safeNext } from "@/lib/auth/util";

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

  const cookieStore = await cookies();
  const pkceCookie = cookieStore.get("zd_pkce")?.value;

  if (!pkceCookie || !state || !code) {
    return NextResponse.redirect(new URL("/login?error=state", origin), 302);
  }

  let pkceData: { state?: string; verifier?: string; next?: string };
  try {
    pkceData = JSON.parse(pkceCookie) as {
      state?: string;
      verifier?: string;
      next?: string;
    };
  } catch {
    return NextResponse.redirect(new URL("/login?error=state", origin), 302);
  }

  if (!pkceData.state || pkceData.state !== state || !pkceData.verifier) {
    return NextResponse.redirect(new URL("/login?error=state", origin), 302);
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
    return NextResponse.redirect(new URL("/login?error=state", origin), 302);
  }

  if (!tokenRes.ok) {
    if (tokenRes.status === 429) {
      return NextResponse.redirect(new URL("/login?error=rate_limited", origin), 302);
    }
    return NextResponse.redirect(new URL("/login?error=state", origin), 302);
  }

  const data = (await tokenRes.json()) as {
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
    return NextResponse.redirect(new URL("/login?error=state", origin), 302);
  }

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
