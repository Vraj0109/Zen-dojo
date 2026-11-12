import { NextResponse } from "next/server";
import { getWorkerUrl } from "@/lib/auth/jwks";
import { hubUrl } from "@/lib/hub/url";
import { computeS256, randomBase64Url, requestOrigin, safeNext } from "@/lib/auth/util";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const nextParam = url.searchParams.get("next");
  const validatedNext = safeNext(nextParam);

  const state = randomBase64Url(32);
  const verifier = randomBase64Url(32);
  const challenge = await computeS256(verifier);

  // Desktop app: the system browser cannot reach the app's local server with
  // the PKCE cookie, so the Worker sends the browser back via the deep link.
  // HABIT_DESKTOP is set only by apps/desktop/main.js.
  const callbackUrl =
    process.env.HABIT_DESKTOP === "1"
      ? "zendojo://auth/callback"
      : new URL("/auth/callback", requestOrigin(req)).toString();

  const workerUrl = getWorkerUrl();
  const targetUrl = new URL(hubUrl("/auth/github/start", workerUrl));
  targetUrl.searchParams.set("redirect_uri", callbackUrl);
  targetUrl.searchParams.set("state", state);
  targetUrl.searchParams.set("code_challenge", challenge);

  const res = NextResponse.redirect(targetUrl.toString(), 302);
  // Never cache this redirect: it carries a one-time sign-in state, and a browser reusing it replays the same state.
  res.headers.set("Cache-Control", "no-store");
  res.cookies.set("zd_pkce", JSON.stringify({ state, verifier, next: validatedNext }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
