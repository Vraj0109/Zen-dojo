// What each roadmap week points you at, so tasks on the Today page can link straight to the work.
// Derived from the week-by-week table in plan.ts; ids refer to DSA patterns (dsa.ts) and to
// study concepts / exercises (study.ts). Weeks with no specific patterns use a DSA filter instead.

export interface WeekFocus {
  /** DSA pattern ids for the week */
  patterns: string[];
  /** Query string for /dsa when the week isn't about specific patterns (e.g. mixed hards) */
  dsaFilter?: string;
  /** System design concepts (sd-*) and designs (sdd-*) */
  sd: string[];
  /** LLD topics (lld-*) and problems (lldp-*) */
  lld: string[];
}

export const WEEK_FOCUS: WeekFocus[] = [
  /* 1 */ { patterns: [], dsaFilter: "difficulty=medium&status=unsolved", sd: ["sdd-url-shortener"], lld: [] },
  /* 2 */ { patterns: ["hash-map", "prefix-sums", "two-pointers", "sliding-window"], sd: ["sd-networking", "sd-apis", "sd-estimation"], lld: [] },
  /* 3 */ { patterns: ["bs-index", "bs-answer", "intervals", "heap-top-k"], sd: ["sd-scalability", "sd-availability", "sd-consistency", "sd-cap"], lld: [] },
  /* 4 */ { patterns: ["monotonic-stack", "fast-slow", "list-reversal", "trie"], sd: ["sd-sql", "sd-replication"], lld: [] },
  /* 5 */ { patterns: ["tree-dfs", "tree-bfs", "bst", "tree-dp"], sd: ["sd-nosql", "sd-sharding", "sd-lsm"], lld: ["lld-oop", "lld-solid", "lld-patterns"] },
  /* 6 */ { patterns: ["graph-bfs", "graph-dfs", "topo-sort", "union-find"], sd: ["sd-caching", "sd-queues"], lld: ["lldp-parking-lot", "lldp-elevator"] },
  /* 7 */ {
    patterns: ["dijkstra", "mst", "tarjan", "eulerian"],
    sd: ["sd-rate-limit", "sd-ids", "sd-observability", "sdd-url-shortener", "sdd-rate-limiter"],
    lld: [],
  },
  /* 8 */ { patterns: ["dp-1d", "knapsack", "lis", "grid-dp"], sd: ["sdd-kv-store", "sdd-notifications"], lld: ["lldp-lru-rate-limiter", "lldp-splitwise", "lld-concurrency"] },
  /* 9 */ { patterns: ["two-string-dp", "interval-dp", "state-machine-dp"], sd: ["sdd-news-feed", "sdd-chat"], lld: [] },
  /* 10 */ { patterns: ["bitmask-dp-assign", "digit-dp", "tree-dp-2", "subsets", "constraint-backtracking"], sd: ["sdd-video", "sdd-file-sync"], lld: [] },
  /* 11 */ { patterns: ["greedy-proof", "exchange-argument", "number-theory", "bit-tricks"], sd: ["sdd-ride-sharing", "sdd-typeahead"], lld: [] },
  /* 12 */ { patterns: ["segment-tree", "ordered-set"], sd: ["sdd-crawler", "sdd-job-scheduler"], lld: [] },
  /* 13 */ { patterns: [], dsaFilter: "difficulty=hard&status=unsolved", sd: ["sdd-payments", "sdd-inventory", "sdd-ticketing"], lld: [] },
  /* 14 */ { patterns: [], dsaFilter: "status=unsolved", sd: ["sdd-metrics", "sdd-kafka", "sdd-collab-editing", "sdd-maps", "sdd-top-k"], lld: [] },
  /* 15 */ { patterns: [], dsaFilter: "status=due", sd: [], lld: [] },
  /* 16 */ { patterns: [], dsaFilter: "status=solved", sd: [], lld: [] },
];

/** Focus for a plan week (clamped to 1..16). */
export function weekFocus(weekNo: number): WeekFocus {
  return WEEK_FOCUS[Math.min(Math.max(weekNo, 1), WEEK_FOCUS.length) - 1];
}

/** URL of a study item (concept or exercise) by id. */
export function studyHref(area: string, id: string) {
  return `/study/${area}/${encodeURIComponent(id)}`;
}
