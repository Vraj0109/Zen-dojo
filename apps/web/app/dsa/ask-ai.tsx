"use client";

import { useRef, useState } from "react";

type Action = "hint" | "review" | "solution";

/** Collapsed "Ask local AI" panel. Streams plain text from this app's /api/ai/chat; text is rendered as text, never as HTML. */
export function AskAi({ problemId, hintCount }: { problemId: string; hintCount: number }) {
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState(0);
  const ac = useRef<AbortController | null>(null);

  async function ask(action: Action) {
    ac.current?.abort();
    const c = new AbortController();
    ac.current = c;
    setText("");
    setError("");
    setRunning(true);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problemId, action, hintIndex: hint }),
        signal: c.signal,
      });
      if (!r.ok || !r.body) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(
          j.error === "no_code"
            ? "Save some code in the Notes tab first, then ask for a review."
            : j.error === "no_model"
              ? "Pick and download a model in Settings first."
              : "Local AI is not available right now.",
        );
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((t) => t + dec.decode(value, { stream: true }));
      }
    } catch {
      /* stopped by the user or Ollama went away */
    } finally {
      setRunning(false);
    }
  }

  const parts = text.split("```");
  return (
    <details className="rounded-xl border border-line bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-foreground">Ask local AI</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-muted">Runs on your computer. Answers can be wrong; check them.</p>
        <div className="flex flex-wrap items-center gap-2">
          {hintCount > 1 && (
            <select aria-label="Which hint" value={hint} onChange={(e) => setHint(Number(e.target.value))} className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm">
              {Array.from({ length: hintCount }, (_, i) => (
                <option key={i} value={i}>
                  Hint {i + 1}
                </option>
              ))}
            </select>
          )}
          <button type="button" disabled={running} onClick={() => void ask("hint")} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background disabled:opacity-50">
            Explain this hint
          </button>
          <button type="button" disabled={running} onClick={() => void ask("review")} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background disabled:opacity-50">
            Review my code
          </button>
          <button type="button" disabled={running} onClick={() => void ask("solution")} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background disabled:opacity-50" title="Shows the full solution idea and code">
            Explain the solution
          </button>
          {running && (
            <button type="button" onClick={() => ac.current?.abort()} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent">
              Stop
            </button>
          )}
          {text && !running && (
            <button type="button" onClick={() => void navigator.clipboard?.writeText(text).catch(() => {})} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background">
              Copy
            </button>
          )}
        </div>
        {error && <p role="status" className="text-sm">{error}</p>}
        {text && (
          <div aria-live="polite" className="space-y-2 text-sm">
            {parts.map((p, i) =>
              i % 2 === 1 ? (
                <pre key={i} className="overflow-x-auto rounded-lg border border-line bg-background p-3 text-xs">
                  <code>{p.replace(/^[a-zA-Z0-9+#-]*\n/, "")}</code>
                </pre>
              ) : (
                <p key={i} className="whitespace-pre-wrap">
                  {p}
                </p>
              ),
            )}
          </div>
        )}
      </div>
    </details>
  );
}
