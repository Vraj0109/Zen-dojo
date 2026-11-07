import { READING_KINDS, type Lesson, type LldDeep, type LldGuide, type LldProject, type Walkthrough } from "@habit/shared";
import type { DiagramView } from "@/lib/diagrams";
import type { ReadingView } from "@/lib/reading";
import { addReadingAction, deleteDiagramAction, deleteReadingAction, toggleReadingAction } from "../actions";
import { Code } from "../code";
import { Diagram } from "../diagram";
import { ArticleSection, DeeperSections } from "../learn-blocks";
import { SubmitButton } from "../submit-button";

// Learning content and per-item resources (reading list, diagrams) for study pages.

export function LessonQuestions({ lesson }: { lesson: Lesson }) {
  return (
    <>
      {lesson.questions.length > 0 && (
        <ArticleSection id="interview-questions" title="Interview questions">
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-7">
            {lesson.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Answer each one out loud in under 2 minutes before rating yourself.</p>
        </ArticleSection>
      )}
      {lesson.pitfalls && lesson.pitfalls.length > 0 && (
        <ArticleSection id="common-mistakes" title="Common mistakes">
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-7">
            {lesson.pitfalls.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </ArticleSection>
      )}
    </>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold">{title}</h4>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

/** Follow-up questions with answers hidden until you've said yours out loud. */
export function FollowUps({ items }: { items: { q: string; a: string }[] }) {
  return (
    <ArticleSection id="follow-ups" title="Follow-ups they'll ask">
      <ul className="space-y-2">
        {items.map((f) => (
          <li key={f.q}>
            <details className="group rounded-lg border border-line bg-surface">
              <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium">
                <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
                {f.q}
              </summary>
              <p className="border-t border-line px-3 py-2 text-sm leading-relaxed">{f.a}</p>
            </details>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Answer out loud first, then open to compare.</p>
    </ArticleSection>
  );
}

/** Closed by default: try the design yourself first, then compare. */
export function WalkthroughView({ w }: { w: Walkthrough }) {
  return (
    <ArticleSection id="reference" title="Reference walkthrough">
      <details className="group rounded-xl border border-line bg-surface">
        <summary className="cursor-pointer list-none p-4">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
          <span className="font-semibold">Reveal reference walkthrough</span>
          <span className="block pl-5 text-xs text-muted">Do your own attempt first, then open this and compare: what did you miss?</span>
        </summary>
        <div className="space-y-4 border-t border-line p-4">
          <Block title="1. Requirements" items={w.requirements} />
          <Block title="2. Estimates" items={w.estimates} />
          <Block title="3. API" items={w.api} />
          <Block title="4. Data model" items={w.data} />
          <Block title="5. High-level design" items={w.design} />
          <div>
            <h4 className="mb-1 text-sm font-semibold">6. Deep dives</h4>
            <div className="space-y-2">
              {w.deepDives.map((d) => (
                <div key={d.title} className="rounded-lg border border-line bg-background/40 p-3 text-sm">
                  <p className="font-medium">{d.title}</p>
                  <p className="mt-0.5">{d.body}</p>
                </div>
              ))}
            </div>
          </div>
          <Block title="7. Trade-offs to mention" items={w.tradeoffs} />
        </div>
      </details>
    </ArticleSection>
  );
}

export function LldGuideView({ g }: { g: LldGuide }) {
  return (
    <ArticleSection id="reference" title="Reference answer">
      <details className="group rounded-xl border border-line bg-surface">
        <summary className="cursor-pointer list-none p-4">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
          <span className="font-semibold">Reveal reference answer</span>
          <span className="block pl-5 text-xs text-muted">Write your own classes first (45 minutes), then compare.</span>
        </summary>
        <div className="space-y-4 border-t border-line p-4">
          <Block title="Requirements to clarify" items={g.requirements} />
          <Block title="Entities" items={g.entities} />
          <Block title="Patterns" items={g.patterns} />
          <div>
            <h4 className="mb-1 text-sm font-semibold">Core classes (Java sketch)</h4>
  <Code code={g.code} lang="java" />
          </div>
          <Block title="Follow-ups and extensions" items={g.extensions} />
        </div>
      </details>
    </ArticleSection>
  );
}

/** The full Java project for an LLD problem (plan 0013): walkthrough, diagrams, one block per file, concurrency. */
export function LldProjectView({ project, deep }: { project?: LldProject; deep?: LldDeep }) {
  return (
    <>
      {deep && (
        <ArticleSection id="walkthrough" title="Full design walkthrough">
          <DeeperSections sections={deep.walkthrough} />
        </ArticleSection>
      )}
      {deep && (
        <ArticleSection id="lld-diagrams" title="Diagrams">
          <div className="space-y-2">
            <Diagram source={deep.classDiagram} caption="Class diagram" />
            <Diagram source={deep.sequenceDiagram} caption="Sequence diagram: the main flow" />
            {deep.stateDiagram && <Diagram source={deep.stateDiagram} caption="State diagram" />}
          </div>
        </ArticleSection>
      )}
      {project && (
        <ArticleSection id="java-code" title="The full code (Java 17)">
          <p className="mb-3 text-sm text-muted">
            Standard library only. Copy the files into one folder, compile with <code>javac *.java</code> and run <code>java Main</code>.
            The checks in this app compile and run exactly this code.
          </p>
          <div className="space-y-4">
            {[...project.files, ...(project.tests ?? [])].map((f) => (
              <Code key={f.name} code={f.code} lang="Java" label={f.name} maxHeight="32rem" />
            ))}
          </div>
        </ArticleSection>
      )}
      {deep && deep.concurrency.length > 0 && (
        <ArticleSection id="concurrency" title="Concurrency">
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-7">
            {deep.concurrency.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </ArticleSection>
      )}
    </>
  );
}

export function ReadingSection({ itemId, items }: { itemId: string; items: ReadingView[] }) {
  const done = items.filter((r) => r.done).length;
  return (
    <ArticleSection id="reading" title="Reading">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm text-muted">Articles and documentation.</p>
        {items.length > 0 && (
          <span className="text-xs text-muted">
            {done}/{items.length} read
          </span>
        )}
      </div>
      {items.length === 0 && <p className="text-sm text-muted">No built-in reading for this one yet. Add a link you found useful.</p>}
      <ul className="space-y-2">
        {items.map((r) => (
          <li key={r.id} className="flex items-start gap-2 text-sm">
            <form action={toggleReadingAction} className="pt-0.5">
              <input type="hidden" name="readingId" value={r.id} />
              <input type="hidden" name="done" value={r.done ? "0" : "1"} />
              <SubmitButton
                aria-label={r.done ? `Mark "${r.title}" unread` : `Mark "${r.title}" read`}
                className={`flex size-5 items-center justify-center rounded border text-xs ${r.done ? "border-accent bg-accent text-on-accent" : "border-line"}`}
              >
                {r.done && (
                  <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m3.5 8.5 3 3 6-7" />
                  </svg>
                )}
              </SubmitButton>
            </form>
            <div className="min-w-0 flex-1">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className={`font-medium hover:underline ${r.done ? "text-muted" : ""}`}>
                {r.title} ↗
              </a>
              <p className="text-xs text-muted">
                {r.kind === "custom" ? "Your link" : `${READING_KINDS[r.kind]} · ${r.by}`}
                {r.why && ` · ${r.why}`}
              </p>
            </div>
            {r.customId && (
              <form action={deleteReadingAction}>
                <input type="hidden" name="id" value={r.customId} />
                <SubmitButton aria-label={`Remove "${r.title}"`} className="px-1 text-muted hover:text-foreground">
                  ×
                </SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>
      <form action={addReadingAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="itemId" value={itemId} />
        <input name="url" type="url" required maxLength={500} placeholder="https://…" aria-label="Link" className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-1.5 text-sm" />
        <input name="title" maxLength={200} placeholder="Title (optional)" aria-label="Title" className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-1.5 text-sm" />
        <SubmitButton className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background">Add link</SubmitButton>
      </form>
    </ArticleSection>
  );
}

export function DiagramsSection({ itemId, diagrams, error }: { itemId: string; diagrams: DiagramView[]; error?: string }) {
  return (
    <ArticleSection id="diagrams" title="Your diagrams">
      <p className="mt-0.5 mb-3 text-xs text-muted">Save the diagram from each practice (a screenshot or an Excalidraw/draw.io link). Week 16 is for skimming these.</p>
      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-cat-mock p-2 text-sm">
          {error.slice(0, 200)}
        </p>
      )}
      {diagrams.length > 0 && (
        <ul className="mb-3 grid gap-3 sm:grid-cols-2">
          {diagrams.map((d) => (
            <li key={d.id} className="overflow-hidden rounded-lg border border-line">
              {d.hasImage && (
                <a href={`/api/diagrams/${d.id}`} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/diagrams/${d.id}`} alt={d.title || "Diagram"} loading="lazy" className="max-h-56 w-full bg-white object-contain" />
                </a>
              )}
              <div className="flex items-center gap-2 p-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{d.title || d.createdOn}</span>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-foreground">
                    Open ↗
                  </a>
                )}
                <form action={deleteDiagramAction}>
                  <input type="hidden" name="id" value={d.id} />
                  <SubmitButton aria-label={`Delete diagram ${d.title || d.id}`} className="px-1 text-muted hover:text-foreground">
                    ×
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form action="/api/diagrams" method="post" encType="multipart/form-data" className="grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="itemId" value={itemId} />
        <input name="title" maxLength={200} placeholder="Title, e.g. Attempt 2: sharded by user" aria-label="Diagram title" className="rounded-lg border border-line bg-background px-3 py-1.5 text-sm" />
        <input name="url" type="url" maxLength={500} placeholder="Excalidraw / draw.io link (optional)" aria-label="Diagram link" className="rounded-lg border border-line bg-background px-3 py-1.5 text-sm" />
        <input
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          aria-label="Diagram image"
          className="text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-background file:px-3 file:py-1 file:text-foreground"
        />
        <button className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background">Save diagram</button>
      </form>
    </ArticleSection>
  );
}
