import { requireAdminRequest } from "@/lib/auth/admin";
import { getContentWriteDb } from "@/lib/content-db/client";
import { writeAudit } from "@/lib/content-db/audit";
import { addItems } from "@/lib/content-admin";
import { deleteItem, getItem, listItems } from "@/lib/content";

// Add, list and remove content items without a release (plan 0030, docs/content-editing.md "Add one thing").
// Protected by requireAdminRequest (plan 0113): needs a verified admin JWT or admin cookie.
export const maxDuration = 120;

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const row = await getItem(id);
    return row ? Response.json(row) : Response.json({ error: "No such item." }, { status: 404 });
  }
  const rows = await listItems();
  return Response.json({ items: rows.map((r) => ({ id: r.id, type: r.type, source: r.source, rev: r.rev, updatedAt: r.updatedAt })) });
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const text = await request.text();
  if (text.length > 4_000_000) return Response.json({ error: "Too large." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "The body must be JSON." }, { status: 400 });
  }
  const results = await addItems(body);
  const okResults = results.filter((r) => r.ok);
  if (okResults.length > 0) {
    const contentDb = await getContentWriteDb(auth.proof);
    await contentDb.transaction(async (tx) => {
      for (const r of okResults) {
        await writeAudit(tx, auth.proof, {
          action: "import",
          entity: "content_item",
          entityId: r.id,
          before: null,
          after: r,
          requestId: null,
        });
      }
    });
  }
  return Response.json({ results }, { status: results.every((r) => r.ok) ? 200 : 400 });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Give ?id=<item id>." }, { status: 400 });
  const existing = await getItem(id);
  const removed = await deleteItem(id);
  if (removed) {
    const contentDb = await getContentWriteDb(auth.proof);
    await contentDb.transaction(async (tx) => {
      await writeAudit(tx, auth.proof, {
        action: "delete",
        entity: "content_item",
        entityId: id,
        before: existing ? existing.item : null,
        after: null,
        requestId: null,
      });
    });
  }
  return removed ? Response.json({ removed: id }) : Response.json({ error: "No such item." }, { status: 404 });
}
