import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { checkSameOrigin } from "@/lib/auth/util";
import { getDb } from "@/lib/db";
import { runSync } from "@/lib/sync-engine";
import type { AnyDbClient } from "@/lib/sync-schema";

export async function POST(req: Request) {
  if (!checkSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const db = (await getDb()) as unknown as AnyDbClient;
    const result = await runSync({ db });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { state: "error", pushed: 0, pulled: 0, message: "Sync failed" },
      { status: 500 },
    );
  }
}
