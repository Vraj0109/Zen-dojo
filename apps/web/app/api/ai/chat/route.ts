import { aiError, byokTextStream, guardAi, guardByok, isByokRequest, isHostedAi, isResponse, textStream } from "@/lib/ai/guard";
import { byokChat } from "@/lib/ai/byok";
import { buildChat, parseChatRequest } from "@/lib/ai/context";

// Plan 0067. Body: { problemId, messages: [{ role, content }], intent?, hintIndex?, revealSolution?, includeCode? }.
// The server builds the system message and the problem context; the reference solution is added only when revealSolution is true.
// Streams plain text through the selected provider. Nothing is logged or stored.
// Hosted site: the person's own API key arrives in x-ai-provider / x-ai-key / x-ai-model headers, is used for this one request
// and is never stored or logged. The same prompt rules apply (the server builds the prompt; the solution only when revealSolution).
export async function POST(req: Request) {
  if (isHostedAi()) return postHosted(req);
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
  const { getProvider } = await import("@/lib/ai/providers"); // dynamic: pulls in child_process, which the hosted build never loads
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

async function postHosted(req: Request): Promise<Response> {
  const k = guardByok(req);
  if (!isByokRequest(k)) return k;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return aiError(400, "bad_request");
  }
  const body = parseChatRequest(raw);
  if (!body) return aiError(400, "bad_request");
  const built = await buildChat(body);
  if (!built.ok) return built.error === "no_code" ? aiError(400, "no_code") : aiError(404, "unknown_problem");
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());
  return byokTextStream(byokChat(k, built.messages, abort.signal), abort);
}
