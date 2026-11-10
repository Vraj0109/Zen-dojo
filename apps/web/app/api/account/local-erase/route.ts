import { NextResponse } from "next/server";
import { checkSameOrigin } from "@/lib/auth/util";
import { eraseLocalData } from "@/lib/erase-data";

export async function POST(req: Request) {
  if (!checkSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Send a JSON body." }, { status: 400 });
  }
  const b = body as { confirm?: unknown; keepSettings?: unknown; includeImported?: unknown } | null;
  if (!b || typeof b !== "object" || b.confirm !== "DELETE") {
    return NextResponse.json({ ok: false, error: 'Type DELETE to confirm.' }, { status: 400 });
  }
  for (const k of ["keepSettings", "includeImported"] as const) {
    if (b[k] !== undefined && typeof b[k] !== "boolean") {
      return NextResponse.json({ ok: false, error: `${k} must be true or false.` }, { status: 400 });
    }
  }

  try {
    const { removed } = await eraseLocalData({
      keepSettings: b.keepSettings as boolean | undefined,
      includeImported: b.includeImported as boolean | undefined,
    });
    return NextResponse.json({ ok: true, removed });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
