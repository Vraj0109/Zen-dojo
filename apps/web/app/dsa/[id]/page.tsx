import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { JUDGE_PROBLEMS, PROBLEMS, RESOLVE_XP, solveXp } from "@habit/shared";
import { getProblemDetail } from "@/lib/dsa";
import { parseProblemTab } from "@/lib/dsa-filters";
import { getPatternNotes } from "@/lib/pattern-notes";
import { STRUGGLE_KINDS, STRUGGLE_RETRY_DAYS, getStruggles } from "@/lib/struggles";
import { JudgeWorkspace, type ProblemTab } from "../../judge-workspace";
import { ProblemDescription, ProblemHelp, startersFor } from "../../problem-workspace";
import { siteMinutesForSlug } from "@/lib/site-time";
import { focusMinutes } from "@/lib/timer";
import { clearStruggleAction, logStruggleAction, markSolvedAction, undoSolveAction } from "../../actions";
import { StartTimer } from "../../start-timer";
import { Code } from "../../code";
import { NotesForm } from "../../notes-form";
import { SubmitButton } from "../../submit-button";
import { Tabs, type TabItem } from "../../tabs";
import { getSimpleMode } from "@/lib/ui-prefs";
import { Difficulty, PageMain, SimpleHint, StatusMark } from "../../ui";

export const metadata: Metadata = { title: "Problem" };

export default function ProblemPage({ params, searchParams }: PageProps<"/dsa/[id]">) {
  return (
    <PageMain title="Problem" full>
      <Link href="/dsa" className="mb-4 inline-block text-sm text-muted hover:text-foreground">
        ← All patterns
      </Link>
      <Suspense fallback={<p className="text-muted">Loading problem…</p>}>
        <Problem params={params} searchParams={searchParams} />
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

function problemTabHref(problemId: string, tabId: string): string {
  const base = `/dsa/${encodeURIComponent(problemId)}`;
  if (tabId === "solve") return base;
  if (tabId === "stuck") return `${base}?tab=stuck#stuck`;
  return `${base}?tab=${tabId}`;
}

async function Problem({
  params,
  searchParams,
}: {
  params: PageProps<"/dsa/[id]">["params"];
  searchParams?: PageProps<"/dsa/[id]">["searchParams"];
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  await connection(); // reads today's date and the database
  const p = await getProblemDetail(decodeURIComponent(id));
  if (!p) notFound();
  const slug = p.url ? /\/problems\/([a-z0-9-]+)/.exec(p.url)?.[1] : undefined;
  const [struggles, focused, cheats, simple, onSite] = await Promise.all([
    getStruggles(p.id),
    focusMinutes(p.id),
    getPatternNotes(),
    getSimpleMode(),
    slug ? siteMinutesForSlug(slug) : 0,
  ]);
  const open = struggles.filter((x) => !x.clearedOn);

  const s = p.status;
  const label = p.number ? `${p.number}. ${p.title}` : p.title;

  const tab = parseProblemTab(sp, p.submissions.length > 0);

  const spec = JUDGE_PROBLEMS[p.id];
  if (spec) {
    const judgedTabs: ProblemTab[] = [
      { id: "description", label: "Description", node: <ProblemDescription spec={spec} /> },
      { id: "help", label: "Hints", node: <ProblemHelp spec={spec} /> },
      {
        id: "notes",
        label: "Notes",
        node: (
          <NotesForm
            id={p.id}
            note={p.note}
            notesPlaceholder={NOTES_TEMPLATE}
            codePlaceholder="Your accepted solution is saved here automatically when every test passes. You can also paste code yourself."
          />
        ),
      },
      ...(p.submissions.length > 0
        ? [{ id: "submissions", label: "Submissions", count: p.submissions.length, node: <Submissions list={p.submissions} /> }]
        : []),
      { id: "stuck", label: "Stuck log", count: open.length, node: <StuckPanel problemId={p.id} open={open} history={simple ? [] : struggles} /> },
      ...(p.patterns.length > 0
        ? [{ id: "pattern", label: "Pattern", node: <PatternHelp p={p} cheats={cheats} simple={simple} /> }]
        : []),
    ];
    const wanted = typeof sp.tab === "string" ? sp.tab : undefined;
    return (
      <article className="judged space-y-3">
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">{label}</h2>
            {PROBLEMS[p.id]?.why && <p className="text-sm text-muted">Why this one: {PROBLEMS[p.id].why}</p>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <Difficulty level={p.difficulty} />
              {p.patterns.map((pat) => (
                <Link key={pat.id} href={`/dsa/pattern/${pat.id}`} className="rounded-full border border-line px-2 py-0.5 text-xs hover:bg-background hover:text-foreground">
                  {pat.name}
                </Link>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <StatusMark state={s.state === "resolved" ? "solved" : s.state === "solved" ? (s.resolveDue ? "resolve" : "solved") : "none"} />
                {s.state === "unsolved" && "Not solved"}
                {s.state === "solved" && (s.resolveDue ? "Solved, re-solve due" : `Solved ${fmt(s.solvedOn)}`)}
                {s.state === "resolved" && `Re-solved ${fmt(s.resolvedOn)}`}
              </span>
              {p.url && (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">
                  {p.id.startsWith("cses-") ? "Open on CSES ↗" : p.url.includes("cp-algorithms.com") ? "Open on cp-algorithms ↗" : "Open on LeetCode ↗"}
                </a>
              )}
              {onSite > 0 && <span>{onSite} min on the LeetCode page</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {p.kind === "roadmap" && s.state !== "resolved" && (
              <form action={markSolvedAction}>
                <input type="hidden" name="problemId" value={p.id} />
                <SubmitButton className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background">
                  {s.state === "unsolved" ? "Mark solved" : "Mark re-solved"}
                  <span className="gamify-only"> (+{s.state === "unsolved" ? solveXp(p) : RESOLVE_XP} XP)</span>
                </SubmitButton>
              </form>
            )}
            {p.kind === "roadmap" && s.state !== "unsolved" && (
              <form action={undoSolveAction}>
                <input type="hidden" name="problemId" value={p.id} />
                <SubmitButton className="rounded-lg border border-line px-3 py-1.5 text-sm">Undo</SubmitButton>
              </form>
            )}
            <StartTimer
              itemId={p.id}
              label={p.title}
              href={`/dsa/${encodeURIComponent(p.id)}`}
              defaultMinutes={p.difficulty === "hard" ? 45 : p.difficulty === "easy" ? 15 : 25}
              totalMinutes={focused}
            />
          </div>
        </header>
        <JudgeWorkspace id={p.id} templates={startersFor(spec)} tabs={judgedTabs} initialTab={wanted === "solve" ? "description" : wanted} />
      </article>
    );
  }

  const tabs: TabItem[] = [
    { id: "solve", label: "Solve" },
    { id: "notes", label: "Notes & code" },
    ...(p.submissions.length > 0 ? [{ id: "submissions", label: "Submissions", count: p.submissions.length }] : []),
    { id: "stuck", label: "Stuck log", count: open.length },
  ];

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          {label}
          {p.auto && (
            <span className="ml-2 text-xs font-normal text-muted">
              synced from LeetCode
            </span>
          )}
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <Difficulty level={p.difficulty} />
          {p.premium && <span>Premium</span>}
          {p.patterns.length > 0 && (
            <span>
              Pattern:{" "}
              {p.patterns.map((pat, i) => (
                <span key={pat.id}>
                  {i > 0 && ", "}
                  <Link href={`/dsa/pattern/${pat.id}`} className="text-foreground hover:underline">
                    {pat.name}
                  </Link>
                </span>
              ))}
            </span>
          )}
          <span>
            {s.state === "unsolved" && "Not solved"}
            {p.kind === "extra" && s.state !== "unsolved" && `Solved ${fmt(s.solvedOn)}`}
            {p.kind === "roadmap" && s.state === "solved" &&
              `Solved ${fmt(s.solvedOn)}${s.resolveDue ? " (re-solve due)" : ` (re-solve ${fmt(s.resolveOn)})`}`}
            {p.kind === "roadmap" && s.state === "resolved" && `Solved ${fmt(s.solvedOn)} · re-solved ${fmt(s.resolvedOn)}`}
          </span>
          {p.url && (
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline"
            >
              {p.id.startsWith("cses-") ? "Open on CSES ↗" : p.url.includes("cp-algorithms.com") ? "Open on cp-algorithms ↗" : "Open on LeetCode ↗"}
            </a>
          )}
        </div>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2 text-sm">
          <StatusMark state={s.state === "resolved" ? "solved" : s.state === "solved" ? (s.resolveDue ? "resolve" : "solved") : "none"} />
          <span>
            {s.state === "unsolved" && "Not solved yet."}
            {p.kind === "extra" && s.state !== "unsolved" && `Solved ${fmt(s.solvedOn)} (synced from LeetCode).`}
            {p.kind === "roadmap" && s.state === "solved" &&
              `Solved ${fmt(s.solvedOn)} · ${s.resolveDue ? "re-solve due now" : `re-solve on ${fmt(s.resolveOn)}`}`}
            {p.kind === "roadmap" && s.state === "resolved" && `Solved ${fmt(s.solvedOn)} · re-solved ${fmt(s.resolvedOn)}`}
          </span>
        </div>
        {p.kind === "roadmap" && (
          <div className="flex gap-2">
            {s.state !== "resolved" && (
              <form action={markSolvedAction}>
                <input type="hidden" name="problemId" value={p.id} />
                <SubmitButton className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background">
                  {s.state === "unsolved" ? "Mark solved" : "Mark re-solved"}
                  <span className="gamify-only"> (+{s.state === "unsolved" ? solveXp(p) : RESOLVE_XP} XP)</span>
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

      <StartTimer
        itemId={p.id}
        label={p.title}
        href={`/dsa/${encodeURIComponent(p.id)}`}
        defaultMinutes={p.difficulty === "hard" ? 45 : p.difficulty === "easy" ? 15 : 25}
        totalMinutes={focused}
      />
      {onSite > 0 && <p className="-mt-3 text-xs text-muted">{onSite} min on this problem&apos;s LeetCode page (from the extension)</p>}

      <Tabs tabs={tabs} active={tab} hrefFor={(tId) => problemTabHref(p.id, tId)} label="Problem sections" />

      {tab === "solve" && (
        <div className="space-y-4">
          <PatternHelp p={p} cheats={cheats} simple={simple} />

          {open.length > 0 && (
            <p className="rounded-xl border border-cat-mock bg-surface p-3 text-sm">
              On your stuck list since {fmt(open[open.length - 1].loggedOn)}.{" "}
              <Link href={`/dsa/${encodeURIComponent(p.id)}?tab=stuck#stuck`} className="font-medium underline">
                View stuck log ({open.length}) →
              </Link>
            </p>
          )}
        </div>
      )}

      {tab === "notes" && (
        <NotesForm
          id={p.id}
          note={p.note}
          notesPlaceholder={NOTES_TEMPLATE}
          codePlaceholder="Paste the code you submitted. When you re-solve, write it fresh first, then compare."
        />
      )}

      {tab === "submissions" && p.submissions.length > 0 && <Submissions list={p.submissions} />}

      {tab === "stuck" && <StuckPanel problemId={p.id} open={open} history={simple ? [] : struggles} />}
      {simple && <SimpleHint />}
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
            <SubmitButton className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent">Solved it cold</SubmitButton>
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

type Detail = NonNullable<Awaited<ReturnType<typeof getProblemDetail>>>;

function PatternHelp({ p, cheats, simple }: { p: Detail; cheats: Awaited<ReturnType<typeof getPatternNotes>>; simple: boolean }) {
  if (p.patterns.length === 0 && p.topics.length === 0) return null;
  return (
    <details className="rounded-xl border border-line bg-surface p-4" open>
      <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-foreground">Stuck? Show the pattern</summary>
      <div className="mt-3 space-y-3">
        {p.patterns.length > 0 && (
          <ul className="space-y-2 text-sm">
            {p.patterns.map((pat) => (
              <li key={pat.id}>
                <Link href={`/dsa/pattern/${pat.id}`} className="font-medium hover:underline">
                  {pat.name}
                </Link>
                <span className="text-muted"> · recognize by: {pat.recognize}</span>
                {!simple && cheats.get(pat.id)?.template && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs font-medium text-muted">Your template</summary>
                    <div className="mt-1">
                      <Code code={cheats.get(pat.id)!.template} lang={cheats.get(pat.id)!.language} maxHeight="20rem" />
                    </div>
                    {cheats.get(pat.id)!.recognize && <p className="mt-1 whitespace-pre-wrap text-xs">{cheats.get(pat.id)!.recognize}</p>}
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
        {p.topics.length > 0 && (
          <p className="text-xs text-muted" title="LeetCode topics">
            Topics: {p.topics.join(" · ")}
          </p>
        )}
      </div>
    </details>
  );
}

function Submissions({ list }: { list: Detail["submissions"] }) {
  return (
    <section>
      <h3 className="mb-1 font-semibold">Your LeetCode submissions ({list.length})</h3>
      <p className="mb-3 text-xs text-muted">Accepted solutions imported by the browser extension, newest first.</p>
      <ul className="space-y-2">
        {list.map((sub, i) => (
          <li key={sub.id}>
            <details open={i === 0} className="group rounded-xl border border-line bg-surface">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                <span className="inline-block transition-transform group-open:rotate-90">›</span>
                <span className="font-medium">{when(sub.submittedAt)}</span>
                <span>{sub.lang}</span>
                {sub.runtime && <span className="text-muted">{sub.runtime}{pct(sub.runtimePct)}</span>}
                {sub.memory && <span className="text-muted">{sub.memory}{pct(sub.memoryPct)}</span>}
                {sub.notes && <span className="text-xs text-muted">notes</span>}
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
                <Code code={sub.code} lang={sub.lang} maxHeight="32rem" />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
