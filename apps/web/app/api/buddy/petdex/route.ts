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

/** Hosts a Petdex fetch may touch, including after a redirect (checked on every hop). */
const ALLOWED_HOSTS = new Set(["petdex.dev", "www.petdex.dev", "assets.petdex.dev"]);
const MAX_HOPS = 3;

class Upstream extends Error {
  constructor(readonly code: "not_found" | "timeout" | "unreachable") {
    super(code);
  }
}

/** GET with manual redirects: https only, each hop must stay on a Petdex host, at most 3 hops. */
async function get(url: string, ms: number, cap: number): Promise<Uint8Array> {
  let cur = url;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const u = new URL(cur);
    if (u.protocol !== "https:" || !ALLOWED_HOSTS.has(u.hostname.toLowerCase()) || u.port || u.username || u.password) throw new Upstream("not_found");
    let res: Response;
    try {
      res = await fetch(cur, { redirect: "manual", signal: AbortSignal.timeout(ms), headers: { accept: "*/*", "user-agent": "ZenDojo-pet-import" } });
    } catch (e) {
      const name = (e as { name?: string }).name;
      throw new Upstream(name === "TimeoutError" || name === "AbortError" ? "timeout" : "unreachable");
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Upstream("not_found");
      cur = new URL(loc, cur).href;
      continue;
    }
    if (!res.ok) throw new Upstream("not_found");
    return readCapped(res, cap);
  }
  throw new Upstream("not_found");
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
    const page = await get(parsed.pageUrl, 15_000, PAGE_CAP);
    const zipUrl = findZipUrl(new TextDecoder().decode(page), parsed.slug);
    if (!zipUrl || !isAssetUrl(zipUrl)) return fail(502, "not_found");
    const zip = await get(zipUrl, 45_000, ZIP_CAP);
    return new Response(zip as BodyInit, {
      status: 200,
      headers: { "content-type": "application/zip", "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  } catch (e) {
    if (e instanceof TooBig) return fail(502, "too_big");
    if (e instanceof Upstream) return fail(502, e.code === "not_found" ? "not_found" : e.code === "timeout" ? "timeout" : "fetch_failed");
    return fail(502, "fetch_failed");
  }
}
