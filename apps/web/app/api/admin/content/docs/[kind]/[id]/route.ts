import { revalidateTag } from "next/cache";
import { revOf, type ContentDoc } from "@habit/shared";
import { requireAdminRequest } from "@/lib/auth/admin";
import { getContentDb } from "@/lib/content-db/client";
import { loadDoc } from "@/lib/content-db/load";
import { saveDoc } from "@/lib/admin-content/write";

// Admin API for docs (list content: reading list, quiz deck, key numbers…). The desktop admin editor forwards doc saves
// here, like problems and lessons, so a desktop edit lands in the hosted content database.

const MAX_BODY_BYTES = 2 * 1024 * 1024;

type Ctx = { params: Promise<{ kind: string; id: string }> | { kind: string; id: string } };

export async function GET(request: Request, ctx: Ctx) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const { kind, id } = await ctx.params;
  const doc = await loadDoc(await getContentDb(), kind, id);
  if (!doc) return Response.json({ error: "Doc not found." }, { status: 404 });
  return Response.json({ doc, rev: revOf(doc) });
}

export async function PUT(request: Request, ctx: Ctx) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) return Response.json({ error: "Body too large." }, { status: 413 });
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return Response.json({ error: "Body too large." }, { status: 413 });

  let body: { draft?: ContentDoc; baseRev?: string | null; note?: unknown; notify?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "The body must be JSON." }, { status: 400 });
  }
  const { kind, id } = await ctx.params;
  if (!body.draft || typeof body.draft !== "object") return Response.json({ error: "Missing draft in body." }, { status: 400 });
  if (body.draft.row?.kind !== kind || body.draft.row?.id !== id) {
    return Response.json({ error: "Draft kind and id do not match the route." }, { status: 400 });
  }

  const res = await saveDoc(auth.proof, body.draft, body.baseRev ?? null, {
    note: typeof body.note === "string" ? body.note : null,
    notify: body.notify === true,
  });
  if (!res.ok) {
    if (res.conflict) return Response.json({ ok: false, conflict: true, current: res.current }, { status: 409 });
    return Response.json({ ok: false, errors: res.errors }, { status: 400 });
  }
  for (const tag of res.tags ?? []) revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, rev: res.rev, version: res.version });
}
