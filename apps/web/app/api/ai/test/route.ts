import { NextResponse } from "next/server";
import { aiError, byokErrorResponse, guardAi, guardByok, isByokRequest, isHostedAi, isResponse } from "@/lib/ai/guard";
import { byokChat } from "@/lib/ai/byok";
import { isAiProviderId } from "@/lib/ui-prefs";

const TEST_TIMEOUT_MS = 60_000;
const REPLY_CAP = 2_000;

// Body: { provider?: AiProviderId }. Sends the word "ping" through that provider (default: the saved one) and returns the reply
// or a short error. Cloud tools need the saved consent first. Allowed while the switch is off so Settings can test before turning it on.
// Never logs the reply or any argument.
export async function POST(req: Request) {
  if (isHostedAi()) return testHosted(req);
  const s = await guardAi(req, { allowDisabled: true });
  if (isResponse(s)) return s;
  let b: { provider?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    b = {};
  }
  if (b.provider !== undefined && !isAiProviderId(b.provider)) return aiError(400, "bad_request");
  const id = b.provider ?? s.provider;
  const { getProvider } = await import("@/lib/ai/providers");
  const provider = getProvider(id);
  if (provider.cloud && !s.consent.includes(id)) return aiError(403, "consent_required");

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TEST_TIMEOUT_MS);
  try {
    let reply = "";
    for await (const piece of provider.chat([{ role: "user", content: "ping" }], { signal: ac.signal, model: s.model || undefined, url: s.url })) {
      reply += piece;
      if (reply.length >= REPLY_CAP) break;
    }
    reply = reply.trim().slice(0, REPLY_CAP);
    if (!reply) return aiError(502, "empty_reply");
    return NextResponse.json({ ok: true, reply });
  } catch {
    return aiError(502, ac.signal.aborted ? "timeout" : "tool_failed");
  } finally {
    clearTimeout(timer);
    ac.abort();
  }
}

// Hosted: tests the key in the headers with one tiny request. The reply is trimmed; the key is never returned or logged.
async function testHosted(req: Request): Promise<Response> {
  const k = guardByok(req);
  if (!isByokRequest(k)) return k;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30_000);
  try {
    let reply = "";
    for await (const piece of byokChat(k, [{ role: "user", content: "Reply with the single word: ping" }], ac.signal)) {
      reply += piece;
      if (reply.length >= REPLY_CAP) break;
    }
    reply = reply.trim().slice(0, REPLY_CAP);
    if (!reply) return aiError(502, "empty_reply");
    return NextResponse.json({ ok: true, reply }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return byokErrorResponse(ac.signal.aborted ? new Error("timeout") : e);
  } finally {
    clearTimeout(timer);
    ac.abort();
  }
}
