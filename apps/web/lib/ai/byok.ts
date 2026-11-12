import type { ChatMessage } from "@habit/shared";
import { BYOK_PROVIDERS, isByokProviderId, isValidKey, isValidModel, type ByokProviderId } from "@/lib/ai-key-store";

// Hosted site: the person's own API key, used for ONE request. Direct HTTPS calls with fetch only (Workers-safe, no child
// processes). The key is read from a request header, put in the provider request header and then forgotten: it is never
// logged, stored, placed in a URL, or included in any error or response. Upstream error bodies are never forwarded.
//
// Endpoints and event shapes checked against the providers' docs on 2026-11-12:
//  - Anthropic Messages: POST https://api.anthropic.com/v1/messages, x-api-key + anthropic-version, "stream": true,
//    SSE content_block_delta with delta.type "text_delta".
//  - OpenAI Chat Completions: POST https://api.openai.com/v1/chat/completions, Bearer auth, "stream": true,
//    SSE choices[0].delta.content, ends with [DONE].
//  - Gemini: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse,
//    x-goog-api-key header, candidates[0].content.parts[].text.

export const ANTHROPIC_VERSION = "2026-10-21";
export const MAX_OUTPUT_TOKENS = 2048;

export type ByokErrorCode =
  | "no_key"
  | "bad_key_format"
  | "bad_provider"
  | "bad_model"
  | "invalid_key"
  | "model_not_found"
  | "rate_limited"
  | "provider_rejected"
  | "provider_unavailable"
  | "network";

/** An error that carries only a fixed code. Its message is a constant: never upstream text, never the key. */
export class ByokError extends Error {
  constructor(public readonly code: ByokErrorCode) {
    super(code);
    this.name = "ByokError";
  }
}

export interface ByokRequest {
  provider: ByokProviderId;
  key: string;
  model: string;
}

/** Read and validate x-ai-provider / x-ai-key / x-ai-model. Pure. Never echoes the values. */
export function parseByokHeaders(headers: Headers): ByokRequest | ByokError {
  const provider = headers.get("x-ai-provider");
  const key = headers.get("x-ai-key");
  if (!provider && !key) return new ByokError("no_key");
  if (!isByokProviderId(provider)) return new ByokError("bad_provider");
  if (!key || !isValidKey(key.trim())) return new ByokError("bad_key_format");
  const rawModel = (headers.get("x-ai-model") ?? "").trim();
  if (!isValidModel(rawModel)) return new ByokError("bad_model");
  return { provider, key: key.trim(), model: rawModel || BYOK_PROVIDERS[provider].defaultModel };
}

export function statusToCode(status: number): ByokErrorCode {
  if (status === 401 || status === 403) return "invalid_key";
  if (status === 404) return "model_not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "provider_unavailable";
  return "provider_rejected";
}

interface Built {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

export function buildProviderRequest(req: ByokRequest, messages: ChatMessage[]): Built {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const turns = messages.filter((m) => m.role !== "system");
  if (req.provider === "anthropic") {
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: { "content-type": "application/json", "x-api-key": req.key, "anthropic-version": ANTHROPIC_VERSION },
      body: {
        model: req.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        stream: true,
        ...(system ? { system } : {}),
        messages: turns.map((m) => ({ role: m.role, content: m.content })),
      },
    };
  }
  if (req.provider === "openai") {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: { "content-type": "application/json", authorization: `Bearer ${req.key}` },
      body: { model: req.model, stream: true, messages: messages.map((m) => ({ role: m.role, content: m.content })) },
    };
  }
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:streamGenerateContent?alt=sse`,
    headers: { "content-type": "application/json", "x-goog-api-key": req.key },
    body: {
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: turns.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    },
  };
}

/** Pure. The text carried by one SSE `data:` payload for this provider ("" when none; throws ByokError on an error event). */
export function textFromEvent(provider: ByokProviderId, data: string): string {
  if (data === "[DONE]") return "";
  let v: Record<string, unknown>;
  try {
    const p = JSON.parse(data);
    if (!p || typeof p !== "object") return "";
    v = p as Record<string, unknown>;
  } catch {
    return "";
  }
  if (provider === "anthropic") {
    if (v.type === "error") throw new ByokError("provider_unavailable");
    const d = v.delta as { type?: unknown; text?: unknown } | undefined;
    return v.type === "content_block_delta" && d?.type === "text_delta" && typeof d.text === "string" ? d.text : "";
  }
  if (provider === "openai") {
    if (v.error) throw new ByokError("provider_unavailable");
    const c = (v.choices as { delta?: { content?: unknown } }[] | undefined)?.[0]?.delta?.content;
    return typeof c === "string" ? c : "";
  }
  if (v.error) throw new ByokError("provider_unavailable");
  const parts = (v.candidates as { content?: { parts?: { text?: unknown; thought?: unknown }[] } }[] | undefined)?.[0]?.content?.parts ?? [];
  return parts.map((p) => (typeof p.text === "string" && p.thought !== true ? p.text : "")).join("");
}

/** Stream the answer text. Throws ByokError with a fixed code on any failure. */
export async function* byokChat(req: ByokRequest, messages: ChatMessage[], signal: AbortSignal): AsyncGenerator<string> {
  const built = buildProviderRequest(req, messages);
  let res: Response;
  try {
    res = await fetch(built.url, { method: "POST", headers: built.headers, body: JSON.stringify(built.body), signal, redirect: "error", cache: "no-store" });
  } catch {
    if (signal.aborted) throw new DOMException("aborted", "AbortError");
    throw new ByokError("network");
  }
  if (!res.ok || !res.body) {
    try {
      await res.body?.cancel();
    } catch {
      /* ignore */
    }
    throw new ByokError(res.ok ? "provider_unavailable" : statusToCode(res.status));
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).replace(/\r$/, "");
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const t = textFromEvent(req.provider, line.slice(5).trim());
        if (t) yield t;
      }
    }
    const rest = buf.trim();
    if (rest.startsWith("data:")) {
      const t = textFromEvent(req.provider, rest.slice(5).trim());
      if (t) yield t;
    }
  } catch (e) {
    if (e instanceof ByokError) throw e;
    if (signal.aborted) throw e;
    throw new ByokError("network");
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
}

/** Plain-language message for a code. Constant strings only. */
export const BYOK_ERROR_TEXT: Record<ByokErrorCode, string> = {
  no_key: "Add your API key in Settings first.",
  bad_key_format: "That key does not look right. Paste it again in Settings.",
  bad_provider: "Pick a provider in Settings.",
  bad_model: "That model name is not valid. Clear it to use the default.",
  invalid_key: "The provider did not accept your key. Check it in Settings.",
  model_not_found: "The provider does not know that model name. Clear it in Settings to use the default.",
  rate_limited: "The provider says you are out of quota or sending too fast. Check your billing, then try again.",
  provider_rejected: "The provider rejected the request. Check your key and model name in Settings.",
  provider_unavailable: "The provider is having trouble right now. Try again in a moment.",
  network: "Could not reach the provider. Check your connection and try again.",
};

export function byokHttpStatus(code: ByokErrorCode): number {
  switch (code) {
    case "no_key":
    case "bad_key_format":
    case "bad_provider":
    case "bad_model":
      return 400;
    case "invalid_key":
      return 401;
    case "model_not_found":
      return 404;
    case "rate_limited":
      return 429;
    default:
      return 502;
  }
}
