import { aiError, guardAi, isResponse, textStream } from "@/lib/ai/guard";
import { buildChat, parseChatRequest } from "@/lib/ai/context";
import { getProvider } from "@/lib/ai/providers";

// Plan 0067. Body: { problemId, messages: [{ role, content }], intent?, hintIndex?, revealSolution?, includeCode? }.
// The server builds the system message and the problem context; the reference solution is added only when revealSolution is true.
// Streams plain text through the selected provider. Nothing is logged or stored.
export async function POST(req: Request) {
  const s = await guardAi(req);
  if (isResponse(s)) return s;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return aiError(400, "bad_request");
  }
  const body = parseChatRequest(raw);
  if (!body) return aiError(400, "bad_request");
  const provider = getProvider(s.provider);
  if (provider.cloud && !s.consent.includes(provider.id)) return aiError(403, "consent_required");
  if (!provider.cloud && !s.model) return aiError(400, "no_model");
  const built = await buildChat(body);
  if (!built.ok) return built.error === "no_code" ? aiError(400, "no_code") : aiError(404, "unknown_problem");
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());
  return textStream(
    provider.chat(built.messages, { signal: abort.signal, model: provider.cloud ? undefined : s.model, url: s.url }),
    abort,
    provider.cloud ? `\n\n[${provider.label} stopped or could not answer. Is it installed and signed in? Try the Test button in Settings.]` : undefined,
  );
}
