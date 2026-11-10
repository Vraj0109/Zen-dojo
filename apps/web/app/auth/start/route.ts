import { NextResponse } from "next/server";
import { getWorkerUrl } from "@/lib/auth/jwks";
import { computeS256, randomBase64Url, safeNext } from "@/lib/auth/util";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const nextParam = url.searchParams.get("next");
  const validatedNext = safeNext(nextParam);

  const state = randomBase64Url(32);
  const verifier = randomBase64Url(32);
  const challenge = await computeS256(verifier);

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host");
  const origin = host ? `${forwardedProto ?? "http"}://${host}` : url.origin;
  const callbackUrl = new URL("/auth/callback", origin).toString();

  const workerUrl = getWorkerUrl();
  const targetUrl = new URL("/auth/github/start", workerUrl);
  targetUrl.searchParams.set("redirect_uri", callbackUrl);
  targetUrl.searchParams.set("state", state);
  targetUrl.searchParams.set("code_challenge", challenge);

  const res = NextResponse.redirect(targetUrl.toString(), 302);
  res.cookies.set("zd_pkce", JSON.stringify({ state, verifier, next: validatedNext }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
