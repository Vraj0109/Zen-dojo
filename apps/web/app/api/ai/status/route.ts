import { NextResponse } from "next/server";
import { describeHardware, recommendModel, MODEL_TIERS } from "@habit/shared";
import { detectHardware } from "@/lib/ai/hardware";
import { aiError, guardAi, isResponse } from "@/lib/ai/guard";
import { listModels, status } from "@/lib/ai/ollama";

// Works while the switch is off so Settings can show the hardware and the install hint.
export async function POST(req: Request) {
  const s = await guardAi(req, { allowDisabled: true });
  if (isResponse(s)) return s;
  try {
    const [hw, st] = await Promise.all([detectHardware(), status(s.url)]);
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
    });
  } catch {
    return aiError(500, "internal_error");
  }
}
