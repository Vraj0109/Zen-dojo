import "server-only";
import type { ChatMessage } from "@habit/shared";

// Plan 0060: the only network code of the local AI helper. It talks to a loopback Ollama and nothing else.

export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const MODEL_RE = /^[a-zA-Z0-9._:/-]{1,100}$/;
const MAX_BODY = 2 * 1024 * 1024;
const QUICK_TIMEOUT_MS = 4000;

export function validModelName(name: string): boolean {
  return typeof name === "string" && MODEL_RE.test(name);
}

/** Returns the URL's origin when its host is loopback over http(s); throws otherwise. */
export function assertLoopback(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("The Ollama address is not a valid URL.");
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("The Ollama address must be http.");
  if (host !== "127.0.0.1" && host !== "::1" && host !== "localhost") throw new Error("Ollama must run on this computer (localhost).");
  if (u.username || u.password) throw new Error("The Ollama address must not contain a login.");
  return u.origin;
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

async function getJson(base: string, path: string): Promise<unknown> {
  const res = await fetch(`${assertLoopback(base)}${path}`, { signal: AbortSignal.timeout(QUICK_TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`Ollama answered ${res.status}.`);
  return JSON.parse(await readCapped(res));
}

export type OllamaStatus = { running: true; version: string } | { running: false };

export async function status(base: string = DEFAULT_OLLAMA_URL): Promise<OllamaStatus> {
  try {
    const j = (await getJson(base, "/api/version")) as { version?: unknown };
    return { running: true, version: typeof j.version === "string" ? j.version : "" };
  } catch {
    return { running: false };
  }
}

export async function listModels(base: string = DEFAULT_OLLAMA_URL): Promise<string[]> {
  try {
    const j = (await getJson(base, "/api/tags")) as { models?: { name?: unknown }[] };
    return (j.models ?? []).map((m) => m.name).filter((n): n is string => typeof n === "string");
  } catch {
    return [];
  }
}

/** Parse a stream of JSON lines into objects. Bad lines are skipped. */
export async function* jsonLines(body: ReadableStream<Uint8Array>): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const parse = (line: string): Record<string, unknown> | null => {
    if (!line.trim()) return null;
    try {
      const v = JSON.parse(line);
      return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const obj = parse(buf.slice(0, nl));
      buf = buf.slice(nl + 1);
      if (obj) yield obj;
    }
  }
  const last = parse(buf);
  if (last) yield last;
}

async function post(base: string, path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(`${assertLoopback(base)}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
    cache: "no-store",
  });
  if (!res.ok || !res.body) throw new Error(`Ollama answered ${res.status}.`);
  return res;
}

/** Download a model; yields progress objects ({status, total, completed}). */
export async function* pullModel(name: string, base: string = DEFAULT_OLLAMA_URL, signal?: AbortSignal): AsyncGenerator<Record<string, unknown>> {
  if (!validModelName(name)) throw new Error("Bad model name.");
  const res = await post(base, "/api/pull", { model: name, stream: true }, signal);
  yield* jsonLines(res.body!);
}

/** Chat with a model; yields the text pieces as they arrive. */
export async function* chat(messages: ChatMessage[], model: string, base: string = DEFAULT_OLLAMA_URL, signal?: AbortSignal): AsyncGenerator<string> {
  if (!validModelName(model)) throw new Error("Bad model name.");
  const res = await post(base, "/api/chat", { model, messages, stream: true }, signal);
  for await (const obj of jsonLines(res.body!)) {
    if (typeof obj.error === "string") throw new Error("The model reported an error.");
    const msg = obj.message as { content?: unknown } | undefined;
    if (msg && typeof msg.content === "string" && msg.content) yield msg.content;
    if (obj.done === true) return;
  }
}
