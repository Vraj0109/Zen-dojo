import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { after, connection } from "next/server";
import { getDsaView, type PatternView } from "@/lib/dsa";
import { getSimpleMode } from "@/lib/ui-prefs";
import { HAS_FILTERS, STATUS_FILTERS, filterProblems, hasActiveFilters, parseDsaFilters, parseDsaTab, type DsaFilters } from "@/lib/dsa-filters";
import { getExtensionStatus } from "@/lib/leetcode/extension";
import { getLeetCodeStatus, syncLeetCodeIfStale } from "@/lib/leetcode/sync";
import { syncLeetCodeAction } from "../actions";
import { CheatSheet, ProblemRow, ProblemTitle } from "./problem-ui";
import { ago } from "../profile/connections";
import { SubmitButton } from "../submit-button";
import { Tabs } from "../tabs";
import { Difficulty, PageMain, ProgressBar, SimpleHint, Stat, StatusMark } from "../ui";

export const metadata: Metadata = { title: "DSA" };

export default function DsaPage({ searchParams }: PageProps<"/dsa">) {
  return (
    <PageMain title="DSA patterns">
      <Suspense fallback={<p className="text-muted">Loading patterns…</p>}>
        <Dsa searchParams={searchParams} />
      </Suspense>
    </PageMain>
  );
}

function dsaTabHref(id: string, params: Record<string, string | string[] | undefined>): string {
  if (id === "patterns") {
    const sp = new URLSearchParams();
    for (const key of ["q", "difficulty", "status", "has", "topic", "group"] as const) {
      const v = Array.isArray(params[key]) ? params[key][0] : params[key];
      if (typeof v === "string" && v.trim()) sp.set(key, v.trim());
    }
    const qs = sp.toString();
    return qs ? `/dsa?${qs}` : "/dsa";
  }
  return `/dsa?tab=${id}`;
}

async function Dsa({ searchParams }: { searchParams: PageProps<"/dsa">["searchParams"] }) {
  const params = await searchParams;
  await connection();
  after(syncLeetCodeIfStale);
  const [{ groups, due, extras, topics, totals }, leetcode, extension, simple] = await Promise.all([getDsaView(), getLeetCodeStatus(), getExtensionStatus(), getSimpleMode()]);

  const tab = parseDsaTab(params);
  const filters = parseDsaFilters(params);
  const filtering = hasActiveFilters(filters);
  const results = filtering ? filterProblems(groups.flatMap((g) => g.patterns), filters) : [];
  // Only the open group's problems are rendered (keeps the page small); ?group=none closes all.
  const openGroup = typeof params.group === "string" ? params.group : groups[0]?.id;

  const tabs = [
    { id: "patterns", label: "Patterns" },
    { id: "resolve", label: "Re-solve due", count: due.length },
    { id: "other", label: "Other solves", count: extras.length },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Patterns" value={`${totals.patternsCovered} / ${totals.patterns}`} hint="covered (4+ solved)" />
        <Stat label="Roadmap solved" value={`${totals.solved} / ${totals.problems}`} hint={`${totals.resolved} re-solved`} />
        <Stat label="All solved" value={String(totals.allSolved)} hint="goal: 150+" />
        <Stat label="Re-solves due" value={String(due.length)} hint={`${totals.xp} DSA XP`} href="?tab=resolve" />
      </section>

      <Tabs tabs={tabs} active={tab} hrefFor={(id) => dsaTabHref(id, params)} label="DSA sections" />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-8">
          {tab === "patterns" && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Patterns</h2>
              <FilterBar filters={filters} topics={topics} totals={totals} />
              {filtering ? (
                <div>
                  <p className="mb-2 text-sm text-muted" role="status">
                    {results.length} problem{results.length === 1 ? "" : "s"} match.{" "}
                    <Link href="/dsa" className="font-medium text-foreground hover:underline">
                      Clear filters
                    </Link>
                  </p>
                  {results.length > 0 && (
                    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                      {results.map(({ problem, patterns }) => (
                        <ProblemRow key={problem.id} p={problem} patterns={patterns} />
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted">
                    Learn the template, solve 4–6 problems easy to hard, then re-solve cold two weeks later.
                  </p>
                  <div className="space-y-4">
                    {groups.map((g) => {
                      const open = g.id === openGroup;
                      const pct = g.patterns.length > 0 ? Math.min(100, Math.round((g.covered / g.patterns.length) * 100)) : 0;
                      return (
                        <div key={g.id} id={`g-${g.id}`} className="scroll-mt-32 lg:scroll-mt-4">
                          <Link
                            href={open ? "/dsa?group=none" : `/dsa?group=${g.id}#g-${g.id}`}
                            scroll={false}
                            prefetch={false}
                            aria-expanded={open}
                            className="flex items-center justify-between gap-3 border-b border-line py-3 hover:text-foreground"
                          >
                            <span className="font-semibold">
                              <span className={`mr-2 inline-block transition-transform ${open ? "rotate-90" : ""}`}>›</span>
                              {g.title}
                            </span>
                            <span className="text-sm text-muted">
                              {g.covered}/{g.patterns.length} covered
                            </span>
                          </Link>
                          <div
                            className="h-0.5 w-full bg-line"
                            role="progressbar"
                            aria-label={`${g.title} progress`}
                            aria-valuenow={g.covered}
                            aria-valuemin={0}
                            aria-valuemax={g.patterns.length}
                          >
                            <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                          </div>
                          {open && (
                            <div className="space-y-6 pt-4 pb-6">
                              {g.patterns.map((p) => (
                                <PatternBlock key={p.id} p={p} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}

          {tab === "resolve" && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Re-solve due</h2>
              <p className="text-sm text-muted">Solved 14+ days ago: solve again from scratch, then tick.</p>
              {due.length === 0 ? (
                <p className="rounded-xl border border-line bg-surface p-6 text-center text-muted">Nothing due.</p>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                  {due.map((p) => (
                    <ProblemRow key={p.id} p={p} />
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "other" && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Other LeetCode solves</h2>
              <p className="text-sm text-muted">Synced problems outside the roadmap list. They count toward XP, streak and the 150+ goal.</p>
              {extras.length === 0 ? (
                <p className="rounded-xl border border-line bg-surface p-6 text-center text-muted">No synced solves outside the roadmap yet.</p>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                  {extras.map((e) => (
                    <li key={e.problemId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-surface/80">
                      <div className="flex min-w-0 items-center gap-3">
                        <StatusMark state="solved" />
                        <ProblemTitle
                          id={e.problemId}
                          label={`${e.number ? `${e.number}. ` : ""}${e.title}`}
                          url={e.url}
                          struggling={e.struggling}
                        />
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs text-muted">+{e.xp} XP</span>
                        <div className="w-14 text-right">
                          <Difficulty level={e.difficulty} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {!simple && (
            <Link href="/dsa/boss" className="block rounded-lg border border-line bg-surface p-3 text-sm hover:bg-background">
              <span className="font-semibold text-foreground">Boss fight</span> · <span className="text-muted">2 unsolved problems against a 2-hour timer.</span>
            </Link>
          )}
          <SyncStatus leetcode={leetcode} extension={extension} />
          {simple && <SimpleHint />}
        </aside>
      </div>
    </div>
  );
}

/** Compact sync status; connecting and the pairing key live in Profile → Settings. */
function SyncStatus({
  leetcode,
  extension,
}: {
  leetcode: Awaited<ReturnType<typeof getLeetCodeStatus>>;
  extension: Awaited<ReturnType<typeof getExtensionStatus>>;
}) {
  const sync = leetcode.last;
  const imp = extension.last;
  return (
    <section className="rounded-xl border border-line bg-surface p-4 text-sm">
      <h2 className="font-semibold">LeetCode sync</h2>
      {leetcode.username ? (
        <>
          <p className="mt-1 text-muted">
            Syncing <span className="font-medium text-foreground">@{leetcode.username}</span>
            {sync && (sync.ok ? ` · last ${ago(sync.at)}, ${sync.added} new` : ` · failed ${ago(sync.at)}`)}
          </p>
          <form action={syncLeetCodeAction} className="mt-2">
            <SubmitButton className="rounded-lg bg-accent px-3 py-1.5 font-medium text-on-accent">Sync now</SubmitButton>
          </form>
        </>
      ) : (
        <p className="mt-1 text-muted">Not connected. Add your username to tick solves automatically.</p>
      )}
      <p className="mt-2 text-muted">
        Extension: {imp ? `last import ${ago(imp.at)}, ${imp.stored} submission${imp.stored === 1 ? "" : "s"}` : "no imports yet"}
      </p>
      <Link href="/profile/settings#leetcode" className="mt-2 inline-block font-medium hover:underline">
        Manage connections →
      </Link>
    </section>
  );
}

function FilterBar({
  filters,
  topics,
  totals,
}: {
  filters: DsaFilters;
  topics: string[];
  totals: { solved: number; problems: number };
}) {
  const field = "rounded-lg border border-line bg-background px-2 py-1.5 text-sm";
  return (
    <form action="/dsa" className="flex flex-wrap items-center gap-2" role="search">
      <input
        name="q"
        type="search"
        defaultValue={filters.q}
        placeholder="Search name or number"
        aria-label="Search problems"
        className={`${field} min-w-0 flex-1 basis-40 sm:max-w-xs`}
      />
      <select name="status" defaultValue={filters.status} aria-label="Status" className={field}>
        <option value="">Any status</option>
        {Object.entries(STATUS_FILTERS).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      <select name="difficulty" defaultValue={filters.difficulty} aria-label="Difficulty" className={field}>
        <option value="">Any difficulty</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
      {topics.length > 0 && (
        <select name="topic" defaultValue={filters.topic} aria-label="LeetCode topic" className={field}>
          <option value="">Any topic</option>
          {topics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      )}
      <select name="has" defaultValue={filters.has} aria-label="Notes and solutions" className={field}>
        <option value="">Notes: any</option>
        {Object.entries(HAS_FILTERS).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      <button className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent">Filter</button>
      <span className="ml-auto text-sm text-muted whitespace-nowrap">
        {totals.solved} / {totals.problems} solved
      </span>
    </form>
  );
}

function PatternBlock({ p }: { p: PatternView }) {
  return (
    <div id={`p-${p.id}`} className="scroll-mt-32 lg:scroll-mt-4">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="font-medium">
          <Link href={`/dsa/pattern/${p.id}`} className="hover:underline">
            {p.name}
          </Link>
        </h3>
        <span className="shrink-0 text-sm text-muted">
          {p.solved}/{p.target}
        </span>
      </div>
      <p className="mb-2 text-xs text-muted">
        Recognize by: {p.recognize} ·{" "}
        <Link href={`/dsa/pattern/${p.id}`} className="font-medium text-foreground hover:underline">
          Learn the pattern
        </Link>
      </p>
      <CheatSheet p={p} />
      <ProgressBar value={p.solved} max={p.target} label={`${p.name} progress`} />
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
        {p.items.map((item) => (
          <ProblemRow key={item.id} p={item} />
        ))}
      </ul>
    </div>
  );
}

