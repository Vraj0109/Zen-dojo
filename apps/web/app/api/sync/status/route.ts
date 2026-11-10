import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { checkSameOrigin } from "@/lib/auth/util";
import { getDb } from "@/lib/db";
import { getSyncStatus } from "@/lib/sync-engine";
import type { AnyDbClient } from "@/lib/sync-schema";

export async function GET(req: Request) {
  if (!checkSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ account: null, state: "signed-out", lastSyncedAt: null, pending: 0 });
  }

  try {
    const db = (await getDb()) as unknown as AnyDbClient;
    const status = await getSyncStatus(db);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { account: null, state: "error", lastSyncedAt: null, pending: 0, message: "Failed to read sync status" },
      { status: 500 },
    );
  }
}
