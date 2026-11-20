"use client";

import { useRef, useState } from "react";
import { summarizePortfolio, type PortfolioData } from "@habit/shared";
import { errorText } from "../dsa/ai-chat";
import { currentByokHeaders } from "@/lib/ai-key-store";
import { buttonClass } from "../ui";

/**
 * "Summarize": a plain-language summary of the person's work, written from the numbers (instant, no AI). On the owner's own
 * page, "Write it with AI" asks the chosen AI provider for a more natural version; the server builds that prompt from the
 * same public-safe numbers, never from notes or code.
 */
export function PortfolioSummary({ data, aiEnabled }: { data: PortfolioData; aiEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const ac = useRef<AbortController | null>(null);
  const plain = summarizePortfolio(data);
  const shown = aiText || plain;

  async function writeWithAi() {
    ac.current?.abort();
    const c = new AbortController();
    ac.current = c;
    setError("");
    setAiText("");
    setBusy(true);
    let got = "";
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json", ...currentByokHeaders() },
        body: JSON.stringify({ portfolioSummary: true, messages: [{ role: "user", content: "Summarize this profile." }] }),
        signal: c.signal,
      });
      if (!r.ok || !r.body) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(errorText(j.error));
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        got += dec.decode(value, { stream: true });
        setAiText(got);
      }
      got += dec.decode();
      if (!got.trim()) {
        setError(errorText(undefined));
        setAiText("");
      } else setAiText(got.trim());
    } catch {
      if (!c.signal.aborted) setError(errorText(undefined));
      setAiText(got.trim());
    } finally {
      if (ac.current === c) setBusy(false);
    }
  }

  return (
    <div className="w-full sm:w-auto">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={buttonClass("primary", "sm", "max-md:h-11")}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h10M4 18h6" />
        </svg>
        {open ? "Hide summary" : "Summarize"}
      </button>
      {open && (
        <div className="mt-3 w-full space-y-3 rounded-[20px] border border-line bg-surface-2 p-4 text-sm sm:max-w-xl dark:border-0">
          <p className="whitespace-pre-wrap leading-relaxed" aria-live="polite">
            {busy && !aiText ? "Writing..." : shown}
          </p>
          {error && (
            <p role="status" className="text-xs text-muted">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {aiEnabled && (
              <>
                {busy ? (
                  <button type="button" onClick={() => ac.current?.abort()} className={buttonClass("outline", "sm", "max-md:h-11")}>
                    Stop
                  </button>
                ) : (
                  <button type="button" onClick={() => void writeWithAi()} className={buttonClass("outline", "sm", "max-md:h-11")}>
                    {aiText ? "Write it again with AI" : "Write it with AI"}
                  </button>
                )}
                {aiText && !busy && (
                  <button type="button" onClick={() => setAiText("")} className={buttonClass("outline", "sm", "max-md:h-11")}>
                    Use the plain version
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(shown).then(() => setCopied(true)).catch(() => {});
                setTimeout(() => setCopied(false), 1500);
              }}
              className={buttonClass("outline", "sm", "max-md:h-11")}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-muted">Made from the numbers on this page only: no notes, code or private data.</p>
        </div>
      )}
    </div>
  );
}
