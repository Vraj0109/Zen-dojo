import { NextResponse } from "next/server";
import { aiError, guardAi, isResponse } from "@/lib/ai/guard";
import { buildBuddyMessages, cleanBuddyLine, parseBuddyRequest } from "@/lib/ai/buddy";
import { getProvider } from "@/lib/ai/providers";

// Plan 0068. Body: { event, tone, name, persona? }. Returns { line }. Only those values (and an imported pet's name and description) reach the model: no code, notes or problem text.
// At most one request every 30 seconds per server process; beyond that 429 "slow_down" and the client uses a built-in line.
const MIN_GAP_MS = 30_000;
const TIMEOUT_MS = 25_000;
let lastRequestAt = 0;

export async function POST(req: Request) {
  const s = await guardAi(req);
  if (isResponse(s)) return s;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return aiError(400, "bad_request");
  }
  const body = parseBuddyRequest(raw);
  if (!body) return aiError(400, "bad_request");
  const provider = getProvider(s.provider);
  if (provider.cloud && !s.consent.includes(provider.id)) return aiError(403, "consent_required");
  if (!provider.cloud && !s.model) return aiError(400, "no_model");

  const now = Date.now();
  if (now - lastRequestAt < MIN_GAP_MS) return aiError(429, "slow_down");
  lastRequestAt = now;

  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    let text = "";
    for await (const piece of provider.chat(buildBuddyMessages(body), { signal: abort.signal, model: provider.cloud ? undefined : s.model, url: s.url })) {
      text += piece;
      if (text.length > 2000) break;
    }
    const line = cleanBuddyLine(text);
    if (!line) return aiError(502, "empty");
    return NextResponse.json({ line }, { headers: { "cache-control": "no-store" } });
  } catch {
    return aiError(502, "ai_failed");
  } finally {
    clearTimeout(timer);
    abort.abort();
  }
}
