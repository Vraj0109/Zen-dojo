import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { after, connection } from "next/server";
import { RESOLVE_XP, solveXp } from "@habit/shared";
import { getDsaView, type PatternView, type ProblemView } from "@/lib/dsa";
import { getLeetCodeStatus, syncLeetCodeIfStale } from "@/lib/leetcode/sync";
import {
  connectLeetCodeAction,
  disconnectLeetCodeAction,
  markSolvedAction,
  syncLeetCodeAction,
  undoSolveAction,
} from "../actions";
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
  after(syncLeetCodeIfStale);
  const [{ groups, due, extras, totals }, leetcode] = await Promise.all([getDsaView(), getLeetCodeStatus()]);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Patterns" value={`${totals.patternsCovered} / ${totals.patterns}`} hint="covered (4+ solved)" />
        <Stat label="Roadmap solved" value={`${totals.solved} / ${totals.problems}`} hint={`${totals.resolved} re-solved`} />
        <Stat label="All solved" value={String(totals.allSolved)} hint="goal: 150+" />
        <Stat label="Re-solves due" value={String(due.length)} hint={`${totals.xp} DSA XP`} />
      </section>

      <LeetCodeCard {...leetcode} />

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

      {extras.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">Other LeetCode solves</h2>
          <p className="mb-3 text-sm text-muted">Synced problems outside the roadmap list. They count toward XP, streak and the 150+ goal.</p>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {extras.map((e) => (
              <li key={e.problemId} className="flex items-center gap-3 px-3 py-2">
                <span className="w-6 text-center" aria-label="Synced from LeetCode">⚡</span>
                <div className="min-w-0 flex-1">
                  <ProblemTitle id={e.problemId} label={`${e.number ? `${e.number}. ` : ""}${e.title}`} url={e.url} noted={e.noted} />
                  <p className="text-xs text-muted">
                    <span className={`font-medium capitalize ${DIFFICULTY_STYLE[e.difficulty]}`}>{e.difficulty}</span> · Solved {fmt(e.solvedOn)}
                  </p>
                </div>
                <span className="text-sm text-muted">+{e.xp} XP</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Title links to the problem page (notes + code); ↗ opens the problem itself. */
function ProblemTitle(props: { id: string; label: string; url?: string; noted?: boolean; auto?: boolean; premium?: boolean }) {
  return (
    <span>
      <Link href={`/dsa/${encodeURIComponent(props.id)}`} prefetch={false} className="hover:underline">
        {props.label}
      </Link>
      {props.url && (
        <a
          href={props.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${props.label} on ${props.url.includes("leetcode.com") ? "LeetCode" : "the web"}`}
          className="ml-1.5 text-xs text-muted hover:text-foreground"
        >
          ↗
        </a>
      )}
      {props.noted && (
        <span className="ml-1.5 text-xs" title="Has notes or saved code">
          📝
        </span>
      )}
      {props.auto && (
        <span className="ml-1.5 text-xs" title="Synced from LeetCode">
          ⚡
        </span>
      )}
      {props.premium && (
        <span className="ml-1.5 text-xs text-muted" title="LeetCode Premium">
          🔒
        </span>
      )}
    </span>
  );
}

function ago(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

function LeetCodeCard({ username, last }: Awaited<ReturnType<typeof getLeetCodeStatus>>) {
  const input = "min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2";
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="font-semibold">⚡ LeetCode auto-sync</h2>
      {!username ? (
        <>
          <p className="mt-1 mb-3 text-sm text-muted">
            Enter your LeetCode username and accepted submissions are ticked here automatically (problems outside the list count too).
            Only your public profile is read; no login needed.
          </p>
          <form action={connectLeetCodeAction} className="flex flex-col gap-2 sm:flex-row">
            <input name="username" required maxLength={40} placeholder="LeetCode username" aria-label="LeetCode username" className={input} />
            <SubmitButton className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">Connect</SubmitButton>
          </form>
        </>
      ) : (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            Syncing{" "}
            <a href={`https://leetcode.com/u/${username}/`} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
              @{username}
            </a>
            <span className="text-muted"> · checks every 15 min while the app is open</span>
          </p>
          <div className="flex gap-2">
            <form action={syncLeetCodeAction}>
              <SubmitButton className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent">Sync now</SubmitButton>
            </form>
            <form action={disconnectLeetCodeAction}>
              <SubmitButton className="rounded-lg border border-line px-3 py-1.5 text-sm">Disconnect</SubmitButton>
            </form>
          </div>
        </div>
      )}
      {last && (
        <p role="status" className={`mt-2 text-sm ${last.ok ? "text-muted" : "text-cat-mock"}`}>
          {last.ok
            ? `Last sync ${ago(last.at)}: ${last.added} new solve${last.added === 1 ? "" : "s"}${last.resolved ? `, ${last.resolved} re-solve${last.resolved === 1 ? "" : "s"}` : ""}.`
            : `Sync failed ${ago(last.at)}: ${last.error}`}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        LeetCode only shares your 20 most recent accepted submissions, so open the app at least once on busy days.
      </p>
    </section>
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
        <ProblemTitle id={p.id} label={label} url={p.url} noted={p.noted} auto={p.auto} premium={p.premium} />
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
