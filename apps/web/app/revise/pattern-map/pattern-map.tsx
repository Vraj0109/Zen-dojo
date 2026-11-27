import { Suspense } from "react";
import { seededRandom, type Clue, type ConstraintHint, type OptimizeMove, type Problem, type ReadStep, type ThinkPattern, type ThinkSignal, type WorkedExample } from "@habit/shared";
import { connection } from "next/server";
import { getDsaView } from "@/lib/dsa";
import { getRoadmapProblems } from "@/lib/content-repo/lookups";
import { docValue } from "@/lib/revise";
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
 * getDsaView(); the content (thinking map, clues, reading routine, examples) comes from the content database.
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

export async function PatternMapTab({ view: rawView, node }: { view?: string; node?: string }) {
  const view = parseView(rawView);
  const read = view === "read" ? await loadContent() : null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Tabs tabs={MAP_VIEWS} active={view} hrefFor={(id) => `/revise?tab=map&view=${id}`} label="Pattern map views" />
        {(view === "think" || view === "groups") && <MasteryLegend />}
      </div>
      <p className="max-w-[70ch] text-sm text-muted">{INTRO[view]}</p>
      {view === "read" ? (
        read && (
          <ReadView
            routine={read.routine}
            clues={read.clues}
            examples={read.examples}
            moves={read.moves}
            patterns={read.patterns}
            problems={read.problems}
          />
        )
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

/** The pattern map's content from the database (cached reads; no user data). */
async function loadContent(): Promise<{
  patterns: Record<string, ThinkPattern>;
  signals: ThinkSignal[];
  hints: ConstraintHint[];
  tags: string[];
  clues: Clue[];
  routine: ReadStep[];
  examples: WorkedExample[];
  moves: OptimizeMove[];
  problems: Record<string, Problem>;
}> {
  const [patterns, signals, hints, tags, clues, routine, examples, moves, problems] = await Promise.all([
    docValue<Record<string, ThinkPattern>>("think-patterns", {}),
    docValue<ThinkSignal[]>("think-signals", []),
    docValue<ConstraintHint[]>("constraint-hints", []),
    docValue<string[]>("leetcode-tags", []),
    docValue<Clue[]>("clues", []),
    docValue<ReadStep[]>("reading-routine", []),
    docValue<WorkedExample[]>("worked-examples", []),
    docValue<OptimizeMove[]>("optimize-moves", []),
    getRoadmapProblems(),
  ]);
  return { patterns, signals, hints, tags, clues, routine, examples, moves, problems };
}

async function MapWithProgress({ view, node }: { view: Exclude<MapView, "read">; node?: string }) {
  await connection();
  const dsa = await getDsaView();
  const allPatterns: (ProgressPattern & { name: string; recognize: string; group: string })[] = dsa.groups.flatMap((g) =>
    g.patterns.map((p) => ({ id: p.id, items: p.items, name: p.name, recognize: p.recognize, group: g.id })),
  );
  const progress = progressByPattern(allPatterns);
  const content = await loadContent();
  const thinkMastery = masteryForThink(content.patterns, progress);

  if (view === "think") {
    return (
      <ThinkView
        node={node}
        mastery={thinkMastery}
        hints={content.hints}
        signals={content.signals}
        patterns={content.patterns}
        tags={content.tags}
        problems={content.problems}
      />
    );
  }
  if (view === "groups") return <GroupsSection groups={dsa.groups} progress={progress} patterns={content.patterns} />;
  return <RecallSection mastery={thinkMastery} today={dsa.today} clues={content.clues} patterns={content.patterns} />;
}

// ---------------------------------------------------------------- Pattern groups

function GroupsSection({
  groups,
  progress,
  patterns,
}: {
  groups: Awaited<ReturnType<typeof getDsaView>>["groups"];
  progress: Record<string, Mastery>;
  patterns: Record<string, ThinkPattern>;
}) {
  // DSA pattern id -> the thinking-map pattern that stands for it (and that pattern's key idea).
  const think = new Map<string, { id: string; key: string }>();
  for (const p of Object.values(patterns)) {
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

function RecallSection({
  mastery,
  today,
  clues,
  patterns,
}: {
  mastery: Record<string, Mastery>;
  today: string;
  clues: Clue[];
  patterns: Record<string, ThinkPattern>;
}) {
  const cards: RecallCard[] = [];
  for (const c of clues) {
    const ref = pointRef(c.points[0] ?? "");
    if (!patterns[ref.pattern]) continue;
    cards.push({
      id: `clue:${c.id}`,
      cue: c.phrase,
      source: "clue",
      answer: labelFor(ref, patterns),
      idea: c.why,
      node: ref.variation ? `${ref.pattern}/${ref.variation}` : ref.pattern,
      state: mastery[ref.pattern]?.state ?? "untracked",
    });
  }
  for (const p of Object.values(patterns)) {
    cards.push({ id: `pat:${p.id}`, cue: p.when, source: "pattern", answer: p.label, idea: p.key, node: p.id, state: mastery[p.id]?.state ?? "untracked" });
  }
  // Stable for the day, different tomorrow; no randomness at render time.
  const seed = today;
  cards.sort((a, b) => seededRandom(`${seed}:${a.id}`) - seededRandom(`${seed}:${b.id}`));
  return <RecallView cards={cards} />;
}
