import { NextResponse } from "next/server";
import { getSession, workerFetch } from "@/lib/auth/session";
import { checkSameOrigin } from "@/lib/auth/util";

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

export async function POST(req: Request) {
  if (!checkSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
  }

  const bodyBuffer = await req.arrayBuffer();
  if (bodyBuffer.byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
  }

  // Forward only the body and Content-Type.
  // Never forward client cookies or client-supplied x-user-id or auth headers.
  const workerRes = await workerFetch("/api/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: bodyBuffer,
  });

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
}
