import { NextResponse } from "next/server";
import { getSession, workerFetch } from "@/lib/auth/session";
import { checkSameOrigin } from "@/lib/auth/util";
import { isHosted } from "@/lib/hosted";
import { unlinkAccount } from "@/lib/sync-engine";

export async function POST(req: Request) {
  if (!checkSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Send a JSON body." }, { status: 400 });
  }
  const b = body as { scope?: unknown; confirm?: unknown } | null;
  if (!b || typeof b !== "object" || b.confirm !== "DELETE") {
    return NextResponse.json({ ok: false, error: "Type DELETE to confirm." }, { status: 400 });
  }
  if (b.scope !== "data" && b.scope !== "account") {
    return NextResponse.json({ ok: false, error: 'scope must be "data" or "account".' }, { status: 400 });
  }

  let workerRes: Response;
  try {
    workerRes = await workerFetch("/api/account/delete-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: b.scope, confirm: "DELETE" }),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }

  let data: { deleted?: unknown; error?: unknown } | null = null;
  try {
    data = await workerRes.json();
  } catch {
    data = null;
  }

  if (!workerRes.ok) {
    const headers = new Headers();
    const retryAfter = workerRes.headers.get("retry-after");
    if (retryAfter) headers.set("Retry-After", retryAfter);
    const error = typeof data?.error === "string" ? data.error : "request_failed";
    return NextResponse.json({ ok: false, error }, { status: workerRes.status, headers });
  }

  try {
    await unlinkAccount(); // nothing should re-upload unless the user links again
    if (isHosted()) {
      // On the hosted site this person's copy lives in their own Durable Object: drop it too.
      const { dropHostedUserData } = await import("@/lib/db");
      await dropHostedUserData(session.userId);
    }
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
  const deleted = data && typeof data.deleted === "object" && data.deleted ? data.deleted : {};
  return NextResponse.json({ ok: true, deleted });
}
