"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonClass, FilterChip } from "../../ui";
import { MasteryDot } from "./mastery";
import { nodeHref, type MasteryState } from "./lib";

export interface RecallCard {
  id: string;
  /** What you see: a phrase from a problem statement, or "use it when" text */
  cue: string;
  source: "clue" | "pattern";
  /** Name of the pattern (or pattern: variation) to recall */
  answer: string;
  /** Why it fits, shown after the reveal */
  idea: string;
  /** Thinking-map node to open */
  node: string;
  state: MasteryState;
}

const ROUND = 10;
const focusOnMount = (el: HTMLElement | null) => el?.focus({ preventScroll: true });

/*
 * Recall (view "recall"): cue -> name the pattern -> reveal -> Solid or Shaky. Everything stays in this page: no database
 * table, nothing is saved, and "Shaky" cards simply come round again at the end of the round. The deck is shuffled on the
 * server with a per-day seed, so it is stable during a render; "New round" takes the next ten cards.
 */
export function RecallView({ cards }: { cards: RecallCard[] }) {
  const [round, setRound] = useState(0);
  const [weakOnly, setWeakOnly] = useState(false);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [queue, setQueue] = useState<number[] | null>(null);
  const [score, setScore] = useState<{ solid: string[]; shaky: string[] }>({ solid: [], shaky: [] });

  const pool = useMemo(() => (weakOnly ? cards.filter((c) => c.state !== "solid") : cards), [cards, weakOnly]);
  const deck = useMemo(() => {
    if (pool.length === 0) return [];
    const size = Math.min(ROUND, pool.length);
    return Array.from({ length: size }, (_, k) => pool[(round * ROUND + k) % pool.length]);
  }, [pool, round]);

  const order = queue ?? deck.map((_, k) => k);
  const card = deck[order[i]];
  const byId = new Map(cards.map((c) => [c.id, c]));

  const restart = (nextRound: number, weak = weakOnly) => {
    setRound(nextRound);
    setWeakOnly(weak);
    setI(0);
    setShown(false);
    setQueue(null);
    setScore({ solid: [], shaky: [] });
  };

  const rate = (shaky: boolean) => {
    if (!card) return;
    setScore((s) => (shaky ? { ...s, shaky: [...s.shaky, card.id] } : { ...s, solid: [...s.solid, card.id] }));
    // A shaky card comes round once more at the end of the round (only the first time).
    if (shaky && !score.shaky.includes(card.id)) setQueue([...order, order[i]]);
    setI((x) => x + 1);
    setShown(false);
  };

  if (cards.length === 0) {
    return <p className="rounded-lg border border-line bg-surface p-6 text-sm text-muted dark:border-0">There are no recall cards yet.</p>;
  }

  const done = deck.length > 0 && i >= order.length;
  const shakyIds = [...new Set(score.shaky)];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {done ? "Round finished" : deck.length === 0 ? "No cards for this filter" : `Card ${Math.min(i + 1, order.length)} of ${order.length} · name the pattern from the cue`}
        </p>
        <FilterChip label="Shaky and not started only" selected={weakOnly} onClick={() => restart(0, !weakOnly)} />
      </div>

      {deck.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center dark:border-0">
          <p className="text-muted">Every pattern here is solid. Turn the filter off to drill all of them.</p>
          <button type="button" onClick={() => restart(0, false)} className={`${buttonClass("tonal", "md")} mt-4`}>
            Show every card
          </button>
        </div>
      ) : done ? (
        <div className="rounded-xl border border-line bg-surface p-6 text-center sm:p-8 dark:border-0">
          <p className="text-2xl font-medium">
            {new Set(score.solid).size} solid, {shakyIds.length} shaky
          </p>
          {shakyIds.length > 0 && (
            <div className="mt-4 text-left">
              <p className="mb-2 text-sm text-muted">Look at these again in the thinking map:</p>
              <ul className="flex flex-wrap gap-2">
                {shakyIds.map((id) => {
                  const c = byId.get(id);
                  return c ? (
                    <li key={id}>
                      <Link href={nodeHref({ pattern: c.node.split("/")[0], variation: c.node.split("/")[1] })} className="inline-flex min-h-10 items-center rounded-sm bg-reward-soft px-3.5 py-1.5 leading-snug text-sm font-medium text-on-reward-soft">
                        {c.answer}
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          )}
          <button type="button" ref={focusOnMount} onClick={() => restart(round + 1)} className={`${buttonClass("primary", "md")} mt-6`}>
            Start a new round
          </button>
          <p className="mt-3 text-xs text-muted">Your answers are kept on this page only. Nothing is saved, so this does not change your review queue.</p>
        </div>
      ) : (
        card && (
          <div key={`${round}-${i}`} className="anim-fade flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-line bg-surface p-6 text-center sm:p-8 dark:border-0">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{card.source === "clue" ? "You read this in a problem" : "Which pattern fits?"}</p>
            <p className="mt-2 max-w-[36ch] text-xl leading-snug font-medium text-balance sm:text-2xl">{card.cue}</p>
            {shown && (
              <div className="mt-4 max-w-[52ch]">
                <p className="inline-flex items-center gap-2 text-xl font-medium text-primary">
                  <MasteryDot state={card.state} />
                  {card.answer}
                </p>
                <p className="mt-2 text-sm text-muted">{card.idea}</p>
                <Link href={nodeHref({ pattern: card.node.split("/")[0], variation: card.node.split("/")[1] })} className="mt-2 inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
                  Open in the thinking map
                </Link>
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {shown ? (
                <>
                  <button type="button" ref={focusOnMount} onClick={() => rate(true)} className={buttonClass("reward", "md")}>
                    Shaky: ask me again
                  </button>
                  <button type="button" onClick={() => rate(false)} className={buttonClass("tonal", "md")}>
                    Solid
                  </button>
                </>
              ) : (
                <button type="button" ref={focusOnMount} onClick={() => setShown(true)} className={buttonClass("primary", "md")}>
                  Show the pattern
                </button>
              )}
            </div>
          </div>
        )
      )}
      {!done && deck.length > 0 && <p className="text-center text-xs text-muted">Your answers are kept on this page only; nothing is saved.</p>}
    </div>
  );
}
