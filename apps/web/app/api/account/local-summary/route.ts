import { NextResponse } from "next/server";
import { checkSameOrigin } from "@/lib/auth/util";
import { getLocalSummary } from "@/lib/erase-data";
import { getSyncStatus } from "@/lib/sync-engine";

export async function GET(req: Request) {
  if (!checkSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  try {
    const [counts, status] = await Promise.all([getLocalSummary(), getSyncStatus()]);
    return NextResponse.json({ ok: true, counts, linked: status.account !== null, account: status.account });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
