import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { after, connection } from "next/server";
import { DSA_GROUPS } from "@habit/shared";
import { getDsaView, type ProblemView } from "@/lib/dsa";
import { AddedProblems } from "./added-problems";
import { getSimpleMode } from "@/lib/ui-prefs";
import {
  FILTER_OPTIONS,
  filterProblems,
  filtersToSearchParams,
  hasActiveFilters,
  parseDsaFilters,
  parseDsaTab,
  parseDsaSort,
  sortProblems,
  removeFilterValue,
  DSA_SORTS,
  type DsaTab,
} from "@/lib/dsa-filters";
import { FilterChipMenu, SortSelect } from "./filter-group";
import { PatternsView } from "./patterns-view";
import { Skeleton } from "@/app/components/skeleton";
import { getExtensionStatus } from "@/lib/leetcode/extension";
import { getLeetCodeStatus, syncLeetCodeIfStale } from "@/lib/leetcode/sync";
import { syncLeetCodeAction } from "../actions";
import { ProblemTable } from "./problem-ui";
import { ListMemory } from "./list-memory";
import { ago } from "../profile/connections";
import { SubmitButton } from "../submit-button";
import { buttonClass, EmptyState, StatusMark } from "../ui";
import { DsaRoadmapSkeleton } from "@/app/components/roadmap-skeleton";

export const metadata: Metadata = { title: "Practice" };

export default function DsaPage({ searchParams }: PageProps<"/dsa">) {
  return (
    <Suspense fallback={<DsaRoadmapSkeleton />}>
      <Dsa searchParams={searchParams} />
    </Suspense>
  );
}

function dsaTabHref(id: string, params: Record<string, string | string[] | undefined>): string {
  if (id === "boss") return "/dsa/boss";
  const filters = parseDsaFilters(params);
  const sp = filtersToSearchParams(filters);
  if (id === "all") {
    sp.set("tab", "all");
    const sort = parseDsaSort(params);
    if (sort !== "roadmap") sp.set("sort", sort);
  } else if (id !== "patterns") {
    sp.set("tab", id);
  }
  if (typeof params.platforms === "string" && params.platforms.trim()) {
    sp.set("platforms", params.platforms.trim());
  }
  const qs = sp.toString();
  return qs ? `/dsa?${qs}` : "/dsa";
}

const PATTERN_FILTER_GROUPS = DSA_GROUPS.map((g) => ({
  title: g.title,
  options: g.patterns.map((p) => ({ value: p.name, label: p.name })),
}));

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
  const [{ groups, due, extras, totals }, simple] = await Promise.all([getDsaView(), getSimpleMode()]);

  const anywhere = params.platforms === "all";
  const shown = anywhere ? { solved: totals.solvedAnywhere, allSolved: totals.allSolvedAnywhere } : { solved: totals.solved, allSolved: totals.allSolved };
  const tab = parseDsaTab(params);
  const filters = parseDsaFilters(params);
  const filtering = hasActiveFilters(filters);

  // Group lookup for problems
  const problemGroupMap = new Map<string, string>();
  let nextProblem: ProblemView | undefined;
  let easySolved = 0;
  let medSolved = 0;
  let hardSolved = 0;

  for (const g of groups) {
    for (const p of g.patterns) {
      for (const item of p.items) {
        if (!problemGroupMap.has(item.id)) {
          problemGroupMap.set(item.id, g.title);
        }
        if (!nextProblem && item.status.state === "unsolved") {
          nextProblem = item;
        }
        if (item.status.state === "solved" || item.status.state === "resolved") {
          if (item.difficulty === "easy") easySolved++;
          else if (item.difficulty === "medium") medSolved++;
          else if (item.difficulty === "hard") hardSolved++;
        }
      }
    }
  }

  const allRows = filterProblems(groups.flatMap((g) => g.patterns), { q: "", source: [], status: [], difficulty: [], topic: [], has: [] });
  const filteredRows = filtering ? filterProblems(groups.flatMap((g) => g.patterns), filters) : allRows;
  const sort = parseDsaSort(params);
  const tableRows = sortProblems(filteredRows, sort);

  const dueRows = due.map((p) => ({ problem: p, patterns: [] }));

  // Tabs for segmented pill
  // The view switch has the three views from the board. Other solves and Boss battle are links in the aside (and
  // in a short row under the switch on narrow windows, where the aside is hidden).
  const tabs: { id: DsaTab; label: string; short?: string }[] = [
    { id: "patterns", label: "Patterns" },
    { id: "all", label: "All problems" },
    { id: "resolve", label: `Re-solve due · ${due.length}`, short: `Re-solve · ${due.length}` },
    ...(tab === "other" ? [{ id: "other" as const, label: `Other solves · ${extras.length}`, short: `Other · ${extras.length}` }] : []),
  ];
  const sideLinks = [
    ...(extras.length > 0 && tab !== "other" ? [{ href: dsaTabHref("other", params), label: `Other solves · ${extras.length}` }] : []),
    ...(!simple ? [{ href: "/dsa/boss", label: "Boss battle" }] : []),
  ];

  const openGroup = typeof params.group === "string" ? params.group : undefined;
  // The chip's clear link: this page's URL without one filter (works without JS).
  const clearHref = (key: "topic" | "difficulty" | "status" | "source" | "has") => {
    const sp = filtersToSearchParams(removeFilterValue(filters, key));
    sp.set("tab", "all");
    if (sort !== "roadmap") sp.set("sort", sort);
    return `/dsa?${sp.toString()}`;
  };

  return (
    <div className="anim-fade flex min-h-0 flex-1 flex-col gap-4 px-4 pt-5 pb-6 sm:px-6 md:h-full md:overflow-hidden md:pt-7 md:pb-0">
      {/* Non-scrolling header */}
      <div className="shrink-0 space-y-3">
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[28px] leading-tight font-semibold text-foreground md:text-4xl">Practice</h1>
            <p className="text-sm text-muted mt-0.5">
              <span className="font-medium text-foreground tabular-nums">{shown.solved}</span> of {totals.problems} solved ·{" "}
              <span>{totals.patterns} patterns in {groups.length} groups</span> ·{" "}
              <Link href={dsaTabHref("resolve", params)} className={due.length > 0 ? "font-medium text-warning hover:underline" : "hover:underline"}>
                {due.length} re-solve{due.length === 1 ? "" : "s"} due
              </Link>
            </p>
          </div>
          {nextProblem && (
            <Link
              href={`/dsa/${encodeURIComponent(nextProblem.id)}`}
              className="inline-flex h-11 max-w-full min-w-0 items-center truncate rounded-full bg-primary-container px-5 text-sm font-medium text-on-primary-container transition-colors hover:brightness-95 max-md:hidden"
            >
              <span className="truncate">Continue: {nextProblem.title}</span>
            </Link>
          )}
        </header>

        {/* View switch segmented pill & Search bar */}
        <form action="/dsa" method="get" role="search" className="space-y-2">
          {tab !== "patterns" && <input type="hidden" name="tab" value={tab} />}
          <div className="flex gap-2.5 flex-wrap items-center">
            {/* Segmented pill */}
            <nav aria-label="View" className="inline-flex max-w-full gap-1 rounded-full bg-surface-2 p-1 select-none">
              {tabs.map((t) => {
                const isActive = t.id === tab;
                return (
                  <Link
                    key={t.id}
                    href={dsaTabHref(t.id, params)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex h-10 items-center rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors sm:px-[18px] ${
                      isActive ? "bg-primary-soft text-on-primary-soft" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {t.short ? (
                      <>
                        <span className="sm:hidden">{t.short}</span>
                        <span className="max-sm:hidden">{t.label}</span>
                      </>
                    ) : (
                      t.label
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Search input */}
            <label className="flex h-12 min-w-0 flex-[1_1_240px] items-center gap-2.5 rounded-full bg-surface-2 px-[18px] text-muted">
              <svg className="size-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                name="q"
                defaultValue={filters.q}
                placeholder={`Search ${totals.problems} problems or ${totals.patterns} patterns`}
                aria-label="Search problems and patterns"
                className="flex-1 min-w-0 border-0 bg-transparent text-foreground placeholder:text-muted outline-none text-[15px]"
              />
            </label>
          </div>

          {sideLinks.length > 0 && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm @min-[920px]:hidden">
              {sideLinks.map((l) => (
                <Link key={l.href} href={l.href} className="font-medium text-primary hover:underline">
                  {l.label}
                </Link>
              ))}
            </p>
          )}

          {/* Filter chip buttons for All problems */}
          {tab === "all" && (
            <div className="flex gap-2 flex-wrap items-center pt-1">
              <FilterChipMenu
                name="topic"
                clearHref={clearHref("topic")}
                label="Pattern"
                selected={filters.topic}
                groups={PATTERN_FILTER_GROUPS}
                searchable
                searchPlaceholder="Find one of 67 patterns"
              />
              <FilterChipMenu name="difficulty" clearHref={clearHref("difficulty")} label="Level" selected={filters.difficulty} options={FILTER_OPTIONS.difficulty} />
              <FilterChipMenu name="status" clearHref={clearHref("status")} label="Status" selected={filters.status} options={FILTER_OPTIONS.status} />
              <FilterChipMenu name="source" clearHref={clearHref("source")} label="Source" selected={filters.source} options={FILTER_OPTIONS.source} />
              <FilterChipMenu name="has" clearHref={clearHref("has")} label="Has notes" selected={filters.has} options={FILTER_OPTIONS.has} />

              <span className="flex items-center gap-1.5 text-sm whitespace-nowrap text-muted">
                Showing all {tableRows.length} · <SortSelect value={sort} options={DSA_SORTS} />
              </span>
              <ListMemory url={dsaTabHref("all", params)} grouped={sort === "roadmap" && tableRows.length > 0} />
            </div>
          )}
        </form>
      </div>

      {/* Main Content Area */}
      {tab === "patterns" && (
        <PatternsView
          groups={groups}
          initialGroup={openGroup}
          searchQuery={filters.q}
          aside={
            <ProgressAside
              totalProblems={totals.problems}
              solvedCount={shown.solved}
              easyCount={easySolved}
              medCount={medSolved}
              hardCount={hardSolved}
              simple={simple}
              extrasCount={extras.length}
            />
          }
        />
      )}

      {tab === "all" && (
        <div className="flex min-h-0 flex-1 flex-col pb-6 md:overflow-hidden">
          <ProblemTable
            rows={tableRows}
            nextProblemId={nextProblem?.id}
            showGroupDividers={sort === "roadmap"}
            problemGroupMap={problemGroupMap}
            openGroups={filtering ? "all" : "next"}
          />
        </div>
      )}

      {tab === "resolve" && (
        <div className="flex min-h-0 flex-1 flex-col pb-6 md:overflow-hidden">
          {due.length === 0 ? (
            <div className="rounded-lg border border-line bg-surface p-10 text-center text-sm text-muted dark:border-0">
              Nothing due for re-solve right now.
            </div>
          ) : (
            <ProblemTable rows={dueRows} nextProblemId={nextProblem?.id} />
          )}
        </div>
      )}

      {tab === "other" && (
        <div className="min-h-0 flex-1 space-y-4 pb-6 md:overflow-y-auto">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Other LeetCode solves</h2>
            <p className="text-sm text-muted">Synced problems outside the roadmap list. They count toward the 150+ goal.</p>
            {extras.length === 0 ? (
              <EmptyState message="No synced solves outside the roadmap yet." />
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line dark:border-0 bg-surface">
                {extras.map((e) => (
                  <li key={e.problemId} className="flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors duration-120 hover:bg-surface-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <StatusMark state="solved" />
                      <span className="truncate font-medium">{e.number ? `${e.number}. ` : ""}{e.title}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
                      {e.difficulty && <span className="capitalize">{e.difficulty}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <AddedProblems />
          </section>
        </div>
      )}
    </div>
  );
}

/** Progress aside on desktop: Solved ring, Boss battle card, LeetCode sync card */
function ProgressAside({
  totalProblems,
  solvedCount,
  easyCount,
  medCount,
  hardCount,
  simple = false,
  extrasCount = 0,
}: {
  totalProblems: number;
  solvedCount: number;
  easyCount: number;
  medCount: number;
  hardCount: number;
  simple?: boolean;
  extrasCount?: number;
}) {
  const c = 251.3;
  const easyLen = totalProblems > 0 ? Math.round((easyCount / totalProblems) * c) : 0;
  const medLen = totalProblems > 0 ? Math.round((medCount / totalProblems) * c) : 0;
  const hardLen = totalProblems > 0 ? Math.round((hardCount / totalProblems) * c) : 0;

  const medOffset = -(easyLen + 4);
  const hardOffset = -(easyLen + medLen + 8);

  return (
    <>
      {/* Solved Card */}
      <section className="rounded-[28px] border border-line bg-surface p-5 dark:border-0 flex flex-col gap-3">
        <span className="text-[15px] font-medium text-foreground">Solved</span>
        <div className="flex items-center gap-4">
          <svg role="img" aria-label={`${solvedCount} of ${totalProblems} solved`} width="96" height="96" viewBox="0 0 100 100" className="shrink-0">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--surface-2)" strokeWidth="10" />
            {easyLen > 0 && (
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="var(--success)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${easyLen} 252`}
                transform="rotate(-90 50 50)"
              />
            )}
            {medLen > 0 && (
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="var(--warning)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${medLen} 252`}
                strokeDashoffset={medOffset}
                transform="rotate(-90 50 50)"
              />
            )}
            {hardLen > 0 && (
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="var(--danger)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${hardLen} 252`}
                strokeDashoffset={hardOffset}
                transform="rotate(-90 50 50)"
              />
            )}
            <text x="50" y="57" textAnchor="middle" className="text-xl font-semibold fill-current font-sans text-foreground">
              {solvedCount}
            </text>
          </svg>
          <div className="flex flex-col gap-1 text-sm text-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success" />
              Easy {easyCount}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-warning" />
              Medium {medCount}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-danger" />
              Hard {hardCount}
            </span>
          </div>
        </div>
      </section>

      {/* Boss battle card */}
      {!simple && (
        <section className="flex flex-col gap-2.5 rounded-[28px] bg-reward-soft p-5 text-on-reward-soft">
          <span className="text-[15px] font-medium">Boss battle</span>
          <p className="text-sm opacity-85 leading-snug">3 problems, 60 minutes, no hints.</p>
          <Link
            href="/dsa/boss"
            className="inline-flex self-start items-center h-10 px-4.5 rounded-full bg-on-reward-soft text-reward-soft font-medium text-sm hover:opacity-90 transition-opacity mt-1"
          >
            Fight the boss
          </Link>
        </section>
      )}

      {extrasCount > 0 && (
        <Link href="/dsa?tab=other" className="rounded-[28px] border border-line bg-surface p-5 text-[15px] font-medium hover:border-line-strong dark:border-0">
          Other solves · {extrasCount}
          <span className="mt-1 block text-sm font-normal text-muted">LeetCode solves outside the roadmap list.</span>
        </Link>
      )}

      {/* LeetCode Sync */}
      <Suspense fallback={<Skeleton className="h-32 w-full rounded-2xl" />}>
        <SyncPanel />
      </Suspense>
    </>
  );
}

/** Loads the sync facts on its own so the group list does not wait for them. */
async function SyncPanel() {
  await connection();
  const [leetcode, extension] = await Promise.all([getLeetCodeStatus(), getExtensionStatus()]);
  return <SyncStatus leetcode={leetcode} extension={extension} />;
}

/** Compact sync status */
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
    <section className="rounded-[28px] border border-line bg-surface p-5 dark:border-0 text-sm flex flex-col gap-2">
      <h2 className="text-[15px] font-medium text-foreground">LeetCode</h2>
      {leetcode.username ? (
        <>
          <p className="text-muted text-xs leading-relaxed">
            Syncing <span className="font-medium text-foreground">@{leetcode.username}</span>
            {sync && (sync.ok ? ` · last ${ago(sync.at)}, ${sync.added} new` : ` · failed ${ago(sync.at)}`)}
          </p>
          <form action={syncLeetCodeAction} className="mt-1">
            <SubmitButton className={buttonClass("secondary", "sm")}>Sync now</SubmitButton>
          </form>
        </>
      ) : (
        <p className="text-muted text-xs leading-relaxed">Not connected. Add your username to tick solves automatically.</p>
      )}
      <p className="text-muted text-xs">
        Extension: {imp ? `last import ${ago(imp.at)}, ${imp.stored} submission${imp.stored === 1 ? "" : "s"}` : "no imports yet"}
      </p>
      <Link href="/profile/settings#leetcode" className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
        Manage connections →
      </Link>
    </section>
  );
}
