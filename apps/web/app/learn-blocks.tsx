import type { Section } from "@habit/shared";
import { Code } from "./code";
import { Diagram } from "./diagram";

// Presentational blocks for learning content: DSA guides, concept lessons, design and LLD extras.

/** Coloured code. `lang` is optional (guessed from the code); `maxHeight` is a CSS length. */
export function CodeBlock({ code, lang, label, maxHeight }: { code: string; lang?: string; label?: string; maxHeight?: string }) {
  return <Code code={code} lang={lang} label={label} maxHeight={maxHeight} />;
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

export function Prose({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`space-y-4 leading-7 ${className}`}>{children}</div>;
}

export function ArticleSection({
  id,
  title,
  children,
  className = "",
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-6 border-t border-line pt-6 first:border-t-0 first:pt-0 ${className}`}>
      <h2 className="mb-4 text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function ArticleLayout({
  toc,
  rail,
  children,
}: {
  toc: { id: string; title: string }[];
  rail?: React.ReactNode;
  children: React.ReactNode;
}) {
  const hasAside = toc.length > 0 || !!rail;
  return (
    <div className={`grid gap-6 ${hasAside ? "xl:grid-cols-[minmax(0,1fr)_16rem]" : ""}`}>
      {hasAside && (
        <aside className="order-1 space-y-4 xl:order-2 xl:sticky xl:top-6 xl:self-start">
          {toc.length > 0 && (
            <>
              <details className="rounded-xl border border-line bg-surface p-3 text-sm xl:hidden">
                <summary className="cursor-pointer font-medium text-muted hover:text-foreground">
                  On this page
                </summary>
                <nav aria-label="Table of contents" className="mt-2 space-y-1.5 border-t border-line pt-2">
                  {toc.map((item) => (
                    <a key={item.id} href={`#${item.id}`} className="block text-muted hover:text-foreground">
                      {item.title}
                    </a>
                  ))}
                </nav>
              </details>
              <nav aria-label="Table of contents" className="hidden space-y-2 text-sm xl:block">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">On this page</p>
                <ul className="space-y-1.5 border-l border-line pl-3">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="text-muted hover:text-foreground">
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </>
          )}
          {rail}
        </aside>
      )}
      <div className={`min-w-0 space-y-8 ${hasAside ? "order-2 xl:order-1" : ""}`}>{children}</div>
    </div>
  );
}

/** Deeper sections rendered open as plain subsections. */
export function DeeperSections({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <div key={s.title} className="space-y-2">
          <h3 className="text-base font-semibold">{s.title}</h3>
          <div className="space-y-3 text-sm leading-7">
            {s.body.split("\n\n").map((para, j) => (
              <p key={j} className="whitespace-pre-line">
                {para}
              </p>
            ))}
          </div>
          {s.diagram && <Diagram source={s.diagram} caption={s.diagramCaption} />}
          {s.code && <CodeBlock code={s.code} lang={s.lang} />}
        </div>
      ))}
    </div>
  );
}
