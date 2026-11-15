import "server-only";
import type { ChatMessage } from "@habit/shared";
import { assertLoopback } from "./ollama";
import { AI_LMSTUDIO_DEFAULT_URL, LOCAL_MODEL_ID_RE } from "@/lib/ui-prefs";

// Plan 0078: a loopback-only client for LM Studio and any other server that speaks the OpenAI chat format on this
// computer (llama.cpp llama-server, vLLM, LocalAI). No key, nothing leaves the computer. Never logs or throws bodies.

export const DEFAULT_LMSTUDIO_URL = AI_LMSTUDIO_DEFAULT_URL;
const MAX_BODY = 2 * 1024 * 1024;
const QUICK_TIMEOUT_MS = 4000;

export function validLocalModelId(id: string): boolean {
  return typeof id === "string" && LOCAL_MODEL_ID_RE.test(id);
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const dec = new TextDecoder();
  let total = 0;
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY) {
      await reader.cancel();
      throw new Error("Response too large.");
    }
    out += dec.decode(value, { stream: true });
  }
  return out;
}

export type LmStatus = { running: true; models: string[] } | { running: false };

/** GET /v1/models. Embedding models are left out (they cannot chat). */
export async function lmStatus(base: string = DEFAULT_LMSTUDIO_URL): Promise<LmStatus> {
  try {
    const res = await fetch(`${assertLoopback(base)}/v1/models`, { signal: AbortSignal.timeout(QUICK_TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return { running: false };
    const j = JSON.parse(await readCapped(res)) as { data?: { id?: unknown }[] };
    const models = (Array.isArray(j.data) ? j.data : [])
      .map((m) => m?.id)
      .filter((id): id is string => typeof id === "string" && !/embed/i.test(id));
    return { running: true, models };
  } catch {
    return { running: false };
  }
}

/** Parses a Server-Sent Events body into the `data:` payloads. Lines may be split across chunks. */
async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const take = (line: string): string | null => {
    const l = line.replace(/\r$/, "");
    if (!l.startsWith("data:")) return null; // blank lines, ": comments", event: lines
    return l.slice(5).trimStart();
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const d = take(buf.slice(0, nl));
        buf = buf.slice(nl + 1);
        if (d !== null) yield d;
      }
    }
    const last = take(buf);
    if (last !== null) yield last;
  } finally {
    reader.releaseLock();
  }
}

/** POST /v1/chat/completions with stream: true; yields the text pieces. Reasoning text is ignored. */
export async function* lmChat(messages: ChatMessage[], model: string, base: string = DEFAULT_LMSTUDIO_URL, signal?: AbortSignal): AsyncGenerator<string> {
  if (!validLocalModelId(model)) throw new Error("Bad model name.");
  const res = await fetch(`${assertLoopback(base)}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
    cache: "no-store",
  });
  if (!res.ok || !res.body) throw new Error(`The local server answered ${res.status}.`);
  for await (const data of sseData(res.body)) {
    if (signal?.aborted) return;
    if (data === "[DONE]") return;
    let obj: unknown;
    try {
      obj = JSON.parse(data);
    } catch {
      continue;
    }
    if (!obj || typeof obj !== "object") continue;
    const o = obj as { error?: unknown; choices?: { delta?: { content?: unknown } }[] };
    if (o.error) throw new Error("The model reported an error.");
    const piece = o.choices?.[0]?.delta?.content;
    if (typeof piece === "string" && piece) yield piece;
  }
}
