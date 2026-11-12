import { NextResponse, type NextRequest } from "next/server";
import { ANON_COOKIE, ANON_MAX_AGE, needsAnonCookie } from "@/lib/hosted/gate";

/**
 * Hosted mode only (HABIT_HOSTED=1): a visitor with no account gets a random anonymous id cookie, which names their own
 * private database. The cookie is also added to this request so the first page already sees it. No redirects: the
 * site works without signing in.
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get("zd_at") || request.cookies.get("zd_rt"));
  if (!needsAnonCookie(process.env.HABIT_HOSTED === "1", hasSession, request.cookies.get(ANON_COOKIE)?.value)) {
    return NextResponse.next();
  }
  const id = crypto.randomUUID();
  request.cookies.set(ANON_COOKIE, id);
  const res = NextResponse.next({ request: { headers: request.headers } });
  res.cookies.set(ANON_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: ANON_MAX_AGE });
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|api/).*)"] };
