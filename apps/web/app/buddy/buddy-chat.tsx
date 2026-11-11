"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { emitBuddy } from "./buddy-events";
import { errorText } from "../dsa/ai-chat";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const KEY = "buddy-chat";
const MAX_KEPT = 20;
const STARTERS = ["Say hi", "I'm stuck, help me start", "Give me a study tip", "Cheer me up"];

function load(): Msg[] {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((m): m is Msg => !!m && typeof m === "object" && ((m as Msg).role === "user" || (m as Msg).role === "assistant") && typeof (m as Msg).content === "string" && (m as Msg).content.trim() !== "")
      .slice(-MAX_KEPT);
  } catch {
    return [];
  }
}

function save(messages: Msg[]) {
  try {
    if (messages.length === 0) window.sessionStorage.removeItem(KEY);
    else window.sessionStorage.setItem(KEY, JSON.stringify(messages.slice(-MAX_KEPT)));
  } catch {
    /* storage unavailable: the chat still works */
  }
}

/**
 * Chat with the Buddy as a character. The server builds the persona from the pet's name and description (plain text, never
 * code or notes). Answers are shown as plain text. Kept for the browser session only.
 */
export function BuddyChat({
  name,
  description,
  tone,
  style,
}: {
  name: string;
  description: string;
  tone: "calm" | "peer" | "coach";
  style: CSSProperties;
}) {
  const [messages, setMessages] = useState<Msg[]>(() => (typeof window === "undefined" ? [] : load()));
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const ac = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pending) save(messages);
  }, [messages, pending]);

  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending, error]);

  useEffect(
    () => () => {
      ac.current?.abort();
    },
    [],
  );

  async function send(text: string) {
    const t = text.trim();
    if (!t || pending) return;
    const history: Msg[] = [...messages, { role: "user", content: t }];
    ac.current?.abort();
    const c = new AbortController();
    ac.current = c;
    setError("");
    setInput("");
    setPending(true);
    setMessages([...history, { role: "assistant", content: "" }]);
    emitBuddy("ai-start");
    let got = "";
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ buddy: { name, description, tone }, messages: history.slice(-MAX_KEPT) }),
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
        const text2 = got;
        setMessages([...history, { role: "assistant", content: text2 }]);
      }
      got += dec.decode();
      if (!got.trim()) {
        setError(errorText(undefined));
        setMessages(history);
      } else {
        setMessages([...history, { role: "assistant", content: got.trim() }]);
      }
    } catch {
      if (!c.signal.aborted) setError(errorText(undefined));
      setMessages(got.trim() ? [...history, { role: "assistant", content: got.trim() }] : history);
    } finally {
      if (ac.current === c) setPending(false);
      emitBuddy("ai-end");
    }
  }

  function newChat() {
    ac.current?.abort();
    ac.current = null;
    setMessages([]);
    setPending(false);
    setError("");
    save([]);
  }

  const lastIdx = messages.length - 1;
  return (
    <section aria-label={`Chat with ${name}`} style={style} className="fixed z-40 space-y-2 rounded-2xl border border-line bg-surface p-3.5 shadow-2xl anim-pop print:hidden">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">Chat with {name}</h3>
        <button type="button" onClick={newChat} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium hover:bg-background">
          New chat
        </button>
      </div>
      <div ref={list} className="h-56 space-y-2 overflow-y-auto rounded-lg border border-line bg-background p-2.5">
        {messages.length === 0 && !error && <p className="text-xs text-muted">Say something, or pick a starter. {name} answers in character. Answers can be wrong.</p>}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[88%] whitespace-pre-wrap rounded-xl bg-accent px-2.5 py-1.5 text-xs text-on-accent">{m.content}</p>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className="max-w-[92%] rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs">
                {m.content ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : pending && i === lastIdx ? (
                  <p role="status" aria-live="polite" className="flex items-center gap-2 text-muted">
                    <span>{name} is thinking</span>
                    <span aria-hidden="true" className="inline-flex gap-1">
                      {[0, 1, 2].map((d) => (
                        <span key={d} className="inline-block size-1.5 rounded-full bg-muted motion-safe:animate-pulse" style={{ animationDelay: `${d * 200}ms` }} />
                      ))}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          ),
        )}
        {error && (
          <p role="status" className="rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs">
            {error}
          </p>
        )}
      </div>
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Starter messages">
          {STARTERS.map((s) => (
            <button key={s} type="button" disabled={pending} onClick={() => void send(s)} className="rounded-full border border-line px-2.5 py-1 text-xs font-medium hover:bg-background disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={2}
          maxLength={1000}
          aria-label={`Message ${name}`}
          placeholder={`Talk to ${name}...`}
          className="min-w-0 flex-1 resize-none rounded-lg border border-line bg-background px-2.5 py-1.5 text-xs"
        />
        {pending ? (
          <button type="button" onClick={() => ac.current?.abort()} className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-background">
            Stop
          </button>
        ) : (
          <button type="button" onClick={() => void send(input)} disabled={!input.trim()} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-on-accent disabled:opacity-50">
            Send
          </button>
        )}
      </div>
    </section>
  );
}
