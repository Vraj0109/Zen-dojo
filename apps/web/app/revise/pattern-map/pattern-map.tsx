import { Suspense } from "react";
import {
  CLUES,
  OPTIMIZE_MOVES,
  READING_ROUTINE,
  THINK_PATTERNS,
  WORKED_EXAMPLES,
  seededRandom,
} from "@habit/shared";
import { connection } from "next/server";
import { getDsaView } from "@/lib/dsa";
import { Skeleton } from "@/app/components/skeleton";
import { Tabs } from "../../tabs";
import { GroupsView, type GroupData } from "./groups-view";
import {
  MAP_VIEWS,
  labelFor,
  masteryForThink,
  parseView,
  pointRef,
  progressByPattern,
  type Mastery,
  type MapView,
  type ProgressPattern,
} from "./lib";
import { MasteryLegend } from "./mastery";
import { ReadView } from "./read-view";
import { RecallView, type RecallCard } from "./recall-view";
import { ThinkView } from "./think-view";

/*
 * Pattern map tab of Quick revise (plan 0091). /revise?tab=map&view=think|read|groups|recall (default think); &node=<pattern>
 * or <pattern>/<variation> opens and selects a node of the thinking map. Progress (solved of total per pattern) comes from
 * getDsaView(); the "read" view needs no data from the database.
 */

const GROUP_SHORT: Record<string, string> = {
  arrays: "Arrays and strings",
  "search-sort": "Search and sort",
  "lists-stacks-heaps": "Lists, stacks, heaps",
  trees: "Trees",
  graphs: "Graphs",
  "backtracking-bits": "Backtracking and bits",
  dp: "Dynamic programming",
  "greedy-math": "Greedy and math",
  advanced: "Advanced structures",
};

export function PatternMapTab({ view: rawView, node }: { view?: string; node?: string }) {
  const view = parseView(rawView);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Tabs tabs={MAP_VIEWS} active={view} hrefFor={(id) => `/revise?tab=map&view=${id}`} label="Pattern map views" />
        {(view === "think" || view === "groups") && <MasteryLegend />}
      </div>
      <p className="max-w-[70ch] text-sm text-muted">{INTRO[view]}</p>
      {view === "read" ? (
        <ReadView routine={READING_ROUTINE} clues={CLUES} examples={WORKED_EXAMPLES} moves={OPTIMIZE_MOVES} patterns={THINK_PATTERNS} />
      ) : (
        <Suspense fallback={<MapSkeleton />}>
          <MapWithProgress view={view} node={node} />
        </Suspense>
      )}
    </div>
  );
}

const INTRO: Record<MapView, string> = {
  think: "How to go from a new problem to the right pattern and variation: read the constraints, decide what is being asked, then follow the branch.",
  read: "Learn to read a problem the way a mentor does: a routine, the clue words that point to patterns, worked examples, and what a slow solution wastes. This is for learning, not a quiz.",
  groups: "All pattern groups on one map, with how much of each you have solved.",
  recall: "See a clue, name the pattern, then check yourself.",
};

function MapSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading the pattern map">
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}

async function MapWithProgress({ view, node }: { view: Exclude<MapView, "read">; node?: string }) {
  await connection();
  const dsa = await getDsaView();
  const allPatterns: (ProgressPattern & { name: string; recognize: string; group: string })[] = dsa.groups.flatMap((g) =>
    g.patterns.map((p) => ({ id: p.id, items: p.items, name: p.name, recognize: p.recognize, group: g.id })),
  );
  const progress = progressByPattern(allPatterns);
  const thinkMastery = masteryForThink(THINK_PATTERNS, progress);

  if (view === "think") return <ThinkView node={node} mastery={thinkMastery} />;
  if (view === "groups") return <GroupsSection groups={dsa.groups} progress={progress} />;
  return <RecallSection mastery={thinkMastery} today={dsa.today} />;
}

// ---------------------------------------------------------------- Pattern groups

function GroupsSection({ groups, progress }: { groups: Awaited<ReturnType<typeof getDsaView>>["groups"]; progress: Record<string, Mastery> }) {
  // DSA pattern id -> the thinking-map pattern that stands for it (and that pattern's key idea).
  const think = new Map<string, { id: string; key: string }>();
  for (const p of Object.values(THINK_PATTERNS)) {
    for (const id of [p.appPattern ?? p.id, p.id, ...(p.covers ?? [])]) if (!think.has(id)) think.set(id, { id: p.id, key: p.key });
  }
  const toPat = (p: (typeof groups)[number]["patterns"][number]) => {
    const m = progress[p.id] ?? { state: "untracked" as const, solved: 0, total: 0 };
    const t = think.get(p.id);
    return { id: p.id, name: p.name, recognize: p.recognize, solved: m.solved, total: m.total, state: m.state, thinkId: t?.id, idea: t?.key };
  };
  const data: GroupData[] = groups
    .filter((g) => g.id !== "cses")
    .map((g) => ({ id: g.id, title: g.title, short: GROUP_SHORT[g.id] ?? g.title, patterns: g.patterns.map(toPat) }));
  const sources = groups
    .filter((g) => g.id === "cses")
    .flatMap((g) => g.patterns.map((p) => ({ id: p.id, title: p.name, solved: progress[p.id]?.solved ?? 0, total: progress[p.id]?.total ?? 0 })));
  return <GroupsView groups={data} sources={sources} />;
}

// ---------------------------------------------------------------- Recall

function RecallSection({ mastery, today }: { mastery: Record<string, Mastery>; today: string }) {
  const cards: RecallCard[] = [];
  for (const c of CLUES) {
    const ref = pointRef(c.points[0] ?? "");
    if (!THINK_PATTERNS[ref.pattern]) continue;
    cards.push({
      id: `clue:${c.id}`,
      cue: c.phrase,
      source: "clue",
      answer: labelFor(ref, THINK_PATTERNS),
      idea: c.why,
      node: ref.variation ? `${ref.pattern}/${ref.variation}` : ref.pattern,
      state: mastery[ref.pattern]?.state ?? "untracked",
    });
  }
  for (const p of Object.values(THINK_PATTERNS)) {
    cards.push({ id: `pat:${p.id}`, cue: p.when, source: "pattern", answer: p.label, idea: p.key, node: p.id, state: mastery[p.id]?.state ?? "untracked" });
  }
  // Stable for the day, different tomorrow; no randomness at render time.
  const seed = today;
  cards.sort((a, b) => seededRandom(`${seed}:${a.id}`) - seededRandom(`${seed}:${b.id}`));
  return <RecallView cards={cards} />;
}
