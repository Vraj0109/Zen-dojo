import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { after, connection } from "next/server";
import { getDsaView, type PatternView, type ProblemView } from "@/lib/dsa";
import { AddedProblems } from "./added-problems";
import { getSimpleMode } from "@/lib/ui-prefs";
import {
  FILTER_OPTIONS,
  filterProblems,
  filtersToSearchParams,
  hasActiveFilters,
  parseDsaFilters,
  parseDsaTab,
  removeFilterValue,
  parseDsaSort,
  sortProblems,
  sourceLabel,
  DSA_SORTS,
  type DsaFilters,
  type DsaSort,
  type DsaTab,
  type FilterKey,
} from "@/lib/dsa-filters";
import { FiltersMenu, SortSelect } from "./filter-group";
import { GroupHeaderLink } from "./group-header-link";
import { Skeleton } from "@/app/components/skeleton";
import { getExtensionStatus } from "@/lib/leetcode/extension";
import { getLeetCodeStatus, syncLeetCodeIfStale } from "@/lib/leetcode/sync";
import { syncLeetCodeAction } from "../actions";
import { CheatSheet, ProblemRow, ProblemTable, ProblemTitle } from "./problem-ui";
import { ago } from "../profile/connections";
import { SubmitButton } from "../submit-button";
import { Tabs } from "../tabs";
import { buttonClass, Card, Difficulty, EmptyState, INPUT_CLASS, PageMain, ProgressBar, SimpleHint, StatusMark } from "../ui";
import { DsaRoadmapSkeleton } from "@/app/components/roadmap-skeleton";

export const metadata: Metadata = { title: "Practice" };

export default function DsaPage({ searchParams }: PageProps<"/dsa">) {
  return (
    <PageMain title="Practice">
      <Suspense fallback={<DsaRoadmapSkeleton />}>
        <Dsa searchParams={searchParams} />
      </Suspense>
    </PageMain>
  );
}

function dsaTabHref(id: string, params: Record<string, string | string[] | undefined>): string {
  if (id === "boss") return "/dsa/boss";
  if (id === "all") {
    const sp = filtersToSearchParams(parseDsaFilters(params));
    sp.set("tab", "all");
    const sort = parseDsaSort(params);
    if (sort !== "roadmap") sp.set("sort", sort);
    if (params.platforms === "all") sp.set("platforms", "all");
    return `/dsa?${sp}`;
  }
  if (id === "patterns") {
    const filters = parseDsaFilters(params);
    const sp = filtersToSearchParams(filters);
    if (typeof params.group === "string" && params.group.trim()) {
      sp.set("group", params.group.trim());
    }
    if (typeof params.platforms === "string" && params.platforms.trim()) {
      sp.set("platforms", params.platforms.trim());
    }
    const qs = sp.toString();
    return qs ? `/dsa?${qs}` : "/dsa";
  }
  return `/dsa?tab=${id}`;
}

async function Dsa({ searchParams }: { searchParams: PageProps<"/dsa">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  if (process.env.HABIT_HOSTED !== "1") {
    after(async () => {
      try {
        await syncLeetCodeIfStale();
      } catch (e) {
        console.error("LeetCode background sync error:", e);
      }
    });
  }
  const [{ groups, due, extras, topics, totals }, simple] = await Promise.all([getDsaView(), getSimpleMode()]);

  const anywhere = params.platforms === "all";
  const shown = anywhere ? { solved: totals.solvedAnywhere, allSolved: totals.allSolvedAnywhere } : { solved: totals.solved, allSolved: totals.allSolved };
  const tab = parseDsaTab(params);
  const filters = parseDsaFilters(params);
  const filtering = hasActiveFilters(filters);
  const results = filtering ? filterProblems(groups.flatMap((g) => g.patterns), filters) : [];
  // Only the open group's problems are rendered (keeps the page small); ?group=none closes all.
  const openGroup = typeof params.group === "string" ? params.group : groups[0]?.id;

  const allRows = filterProblems(groups.flatMap((g) => g.patterns), { q: "", source: [], status: [], difficulty: [], topic: [], has: [] });
  const sort = parseDsaSort(params);
  const tableRows = tab === "all" ? sortProblems(filtering ? results : allRows, sort) : tab === "patterns" && filtering ? sortProblems(results, sort) : [];

  const tabs = [
    { id: "patterns", label: "Patterns" },
    { id: "all", label: "All problems", count: allRows.length },
    { id: "resolve", label: "Re-solve due", count: due.length },
    { id: "other", label: "Other solves", count: extras.length },
    ...(simple ? [] : [{ id: "boss", label: "Boss battles" }]),
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p aria-hidden="true" className="text-2xl font-semibold tracking-tight">Practice</p>
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground tabular-nums">{totals.patternsCovered}</span> of {totals.patterns} patterns covered ·{" "}
          <span className="font-medium text-foreground tabular-nums">{shown.solved}</span> of {totals.problems} roadmap problems solved ·{" "}
          <span className="tabular-nums">{shown.allSolved}</span> solved in all (goal 150+) ·{" "}
          <Link href="?tab=resolve" className={due.length > 0 ? "font-medium text-warning hover:underline" : "hover:underline"}>
            {due.length} re-solve{due.length === 1 ? "" : "s"} due
          </Link>
        </p>
        <p className="text-xs text-muted">
          {anywhere ? "Counting solves on LeetCode and other platforms too." : "Counting only problems solved here (every test passed in the editor)."}{" "}
          <Link href={anywhere ? "/dsa" : "/dsa?platforms=all"} className="underline hover:text-foreground">
            {anywhere ? "Count only this app" : "Count all platforms"}
          </Link>
        </p>
      </header>

      <Tabs tabs={tabs} active={tab} hrefFor={(id) => dsaTabHref(id, params)} label="Practice sections" />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {(tab === "patterns" || tab === "all") && <FilterBar filters={filters} topics={topics} tab={tab} sort={sort} />}

          {tab === "patterns" && (
            <section className="space-y-3" aria-label="Patterns">
              {filtering ? (
                <ResultTable rows={tableRows} />
              ) : (
                <>
                  <p className="text-sm text-muted">Learn the template, solve 4 to 6 problems easy to hard, then re-solve cold two weeks later.</p>
                  <div className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
                    {groups.map((g) => {
                      const open = g.id === openGroup;
                      return (
                        <div key={g.id} id={`g-${g.id}`} className="scroll-mt-32 lg:scroll-mt-4">
                          <GroupHeaderLink id={g.id} title={g.title} covered={g.covered} total={g.patterns.length} open={open} />
                          {open && (
                            <div className="space-y-4 border-t border-line bg-background/40 p-4">
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

          {tab === "all" && (
            <section className="space-y-3" aria-label="All problems">
              <ResultTable rows={tableRows} total={tableRows.length} filtering={filtering} />
            </section>
          )}

          {tab === "resolve" && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Re-solve due</h2>
              <p className="text-sm text-muted">Solved 14+ days ago: solve again from scratch, then tick.</p>
              {due.length === 0 ? (
                <EmptyState message="Nothing due." />
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
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
              <p className="text-sm text-muted">Synced problems outside the roadmap list. They count toward the 150+ goal (and XP and streak if game features are on).</p>
              {extras.length === 0 ? (
                <EmptyState message="No synced solves outside the roadmap yet." />
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
                  {extras.map((e) => (
                    <li key={e.problemId} className="flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors duration-120 hover:bg-surface-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <StatusMark state="solved" />
                        <ProblemTitle id={e.problemId} label={`${e.number ? `${e.number}. ` : ""}${e.title}`} url={e.url} struggling={e.struggling} />
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="gamify-only text-xs text-muted">+{e.xp} XP</span>
                        <div className="w-16 text-right">
                          <Difficulty level={e.difficulty} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <AddedProblems />
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {!simple && (
            <Card href="/dsa/boss" className="p-4 text-sm">
              <span className="font-semibold text-foreground">Boss battle</span>
              <span className="mt-1 block text-muted">2 unsolved problems against a 2-hour timer.</span>
            </Card>
          )}
          <Suspense fallback={<Skeleton className="h-32 w-full rounded-md" />}>
            <SyncPanel />
          </Suspense>
          {simple && <SimpleHint />}
        </aside>
      </div>
    </div>
  );
}

function ResultTable({ rows, total, filtering = true }: { rows: { problem: ProblemView; patterns: string[] }[]; total?: number; filtering?: boolean }) {
  const count = total ?? rows.length;
  return (
    <div className="space-y-2">
      {filtering && (
        <p className="text-sm text-muted" role="status">
          {count} problem{count === 1 ? "" : "s"} match.{" "}
          <Link href="/dsa" className="font-medium text-foreground hover:underline">
            Clear all
          </Link>
        </p>
      )}
      {rows.length > 0 ? <ProblemTable rows={rows} sourceOf={sourceLabel} /> : <EmptyState message="No problems match these filters." action={{ label: "Clear filters", href: "/dsa" }} />}
    </div>
  );
}

/** Loads the sync facts on its own so the group list does not wait for them. */
async function SyncPanel() {
  await connection();
  const [leetcode, extension] = await Promise.all([getLeetCodeStatus(), getExtensionStatus()]);
  return <SyncStatus leetcode={leetcode} extension={extension} />;
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
    <section className="rounded-md border border-line bg-surface p-4 text-sm">
      <h2 className="font-semibold">LeetCode sync</h2>
      {leetcode.username ? (
        <>
          <p className="mt-1 text-muted">
            Syncing <span className="font-medium text-foreground">@{leetcode.username}</span>
            {sync && (sync.ok ? ` · last ${ago(sync.at)}, ${sync.added} new` : ` · failed ${ago(sync.at)}`)}
          </p>
          <form action={syncLeetCodeAction} className="mt-2">
            <SubmitButton className={buttonClass("secondary", "sm")}>Sync now</SubmitButton>
          </form>
        </>
      ) : (
        <p className="mt-1 text-muted">Not connected. Add your username to tick solves automatically.</p>
      )}
      <p className="mt-2 text-muted">
        Extension: {imp ? `last import ${ago(imp.at)}, ${imp.stored} submission${imp.stored === 1 ? "" : "s"}` : "no imports yet"}
      </p>
      <Link href="/profile/settings#leetcode" className="mt-2 inline-block font-medium text-primary hover:underline">
        Manage connections →
      </Link>
    </section>
  );
}

function ActiveChips({ filters }: { filters: DsaFilters }) {
  if (!hasActiveFilters(filters)) return null;

  const chips: { key: FilterKey | "q"; value?: string; label: string }[] = [];

  if (filters.q) {
    chips.push({ key: "q", label: `Search: "${filters.q}"` });
  }

  for (const s of filters.source) {
    const opt = FILTER_OPTIONS.source.find((o) => o.value === s);
    chips.push({ key: "source", value: s, label: opt?.label ?? s });
  }

  for (const st of filters.status) {
    const opt = FILTER_OPTIONS.status.find((o) => o.value === st);
    chips.push({ key: "status", value: st, label: opt?.label ?? st });
  }

  for (const d of filters.difficulty) {
    const opt = FILTER_OPTIONS.difficulty.find((o) => o.value === d);
    chips.push({ key: "difficulty", value: d, label: opt?.label ?? d });
  }

  for (const t of filters.topic) {
    chips.push({ key: "topic", value: t, label: `Topic: ${t}` });
  }

  for (const h of filters.has) {
    const opt = FILTER_OPTIONS.has.find((o) => o.value === h);
    chips.push({ key: "has", value: h, label: opt?.label ?? h });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      {chips.map((chip) => {
        const href = `/dsa?${filtersToSearchParams(removeFilterValue(filters, chip.key, chip.value)).toString()}`;
        return (
          <Link
            key={`${chip.key}-${chip.value ?? ""}`}
            href={href}
            aria-label={`Remove filter ${chip.label}`}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-primary-soft px-2.5 text-xs font-medium text-primary transition-colors duration-120 hover:border-primary"
          >
            <span>{chip.label}</span>
            <span aria-hidden="true">
              ×
            </span>
          </Link>
        );
      })}
      <Link href="/dsa" className="text-xs text-muted underline hover:text-foreground">
        Clear all
      </Link>
    </div>
  );
}

function FilterBar({ filters, topics, tab, sort }: { filters: DsaFilters; topics: string[]; tab: DsaTab; sort: DsaSort }) {
  const fallbackTopics = [
    "Arrays & Hashing",
    "Two pointers",
    "Sliding window",
    "Stack",
    "Binary search",
    "Linked list",
    "Trees",
    "Tries",
    "Heap / priority queue",
    "Backtracking",
    "Graphs",
    "Advanced graphs",
    "1-D Dynamic programming",
    "2-D Dynamic programming",
    "Greedy",
    "Intervals",
    "Math & geometry",
    "Bit manipulation",
  ];
  const effectiveTopics = topics.length > 0 ? topics : fallbackTopics;
  const sections = [
    { title: "Status", name: "status", options: FILTER_OPTIONS.status, selected: filters.status },
    { title: "Difficulty", name: "difficulty", options: FILTER_OPTIONS.difficulty, selected: filters.difficulty },
    { title: "Source", name: "source", options: FILTER_OPTIONS.source, selected: filters.source },
    { title: "Notes", name: "has", options: FILTER_OPTIONS.has, selected: filters.has },
    { title: "Topic", name: "topic", options: effectiveTopics.map((t) => ({ value: t, label: t })), selected: filters.topic },
  ];

  return (
    <div className="space-y-2">
      <form action="/dsa" method="get" className="flex flex-wrap items-center gap-2" role="search">
        {tab === "all" && <input type="hidden" name="tab" value="all" />}
        <div className="relative min-w-0 flex-1 basis-48 sm:max-w-sm">
          <svg className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Search title, topic, description or tests"
            aria-label="Search problems"
            className={`${INPUT_CLASS} pl-8`}
          />
        </div>
        <FiltersMenu sections={sections} />
        <span className="ml-auto">
          <SortSelect value={sort} options={DSA_SORTS} />
        </span>
        <noscript>
          <button type="submit" className={buttonClass("secondary", "md")}>
            Apply
          </button>
        </noscript>
      </form>
      <ActiveChips filters={filters} />
    </div>
  );
}

function PatternBlock({ p }: { p: PatternView }) {
  return (
    <div id={`p-${p.id}`} className="scroll-mt-32 space-y-3 rounded-md border border-line bg-surface p-4 lg:scroll-mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-semibold">
          <Link href={`/dsa/pattern/${p.id}`} className="hover:underline">
            {p.name}
          </Link>
        </h3>
        <Link href={`/dsa/pattern/${p.id}`} className="text-sm font-medium text-primary hover:underline">
          Learn the pattern
        </Link>
      </div>
      <p className="text-sm text-muted">Recognize by: {p.recognize}</p>
      <ProgressBar value={p.solved} max={p.target} label={`${p.name} progress`} showCount />
      <CheatSheet p={p} />
      <ul className="divide-y divide-line overflow-hidden rounded-md border border-line">
        {p.items.map((item) => (
          <ProblemRow key={item.id} p={item} />
        ))}
      </ul>
    </div>
  );
}
