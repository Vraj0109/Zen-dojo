"use client";

import "./pattern-map.css";
import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { buttonClass } from "../../ui";
import { MasteryDot, MasteryLine } from "./mastery";
import { revealCard } from "./reveal";
import {
  GUIDE_HREF,
  PRACTICE_HREF,
  nodeHref,
  type Mastery,
  type NodeRef,
  type ProblemLink,
  type ThinkPatData,
  type ThinkSigData,
} from "./lib";

/*
 * Thinking map (view "think"): constraints are rendered by the server wrapper; this is the branching tree
 * signal -> pattern -> variation plus the detail card.
 *
 * Without JS it is still a working tree: every branch is a <details>, every leaf a link to ?node=..., and the server picks
 * the selected node from the URL, so the card shows it. With JS, clicks select in place and the URL is updated with
 * history.replaceState so the selection can be shared. The card is a sticky side panel from 1100px of content width,
 * stacks under the tree from 760px, and on narrower content it opens inline under the selected node.
 */

const noop = () => () => {};
function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

function openKeysFor(signals: ThinkSigData[], sel: NodeRef | null): Set<string> {
  const keys = new Set<string>();
  const sig = (sel && signals.find((s) => s.patterns.includes(sel.pattern))) ?? signals[0];
  if (!sig) return keys;
  keys.add(`s:${sig.id}`);
  const pat = sel && sig.patterns.includes(sel.pattern) ? sel.pattern : sig.patterns[0];
  if (pat) keys.add(`p:${sig.id}:${pat}`);
  return keys;
}

export function ThinkMap({
  signals,
  patterns,
  mastery,
  initialNode,
}: {
  signals: ThinkSigData[];
  patterns: Record<string, ThinkPatData>;
  mastery: Record<string, Mastery>;
  initialNode: NodeRef | null;
}) {
  const hydrated = useHydrated();
  const valid = initialNode && patterns[initialNode.pattern] ? initialNode : null;
  const first = signals.flatMap((s) => s.patterns).find((id) => patterns[id]);
  const [sel, setSel] = useState<NodeRef | null>(valid ?? (first ? { pattern: first } : null));
  const [open, setOpen] = useState<Set<string>>(() => openKeysFor(signals, valid ?? (first ? { pattern: first } : null)));
  const card = useRef<HTMLElement>(null);

  const select = useCallback((ref: NodeRef) => {
    setSel(ref);
    try {
      window.history.replaceState(null, "", nodeHref(ref));
    } catch {
      // The URL is only a convenience; ignore a blocked history API.
    }
    // From 760px up the card is not inline: when it sits below the tree, bring it into view.
    requestAnimationFrame(() => revealCard(card.current));
  }, []);

  const setKey = (key: string, isOpen: boolean) =>
    setOpen((prev) => {
      if (prev.has(key) === isOpen) return prev;
      const next = new Set(prev);
      if (isOpen) next.add(key);
      else next.delete(key);
      return next;
    });

  const openAll = () => {
    const all = new Set<string>();
    for (const s of signals) {
      all.add(`s:${s.id}`);
      for (const pid of s.patterns) if (patterns[pid]?.variations.length) all.add(`p:${s.id}:${pid}`);
    }
    setOpen(all);
  };

  if (signals.length === 0) {
    return <p className="rounded-lg border border-line bg-surface p-6 text-sm text-muted dark:border-0">The thinking map has no content yet.</p>;
  }

  const selPattern = sel ? patterns[sel.pattern] : undefined;
  const selSignal = sel ? (signals.find((s) => s.patterns.includes(sel.pattern)) ?? signals[0]) : undefined;
  const detail = selPattern && selSignal ? <Detail pattern={selPattern} variationId={sel?.variation} signal={selSignal.label} mastery={mastery[selPattern.id]} onSelect={select} /> : null;

  return (
    <div className="grid items-start gap-4 @min-[1100px]:grid-cols-[minmax(0,1fr)_360px]">
      <section aria-labelledby="pm-tree-title" className="min-w-0 rounded-lg border border-line bg-surface p-4 dark:border-0 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 id="pm-tree-title" className="min-w-[200px] flex-1 text-xs font-medium tracking-wide text-muted uppercase">
            Step 2 · what is the problem asking? Open a branch
          </h2>
          {hydrated && (
            <>
              <button type="button" onClick={openAll} className="inline-flex h-9 items-center rounded-sm border border-line-strong px-3.5 text-sm font-medium hover:bg-surface-2 max-md:h-11">
                Open every branch
              </button>
              <button type="button" onClick={() => setOpen(new Set())} className="inline-flex h-9 items-center rounded-sm border border-line-strong px-3.5 text-sm font-medium hover:bg-surface-2 max-md:h-11">
                Close all
              </button>
            </>
          )}
        </div>
        <div className="overflow-x-auto pb-2">
          <ul className="pm-tree">
            <li className="pm-li">
              <div className="pm-grp">
                <div className="pm-node pm-root">
                  <b>New problem</b>
                </div>
                <ul>
                  {signals.map((sig) => {
                    const key = `s:${sig.id}`;
                    const pats = sig.patterns.map((id) => patterns[id]).filter((p): p is ThinkPatData => Boolean(p));
                    return (
                      <li key={sig.id} className="pm-li">
                        <details className="pm-grp" open={open.has(key)} onToggle={(e) => setKey(key, e.currentTarget.open)}>
                          <summary className="pm-node pm-sig">
                            <b>
                              {sig.label}
                              <Toggle n={pats.length} />
                            </b>
                            <span className="pm-w">{sig.when}</span>
                          </summary>
                          <ul>
                            {pats.map((p) => (
                              <PatternNode
                                key={p.id}
                                sig={sig}
                                p={p}
                                open={open}
                                setKey={setKey}
                                sel={sel}
                                mastery={mastery[p.id]}
                                select={select}
                                inline={sel?.pattern === p.id && selSignal?.id === sig.id ? detail : null}
                              />
                            ))}
                          </ul>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <aside
        ref={card}
        aria-label="Selected pattern"
        aria-live="polite"
        className="hidden min-w-0 rounded-lg border border-line bg-surface p-5 @min-[760px]:block dark:border-0 @min-[1100px]:sticky @min-[1100px]:top-4 @min-[1100px]:max-h-[calc(100dvh-2rem)] @min-[1100px]:overflow-y-auto"
      >
        {detail}
      </aside>
    </div>
  );
}

function Toggle({ n }: { n: number }) {
  return (
    <span className="pm-tw" aria-hidden="true">
      <span className="pm-tw-open">− {n}</span>
      <span className="pm-tw-closed">+ {n}</span>
    </span>
  );
}

function PatternNode({
  sig,
  p,
  open,
  setKey,
  sel,
  mastery,
  select,
  inline,
}: {
  sig: ThinkSigData;
  p: ThinkPatData;
  open: Set<string>;
  setKey: (key: string, isOpen: boolean) => void;
  sel: NodeRef | null;
  mastery: Mastery | undefined;
  select: (ref: NodeRef) => void;
  inline: React.ReactNode;
}) {
  const key = `p:${sig.id}:${p.id}`;
  const on = sel?.pattern === p.id && !sel.variation;
  const label = (
    <>
      <b>
        {mastery && <MasteryDot state={mastery.state} className="mr-1.5 align-[-1px]" />}
        {p.label}
        {p.variations.length > 0 && <Toggle n={p.variations.length} />}
      </b>
      <span className="pm-w">{p.when}</span>
    </>
  );
  const inlineCard = inline ? (
    <div className="my-2 rounded-md border border-line bg-surface p-4 @min-[760px]:hidden dark:border-0">{inline}</div>
  ) : null;

  if (p.variations.length === 0) {
    const ref = { pattern: p.id };
    return (
      <li className="pm-li">
        <Link
          href={nodeHref(ref)}
          scroll={false}
          className="pm-node pm-pat"
          data-on={on}
          aria-current={on ? "true" : undefined}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            select(ref);
          }}
        >
          {label}
        </Link>
        {inlineCard}
      </li>
    );
  }

  return (
    <li className="pm-li">
      <details className="pm-grp" open={open.has(key)} onToggle={(e) => setKey(key, e.currentTarget.open)}>
        <summary
          className="pm-node pm-pat"
          data-on={on}
          aria-current={on ? "true" : undefined}
          onClick={() => select({ pattern: p.id })}
        >
          {label}
        </summary>
        {inlineCard}
        <ul>
          {p.variations.map((v) => {
            const ref = { pattern: p.id, variation: v.id };
            const vOn = sel?.pattern === p.id && sel.variation === v.id;
            return (
              <li key={v.id} className="pm-li">
                <Link
                  href={nodeHref(ref)}
                  scroll={false}
                  className="pm-node pm-var"
                  data-on={vOn}
                  aria-current={vOn ? "true" : undefined}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    select(ref);
                  }}
                >
                  <b>{v.label}</b>
                  <span className="pm-w">{v.when}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </details>
    </li>
  );
}

function ExampleLinks({ items }: { items: ProblemLink[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="mb-1.5 text-sm font-medium">Examples</h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((e) => (
          <li key={e.href}>
            {e.external ? (
              <a href={e.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-sm bg-surface-2 px-2.5 text-sm text-muted hover:text-foreground">
                {e.label} ↗
              </a>
            ) : (
              <Link href={e.href} className="inline-flex min-h-9 items-center rounded-sm bg-surface-2 px-2.5 text-sm text-muted hover:text-foreground">
                {e.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Detail({
  pattern,
  variationId,
  signal,
  mastery,
  onSelect,
}: {
  pattern: ThinkPatData;
  variationId: string | undefined;
  signal: string;
  mastery: Mastery | undefined;
  onSelect: (ref: NodeRef) => void;
}) {
  const v = variationId ? pattern.variations.find((x) => x.id === variationId) : undefined;
  const examples = v ? v.examples : dedupe(pattern.variations.flatMap((x) => x.examples));
  const app = pattern.appPattern;
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{signal}</p>
      <h3 className="mt-1 text-[22px] leading-tight font-medium">{v ? v.label : pattern.label}</h3>
      {v && <p className="text-sm text-muted">A variation of {pattern.label}</p>}
      <div className="mt-3 rounded-md bg-primary-container p-3.5 text-sm text-on-primary-container">
        <b className="font-medium">Use it when</b>
        <br />
        {v ? v.when : pattern.when}
      </div>
      <p className="mt-3 text-sm">
        <b className="font-medium">Key idea.</b> {v ? v.key : pattern.key}
      </p>

      {!v && pattern.watch.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-medium">Watch out for</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {pattern.watch.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {!v && pattern.template && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-medium">Template · {pattern.template.complexity}</h3>
          <pre tabIndex={0} className="overflow-x-auto rounded-md bg-surface-2 p-3.5 font-mono text-[13px] leading-relaxed text-foreground">
            <code>{pattern.template.code}</code>
          </pre>
        </div>
      )}

      {!v && pattern.variations.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1.5 text-sm font-medium">Variations</h3>
          <ul className="grid gap-1.5">
            {pattern.variations.map((x) => (
              <li key={x.id}>
                <Link
                  href={nodeHref({ pattern: pattern.id, variation: x.id })}
                  scroll={false}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    onSelect({ pattern: pattern.id, variation: x.id });
                  }}
                  className="block rounded-sm bg-surface-2 px-3 py-2.5 text-sm hover:bg-primary-soft/60"
                >
                  <b className="block font-medium">{x.label}</b>
                  <span className="text-muted">{x.when}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {v && (
        <p className="mt-4">
          <Link
            href={nodeHref({ pattern: pattern.id })}
            scroll={false}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              onSelect({ pattern: pattern.id });
            }}
            className={buttonClass("tonal", "sm")}
          >
            Back to {pattern.label}
          </Link>
        </p>
      )}

      <ExampleLinks items={examples} />

      {mastery && mastery.state !== "untracked" && (
        <div className="mt-4">
          <MasteryLine m={mastery} />
        </div>
      )}

      {app ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={PRACTICE_HREF(app)} className={buttonClass("primary", "sm")}>
            Practice this
          </Link>
          <Link href={GUIDE_HREF(app)} className={buttonClass("outline", "sm")}>
            Open guide
          </Link>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted">This idea has no guide of its own in the app yet.</p>
      )}
    </div>
  );
}

function dedupe(items: ProblemLink[]): ProblemLink[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.href) ? false : (seen.add(i.href), true)));
}
