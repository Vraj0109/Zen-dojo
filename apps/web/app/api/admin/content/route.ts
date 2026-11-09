import { adminDenied, addItems } from "@/lib/content-admin";
import { deleteItem, getItem, listItems } from "@/lib/content";

// Add, list and remove content items without a release (plan 0030, docs/content-editing.md "Add one thing").
// Needs the environment variable CONTENT_ADMIN_TOKEN and the header "Authorization: Bearer <token>". Without the variable
// the route answers 404, so a normal install exposes nothing. The desktop app only listens on 127.0.0.1.
export const maxDuration = 120;

export async function GET(request: Request) {
  const denied = adminDenied(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const row = await getItem(id);
    return row ? Response.json(row) : Response.json({ error: "No such item." }, { status: 404 });
  }
  const rows = await listItems();
  return Response.json({ items: rows.map((r) => ({ id: r.id, type: r.type, source: r.source, rev: r.rev, updatedAt: r.updatedAt })) });
}

export async function POST(request: Request) {
  const denied = adminDenied(request);
  if (denied) return denied;
  const text = await request.text();
  if (text.length > 4_000_000) return Response.json({ error: "Too large." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "The body must be JSON." }, { status: 400 });
  }
  const results = await addItems(body);
  return Response.json({ results }, { status: results.every((r) => r.ok) ? 200 : 400 });
}

export async function DELETE(request: Request) {
  const denied = adminDenied(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Give ?id=<item id>." }, { status: 400 });
  return (await deleteItem(id)) ? Response.json({ removed: id }) : Response.json({ error: "No such item." }, { status: 404 });
}
