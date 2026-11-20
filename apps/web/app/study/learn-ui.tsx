import { READING_KINDS, type Lesson, type LldDeep, type LldGuide, type LldProject, type Walkthrough } from "@habit/shared";
import { DIAGRAM_LIMITS, DIAGRAM_TYPES, type DiagramView } from "@/lib/diagrams";
import { DiagramDrop } from "./diagrams/diagram-drop";
import type { ReadingView } from "@/lib/reading";
import { addReadingAction, deleteDiagramAction, deleteReadingAction, toggleReadingAction } from "../actions";
import { Code } from "../code";
import { Diagram } from "../diagram";
import { ArticleSection, DeeperSections } from "../learn-blocks";
import { SubmitButton } from "../submit-button";
import { buttonClass, INPUT_CLASS } from "../ui";

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
            <details className="group rounded-md border border-line bg-surface">
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

/** One step of the seven-step walkthrough: a numbered dot on a rail, the content beside it. */
function Step({ n, last = false, children }: { n: number; last?: boolean; children: React.ReactNode }) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && <span aria-hidden className="absolute top-8 bottom-0 left-[0.9375rem] w-px bg-line" />}
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong bg-surface text-sm font-semibold tabular-nums text-muted">
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-1">{children}</div>
    </li>
  );
}

/** Closed by default: try the design yourself first, then compare. */
export function WalkthroughView({ w }: { w: Walkthrough }) {
  return (
    <ArticleSection id="reference" title="Reference walkthrough">
      <details className="group rounded-md border border-line bg-surface">
        <summary className="cursor-pointer list-none p-4">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
          <span className="font-semibold">Reveal reference walkthrough</span>
          <span className="block pl-5 text-xs text-muted">Do your own attempt first, then open this and compare: what did you miss?</span>
        </summary>
        <ol className="border-t border-line p-5">
          <Step n={1}>
            <Block title="Requirements" items={w.requirements} />
          </Step>
          <Step n={2}>
            <Block title="Estimates" items={w.estimates} />
          </Step>
          <Step n={3}>
            <Block title="API" items={w.api} />
          </Step>
          <Step n={4}>
            <Block title="Data model" items={w.data} />
          </Step>
          <Step n={5}>
            <Block title="High-level design" items={w.design} />
          </Step>
          <Step n={6}>
            <h4 className="mb-1 text-sm font-semibold">Deep dives</h4>
            <div className="space-y-2">
              {w.deepDives.map((d) => (
                <div key={d.title} className="rounded-md border border-line bg-surface-2 p-3 text-sm">
                  <p className="font-medium">{d.title}</p>
                  <p className="mt-0.5">{d.body}</p>
                </div>
              ))}
            </div>
          </Step>
          <Step n={7} last>
            <div className="rounded-md border border-line border-l-[3px] border-l-reward bg-surface p-3">
              <Block title="Trade-offs to mention" items={w.tradeoffs} />
            </div>
          </Step>
        </ol>
      </details>
    </ArticleSection>
  );
}

export function LldGuideView({ g }: { g: LldGuide }) {
  return (
    <ArticleSection id="reference" title="Reference answer">
      <details className="group rounded-md border border-line bg-surface">
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
            {(deep.extraDiagrams ?? []).map((d) => (
              <div key={d.title} className="pt-4">
                <h3 className="text-base font-semibold">{d.title}</h3>
                <Diagram source={d.source} caption={d.caption} />
              </div>
            ))}
          </div>
        </ArticleSection>
      )}
      {project && (
        <ArticleSection id="java-code" title="The full code (Java 17)">
          <p className="mb-3 text-sm text-muted">
            Standard library only. Copy the files into one folder, compile with <code>javac *.java</code> and run <code>java Main</code>.
            The checks in this app compile and run exactly this code.
          </p>
          <ProjectFiles files={[...project.files, ...(project.tests ?? [])]} />
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

const fileAnchor = (name: string) => `file-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
const classOf = (name: string) => name.replace(/^.*\//, "").replace(/\.java$/, "");

/**
 * The project's reference files: a clean file list showing each class, what it uses, and its code.
 */
export function ProjectFiles({ files }: { files: { name: string; code: string }[] }) {
  const names = files.map((f) => classOf(f.name));
  const uses = (f: { name: string; code: string }) =>
    names.filter((n) => n !== "" && n !== classOf(f.name) && new RegExp(`\\b${n.replace(/[^\w$]/g, "")}\\b`).test(f.code));
  return (
    <div className="space-y-4">
      {files.map((f) => {
        const u = uses(f);
        return (
          <div key={f.name} id={fileAnchor(f.name)} className="scroll-mt-20 space-y-1.5">
            {u.length > 0 && (
              <p className="text-xs text-muted">
                <span className="font-medium text-foreground">Uses</span> {u.join(", ")}
              </p>
            )}
            <Code code={f.code} lang="Java" label={f.name} maxHeight="32rem" />
          </div>
        );
      })}
    </div>
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
                className={`flex size-5 items-center justify-center rounded-sm border text-xs ${r.done ? "border-primary bg-primary text-on-primary" : "border-line-strong"}`}
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
        <input name="url" type="url" required maxLength={500} placeholder="https://…" aria-label="Link" className={`${INPUT_CLASS} min-w-0 flex-1`} />
        <input name="title" maxLength={200} placeholder="Title (optional)" aria-label="Title" className={`${INPUT_CLASS} min-w-0 flex-1`} />
        <SubmitButton className={buttonClass("secondary")}>Add link</SubmitButton>
      </form>
    </ArticleSection>
  );
}

export function DiagramsSection({ itemId, diagrams, error }: { itemId: string; diagrams: DiagramView[]; error?: string }) {
  return (
    <ArticleSection id="diagrams" title="Your diagrams">
      <p className="mt-0.5 mb-3 text-xs text-muted">Save the diagram from each practice (a screenshot or an Excalidraw/draw.io link). Week 16 is for skimming these.</p>
      {error && (
        <p role="alert" className="mb-3 rounded-md border border-danger p-2 text-sm text-danger">
          {error.slice(0, 200)}
        </p>
      )}
      {diagrams.length > 0 && (
        <ul className="mb-3 grid gap-3 sm:grid-cols-2">
          {diagrams.map((d) => (
            <li key={d.id} className="overflow-hidden rounded-md border border-line bg-surface">
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
        <input name="title" maxLength={200} placeholder="Title, e.g. Attempt 2: sharded by user" aria-label="Diagram title" className={INPUT_CLASS} />
        <input name="url" type="url" maxLength={500} placeholder="Excalidraw / draw.io link (optional)" aria-label="Diagram link" className={INPUT_CLASS} />
        <DiagramDrop name="file" label="Image" required={false} types={DIAGRAM_TYPES} maxBytes={DIAGRAM_LIMITS.bytes} />
        <button className={buttonClass("secondary")}>Save diagram</button>
      </form>
    </ArticleSection>
  );
}
