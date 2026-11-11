import { checkSameOrigin } from "@/lib/auth/util";
import { findZipUrl, isAssetUrl, parsePetdexUrl } from "@/lib/petdex";

// Plan 0069. Body: { url } with a https://petdex.dev/pets/<slug> link. Fetches that page, finds the pet's zip on
// assets.petdex.dev and returns the zip bytes. Only those two hosts are ever fetched, with no redirects.
const PAGE_CAP = 3 * 1024 * 1024;
const ZIP_CAP = 6 * 1024 * 1024;

const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });

class TooBig extends Error {}

async function readCapped(res: Response, cap: number): Promise<Uint8Array> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > cap) throw new TooBig();
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) {
      await reader.cancel().catch(() => {});
      throw new TooBig();
    }
    parts.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
}

async function get(url: string, ms: number, cap: number): Promise<Uint8Array | null> {
  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(ms), headers: { accept: "*/*" } });
  if (!res.ok) return null;
  return readCapped(res, cap);
}

export async function POST(req: Request) {
  if (process.env.HABIT_HOSTED === "1") return new Response(null, { status: 404 });
  if (!checkSameOrigin(req)) return fail(403, "forbidden");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_url");
  }
  const url = typeof (body as { url?: unknown } | null)?.url === "string" ? (body as { url: string }).url : "";
  const parsed = parsePetdexUrl(url);
  if (!parsed) return fail(400, "bad_url");
  try {
    const page = await get(parsed.pageUrl, 10_000, PAGE_CAP);
    if (!page) return fail(502, "not_found");
    const zipUrl = findZipUrl(new TextDecoder().decode(page), parsed.slug);
    if (!zipUrl || !isAssetUrl(zipUrl)) return fail(502, "not_found");
    const zip = await get(zipUrl, 30_000, ZIP_CAP);
    if (!zip) return fail(502, "not_found");
    return new Response(zip as BodyInit, {
      status: 200,
      headers: { "content-type": "application/zip", "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  } catch (e) {
    return fail(502, e instanceof TooBig ? "too_big" : "fetch_failed");
  }
}
