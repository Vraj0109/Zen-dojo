import { JUDGE_LANGS, templateFor, type ProblemSpec } from "@habit/shared";
import { Code } from "./code";
import { JudgePanel } from "./judge-panel";

const show = (v: unknown) => JSON.stringify(v);

/**
 * The problem as on LeetCode: statement, examples, constraints, the code editor with Run, hints one at a time, and the
 * solution behind a click. Used on the roadmap problem page and on the CSES pages.
 */
export async function ProblemWorkspace({ spec }: { spec: ProblemSpec }) {
  const templates = Object.fromEntries(JUDGE_LANGS.map((l) => [l, templateFor(spec, l)])) as Record<(typeof JUDGE_LANGS)[number], string>;
  const signature = `${spec.fn.name}(${spec.fn.params.map((p) => `${p.name}: ${p.type}`).join(", ")}) -> ${spec.fn.returns}`;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div data-focus-reading className="space-y-5">
        <section aria-labelledby={`desc-${spec.id}`} className="space-y-3">
          <h3 id={`desc-${spec.id}`} className="text-lg font-semibold">
            Description
          </h3>
          {spec.statement.map((para, i) => (
            <p key={i} className="text-sm leading-relaxed">
              {para}
            </p>
          ))}
          <p className="text-xs text-muted">
            You write <code className="font-mono">{signature}</code>.
            {spec.unordered && " The order of the returned list does not matter."}
          </p>
          {spec.url && (
            <p className="text-xs text-muted">
              This is a summary in our own words.{" "}
              <a href={spec.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline">
                Original statement on CSES
              </a>
              . The test cases here were written for this app.
            </p>
          )}
        </section>

        <section aria-labelledby={`ex-${spec.id}`} className="space-y-3">
          <h3 id={`ex-${spec.id}`} className="text-lg font-semibold">
            Examples
          </h3>
          {spec.examples.map((ex, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface p-3 text-sm">
              <p className="mb-1 text-xs font-medium text-muted">Example {i + 1}</p>
              <dl className="space-y-1 font-mono text-xs">
                {spec.fn.params.map((p, k) => (
                  <div key={p.name}>
                    <dt className="inline text-muted">{p.name} = </dt>
                    <dd className="inline break-all">{show(ex.input[k])}</dd>
                  </div>
                ))}
                <div>
                  <dt className="inline text-muted">returns </dt>
                  <dd className="inline break-all">{show(ex.output)}</dd>
                </div>
              </dl>
              {ex.explanation && <p className="mt-2 text-xs text-muted">{ex.explanation}</p>}
            </div>
          ))}
        </section>

        <section aria-labelledby={`con-${spec.id}`} className="space-y-2">
          <h3 id={`con-${spec.id}`} className="text-lg font-semibold">
            Constraints
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {spec.constraints.map((c) => (
              <li key={c} className="font-mono text-xs">
                {c}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            {spec.examples.length + spec.tests.length} test cases run when you press Run: the examples above and {spec.tests.length} more.
          </p>
        </section>

        <section aria-labelledby={`help-${spec.id}`} className="space-y-2">
          <h3 id={`help-${spec.id}`} className="text-lg font-semibold">
            Hints and solution
          </h3>
          {spec.hints.map((h, i) => (
            <details key={i} className="rounded-xl border border-line bg-surface p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Hint {i + 1} of {spec.hints.length}
              </summary>
              <p className="mt-2 text-sm">{h}</p>
            </details>
          ))}
          <details className="rounded-xl border border-line bg-surface p-3">
            <summary className="cursor-pointer text-sm font-medium">Show the solution</summary>
            <div className="mt-3 space-y-3">
              {spec.solution.idea.map((para, i) => (
                <p key={i} className="text-sm leading-relaxed">
                  {para}
                </p>
              ))}
              <p className="text-sm">
                <span className="font-medium">Complexity:</span> {spec.solution.complexity}
              </p>
              <Code code={spec.solution.cpp} lang="C++" label="C++" maxHeight="24rem" />
            </div>
          </details>
        </section>
      </div>

      <div className="min-w-0">
        <JudgePanel id={spec.id} templates={templates} />
      </div>
    </div>
  );
}
