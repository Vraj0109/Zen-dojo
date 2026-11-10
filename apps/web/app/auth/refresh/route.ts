import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { checkSameOrigin, safeNext } from "@/lib/auth/util";

// The one place a session is renewed from a page. A route handler can store the new cookies; a Server Component cannot
// (see getSession). GET is for redirects from protected pages, POST is for the account menu's background renew.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url), 302);
  return NextResponse.redirect(new URL(next, req.url), 302);
}

export async function POST(req: Request) {
  if (!checkSameOrigin(req)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true });
}
