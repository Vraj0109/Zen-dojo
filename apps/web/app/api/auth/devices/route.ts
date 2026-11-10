import { NextResponse } from "next/server";
import { workerFetch } from "@/lib/auth/session";
import { checkSameOrigin } from "@/lib/auth/util";

export async function GET() {
  const res = await workerFetch("/auth/devices", { method: "GET" });
  if (res.status === 401) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = [];
  }
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(req: Request) {
  if (!checkSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  let id = url.searchParams.get("id");

  if (!id) {
    try {
      const body = (await req.json()) as { id?: unknown };
      if (typeof body?.id === "string") {
        id = body.id;
      }
    } catch {
      // Body was not JSON
    }
  }

  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const res = await workerFetch(`/auth/devices/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (res.status === 401) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = { ok: res.ok };
  }
  return NextResponse.json(data, { status: res.status });
}
