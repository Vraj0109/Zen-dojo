import Link from "next/link";
import type { Clue, OptimizeMove, ReadStep, ThinkPattern, WorkedExample } from "@habit/shared";
import { ClueDictionary, type ClueData } from "./clue-dictionary";
import { labelFor, nodeHref, pointRef, problemLink, type NodeRef } from "./lib";
import "./pattern-map.css";

/*
 * "How to read a problem" (view "read"): teaching, not a quiz. A reading routine, a clue dictionary, worked examples
 * (the reasoning is hidden behind a <details> so you think first), and the brute force -> optimisation table.
 * Server-rendered; only the clue filter is a client component.
 */

type Patterns = Record<string, ThinkPattern>;

function SectionHead({ id, title, hint }: { id: string; title: string; hint: string }) {
  return (
    <div className="mb-3 scroll-mt-4" id={id}>
      <h2 id={`${id}-title`} className="text-xl font-medium tracking-tight">
        {title}
      </h2>
      <p className="mt-0.5 max-w-[70ch] text-sm text-muted">{hint}</p>
    </div>
  );
}

export function ReadView({
  routine,
  clues,
  examples,
  moves,
  patterns,
}: {
  routine: ReadStep[];
  clues: Clue[];
  examples: WorkedExample[];
  moves: OptimizeMove[];
  patterns: Patterns;
}) {
  const clueData: ClueData[] = clues.map((c) => ({
    id: c.id,
    kind: c.kind,
    phrase: c.phrase,
    why: c.why,
    falseFriend: c.falseFriend,
    points: c.points.map((pt) => {
      const ref = pointRef(pt);
      return { label: labelFor(ref, patterns), href: nodeHref(ref) };
    }),
  }));
  const clueById = new Map(clues.map((c) => [c.id, c]));

  return (
    <div className="space-y-10">
      <nav aria-label="On this page" className="flex flex-wrap gap-2 text-sm">
        {[
          ["routine", "Reading routine"],
          ["clues", "Clue dictionary"],
          ["examples", "Worked examples"],
          ["moves", "Brute force to pattern"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="inline-flex h-10 items-center rounded-full bg-surface-2 px-4 font-medium text-muted hover:text-foreground max-md:h-11">
            {label}
          </a>
        ))}
      </nav>

      <section aria-labelledby="routine-title">
        <SectionHead id="routine" title="A reading routine" hint="Do these in order on every new problem, before you choose a pattern. Each step ends with questions to ask yourself." />
        {routine.length === 0 ? (
          <p className="text-sm text-muted">The routine has no steps yet.</p>
        ) : (
          <ol className="grid-auto-cards-300 grid gap-3">
            {routine.map((s, i) => (
              <li key={s.id} className="flex gap-3 rounded-lg border border-line bg-surface p-4 dark:border-0">
                <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-on-primary-soft">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-medium">
                    <span className="sr-only">Step {i + 1}: </span>
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{s.body}</p>
                  {s.ask.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {s.ask.map((q) => (
                        <li key={q} className="flex gap-2">
                          <span aria-hidden="true" className="text-primary">
                            ?
                          </span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="clues-title">
        <SectionHead id="clues" title="Clue dictionary" hint="A phrase you read, what it usually points to, and why. Open a pattern to see it in the thinking map." />
        <ClueDictionary clues={clueData} />
      </section>

      <section aria-labelledby="examples-title">
        <SectionHead id="examples" title="Worked examples" hint="Read the statement, spot the clues, and try to name the pattern. Then open the reasoning to compare." />
        {examples.length === 0 ? (
          <p className="text-sm text-muted">No worked examples yet.</p>
        ) : (
          <ul className="grid items-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr))]">
            {examples.map((ex) => {
              const ref: NodeRef = { pattern: ex.pattern, variation: ex.variation };
              const prob = ex.problem ? problemLink(ex.problem) : null;
              return (
                <li key={ex.id} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 dark:border-0">
                  <h3 className="text-base leading-snug font-medium">{ex.title}</h3>
                  <p className="text-sm">{ex.statement}</p>
                  {ex.clues.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5" aria-label="Clues in this problem">
                      {ex.clues.map((id) => (
                        <li key={id} className="rounded-sm bg-primary-container px-2.5 py-1 text-xs text-on-primary-container">
                          {clueById.get(id)?.phrase ?? id}
                        </li>
                      ))}
                    </ul>
                  )}
                  <details className="group rounded-md border border-line bg-background/50 dark:border-0 dark:bg-surface-2/40">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                      <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">
                        ›
                      </span>
                      Show the reasoning
                    </summary>
                    <div className="space-y-3 border-t border-line p-3.5 text-sm">
                      {ex.steps.length > 0 && (
                        <div>
                          <h4 className="mb-1 font-medium">How to think about it</h4>
                          <ol className="list-decimal space-y-1 pl-5">
                            {ex.steps.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      <div>
                        <h4 className="mb-1 font-medium">Brute force</h4>
                        <p className="text-muted">{ex.brute}</p>
                      </div>
                      <div>
                        <h4 className="mb-1 font-medium">Pattern</h4>
                        <Link href={nodeHref(ref)} className="inline-flex min-h-9 items-center rounded-sm bg-primary-soft px-3 font-medium text-on-primary-soft hover:bg-primary-soft/70">
                          {labelFor(ref, patterns)}
                        </Link>
                      </div>
                      <p className="rounded-md bg-reward-soft px-3 py-2 text-on-reward-soft">
                        <b className="font-medium">The trap.</b> {ex.trap}
                      </p>
                      {prob && (
                        <p>
                          {prob.external ? (
                            <a href={prob.href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                              Open {prob.label} on LeetCode ↗
                            </a>
                          ) : (
                            <Link href={prob.href} className="font-medium text-primary hover:underline">
                              Open {prob.label}
                            </Link>
                          )}
                        </p>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="moves-title">
        <SectionHead id="moves" title="From brute force to pattern" hint="Write the slow version first. What it wastes tells you which pattern to reach for." />
        {moves.length === 0 ? (
          <p className="text-sm text-muted">No moves yet.</p>
        ) : (
          <div className="rounded-lg border border-line bg-surface p-3 dark:border-0 sm:p-4">
            <table className="pm-moves">
              <thead>
                <tr>
                  <th scope="col">If the brute force wastes this</th>
                  <th scope="col">Do this</th>
                  <th scope="col">Pattern</th>
                </tr>
              </thead>
              <tbody>
                {moves.map((m) => {
                  const ref = pointRef(m.pattern);
                  return (
                    <tr key={`${m.waste}|${m.pattern}`}>
                      <td data-label="If the brute force wastes this">{m.waste}</td>
                      <td data-label="Do this">{m.fix}</td>
                      <td data-label="Pattern">
                        <Link href={nodeHref(ref)} className="inline-flex min-h-9 items-center rounded-sm bg-primary-soft px-3 font-medium whitespace-nowrap text-on-primary-soft hover:bg-primary-soft/70">
                          {labelFor(ref, patterns)}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
