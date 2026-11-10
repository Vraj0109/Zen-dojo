import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { checkSameOrigin } from "@/lib/auth/util";
import { getDb } from "@/lib/db";
import { linkAccount } from "@/lib/sync-engine";
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
    const result = await linkAccount(session.userId, db);
    return NextResponse.json({ ok: true, queued: result.queued });
  } catch (err: unknown) {
    const isMismatch =
      (err instanceof Error && (err.name === "account-mismatch" || err.message.includes("account-mismatch"))) ||
      (typeof err === "object" && err !== null && "message" in err && String((err as { message: unknown }).message).includes("account-mismatch"));
    if (isMismatch) {
      const message = err instanceof Error ? err.message : "account-mismatch";
      return NextResponse.json({ ok: false, error: "account-mismatch", message }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
