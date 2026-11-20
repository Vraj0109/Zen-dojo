import type { Section } from "@habit/shared";
import { Toc, type TocItem } from "./toc";
import { deeperIds } from "./toc-items";
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
    <section className="rounded-md border border-line bg-surface p-5">
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
  return (
    <div data-focus-reading className={`space-y-4 leading-7 ${className}`}>
      {children}
    </div>
  );
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
    <section id={id} className={`scroll-mt-24 border-t border-line pt-8 first:border-t-0 first:pt-0 ${className}`}>
      <h2 className="mb-4 text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function TipCallout({
  title = "Interview tip",
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3.5 p-4 sm:p-5 rounded-[24px] bg-primary-soft text-on-primary-soft ${className}`}>
      <span className="size-10 rounded-[14px] bg-primary/20 flex items-center justify-center shrink-0">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
        </svg>
      </span>
      <div className="text-[15px] leading-relaxed">
        <b className="font-semibold">{title}.</b> {children}
      </div>
    </div>
  );
}

export function ArticleLayout({
  toc,
  rail,
  lessonNav,
  askAi,
  tabs,
  children,
}: {
  toc: TocItem[];
  /** A tab strip above the article (LLD and design pages). Sticks to the top of the reading column while you read. */
  tabs?: React.ReactNode;
  /** The "Ask AI about this lesson" button, when AI is on. */
  askAi?: React.ReactNode;
  rail?: React.ReactNode;
  lessonNav?: React.ReactNode;
  /** @deprecated Course outline moved to header breadcrumb navigation. */
  outline?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const hasToc = toc.length > 0;
  // Three columns sized by the page's own width (this element is the container; the rail is not part of it):
  // the lesson list shows from 780px, the outline from 1040px, so the article never drops under about 60ch. On wide
  // screens the article grows to 1040px (prose lines stay under 80ch; code, diagrams and tables use the full width).
  // When the outline is hidden, an "Outline" button above the article opens the same list.
  //
  // The two side columns stick at top-16 (below the sticky breadcrumb / tab strip) and may be at most the page height
  // minus that top offset minus 3.5rem. The 3.5rem is the page's bottom padding (pb-10 = 2.5rem) plus a 1rem gap: a
  // sticky box can never leave its row, so when you scroll to the very end it is pushed up by however much it overlaps
  // that padding. Reserving the padding keeps it in place, so its first line is never hidden behind the breadcrumb.
  return (
    <div className="@container w-full">
      <div className="relative flex w-full items-start justify-start gap-5">
        {lessonNav && (
          <nav
            aria-label="Lessons in this course"
            className="zd-list hidden w-[240px] @min-[1500px]:w-[260px] shrink-0 flex-col gap-2 overflow-y-auto [scrollbar-width:thin] @min-[780px]:flex sticky top-16 self-start max-h-[calc(100dvh-7.5rem)] overscroll-contain py-1"
          >
            {lessonNav}
          </nav>
        )}

        <div className={`min-w-0 flex-1 space-y-3 ${lessonNav ? "max-w-[1040px]" : ""}`}>
          {tabs && <div className="sticky top-0 z-20 -mx-1 bg-background/95 px-1 py-2 backdrop-blur-md print:hidden">{tabs}</div>}
          {(hasToc || rail) && (
            <details className="group rounded-[24px] border border-line bg-surface @min-[1040px]:hidden dark:border-0">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-5 text-sm font-medium">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M4 6h16M4 12h10M4 18h13" />
                </svg>
                Outline
                <span aria-hidden className="ml-auto text-muted transition-transform group-open:rotate-90">
                  ›
                </span>
              </summary>
              <div className="space-y-4 px-3 pb-4">
                {hasToc && <Toc items={toc} />}
                {rail}
              </div>
            </details>
          )}
          <article
            data-focus-reading
            className="space-y-6 rounded-[32px] border border-line bg-surface p-5 sm:p-8 @min-[1040px]:p-10 dark:border-0 [&_li]:max-w-[80ch] [&_p]:max-w-[80ch]"
          >
            {children}
          </article>
        </div>

        {(hasToc || rail) && (
          <aside
            aria-label="On this page"
            className="zd-toc hidden w-[280px] @min-[1500px]:w-[300px] shrink-0 flex-col gap-4 overflow-y-auto text-sm [scrollbar-width:thin] @min-[1040px]:flex sticky top-16 self-start max-h-[calc(100dvh-7.5rem)] overscroll-contain py-1"
          >
            {hasToc && (
              <div className="space-y-3">
                <p className="px-3 text-xs font-semibold text-muted">On this page</p>
                <Toc items={toc} />
              </div>
            )}
            {rail}
            {askAi}
          </aside>
        )}
      </div>
    </div>
  );
}

/** Deeper sections rendered open as plain subsections. */
export function DeeperSections({ sections }: { sections: Section[] }) {
  const ids = deeperIds(sections.map((s) => s.title));
  return (
    <div className="space-y-6">
      {sections.map((s, i) => (
        <div key={s.title} id={ids[i]} className="scroll-mt-6 space-y-2">
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
