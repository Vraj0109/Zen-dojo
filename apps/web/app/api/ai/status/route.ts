import { NextResponse } from "next/server";
import { describeHardware, recommendModel, MODEL_TIERS } from "@habit/shared";
import { detectHardware } from "@/lib/ai/hardware";
import { aiError, guardAi, isResponse } from "@/lib/ai/guard";
import { listModels, status } from "@/lib/ai/ollama";
import { detectProviders } from "@/lib/ai/providers";

// Works while the switch is off so Settings can show the hardware and the install hint.
export async function POST(req: Request) {
  // Hosted: no local tools; the page shows the "bring your own key" setup instead. Nothing here touches a key.
  if (process.env.HABIT_HOSTED === "1") return NextResponse.json({ ok: true, hosted: true }, { headers: { "cache-control": "no-store" } });
  const s = await guardAi(req, { allowDisabled: true });
  if (isResponse(s)) return s;
  try {
    const [hw, st, providers] = await Promise.all([detectHardware(), status(s.url), detectProviders()]);
    const models = st.running ? await listModels(s.url) : [];
    return NextResponse.json({
      ok: true,
      enabled: s.enabled,
      model: s.model,
      hardware: hw,
      summary: describeHardware(hw),
      recommended: recommendModel(hw),
      tiers: MODEL_TIERS,
      ollama: st,
      installed: models,
      providers,
      provider: s.provider,
      consent: s.consent,
      platform: process.platform,
    });
  } catch {
    return aiError(500, "internal_error");
  }
}
