import type { Section } from "@habit/shared";

// Presentational blocks for learning content: DSA guides, concept lessons, design and LLD extras.

export function CodeBlock({ code, label, maxHeight = "max-h-[36rem]" }: { code: string; label?: string; maxHeight?: string }) {
  return (
    <div>
      {label && <p className="mb-1 text-xs font-medium text-muted">{label}</p>}
      <pre className={`${maxHeight} overflow-auto rounded-lg border border-line bg-background p-3 font-mono text-xs leading-relaxed`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function BulletCard({ title, items, ordered = false, note }: { title: string; items: string[]; ordered?: boolean; note?: string }) {
  const List = ordered ? "ol" : "ul";
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <List className={`${ordered ? "list-decimal" : "list-disc"} space-y-1.5 pl-5 text-sm leading-relaxed`}>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </List>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </section>
  );
}

/** The few lines to remember; the same lines appear on Quick revise. */
export function RecapCard({ items, title = "⚡ Remember" }: { items: string[]; title?: string }) {
  return (
    <section className="rounded-xl border border-accent bg-surface p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <ul className="space-y-1 text-sm">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="text-accent">▸</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Deeper sections, each collapsible so the page stays scannable. The first one starts open. */
export function DeeperSections({ sections, title = "🔬 Deeper" }: { sections: Section[]; title?: string }) {
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      {sections.map((s, i) => (
        <details key={s.title} open={i === 0} className="group rounded-xl border border-line bg-surface">
          <summary className="cursor-pointer list-none p-4 font-medium">
            <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
            {s.title}
          </summary>
          <div className="space-y-3 border-t border-line p-4">
            {s.body.split("\n\n").map((para, j) => (
              <p key={j} className="text-sm leading-relaxed whitespace-pre-line">
                {para}
              </p>
            ))}
            {s.code && <CodeBlock code={s.code} />}
          </div>
        </details>
      ))}
    </section>
  );
}
