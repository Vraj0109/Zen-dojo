import { aiError, guardAi, isResponse, textStream } from "@/lib/ai/guard";
import { buildMessages, isAiAction } from "@/lib/ai/context";
import { chat } from "@/lib/ai/ollama";

// Body: { problemId, action: "hint" | "review" | "solution", hintIndex? }. Streams plain text. Nothing is logged or stored.
export async function POST(req: Request) {
  const s = await guardAi(req);
  if (isResponse(s)) return s;
  let b: { problemId?: unknown; action?: unknown; hintIndex?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return aiError(400, "bad_request");
  }
  if (typeof b.problemId !== "string" || !isAiAction(b.action)) return aiError(400, "bad_request");
  if (!s.model) return aiError(400, "no_model");
  const messages = await buildMessages(b.problemId, b.action, typeof b.hintIndex === "number" ? b.hintIndex : 0);
  if (!messages) return aiError(404, "unknown_problem");
  if (messages.length === 0) return aiError(400, "no_code");
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());
  return textStream(chat(messages, s.model, s.url, abort.signal), abort);
}
