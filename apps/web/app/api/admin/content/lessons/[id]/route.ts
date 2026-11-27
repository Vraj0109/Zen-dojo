import { revalidateTag } from "next/cache";
import { revOf, type ContentLesson } from "@habit/shared";
import { requireAdminRequest } from "@/lib/auth/admin";
import { getContentDb } from "@/lib/content-db/client";
import { loadLesson } from "@/lib/content-db/load";
import { deleteLesson, saveLesson } from "@/lib/admin-content/write";

const MAX_BODY_BYTES = 2 * 1024 * 1024;

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } },
) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const db = await getContentDb();
  const lesson = await loadLesson(db, id);
  if (!lesson) {
    return Response.json({ error: "Lesson not found." }, { status: 404 });
  }
  return Response.json({ lesson, rev: revOf(lesson) });
}

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } },
) {
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

  let body: { draft?: ContentLesson; baseRev?: string | null; note?: unknown; notify?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "The body must be JSON." }, { status: 400 });
  }

  const { id } = await ctx.params;
  if (!body.draft || typeof body.draft !== "object") {
    return Response.json({ error: "Missing draft in body." }, { status: 400 });
  }
  if (body.draft.row?.id !== id) {
    return Response.json({ error: "Draft id does not match route id." }, { status: 400 });
  }

  const res = await saveLesson(auth.proof, body.draft, body.baseRev ?? null, { note: typeof body.note === "string" ? body.note : null, notify: body.notify === true });
  if (!res.ok) {
    if (res.conflict) {
      return Response.json({ ok: false, conflict: true, current: res.current }, { status: 409 });
    }
    return Response.json({ ok: false, errors: res.errors }, { status: 400 });
  }

  if (res.tags) {
    for (const tag of res.tags) revalidateTag(tag, { expire: 0 });
  }
  return Response.json({ ok: true, rev: res.rev, version: res.version });
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } },
) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  let baseRev: string | null = null;
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Body too large." }, { status: 413 });
  }
  if (text.trim()) {
    try {
      const body = JSON.parse(text);
      if (typeof body.baseRev === "string") baseRev = body.baseRev;
    } catch {
      return Response.json({ error: "The body must be JSON." }, { status: 400 });
    }
  }

  const res = await deleteLesson(auth.proof, id, baseRev);
  if (!res.ok) {
    if (res.conflict) {
      return Response.json({ ok: false, conflict: true, current: res.current }, { status: 409 });
    }
    const status = res.errors.includes("Lesson not found.") ? 404 : 400;
    return Response.json({ ok: false, errors: res.errors }, { status });
  }

  if (res.tags) {
    for (const tag of res.tags) revalidateTag(tag, { expire: 0 });
  }
  return Response.json({ ok: true, rev: res.rev, version: res.version });
}
