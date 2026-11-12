"use client";

import { useMemo, useState } from "react";
import { FAQ_CATEGORIES, FAQ_ENTRIES, type FaqBlock, type FaqEntry } from "@/lib/faq";

/** Backtick spans become inline code; everything else is plain text. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
          <code key={i} className="rounded bg-line/60 px-1 py-0.5 font-mono text-[0.85em] break-words">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Block({ b }: { b: FaqBlock }) {
  if (b.type === "p")
    return (
      <p>
        <Inline text={b.text} />
      </p>
    );
  if (b.type === "code")
    return (
      <pre className="overflow-x-auto rounded-lg border border-line bg-background p-3 font-mono text-xs">
        <code>{b.text}</code>
      </pre>
    );
  const Tag = b.type === "steps" ? "ol" : "ul";
  return (
    <Tag className={`space-y-1.5 pl-5 ${b.type === "steps" ? "list-decimal" : "list-disc"}`}>
      {b.items.map((t, i) => (
        <li key={i}>
          <Inline text={t} />
        </li>
      ))}
    </Tag>
  );
}

function plain(e: FaqEntry): string {
  const parts = e.answer.flatMap((b) => (b.type === "p" || b.type === "code" ? [b.text] : b.items));
  return [e.question, ...parts].join(" ").toLowerCase();
}

export function FaqBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const index = useMemo(() => FAQ_ENTRIES.map((e) => ({ e, hay: plain(e) })), []);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = index.filter(({ e, hay }) => (category === "all" || e.category === category) && words.every((w) => hay.includes(w))).map((x) => x.e);

  return (
    <div>
      <label htmlFor="faq-search" className="sr-only">
        Search the help
      </label>
      <input
        id="faq-search"
        type="search"
        value={query}
        onChange={(ev) => setQuery(ev.target.value)}
        placeholder="Search, for example Gatekeeper, Python, sync"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
      />

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Topic">
        {[{ id: "all", title: "All" }, ...FAQ_CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              category === c.id ? "border-accent bg-accent text-on-accent" : "border-line bg-surface text-muted hover:text-foreground"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted" aria-live="polite">
        {shown.length} {shown.length === 1 ? "question" : "questions"}
      </p>

      {shown.length === 0 ? (
        <p className="mt-3 rounded-xl border border-line bg-surface p-4 text-sm text-muted">Nothing matches. Try fewer words or pick All.</p>
      ) : (
        <div className="mt-3 space-y-6">
          {FAQ_CATEGORIES.map((c) => {
            const items = shown.filter((e) => e.category === c.id);
            if (items.length === 0) return null;
            return (
              <section key={c.id} aria-labelledby={`cat-${c.id}`}>
                <h3 id={`cat-${c.id}`} className="text-lg font-semibold">
                  {c.title}
                </h3>
                <p className="mb-2 text-sm text-muted">{c.blurb}</p>
                <div className="space-y-2">
                  {items.map((e) => (
                    <details key={e.id} id={e.id} open={words.length > 0 && shown.length <= 3} className="rounded-xl border border-line bg-surface">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{e.question}</summary>
                      <div className="space-y-3 border-t border-line px-4 py-3 text-sm leading-relaxed break-words">
                        {e.answer.map((b, i) => (
                          <Block key={i} b={b} />
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
