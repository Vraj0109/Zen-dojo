"use client";

import { inlineParts, parseMarkdown } from "@habit/shared";

// A light preview for the admin editors. It reads the same Markdown subset as app/markdown.tsx but draws code blocks
// as plain text: app/markdown.tsx pulls in the Shiki highlighter, which is server-only and cannot go in a client bundle.

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((p, i) =>
        p.kind === "bold" ? (
          <strong key={i}>{p.text}</strong>
        ) : p.kind === "code" ? (
          <code key={i} className="rounded-sm bg-surface px-1 py-0.5 font-mono text-[0.9em]">
            {p.text}
          </code>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

export function MarkdownPreview({ source }: { source: string }) {
  return (
    <div className="space-y-3 leading-7">
      {parseMarkdown(source).map((b, i) => {
        switch (b.type) {
          case "h":
            return (
              <p key={i} className="pt-1 font-semibold">
                <Inline text={b.text} />
              </p>
            );
          case "p":
            return (
              <p key={i}>
                <Inline text={b.text} />
              </p>
            );
          case "ul":
          case "ol": {
            const List = b.type === "ol" ? "ol" : "ul";
            return (
              <List key={i} className={`${b.type === "ol" ? "list-decimal" : "list-disc"} space-y-1 pl-6`}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inline text={it} />
                  </li>
                ))}
              </List>
            );
          }
          case "code":
            return (
              <pre key={i} className="overflow-x-auto rounded-2xl bg-surface p-3 font-mono text-xs">
                {b.text}
              </pre>
            );
        }
      })}
    </div>
  );
}
