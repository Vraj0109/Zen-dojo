import { JUDGE_LANGS, templateFor, type ProblemSpec } from "@habit/shared";
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
          Run checks the {spec.examples.length} examples above and your own cases. Submit also runs {spec.tests.length} extra tests
          {spec.stress?.length ? ` and ${spec.stress.length} large inputs that check speed` : ""}, and saves your code when everything passes.
        </p>
      </section>
    </div>
  );
}

export function ProblemHelp({ spec }: { spec: ProblemSpec }) {
  return (
    <div data-focus-reading className="space-y-2">
      <p className="text-xs text-muted">Open one hint at a time.</p>
      {spec.hints.map((h, i) => (
        <details key={i} className="group rounded-lg border border-line bg-background p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Hint {i + 1} of {spec.hints.length}
          </summary>
          <p className="anim-fade-up mt-2 text-sm">{h}</p>
        </details>
      ))}
    </div>
  );
}

const LANG_DISPLAY: Record<string, string> = {
  cpp: "C++",
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
};

/** The reference solution in every language that has one, as tabs (C++ first). Stored (pack or admin) problems keep C++ only. */
export function SolutionCode({ spec }: { spec: ProblemSpec }) {
  const codeByLang: Record<string, string> = {};
  if (spec.solution.cpp) codeByLang.cpp = spec.solution.cpp;
  const raw = spec.solution as Record<string, unknown>;
  for (const lang of ["java", "python", "javascript", "typescript"]) {
    if (typeof raw[lang] === "string" && raw[lang]) {
      codeByLang[lang] = raw[lang] as string;
    }
  }
  const langs = Object.keys(codeByLang);
  return (
    <div className="space-y-2">
      <SolutionTabs
        tabs={langs.map((l) => ({
          id: l,
          label: LANG_DISPLAY[l] ?? l,
          node: <Code code={codeByLang[l] ?? ""} lang={LANG_DISPLAY[l] ?? l} maxHeight="24rem" />,
        }))}
      />
      {langs.length === 1 && <p className="text-xs text-muted">Java and Python solutions are being added.</p>}
    </div>
  );
}
