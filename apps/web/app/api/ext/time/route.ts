import { authorizeExtension } from "@/lib/leetcode/extension";
import { SITE_TIME_LIMITS, addSiteTime } from "@/lib/site-time";

/** Extension: add seconds spent on LeetCode problem pages. Body: { entries: [{ day, slug, seconds }] } */
export async function POST(request: Request) {
  const denied = await authorizeExtension(request);
  if (denied) return denied;
  const text = await request.text();
  if (text.length > SITE_TIME_LIMITS.bodyBytes) return Response.json({ error: "Too large; send smaller batches." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { entries } = (body ?? {}) as { entries?: unknown };
  if (!Array.isArray(entries)) return Response.json({ error: "Expected { entries: [...] }" }, { status: 400 });
  return Response.json({ ok: true, ...(await addSiteTime(entries)) });
}
