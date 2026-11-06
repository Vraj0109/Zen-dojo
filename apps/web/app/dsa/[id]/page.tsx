import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { RESOLVE_XP, solveXp } from "@habit/shared";
import { getProblemDetail } from "@/lib/dsa";
import { markSolvedAction, undoSolveAction } from "../../actions";
import { NotesForm } from "../../notes-form";
import { SubmitButton } from "../../submit-button";
import { PageMain } from "../../ui";

export const metadata: Metadata = { title: "Problem" };

export default function ProblemPage({ params }: PageProps<"/dsa/[id]">) {
  return (
    <PageMain title="Problem">
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
