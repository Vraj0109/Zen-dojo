import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { RESOLVE_XP, solveXp } from "@habit/shared";
import { getDsaView, type PatternView, type ProblemView } from "@/lib/dsa";
import { markSolvedAction, undoSolveAction } from "../actions";
import { SubmitButton } from "../submit-button";
import { PageMain, ProgressBar, Stat } from "../ui";

export const metadata: Metadata = { title: "DSA" };

export default function DsaPage() {
  return (
    <PageMain title="DSA patterns">
      <Suspense fallback={<p className="text-muted">Loading patterns…</p>}>
        <Dsa />
      </Suspense>
    </PageMain>
  );
}

const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

async function Dsa() {
  await connection();
  const { groups, due, totals } = await getDsaView();

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Patterns" value={`${totals.patternsCovered} / ${totals.patterns}`} hint="covered (4+ solved)" />
        <Stat label="Solved" value={`${totals.solved} / ${totals.problems}`} hint={`${totals.resolved} re-solved`} />
        <Stat label="Re-solves due" value={String(due.length)} hint="14 days after solving" />
        <Stat label="DSA XP" value={`${totals.xp}`} hint="Easy 5 · Med 15 · Hard 30" />
      </section>

      {due.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">🔁 Re-solve today</h2>
          <p className="mb-3 text-sm text-muted">Solve these cold, without looking at your old code.</p>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-accent bg-surface">
            {due.map((p) => (
              <ProblemRow key={p.id} p={p} />
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Patterns</h2>
        <p className="text-sm text-muted">
          Learn the template, solve 4–6 problems easy to hard, then re-solve cold two weeks later.
        </p>
        {groups.map((g, i) => (
          <details key={g.id} open={i === 0} className="group rounded-xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
              <span className="font-semibold">
                <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
                {g.title}
              </span>
              <span className="text-sm text-muted">
                {g.covered}/{g.patterns.length} covered
              </span>
            </summary>
            <div className="space-y-4 border-t border-line p-4">
              {g.patterns.map((p) => (
                <PatternBlock key={p.id} p={p} />
              ))}
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}

function PatternBlock({ p }: { p: PatternView }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="font-medium">
          {p.covered && <span aria-label="covered">✅ </span>}
          {p.name}
        </h3>
        <span className="shrink-0 text-sm text-muted">
          {p.solved}/{p.target}
        </span>
      </div>
      <p className="mb-2 text-xs text-muted">Recognize by: {p.recognize}</p>
      <ProgressBar value={p.solved} max={p.target} label={`${p.name} progress`} />
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
        {p.items.map((item) => (
          <ProblemRow key={item.id} p={item} />
        ))}
      </ul>
    </div>
  );
}

const DIFFICULTY_STYLE = { easy: "text-cat-dsa", medium: "text-cat-beh", hard: "text-cat-mock" } as const;

function ProblemRow({ p }: { p: ProblemView }) {
  const s = p.status;
  const solved = s.state !== "unsolved";
  const due = s.state === "solved" && s.resolveDue;
  const label = p.number ? `${p.number}. ${p.title}` : p.title;

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      {s.state !== "resolved" ? (
        <form action={markSolvedAction}>
          <input type="hidden" name="problemId" value={p.id} />
          <SubmitButton
            aria-label={solved ? `Mark "${label}" re-solved` : `Mark "${label}" solved`}
            title={solved ? `Re-solved (+${RESOLVE_XP} XP)` : `Solved (+${solveXp(p)} XP)`}
            className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 text-sm ${
              solved ? "border-accent bg-accent text-on-accent" : "border-line"
            } ${due ? "animate-pulse" : ""}`}
          >
            {solved ? "✓" : ""}
          </SubmitButton>
        </form>
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent text-xs text-on-accent" aria-label="Re-solved">
          ✓✓
        </span>
      )}

      <div className="min-w-0 flex-1">
        {p.url ? (
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {label}
          </a>
        ) : (
          <span>{label}</span>
        )}
        {p.premium && (
          <span className="ml-1.5 text-xs text-muted" title="LeetCode Premium">
            🔒
          </span>
        )}
        <p className="text-xs text-muted">
          {p.difficulty && <span className={`font-medium capitalize ${DIFFICULTY_STYLE[p.difficulty]}`}>{p.difficulty}</span>}
          {s.state === "solved" && (
            <span className={due ? "font-medium text-foreground" : ""}>
              {p.difficulty && " · "}Solved {fmt(s.solvedOn)} · {due ? "re-solve due now — tick again" : `re-solve ${fmt(s.resolveOn)}`}
            </span>
          )}
          {s.state === "resolved" && (
            <span>
              {p.difficulty && " · "}Solved {fmt(s.solvedOn)} · re-solved {fmt(s.resolvedOn)}
            </span>
          )}
        </p>
      </div>

      {solved && (
        <form action={undoSolveAction}>
          <input type="hidden" name="problemId" value={p.id} />
          <SubmitButton aria-label={`Undo last solve of "${label}"`} title="Undo" className="px-1 text-muted hover:text-foreground">
            ↺
          </SubmitButton>
        </form>
      )}
    </li>
  );
}
