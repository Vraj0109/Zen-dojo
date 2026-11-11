import type { BuddyLineEvent, BuddyTone } from "@habit/shared";

/**
 * Ask the AI for one short Buddy line. Sends only the event, the tone and the buddy's name.
 * Returns null on any failure (off, not allowed, rate limited, offline) or after 25 seconds, so the caller uses a built-in line.
 */
export async function fetchAiLine(event: BuddyLineEvent, tone: BuddyTone, name: string, signal?: AbortSignal): Promise<string | null> {
  const ctl = new AbortController();
  const onAbort = () => ctl.abort();
  if (signal) {
    if (signal.aborted) return null;
    signal.addEventListener("abort", onAbort);
  }
  const timer = setTimeout(() => ctl.abort(), 25_000);
  try {
    const res = await fetch("/api/ai/buddy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, tone, name }),
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { line?: unknown };
    return typeof j.line === "string" && j.line.trim() ? j.line : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
