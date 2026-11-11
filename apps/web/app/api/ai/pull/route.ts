import { aiError, guardAi, isResponse, textStream } from "@/lib/ai/guard";
import { pullModel, validModelName } from "@/lib/ai/ollama";

// Streams download progress as one JSON object per line.
export async function POST(req: Request) {
  const s = await guardAi(req);
  if (isResponse(s)) return s;
  let model = "";
  try {
    model = String(((await req.json()) as { model?: unknown }).model ?? "");
  } catch {
    return aiError(400, "bad_request");
  }
  if (!validModelName(model)) return aiError(400, "bad_model");
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());
  async function* lines() {
    for await (const p of pullModel(model, s.url, abort.signal)) {
      yield JSON.stringify({ status: p.status, total: p.total, completed: p.completed }) + "\n";
    }
  }
  return textStream(lines(), abort);
}
