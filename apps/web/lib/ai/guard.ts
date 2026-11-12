import "server-only";
import { NextResponse } from "next/server";
import { checkSameOrigin } from "@/lib/auth/util";
import { getAiSettings, type AiSettings } from "@/lib/ui-prefs";
import { ByokError, byokHttpStatus, parseByokHeaders, type ByokRequest } from "@/lib/ai/byok";

/** True on the hosted website: the only AI there is the person's own API key (plan 0058). */
export const isHostedAi = (): boolean => process.env.HABIT_HOSTED === "1";

/**
 * Hosted checks: same-origin, then the key headers. Returns the validated key request or a response to send back.
 * The key is never logged, stored or echoed; errors carry a fixed code only.
 */
export function guardByok(req: Request): ByokRequest | NextResponse {
  if (!checkSameOrigin(req)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403, headers: { "cache-control": "no-store" } });
  const r = parseByokHeaders(req.headers);
  if (r instanceof ByokError) return NextResponse.json({ ok: false, error: r.code }, { status: byokHttpStatus(r.code), headers: { "cache-control": "no-store" } });
  return r;
}

export const isByokRequest = (v: ByokRequest | NextResponse): v is ByokRequest => !(v instanceof NextResponse);

/** Error response for a failed provider call. Only the fixed code leaves the server. */
export function byokErrorResponse(e: unknown): NextResponse {
  const code = e instanceof ByokError ? e.code : "network";
  return NextResponse.json({ ok: false, error: code }, { status: byokHttpStatus(code), headers: { "cache-control": "no-store" } });
}

/**
 * Wait for the first piece so a bad key or model becomes a clean JSON error (not a broken stream), then stream the rest as plain text.
 */
export async function byokTextStream(pieces: AsyncGenerator<string>, abort: AbortController): Promise<Response> {
  let first: IteratorResult<string>;
  try {
    first = await pieces.next();
  } catch (e) {
    abort.abort();
    return byokErrorResponse(e);
  }
  if (first.done) {
    abort.abort();
    return NextResponse.json({ ok: false, error: "empty" }, { status: 502, headers: { "cache-control": "no-store" } });
  }
  const head = first.value;
  async function* all() {
    yield head;
    yield* pieces;
  }
  return textStream(all(), abort, "\n\n[The AI provider stopped answering. Try again.]");
}

/** The AI routes exist only on this computer's own app: never on the hosted site. */
export const aiAvailable = (): boolean => process.env.HABIT_HOSTED !== "1";

const json = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

/**
 * Common checks for the AI routes. Returns the saved settings, or a response to send back.
 * 404 when hosted, 403 when cross-origin, 403 when the switch is off (unless `allowDisabled`).
 */
export async function guardAi(req: Request, opts: { allowDisabled?: boolean } = {}): Promise<AiSettings | NextResponse> {
  if (!aiAvailable()) return json(404, "not_found");
  if (!checkSameOrigin(req)) return json(403, "forbidden");
  const s = await getAiSettings();
  if (!s.enabled && !opts.allowDisabled) return json(403, "disabled");
  return s;
}

export const isResponse = (v: AiSettings | NextResponse): v is NextResponse => v instanceof NextResponse;
export { json as aiError };

/** Stream text pieces as a plain-text response. Errors end the stream with a short note; never log bodies. */
export function textStream(
  pieces: AsyncGenerator<string>,
  abort: AbortController,
  failure = "\n\n[The local model stopped. Is Ollama running and the model downloaded?]",
): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(c) {
      try {
        for await (const t of pieces) c.enqueue(enc.encode(t));
      } catch {
        if (!abort.signal.aborted) c.enqueue(enc.encode(failure));
      }
      try {
        c.close();
      } catch {
        /* already closed */
      }
    },
    cancel() {
      abort.abort();
    },
  });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
