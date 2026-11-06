// The 16-week SDE2 (Amazon) / SWE3 (Google) roadmap, from the week-by-week table in the PDF.
// The PDF table extracts with merged columns, so double-check wording against the PDF.

export type Category = "dsa" | "sd" | "beh_lld" | "mock_app" | "other";

export const CATEGORIES: Record<Category, { label: string; target: number }> = {
  dsa: { label: "DSA", target: 0.4 },
  sd: { label: "System design", target: 0.35 },
  beh_lld: { label: "Behavioral + LLD", target: 0.15 },
  mock_app: { label: "Mocks + applications", target: 0.1 },
  other: { label: "Other", target: 0 },
};

export interface PlanWeek {
  week: number;
  dsa: string;
  sd: string;
  other: string;
}

export const PLAN_WEEKS: PlanWeek[] = [
  { week: 1, dsa: "Diagnostic: 10 mixed mediums, tag weak patterns", sd: "Diagnostic: design a URL shortener cold, note gaps", other: "Resume rewrite with metrics; list 10 story candidates" },
  { week: 2, dsa: "Arrays, hashing, prefix sums, two pointers, sliding window", sd: "Fundamentals: networking, APIs, estimation", other: "Draft first 4 STAR stories" },
  { week: 3, dsa: "Binary search (index + answer), intervals, heaps", sd: "Fundamentals: scalability, availability, consistency, CAP", other: "Resume sent to referrals" },
  { week: 4, dsa: "Stacks (monotonic), linked lists, tries", sd: "Data: SQL internals, indexes, isolation, replication", other: "Finish 8 stories" },
  { week: 5, dsa: "Trees: DFS, BFS, BST, tree DP", sd: "Data: NoSQL, sharding, consistent hashing, LSM vs B-tree", other: "LLD: SOLID + patterns" },
  { week: 6, dsa: "Graphs: BFS/DFS, topo sort, union-find", sd: "Building blocks: caching, queues, Kafka", other: "LLD: parking lot, elevator" },
  { week: 7, dsa: "Graphs: Dijkstra, MST, bridges, Eulerian", sd: "Building blocks: rate limiting, ID gen, observability. Designs 1-2: URL shortener, rate limiter", other: "Start Project 4" },
  { week: 8, dsa: "DP I: 1D, knapsack, LIS, grids", sd: "Designs 3-4: KV store, notification service", other: "LLD: LRU, Splitwise, concurrency basics" },
  { week: 9, dsa: "DP II: two-string, interval, state machine", sd: "Designs 5-6: news feed, chat", other: "Project 4 core working" },
  { week: 10, dsa: "DP III: bitmask, digit, tree DP; backtracking", sd: "Designs 7-8: video streaming, Dropbox", other: "Behavioral mock with a friend" },
  { week: 11, dsa: "Greedy, math, bit tricks", sd: "Designs 9-10: Uber, typeahead", other: "Start Project 2/3" },
  { week: 12, dsa: "Advanced: segment tree, Fenwick, ordered set", sd: "Designs 11-12: crawler, job scheduler", other: "Story refinement, LP mapping" },
  { week: 13, dsa: "Mixed hards, timed", sd: "Designs 13-15: payments, inventory/e-commerce, ticket booking", other: "Project 2/3 finished with README + numbers" },
  { week: 14, dsa: "Company-tagged sets (Amazon, Google)", sd: "Designs 16-20, then random prompts", other: "2 coding mocks, 1 design mock" },
  { week: 15, dsa: "Re-solve failed list; speed rounds", sd: "2 mock designs; review papers and blogs", other: "3 mocks total, behavioral mock" },
  { week: 16, dsa: "Light review, no new topics", sd: "Skim notes and your own diagrams", other: "Sleep, logistics, interview" },
];

export const TOTAL_WEEKS = PLAN_WEEKS.length;

export interface TaskTemplate {
  key: string;
  scope: "day" | "week";
  category: Category;
  xp: number;
  minutes?: number;
  title: (w: PlanWeek) => string;
}

// Weekday template from the roadmap's "Daily schedule".
export const WEEKDAY_TEMPLATE: TaskTemplate[] = [
  { key: "dsa-warmup", scope: "day", category: "dsa", xp: 10, minutes: 30, title: (w) => `DSA warm-up: 1 medium or a re-solve (${w.dsa})` },
  { key: "deep-block", scope: "day", category: "sd", xp: 30, minutes: 75, title: (w) => `Deep block: ${w.sd}` },
  { key: "behavioral", scope: "day", category: "beh_lld", xp: 10, minutes: 15, title: () => "Polish a STAR story or write a 1-page learning note" },
];

// Weekend template.
export const WEEKEND_TEMPLATE: TaskTemplate[] = [
  { key: "timed-set", scope: "day", category: "dsa", xp: 50, minutes: 120, title: () => "Boss fight: 2 problems in a timed 2-hour block" },
  { key: "design-session", scope: "day", category: "sd", xp: 30, minutes: 150, title: (w) => `Design practice or project session: ${w.sd}` },
  { key: "review", scope: "day", category: "other", xp: 10, minutes: 60, title: () => "Review: re-read notes and failed problems" },
];

// Weekly goals: one per column of the week table.
export const WEEK_TEMPLATE: TaskTemplate[] = [
  { key: "week-dsa", scope: "week", category: "dsa", xp: 40, title: (w) => `DSA focus: ${w.dsa}` },
  { key: "week-sd", scope: "week", category: "sd", xp: 40, title: (w) => `System design focus: ${w.sd}` },
  { key: "week-other", scope: "week", category: "beh_lld", xp: 40, title: (w) => w.other },
];
