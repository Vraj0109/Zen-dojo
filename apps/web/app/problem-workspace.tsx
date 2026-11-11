import { JUDGE_LANGS, templateFor, type ProblemSpec } from "@habit/shared";
import { SOLUTION_LANG_LABEL, hasBundledSolutions, solutionCode, solutionLangs } from "@habit/shared/solutions";
import { Code } from "./code";
import { SolutionTabs } from "./solution-tabs";

// The reading parts of a problem, as separate pieces so the problem screen can put them in tabs (judge-workspace.tsx):
// the description (statement, examples, constraints) and the help (hints one at a time, then the solution).

const show = (v: unknown) => JSON.stringify(v);

/** Starter code for every language, for the editor. */
export function startersFor(spec: ProblemSpec) {
  return Object.fromEntries(JUDGE_LANGS.map((l) => [l, templateFor(spec, l)])) as Record<(typeof JUDGE_LANGS)[number], string>;
}

export function ProblemDescription({ spec }: { spec: ProblemSpec }) {
  const d = spec.design;
  const signature = d
    ? [`${d.className}(${d.ctor.map((p) => `${p.name}: ${p.type}`).join(", ")})`, ...d.methods.map((m) => `${m.name}(${m.params.map((p) => `${p.name}: ${p.type}`).join(", ")}) -> ${m.returns}`)].join("; ")
    : `${spec.fn.name}(${spec.fn.params.map((p) => `${p.name}: ${p.type}`).join(", ")}) -> ${spec.fn.returns}`;
  return (
    <div data-focus-reading className="space-y-5">
      <section aria-label="Description" className="space-y-3">
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
        <h3 id={`ex-${spec.id}`} className="text-sm font-semibold">
          Examples
        </h3>
        {spec.examples.map((ex, i) => (
          <div key={i} className="rounded-lg border border-line bg-background p-3 text-sm">
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
        <h3 id={`con-${spec.id}`} className="text-sm font-semibold">
          Constraints
        </h3>
        <ul className="list-disc space-y-1 pl-5">
          {spec.constraints.map((c) => (
            <li key={c} className="font-mono text-xs">
              {c}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          {spec.examples.length + spec.tests.length} test cases run when you press Run: the examples above and {spec.tests.length} more
          {spec.stress?.length ? `, plus ${spec.stress.length} large inputs that check speed` : ""}. Open any case in Results to see its input.
        </p>
      </section>
    </div>
  );
}

export function ProblemHelp({ spec }: { spec: ProblemSpec }) {
  return (
    <div data-focus-reading className="space-y-2">
      <p className="text-xs text-muted">Open one hint at a time. The solution is last.</p>
      {spec.hints.map((h, i) => (
        <details key={i} className="group rounded-lg border border-line bg-background p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Hint {i + 1} of {spec.hints.length}
          </summary>
          <p className="anim-fade-up mt-2 text-sm">{h}</p>
        </details>
      ))}
      <details className="rounded-lg border border-line bg-background p-3">
        <summary className="cursor-pointer text-sm font-medium">Show the solution</summary>
        <div className="anim-fade-up mt-3 space-y-3">
          {spec.solution.idea.map((para, i) => (
            <p key={i} className="text-sm leading-relaxed">
              {para}
            </p>
          ))}
          <p className="text-sm">
            <span className="font-medium">Complexity:</span> {spec.solution.complexity}
          </p>
          <SolutionCode spec={spec} />
        </div>
      </details>
    </div>
  );
}

/** The reference solution in every language that has one, as tabs (C++ first). Stored (pack or admin) problems keep C++ only. */
function SolutionCode({ spec }: { spec: ProblemSpec }) {
  const langs = solutionLangs(spec);
  const builtIn = hasBundledSolutions(spec);
  return (
    <div className="space-y-2">
      <SolutionTabs
        tabs={langs.map((l) => ({ id: l, label: SOLUTION_LANG_LABEL[l], node: <Code code={solutionCode(spec, l) ?? ""} lang={SOLUTION_LANG_LABEL[l]} maxHeight="24rem" /> }))}
      />
      {builtIn && langs.length === 1 && <p className="text-xs text-muted">Java and Python solutions are being added.</p>}
    </div>
  );
}
