import { NextResponse } from "next/server";
import { aiError, guardAi, isResponse } from "@/lib/ai/guard";
import { assertLoopback, validModelName } from "@/lib/ai/ollama";
import { setAiSettings } from "@/lib/ui-prefs";

// Body: { enabled?: boolean, model?: string, url?: string }. Allowed while the switch is off (that is how it gets turned on).
export async function POST(req: Request) {
  const s = await guardAi(req, { allowDisabled: true });
  if (isResponse(s)) return s;
  let b: { enabled?: unknown; model?: unknown; url?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return aiError(400, "bad_request");
  }
  const next: { enabled?: boolean; model?: string; url?: string } = {};
  if (b.enabled !== undefined) {
    if (typeof b.enabled !== "boolean") return aiError(400, "bad_request");
    next.enabled = b.enabled;
  }
  if (b.model !== undefined) {
    if (typeof b.model !== "string" || (b.model !== "" && !validModelName(b.model))) return aiError(400, "bad_model");
    next.model = b.model;
  }
  if (b.url !== undefined) {
    try {
      next.url = assertLoopback(String(b.url));
    } catch {
      return aiError(400, "not_loopback");
    }
  }
  try {
    await setAiSettings(next);
    return NextResponse.json({ ok: true });
  } catch {
    return aiError(500, "internal_error");
  }
}
