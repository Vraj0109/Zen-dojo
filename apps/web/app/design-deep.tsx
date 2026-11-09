import type { WalkthroughDeep } from "@habit/shared";

// ArchitectureBlock and EvaluationCriterion are not re-exported from the package index (learn/index.ts is not ours); derive them.
type ArchitectureBlock = NonNullable<WalkthroughDeep["architecture"]>[number];
type EvaluationCriterion = NonNullable<WalkthroughDeep["criteria"]>[number];
import { ArticleSection, DeeperSections } from "./learn-blocks";
import { Code } from "./code";
import { Diagram } from "./diagram";

/**
 * Depth for a system design (plan 0014): its diagrams, the sections that explain the reasoning and the failure modes, and
 * the runnable Java. Sections use the same sub-section ids as lessons (deeper-<slug>), so the table of contents can link
 * to them; build the matching entries with designDeepToc() from toc-items.ts.
 */
export function DesignDeepView({ deep }: { deep: WalkthroughDeep }) {
  return (
    <>
      <ArticleSection id="design-diagrams" title="Diagrams">
        <div className="space-y-6">
          {deep.diagrams.map((d) => (
            <div key={d.title} className="space-y-2">
              <h3 className="text-base font-semibold">{d.title}</h3>
              <Diagram source={d.source} caption={d.caption} />
            </div>
          ))}
        </div>
        {deep.architecture && deep.architecture.length > 0 && <ArchitectureExplorer blocks={deep.architecture} />}
      </ArticleSection>
      <ArticleSection id="design-depth" title="Why it is built this way">
        <DeeperSections sections={deep.sections} />
        {deep.criteria && deep.criteria.length > 0 && <EvaluationScorecard criteria={deep.criteria} />}
      </ArticleSection>
      {deep.code && deep.code.length > 0 && (
        <ArticleSection id="design-code" title="Key parts in Java">
          <p className="mb-3 text-sm text-muted">Standard library only. Save each file, compile with <code>javac</code> and run it with <code>java</code> and the class name. The checks in this app compile and run exactly this code.</p>
          <div className="space-y-6">
            {deep.code.map((c) => (
              <Code key={c.name} code={c.code} lang="Java" label={c.name} maxHeight="32rem" />
            ))}
          </div>
        </ArticleSection>
      )}
    </>
  );
}

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4l6 6-6 6" />
    </svg>
  );
}

/** Plan 0031: each part of the architecture as a card that opens to show its job, scale and failure behaviour. Plain details elements, so it works without JavaScript. */
function ArchitectureExplorer({ blocks }: { blocks: ArchitectureBlock[] }) {
  return (
    <div className="mt-8 space-y-2" id="design-architecture">
      <h3 className="text-base font-semibold">Architecture explorer</h3>
      <p className="text-sm text-muted">Open each part and say the three lines out loud before you read them: what it does, how it scales, what happens when it fails.</p>
      <div className="space-y-2">
        {blocks.map((b, i) => (
          <details key={b.name} className="group rounded-xl border border-line bg-surface p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
              <Chevron />
              <span className="text-muted">{i + 1}.</span>
              <span>{b.name}</span>
            </summary>
            <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Job</dt>
                <dd className="mt-1">{b.role}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Scale</dt>
                <dd className="mt-1">{b.scale}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">When it fails</dt>
                <dd className="mt-1">{b.failure}</dd>
              </div>
            </dl>
          </details>
        ))}
      </div>
    </div>
  );
}

/** Plan 0031: what an interviewer scores. Each row opens to show a strong and a weak answer so you can mark your own. */
function EvaluationScorecard({ criteria }: { criteria: EvaluationCriterion[] }) {
  return (
    <div className="mt-8 space-y-2" id="design-criteria">
      <h3 className="text-base font-semibold">How you will be judged</h3>
      <p className="text-sm text-muted">Interviewers score areas like these. After your own attempt, open each row and mark yourself honestly.</p>
      <div className="space-y-2">
        {criteria.map((c) => (
          <details key={c.area} className="group rounded-xl border border-line bg-surface p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
              <Chevron />
              <span>{c.area}</span>
            </summary>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Strong answer</p>
                <p className="mt-1">{c.strong}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Weak answer</p>
                <p className="mt-1">{c.weak}</p>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
