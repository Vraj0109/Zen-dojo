import "server-only";
import { NextResponse } from "next/server";
import { checkSameOrigin } from "@/lib/auth/util";
import { getAiSettings, type AiSettings } from "@/lib/ui-prefs";

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
