import { NextResponse } from "next/server";
import { getSession, workerFetch } from "@/lib/auth/session";
import { checkSameOrigin } from "@/lib/auth/util";

export async function GET(req: Request) {
  if (!checkSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const workerRes = await workerFetch("/api/sync/head");
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    const retryAfter = workerRes.headers.get("retry-after");
    if (retryAfter) {
      headers.set("Retry-After", retryAfter);
    }

    let data: unknown;
    try {
      data = await workerRes.json();
    } catch {
      data = { ok: workerRes.ok };
    }

    return NextResponse.json(data, {
      status: workerRes.status,
      headers,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "failed_to_fetch_head" }, { status: 500 });
  }
}
