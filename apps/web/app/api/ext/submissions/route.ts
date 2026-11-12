import { hostedNotFound } from "@/lib/hosted/no-run";
import { EXT_LIMITS, authorizeExtension, importFromExtension } from "@/lib/leetcode/extension";

/** Extension: store your accepted LeetCode submissions and record the solves. Body: { submissions: [...], topics?: [{ slug, tags }] } */
export async function POST(request: Request) {
  const gone = hostedNotFound();
  if (gone) return gone;
  const denied = await authorizeExtension(request);
  if (denied) return denied;
  const text = await request.text();
  if (text.length > EXT_LIMITS.bodyBytes) return Response.json({ error: "Too large; send smaller batches." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { submissions, topics } = (body ?? {}) as { submissions?: unknown; topics?: unknown };
  if (!Array.isArray(submissions)) return Response.json({ error: "Expected { submissions: [...], topics?: [...] }" }, { status: 400 });
  const result = await importFromExtension(submissions, Array.isArray(topics) ? topics : []);
  return Response.json({ ok: true, ...result });
}
