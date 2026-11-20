import { CONSTRAINT_HINTS, LEETCODE_TAGS, THINK_PATTERNS, THINK_SIGNALS } from "@habit/shared";
import { parseNode, thinkPatternData, type Mastery } from "./lib";
import { ThinkMap } from "./think-map";

/** Thinking map view: Step 1 constraints strip, then the branching tree and its detail card. Server-rendered. */
export function ThinkView({ node, mastery }: { node?: string; mastery: Record<string, Mastery> }) {
  const patterns = Object.fromEntries(Object.values(THINK_PATTERNS).map((p) => [p.id, thinkPatternData(p)]));
  return (
    <div className="space-y-4">
      <section aria-labelledby="pm-step1" className="rounded-lg border border-line bg-surface p-4 sm:p-5 dark:border-0">
        <h2 id="pm-step1" className="text-xs font-medium tracking-wide text-muted uppercase">
          Step 1 · read the constraints, they tell you the budget
        </h2>
        {CONSTRAINT_HINTS.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No constraint hints yet.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(100%,170px),1fr))] gap-2">
            {CONSTRAINT_HINTS.map((c) => (
              <li key={c.n} className="rounded-md bg-surface-2 px-3 py-2.5 text-sm">
                <b className="block font-mono text-[13px] font-medium text-foreground">{c.n}</b>
                <span className="block text-foreground">{c.budget}</span>
                <span className="block text-xs text-muted">{c.fits}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ThinkMap key={node ?? ""} signals={THINK_SIGNALS.map((s) => ({ id: s.id, label: s.label, when: s.when, patterns: s.patterns }))} patterns={patterns} mastery={mastery} initialNode={parseNode(node)} />
      <p className="text-xs text-muted">
        {Object.keys(THINK_PATTERNS).length > 0 && `${Object.keys(THINK_PATTERNS).length} patterns across ${THINK_SIGNALS.length} signals, covering ${LEETCODE_TAGS.length} LeetCode topic tags.`}
      </p>
    </div>
  );
}

