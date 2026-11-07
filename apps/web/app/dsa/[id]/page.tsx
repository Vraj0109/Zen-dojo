import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { RESOLVE_XP, solveXp } from "@habit/shared";
import { getProblemDetail } from "@/lib/dsa";
import { getPatternNotes } from "@/lib/pattern-notes";
import { STRUGGLE_KINDS, STRUGGLE_RETRY_DAYS, getStruggles } from "@/lib/struggles";
import { focusMinutes } from "@/lib/timer";
import { clearStruggleAction, logStruggleAction, markSolvedAction, undoSolveAction } from "../../actions";
import { FocusTimer } from "../../focus-timer";
import { NotesForm } from "../../notes-form";
import { SubmitButton } from "../../submit-button";
import { PageMain } from "../../ui";

export const metadata: Metadata = { title: "Problem" };

export default function ProblemPage({ params }: PageProps<"/dsa/[id]">) {
  return (
    <PageMain title="Problem" narrow>
      <Link href="/dsa" className="mb-4 inline-block text-sm text-muted hover:text-foreground">
        ← All patterns
      </Link>
      <Suspense fallback={<p className="text-muted">Loading problem…</p>}>
        <Problem params={params} />
      </Suspense>
    </PageMain>
  );
}

const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const when = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

const pct = (v: number | null) => (v === null ? "" : ` (beats ${Math.round(v)}%)`);

const NOTES_TEMPLATE =`Approach:
Key insight:
Complexity: O(?) time, O(?) space
Edge cases / mistakes:`;

async function Problem({ params }: { params: PageProps<"/dsa/[id]">["params"] }) {
  const { id } = await params;
  await connection(); // reads today's date and the database
  const p = await getProblemDetail(decodeURIComponent(id));
  if (!p) notFound();
  const [struggles, focused, cheats] = await Promise.all([getStruggles(p.id), focusMinutes(p.id), getPatternNotes()]);
  const open = struggles.filter((x) => !x.clearedOn);

  const s = p.status;
  const label = p.number ? `${p.number}. ${p.title}` : p.title;

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          {label}
          {p.auto && (
            <span className="ml-2 text-base" title="Synced from LeetCode">
              ⚡
            </span>
          )}
        </h2>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {p.difficulty && <span className="capitalize">{p.difficulty}</span>}
          {p.premium && <span>🔒 Premium</span>}
          {p.topics.length > 0 && <span title="LeetCode topics">{p.topics.join(" · ")}</span>}
          {p.url && (
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:underline">
              Open on {p.url.includes("leetcode.com") ? "LeetCode" : "the web"} ↗
            </a>
          )}
        </p>
      </header>

      {p.patterns.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold">Pattern{p.patterns.length > 1 ? "s" : ""}</h3>
          <ul className="space-y-1 text-sm">
            {p.patterns.map((pat) => (
              <li key={pat.id}>
                <span className="font-medium">{pat.name}</span>
                <span className="text-muted"> · recognize by: {pat.recognize}</span>
                {cheats.get(pat.id)?.template && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs font-medium text-muted">Your template</summary>
                    <pre className="mt-1 max-h-80 overflow-auto rounded-lg border border-line bg-background p-3 font-mono text-xs">
                      <code>{cheats.get(pat.id)!.template}</code>
                    </pre>
                    {cheats.get(pat.id)!.recognize && <p className="mt-1 whitespace-pre-wrap text-xs">{cheats.get(pat.id)!.recognize}</p>}
                  </details>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
        <p className="text-sm">
          {s.state === "unsolved" && "Not solved yet."}
          {p.kind === "extra" && s.state !== "unsolved" && `Solved ${fmt(s.solvedOn)} (synced from LeetCode).`}
          {p.kind === "roadmap" && s.state === "solved" &&
            `Solved ${fmt(s.solvedOn)} · ${s.resolveDue ? "re-solve due now" : `re-solve on ${fmt(s.resolveOn)}`}`}
          {p.kind === "roadmap" && s.state === "resolved" && `Solved ${fmt(s.solvedOn)} · re-solved ${fmt(s.resolvedOn)} ✓✓`}
        </p>
        {p.kind === "roadmap" && (
          <div className="flex gap-2">
            {s.state !== "resolved" && (
              <form action={markSolvedAction}>
                <input type="hidden" name="problemId" value={p.id} />
                <SubmitButton className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent">
                  {s.state === "unsolved" ? `Mark solved (+${solveXp(p)} XP)` : `Mark re-solved (+${RESOLVE_XP} XP)`}
                </SubmitButton>
              </form>
            )}
            {s.state !== "unsolved" && (
              <form action={undoSolveAction}>
                <input type="hidden" name="problemId" value={p.id} />
                <SubmitButton className="rounded-lg border border-line px-3 py-1.5 text-sm">Undo</SubmitButton>
              </form>
            )}
          </div>
        )}
      </section>

      <FocusTimer itemId={p.id} defaultMinutes={p.difficulty === "hard" ? 45 : p.difficulty === "easy" ? 15 : 25} presets={[15, 25, 45]} totalMinutes={focused} />

      <StuckPanel problemId={p.id} open={open} history={struggles} />

      {p.submissions.length > 0 && (
        <section>
          <h3 className="mb-1 font-semibold">Your LeetCode submissions ({p.submissions.length})</h3>
          <p className="mb-3 text-xs text-muted">Accepted solutions imported by the browser extension, newest first.</p>
          <ul className="space-y-2">
            {p.submissions.map((sub, i) => (
              <li key={sub.id}>
                <details open={i === 0} className="group rounded-xl border border-line bg-surface">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                    <span className="inline-block transition-transform group-open:rotate-90">›</span>
                    <span className="font-medium">{when(sub.submittedAt)}</span>
                    <span>{sub.lang}</span>
                    {sub.runtime && <span className="text-muted">⏱ {sub.runtime}{pct(sub.runtimePct)}</span>}
                    {sub.memory && <span className="text-muted">💾 {sub.memory}{pct(sub.memoryPct)}</span>}
                    {sub.notes && <span title="Has LeetCode notes">📝</span>}
                    <a
                      href={`https://leetcode.com/submissions/detail/${sub.id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-xs text-muted hover:text-foreground"
                    >
                      LeetCode ↗
                    </a>
                  </summary>
                  <div className="space-y-3 border-t border-line p-4">
                    {sub.notes && <p className="whitespace-pre-wrap text-sm">{sub.notes}</p>}
                    <pre className="max-h-[32rem] overflow-auto rounded-lg border border-line bg-background p-3 font-mono text-xs">
                      <code>{sub.code}</code>
                    </pre>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}

      <NotesForm
        id={p.id}
        note={p.note}
        notesPlaceholder={NOTES_TEMPLATE}
        codePlaceholder="Paste the code you submitted. When you re-solve, write it fresh first, then compare."
      />
    </article>
  );
}

function StuckPanel({ problemId, open, history }: { problemId: string; open: Awaited<ReturnType<typeof getStruggles>>; history: Awaited<ReturnType<typeof getStruggles>> }) {
  return (
    <section id="stuck" className={`rounded-xl border bg-surface p-4 ${open.length ? "border-cat-mock" : "border-line"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">Stuck list</h3>
        {open.length > 0 && <span className="text-sm text-muted">On your list since {fmt(open[open.length - 1].loggedOn)}</span>}
      </div>
      {open.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            Comes back for review {STRUGGLE_RETRY_DAYS} days after each attempt until you solve it cold, without looking at notes.
          </p>
          <form action={clearStruggleAction}>
            <input type="hidden" name="problemId" value={problemId} />
            <SubmitButton className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent">Solved it cold ✓</SubmitButton>
          </form>
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted">Needed a hint, couldn&apos;t solve it, or took too long? Log it so it comes back in {STRUGGLE_RETRY_DAYS} days.</p>
      )}
      <form action={logStruggleAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="problemId" value={problemId} />
        <select name="kind" aria-label="What happened" className="rounded-lg border border-line bg-background px-2 py-2 text-sm" defaultValue="hint">
          {Object.entries(STRUGGLE_KINDS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <input
          name="reason"
          maxLength={500}
          placeholder="What tripped you up? e.g. didn't see it was a monotonic stack"
          aria-label="Reason"
          className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm"
        />
        <SubmitButton className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-background">Log it</SubmitButton>
      </form>
      {history.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {history.map((h) => (
            <li key={h.id} className={h.clearedOn ? "text-muted" : ""}>
              {fmt(h.loggedOn)} · {STRUGGLE_KINDS[h.kind as keyof typeof STRUGGLE_KINDS] ?? h.kind}
              {h.reason && `: ${h.reason}`}
              {h.clearedOn && ` · cleared ${fmt(h.clearedOn)}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
