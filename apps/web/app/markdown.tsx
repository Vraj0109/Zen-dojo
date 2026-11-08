import { inlineParts, parseMarkdown } from "@habit/shared";
import { CodeBlock } from "./learn-blocks";

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((p, i) =>
        p.kind === "bold" ? (
          <strong key={i}>{p.text}</strong>
        ) : p.kind === "code" ? (
          <code key={i} className="rounded bg-background px-1 py-0.5 font-mono text-[0.9em]">
            {p.text}
          </code>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/** Renders a lesson's Markdown (headings, paragraphs, lists, code). It builds elements, never raw HTML, so imported text cannot inject markup. */
export function Markdown({ source }: { source: string }) {
  return (
    <div data-focus-reading className="space-y-4 leading-7">
      {parseMarkdown(source).map((b, i) => {
        switch (b.type) {
          case "h":
            return b.level === 2 ? (
              <h2 key={i} className="pt-2 text-xl font-semibold">
                <Inline text={b.text} />
              </h2>
            ) : (
              <h3 key={i} className="pt-1 text-lg font-semibold">
                <Inline text={b.text} />
              </h3>
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
            return <CodeBlock key={i} code={b.text} lang={b.lang || undefined} />;
        }
      })}
    </div>
  );
}
