import type { ReactNode } from "react";
import type { ProblemSpec } from "@habit/shared";
import { parseMarkdown, inlineParts, type MdBlock } from "@habit/shared";
import { SOLUTION_LANG_LABEL, hasBundledSolutions, solutionCode, solutionLangs, bruteCode, bruteLangs } from "@habit/shared/solutions";
import { SolutionTabs } from "./solution-tabs";
import { Code } from "./code";
import { slug } from "./toc-items";

interface WalkthroughItem {
  md: string;
  optimal: string;
  reviewed: boolean;
}

export interface ProblemSolutionProps {
  spec: ProblemSpec;
  interview?: WalkthroughItem;
  approachSlots?: Record<string, ReactNode>;
}

interface ParsedSection {
  title: string;
  id: string;
  blocks: MdBlock[];
}

function parseWalkthroughSections(rawMd: string): ParsedSection[] {
  // Strip frontmatter
  const body = rawMd.replace(/^---[\s\S]*?---\n*/, "");
  const allBlocks = parseMarkdown(body);

  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const b of allBlocks) {
    if (b.type === "h" && b.level === 2) {
      if (current) sections.push(current);
      current = {
        title: b.text,
        id: slug(b.text),
        blocks: [],
      };
    } else {
      if (!current) {
        current = {
          title: "Overview",
          id: "overview",
          blocks: [],
        };
      }
      current.blocks.push(b);
    }
  }
  if (current) sections.push(current);

  return sections;
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((p, i) =>
        p.kind === "bold" ? (
          <strong key={i}>{p.text}</strong>
        ) : p.kind === "code" ? (
          <code key={i} className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-[0.9em]">
            {p.text}
          </code>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

export function ProblemSolution({ spec, interview, approachSlots }: ProblemSolutionProps) {
  const complexityBadge = interview?.optimal ?? spec.solution.complexity;

  return (
    <div data-focus-reading className="space-y-4">
      <details className="group rounded-lg border border-line bg-surface p-4" open={false}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 font-medium">
          <span className="flex items-center gap-2">
            <span className="inline-block transition-transform group-open:rotate-90">›</span>
            Try it yourself first
          </span>
          {complexityBadge && (
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-xs text-muted">
              {complexityBadge}
            </span>
          )}
        </summary>

        <div className="mt-4 border-t border-line pt-4 space-y-6">
          {interview ? (
            <WalkthroughBody spec={spec} interview={interview} approachSlots={approachSlots} />
          ) : (
            <FallbackSolutionBody spec={spec} />
          )}
        </div>
      </details>
    </div>
  );
}

function FallbackSolutionBody({ spec }: { spec: ProblemSpec }) {
  return (
    <div className="space-y-4">
      {spec.solution.idea.map((para, i) => (
        <p key={i} className="text-sm leading-relaxed">
          {para}
        </p>
      ))}
      <p className="text-sm">
        <span className="font-medium">Complexity:</span> {spec.solution.complexity}
      </p>
      <SolutionCodeBlock spec={spec} />
    </div>
  );
}

function WalkthroughBody({
  spec,
  interview,
  approachSlots,
}: {
  spec: ProblemSpec;
  interview: WalkthroughItem;
  approachSlots?: Record<string, ReactNode>;
}) {
  const sections = parseWalkthroughSections(interview.md);

  return (
    <div className="space-y-6">
      {/* Outline links/chips */}
      {sections.length > 0 && (
        <nav aria-label="Section outline" className="flex flex-wrap gap-1.5 pb-2 border-b border-line">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted hover:text-foreground hover:bg-surface-3 transition-colors"
            >
              {s.title}
            </a>
          ))}
        </nav>
      )}

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((sec) => {
          const isBruteForce = sec.title.toLowerCase().includes("brute force");
          const isOptimalApproach = sec.title.toLowerCase().includes("optimal approach");
          const slot = approachSlots?.[sec.id] ?? approachSlots?.[sec.title];
          const isBruteSame = /brute:\s*same/i.test(interview.md);

          return (
            <section key={sec.id} id={sec.id} className="scroll-mt-16 space-y-3">
              <h3 className="text-lg font-semibold tracking-tight text-foreground border-b border-line/40 pb-1.5">
                {sec.title}
              </h3>
              <MarkdownBlocks blocks={sec.blocks} />

              {/* Approach slot for future plan 0076 */}
              {slot && <div className="mt-3">{slot}</div>}

              {/* Brute force code directly after Brute force section */}
              {isBruteForce && (
                <div className="mt-4 space-y-3 rounded-lg border border-line bg-surface-2/60 p-4">
                  <h4 className="text-sm font-semibold text-foreground">Brute force implementation</h4>
                  {isBruteSame ? (
                    <p className="text-sm text-muted">The direct approach is already optimal here.</p>
                  ) : (
                    <BruteCodeBlock spec={spec} />
                  )}
                </div>
              )}

              {/* Reference code directly under Optimal approach */}
              {isOptimalApproach && (
                <div className="mt-4 space-y-3 rounded-lg border border-line bg-surface-2/60 p-4">
                  <h4 className="text-sm font-semibold text-foreground">Reference implementation</h4>
                  {spec.solution.idea.length > 0 && (
                    <div className="space-y-2 text-sm leading-relaxed text-muted">
                      {spec.solution.idea.map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  )}
                  {spec.solution.complexity && (
                    <p className="text-xs text-muted">
                      <span className="font-medium text-foreground">Reference complexity:</span>{" "}
                      {spec.solution.complexity}
                    </p>
                  )}
                  <SolutionCodeBlock spec={spec} />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SolutionCodeBlock({ spec }: { spec: ProblemSpec }) {
  const langs = solutionLangs(spec);
  const builtIn = hasBundledSolutions(spec);
  return (
    <div className="space-y-2">
      <SolutionTabs
        tabs={langs.map((l) => ({
          id: l,
          label: SOLUTION_LANG_LABEL[l],
          node: <Code code={solutionCode(spec, l) ?? ""} lang={SOLUTION_LANG_LABEL[l]} maxHeight="24rem" />,
        }))}
      />
      {builtIn && langs.length === 1 && (
        <p className="text-xs text-muted">Java and Python solutions are being added.</p>
      )}
    </div>
  );
}

function BruteCodeBlock({ spec }: { spec: ProblemSpec }) {
  const langs = bruteLangs(spec);
  if (!langs.length) {
    return <p className="text-xs text-muted">Brute force solution is being added.</p>;
  }
  return (
    <div className="space-y-2">
      <SolutionTabs
        tabs={langs.map((l) => ({
          id: l,
          label: SOLUTION_LANG_LABEL[l],
          node: <Code code={bruteCode(spec, l) ?? ""} lang={SOLUTION_LANG_LABEL[l]} maxHeight="24rem" />,
        }))}
      />
    </div>
  );
}

function MarkdownBlocks({ blocks }: { blocks: MdBlock[] }) {
  return (
    <div className="space-y-3 leading-relaxed text-sm">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h":
            return b.level === 2 ? (
              <h3 key={i} className="pt-2 text-base font-semibold">
                <Inline text={b.text} />
              </h3>
            ) : (
              <h4 key={i} className="pt-1 text-sm font-semibold">
                <Inline text={b.text} />
              </h4>
            );
          case "p":
            return (
              <p key={i} className="text-sm leading-relaxed">
                <Inline text={b.text} />
              </p>
            );
          case "ul":
          case "ol": {
            const List = b.type === "ol" ? "ol" : "ul";
            return (
              <List key={i} className={`${b.type === "ol" ? "list-decimal" : "list-disc"} space-y-1 pl-5`}>
                {b.items.map((it, j) => (
                  <li key={j} className="text-sm">
                    <Inline text={it} />
                  </li>
                ))}
              </List>
            );
          }
          case "code":
            return <Code key={i} code={b.text} lang={b.lang || undefined} />;
        }
      })}
    </div>
  );
}
