import { revalidateTag } from "next/cache";
import { requireAdminRequest } from "@/lib/auth/admin";
import { getContentDb } from "@/lib/content-db/client";
import { listAudit } from "@/lib/content-db/audit";
import { restoreFromAudit } from "@/lib/admin-content/write";

const MAX_BODY_BYTES = 2 * 1024 * 1024;

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const entity = url.searchParams.get("entity") ?? undefined;
  const entityId = url.searchParams.get("entityId") ?? undefined;
  const actorId = url.searchParams.get("actorId") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 50;
  const beforeParam = url.searchParams.get("before");
  const before = beforeParam ? Number(beforeParam) : undefined;

  const db = await getContentDb();
  const rows = await listAudit(db, { entity, entityId, actorId, limit, before });
  return Response.json({ rows });
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return Response.json({ error: "Body too large." }, { status: 413 });
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Body too large." }, { status: 413 });
  }

  let body: { auditId?: number };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "The body must be JSON." }, { status: 400 });
  }

  if (typeof body.auditId !== "number") {
    return Response.json({ error: "Missing auditId in body." }, { status: 400 });
  }

  const res = await restoreFromAudit(auth.proof, body.auditId);
  if (!res.ok) {
    const errors = "errors" in res && res.errors ? res.errors : ["Restore failed."];
    return Response.json({ ok: false, errors }, { status: 400 });
  }

  if (res.tags && res.tags.length > 0) {
    for (const tag of res.tags) {
      revalidateTag(tag, { expire: 0 });
    }
  }

  return Response.json({ ok: true, rev: res.rev, version: res.version, tags: res.tags });
}
