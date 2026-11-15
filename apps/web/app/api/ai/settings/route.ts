import { NextResponse } from "next/server";
import { aiError, guardAi, isResponse } from "@/lib/ai/guard";
import { assertLoopback, validModelName } from "@/lib/ai/ollama";
import { validLocalModelId } from "@/lib/ai/openai-local";
import { isAiProviderId, setAiSettings, type AiSettings } from "@/lib/ui-prefs";

// Body: { enabled?: boolean, model?: string, url?: string, provider?: AiProviderId, consent?: AiProviderId[],
//         lmstudioUrl?: string, lmstudioModel?: string, foldSystem?: boolean }.
// Allowed while the switch is off (that is how it gets turned on). An unknown provider id is a 400.
export async function POST(req: Request) {
  const s = await guardAi(req, { allowDisabled: true });
  if (isResponse(s)) return s;
  let b: { enabled?: unknown; model?: unknown; url?: unknown; provider?: unknown; consent?: unknown; lmstudioUrl?: unknown; lmstudioModel?: unknown; foldSystem?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return aiError(400, "bad_request");
  }
  const next: Partial<AiSettings> = {};
  // Plan 0078: LM Studio address (loopback only), model id and the fold switch.
  if (b.lmstudioUrl !== undefined) {
    try {
      next.lmstudioUrl = assertLoopback(String(b.lmstudioUrl));
    } catch {
      return aiError(400, "not_loopback");
    }
  }
  if (b.lmstudioModel !== undefined) {
    if (typeof b.lmstudioModel !== "string" || (b.lmstudioModel !== "" && !validLocalModelId(b.lmstudioModel))) return aiError(400, "bad_model");
    next.lmstudioModel = b.lmstudioModel;
  }
  if (b.foldSystem !== undefined) {
    if (typeof b.foldSystem !== "boolean") return aiError(400, "bad_request");
    next.foldSystem = b.foldSystem;
  }
  if (b.provider !== undefined) {
    if (!isAiProviderId(b.provider)) return aiError(400, "bad_provider");
    next.provider = b.provider;
  }
  if (b.consent !== undefined) {
    if (!Array.isArray(b.consent) || !b.consent.every(isAiProviderId)) return aiError(400, "bad_consent");
    next.consent = b.consent;
  }
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
