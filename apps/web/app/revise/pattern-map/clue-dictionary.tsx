"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { ClueKind } from "@habit/shared";
import { FilterChip } from "../../ui";

export interface ClueData {
  id: string;
  kind: ClueKind;
  phrase: string;
  why: string;
  falseFriend?: string;
  points: { label: string; href: string }[];
}

export const CLUE_KIND_LABEL: Record<ClueKind, string> = {
  constraint: "Constraint clues",
  wording: "Wording clues",
  input: "Input clues",
  output: "Output clues",
};
const KINDS: ClueKind[] = ["constraint", "wording", "input", "output"];

/** Searchable clue dictionary: what you read -> what it points to -> why. Filtering is client-side; without JS the whole list shows. */
export function ClueDictionary({ clues }: { clues: ClueData[] }) {
  const [kind, setKind] = useState<ClueKind | "all">("all");
  const [text, setText] = useState("");
  const inputId = useId();
  const q = text.trim().toLowerCase();
  const shown = useMemo(
    () =>
      clues.filter(
        (c) =>
          (kind === "all" || c.kind === kind) &&
          (q === "" || `${c.phrase} ${c.why} ${c.falseFriend ?? ""} ${c.points.map((p) => p.label).join(" ")}`.toLowerCase().includes(q)),
      ),
    [clues, kind, q],
  );
  const counts = useMemo(() => {
    const m: Record<string, number> = { all: clues.length };
    for (const c of clues) m[c.kind] = (m[c.kind] ?? 0) + 1;
    return m;
  }, [clues]);

  if (clues.length === 0) return <p className="text-sm text-muted">The clue dictionary has no entries yet.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Clue type">
          <FilterChip label={`All · ${counts.all}`} selected={kind === "all"} onClick={() => setKind("all")} />
          {KINDS.filter((k) => counts[k]).map((k) => (
            <FilterChip key={k} label={`${CLUE_KIND_LABEL[k]} · ${counts[k]}`} selected={kind === k} onClick={() => setKind(k)} />
          ))}
        </div>
        <div className="relative ml-auto w-full min-w-[200px] sm:w-72">
          <label htmlFor={inputId} className="sr-only">
            Filter clues
          </label>
          <input
            id={inputId}
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Filter clues, e.g. window, sorted, k-th"
            className="h-11 w-full rounded-full bg-surface-2 px-4 text-sm outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
      </div>
      <p className="text-xs text-muted" aria-live="polite">
        {shown.length} of {clues.length} clues
      </p>

      {shown.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-6 text-center dark:border-0">
          <p className="text-sm text-muted">No clue matches that filter.</p>
          <button
            type="button"
            onClick={() => {
              setKind("all");
              setText("");
            }}
            className="mt-3 inline-flex h-10 items-center rounded-full bg-primary-soft px-4 text-sm font-medium text-on-primary-soft"
          >
            Show every clue
          </button>
        </div>
      ) : (
        <ul className="grid-auto-cards-300 grid gap-3">
          {shown.map((c) => (
            <li key={c.id} id={`clue-${c.id}`} className="flex scroll-mt-4 flex-col gap-2 rounded-lg border border-line bg-surface p-4 [content-visibility:auto] dark:border-0">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">{CLUE_KIND_LABEL[c.kind]}</p>
              <p className="text-[15px] font-medium leading-snug">{c.phrase}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted">Points to</span>
                {c.points.map((p) => (
                  <Link key={p.href} href={p.href} className="inline-flex min-h-8 items-center rounded-sm py-1.5 leading-snug bg-primary-soft px-2.5 text-sm font-medium text-on-primary-soft hover:bg-primary-soft/70">
                    {p.label}
                  </Link>
                ))}
              </div>
              <p className="text-sm text-muted">{c.why}</p>
              {c.falseFriend && (
                <p className="rounded-md bg-reward-soft px-3 py-2 text-sm text-on-reward-soft">
                  <b className="font-medium">False friend.</b> {c.falseFriend}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
