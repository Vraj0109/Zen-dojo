"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type ChatIntent = "question" | "hint" | "review" | "solution" | "free";
export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}
export interface ProviderInfo {
  id: string;
  label: string;
  found: boolean;
  cloud: boolean;
}

// Same limits the server enforces (plan 0067); the server is the real gate, this only keeps requests small.
export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 4000;
export const MAX_TOTAL_CHARS = 16000;

/** Keep the newest messages: at most 20, each clipped to 4,000 characters, total at most 16,000. Pure. */
export function trimHistory(messages: ChatMsg[]): ChatMsg[] {
  const clipped = messages.map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
  const kept: ChatMsg[] = [];
  let total = 0;
  for (let i = clipped.length - 1; i >= 0 && kept.length < MAX_MESSAGES; i--) {
    if (total + clipped[i].content.length > MAX_TOTAL_CHARS && kept.length > 0) break;
    total += clipped[i].content.length;
    kept.unshift(clipped[i]);
  }
  return kept;
}

export function storageKey(problemId: string): string {
  return `ai-chat:${problemId}`;
}

/** Read a saved chat. Anything malformed gives an empty chat; an empty assistant message is dropped. Pure. */
export function parseStoredChat(raw: string | null): ChatMsg[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const out: ChatMsg[] = [];
    for (const m of data) {
      if (!m || typeof m !== "object") continue;
      const { role, content } = m as { role?: unknown; content?: unknown };
      if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
      if (role === "assistant" && !content.trim()) continue;
      out.push({ role, content });
    }
    return out.slice(-MAX_MESSAGES);
  } catch {
    return [];
  }
}

function readStored(problemId: string): ChatMsg[] {
  try {
    return parseStoredChat(window.sessionStorage.getItem(storageKey(problemId)));
  } catch {
    return [];
  }
}

function writeStored(problemId: string, messages: ChatMsg[]): void {
  try {
    if (messages.length === 0) window.sessionStorage.removeItem(storageKey(problemId));
    else window.sessionStorage.setItem(storageKey(problemId), JSON.stringify(messages));
  } catch {
    /* storage unavailable or full: the chat still works, it just does not survive a reload */
  }
}

/** The visible text a starter chip posts. Mirrors the plan's starterMessage. Pure. */
export function starterText(intent: ChatIntent, opts: { hintIndex?: number; hintText?: string } = {}): string {
  switch (intent) {
    case "question":
      return "Explain the question to me.";
    case "hint":
      return `Explain hint ${(opts.hintIndex ?? 0) + 1}: "${opts.hintText ?? ""}"`;
    case "review":
      return "Review my code.";
    case "solution":
      return "Explain the solution.";
    default:
      return "";
  }
}

/** Split an answer on code fences into text and code parts. Plain strings only, never HTML. Pure. */
export function splitFences(text: string): { code: boolean; text: string }[] {
  return text.split("```").map((p, i) => (i % 2 === 1 ? { code: true, text: p.replace(/^[a-zA-Z0-9+#-]*\n/, "") } : { code: false, text: p }));
}

export function errorText(code: string | undefined): string {
  switch (code) {
    case "no_code":
      return "Save some code in the Notes tab first, then ask for a review.";
    case "no_model":
      return "Pick and download a model in Settings first.";
    case "consent_required":
      return "Allow this AI tool in Settings first (it sends this chat to its company).";
    case "disabled":
      return "AI is turned off in Settings.";
    case "bad_request":
      return "That message could not be sent. Try a shorter one or start a new chat.";
    default:
      return "The AI is not available right now. Check that it is running and try again.";
  }
}

function Answer({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm">
      {splitFences(text).map((p, i) =>
        p.code ? (
          <pre key={i} className="overflow-x-auto rounded-lg border border-line bg-background p-3 text-xs">
            <code>{p.text}</code>
          </pre>
        ) : p.text.trim() ? (
          <p key={i} className="whitespace-pre-wrap">
            {p.text.trim()}
          </p>
        ) : null,
      )}
    </div>
  );
}

const noopSubscribe = () => () => {};

export function AiChat(props: { problemId: string; hints: string[]; providers: ProviderInfo[]; provider: string; hasCode: boolean }) {
  // Saved chats are read in the browser only; the body mounts after hydration so server and client markup match.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!hydrated) return <div className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">Loading chat...</div>;
  return <ChatBody {...props} />;
}

const chip = "rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:bg-background disabled:cursor-not-allowed disabled:opacity-50";

function ChatBody({ problemId, hints, providers, provider, hasCode }: { problemId: string; hints: string[]; providers: ProviderInfo[]; provider: string; hasCode: boolean }) {
  const info = providers.find((p) => p.id === provider);
  const cloud = info ? info.cloud : provider !== "ollama";
  const providerLabel = info?.label ?? (provider === "ollama" ? "Ollama" : provider);

  const [messages, setMessages] = useState<ChatMsg[]>(() => readStored(problemId));
  const [pending, setPending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [includeCode, setIncludeCode] = useState(!cloud);
  const [reveal, setReveal] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const ac = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement | null>(null);
  const stick = useRef(true);
  const lastMeta = useRef<{ intent: ChatIntent; hintIndex?: number }>({ intent: "free" });

  // Keep the chat for this browser session only (never localStorage: it may contain code).
  useEffect(() => {
    if (!pending) writeStored(problemId, messages);
  }, [problemId, messages, pending]);

  // Follow the newest text only while the reader is already at the bottom.
  useEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, pending, error]);

  // Abort a running request if the component goes away.
  useEffect(() => () => ac.current?.abort(), []);

  function onScroll() {
    const el = list.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    stick.current = near;
    setAtBottom(near);
  }

  function jumpToLatest() {
    const el = list.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stick.current = true;
    setAtBottom(true);
  }

  /** Send `history` (ends with the new user message) and stream the answer into a fresh assistant bubble. */
  async function run(history: ChatMsg[], meta: { intent: ChatIntent; hintIndex?: number }, revealNow: boolean) {
    ac.current?.abort();
    const c = new AbortController();
    ac.current = c;
    lastMeta.current = meta;
    const sent = trimHistory(history);
    setError("");
    setSlow(false);
    setPending(true);
    setMessages([...history, { role: "assistant", content: "" }]);
    stick.current = true;
    const timer = setTimeout(() => setSlow(true), 8000);
    let got = "";
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          problemId,
          messages: sent,
          intent: meta.intent,
          hintIndex: meta.hintIndex,
          revealSolution: revealNow,
          includeCode: includeCode || meta.intent === "review",
        }),
        signal: c.signal,
      });
      if (!r.ok || !r.body) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(errorText(j.error));
        setMessages(history);
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        got += dec.decode(value, { stream: true });
        const text = got;
        setMessages([...history, { role: "assistant", content: text }]);
      }
      got += dec.decode();
      if (!got.trim()) {
        setError(errorText(undefined));
        setMessages(history);
      } else {
        setMessages([...history, { role: "assistant", content: got }]);
      }
    } catch {
      if (c.signal.aborted) {
        // Stop pressed: keep what arrived, or drop the empty bubble.
        setMessages(got.trim() ? [...history, { role: "assistant", content: got }] : history);
      } else {
        setError(errorText(undefined));
        setMessages(got.trim() ? [...history, { role: "assistant", content: got }] : history);
      }
    } finally {
      clearTimeout(timer);
      if (ac.current === c) setPending(false);
    }
  }

  function post(text: string, meta: { intent: ChatIntent; hintIndex?: number }, revealNow = reveal) {
    const t = text.trim();
    if (!t || pending) return;
    void run([...messages, { role: "user", content: t }], meta, revealNow);
  }

  function sendTyped() {
    const t = input;
    if (!t.trim() || pending) return;
    setInput("");
    post(t, { intent: "free" });
  }

  function starter(intent: ChatIntent, hintIndex?: number) {
    if (intent === "solution") {
      if (!window.confirm("This will show the full solution idea and code in the chat.")) return;
      setReveal(true);
      post(starterText("solution"), { intent }, true);
      return;
    }
    post(starterText(intent, { hintIndex, hintText: hintIndex === undefined ? undefined : hints[hintIndex] }), { intent, hintIndex });
  }

  function tryAgain() {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user") return;
    void run(messages, lastMeta.current, reveal);
  }

  function newChat() {
    ac.current?.abort();
    ac.current = null;
    setMessages([]);
    setPending(false);
    setError("");
    setReveal(false);
    setInput("");
    writeStored(problemId, []);
  }

  const lastIdx = messages.length - 1;
  return (
    <section aria-label="Ask AI" className="flex min-h-[28rem] flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0">
          <span className="text-sm font-semibold">{providerLabel}</span>{" "}
          <span className="text-xs text-muted">{cloud ? `Sends this chat to ${providerLabel}` : "Runs on your computer"}</span>
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs">
          <input type="checkbox" checked={includeCode} onChange={(e) => setIncludeCode(e.target.checked)} />
          Include my code
        </label>
        <button type="button" onClick={newChat} className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-background">
          New chat
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={list} onScroll={onScroll} className="h-[24rem] space-y-3 overflow-y-auto rounded-lg border border-line bg-background p-3">
          {messages.length === 0 && !error && <p className="text-sm text-muted">Pick a starter below or ask your own question. Answers can be wrong; check them.</p>}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-xl bg-accent px-3 py-2 text-sm text-on-accent">{m.content}</p>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[92%] rounded-xl border border-line bg-surface px-3 py-2">
                  {m.content ? (
                    <Answer text={m.content} />
                  ) : pending && i === lastIdx ? (
                    <div role="status" aria-live="polite" className="space-y-1 text-sm text-muted">
                      <p className="flex items-center gap-2">
                        <span>Thinking</span>
                        <span aria-hidden="true" className="inline-flex gap-1">
                          {[0, 1, 2].map((d) => (
                            <span key={d} className="inline-block size-1.5 rounded-full bg-muted motion-safe:animate-pulse" style={{ animationDelay: `${d * 200}ms` }} />
                          ))}
                        </span>
                      </p>
                      {slow && <p className="text-xs">The model may still be loading into memory. The first answer can take up to a minute.</p>}
                    </div>
                  ) : null}
                </div>
              </div>
            ),
          )}
          {error && (
            <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-sm">
              <span>{error}</span>
              {messages[lastIdx]?.role === "user" && (
                <button type="button" onClick={tryAgain} className="rounded-lg border border-line px-3 py-1 text-xs font-medium hover:bg-background">
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
        {!atBottom && (
          <button type="button" onClick={jumpToLatest} className="absolute bottom-3 right-4 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium shadow-sm hover:bg-background">
            Jump to latest
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Starter questions">
        <button type="button" disabled={pending} onClick={() => starter("question")} className={chip}>
          Explain the question
        </button>
        {hints.map((h, i) => (
          <button key={i} type="button" disabled={pending} onClick={() => starter("hint", i)} title={h} className={chip}>
            Explain hint {i + 1}
          </button>
        ))}
        <button
          type="button"
          disabled={pending || !hasCode}
          onClick={() => starter("review")}
          title={hasCode ? "Send your saved code for review" : "Save some code in the Notes tab first"}
          className={chip}
        >
          Review my code
        </button>
        <button type="button" disabled={pending} onClick={() => starter("solution")} title="Shows the full solution idea and code" className={chip}>
          Explain the solution
        </button>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              sendTyped();
            }
          }}
          rows={2}
          maxLength={MAX_MESSAGE_CHARS}
          aria-label="Your question"
          placeholder="Ask anything about this problem. Enter sends, Shift+Enter adds a line."
          className="min-w-0 flex-1 resize-y rounded-lg border border-line bg-background px-3 py-2 text-sm"
        />
        {pending ? (
          <button type="button" onClick={() => ac.current?.abort()} className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-background">
            Stop
          </button>
        ) : (
          <button type="button" onClick={sendTyped} disabled={!input.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-50">
            Send
          </button>
        )}
      </div>
    </section>
  );
}
