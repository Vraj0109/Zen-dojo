// Quick revise: the last-days plan, numbers worth memorizing, and the quiz deck.
// Pure data and helpers; the page combines them with your progress.

import { daysBetween } from "./dates";
import { LESSON_EXTRA, LESSONS, WALKTHROUGH_EXTRA } from "./learn";
import { ALL_CONCEPTS, ALL_EXERCISES, type StudyAreaId } from "./study";

/** Days from today until the interview (0 = today, negative = past). */
export function daysUntil(today: string, interview: string): number {
  return daysBetween(today, interview);
}

export interface PlanPhase {
  id: string;
  title: string;
  /** Applies when days left is within [from, to] */
  from: number;
  to: number;
  items: string[];
}

/** What to do in the final stretch. Uses your weak spots (see the Plan tab) for the specifics. */
export const LAST_DAYS_PLAN: PlanPhase[] = [
  {
    id: "week",
    title: "7 to 4 days before",
    from: 4,
    to: 7,
    items: [
      "One timed mock per day: 2 mediums in 45 minutes, talking out loud.",
      "Re-solve your stuck list cold; anything that fails again goes on tomorrow's list.",
      "One full system design aloud per day from the weakest designs, with a diagram.",
      "Read every 'Remember' box in Quick revise once; mark concepts below Solid and reread their lessons.",
      "Prepare 6-8 behavioural stories (STAR) mapped to the company's principles.",
    ],
  },
  {
    id: "final",
    title: "3 to 2 days before",
    from: 2,
    to: 3,
    items: [
      "Switch from learning to recall: Quiz mode, 20 questions a day, answer before revealing.",
      "Type out the templates you'd hate to forget (binary search on answer, Dijkstra, DSU, topo sort, LRU) from memory.",
      "Skim your diagrams gallery and design notes.",
      "One LLD problem end to end in 45 minutes: classes, core flow, one concurrency point.",
      "No new topics. Sleep normally.",
    ],
  },
  {
    id: "eve",
    title: "The day before",
    from: 1,
    to: 1,
    items: [
      "Light only: Numbers & frameworks tab, DSA recap lines, 2 easy problems to warm up.",
      "Reread your behavioural stories once.",
      "Check logistics: links, time zone, ID, quiet room, charger, water, pen and paper.",
      "Stop by the evening. Sleep matters more than one more topic.",
    ],
  },
  {
    id: "day",
    title: "Interview day",
    from: 0,
    to: 0,
    items: [
      "Warm up with one easy problem you've solved before (confidence, not learning).",
      "In each round: clarify, state brute force, improve, code, test with an example and edge cases.",
      "Design rounds: requirements and numbers first, then the 45-minute framework; drive the conversation.",
      "Between rounds, let the last one go.",
    ],
  },
];

/** The phase for a number of days left, or null if the interview is further out or past. */
export function currentPhase(daysLeft: number): PlanPhase | null {
  return LAST_DAYS_PLAN.find((p) => daysLeft >= p.from && daysLeft <= p.to) ?? null;
}

export const KEY_NUMBERS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Latency",
    rows: [
      ["L1 cache / main memory", "~1 ns / ~100 ns"],
      ["Read 1 MB from memory", "~10 µs"],
      ["SSD random read", "~100 µs"],
      ["Round trip in a data center", "~0.5 ms"],
      ["Read 1 MB from SSD", "~1 ms"],
      ["HDD seek", "~10 ms"],
      ["Cross-continent round trip", "~100-150 ms"],
    ],
  },
  {
    title: "Conversions",
    rows: [
      ["Seconds in a day", "86,400 ≈ 10⁵"],
      ["1M requests/day", "≈ 12 QPS"],
      ["100M requests/day", "≈ 1,200 QPS"],
      ["1 KB × 1 billion", "1 TB"],
      ["1 MB × 1 million", "1 TB"],
      ["2¹⁰ / 2²⁰ / 2³⁰ / 2⁴⁰", "≈ 10³ / 10⁶ / 10⁹ / 10¹²"],
      ["Peak vs average", "2-10×"],
    ],
  },
  {
    title: "Capacity rules of thumb",
    rows: [
      ["One app server", "~10k-50k simple req/s"],
      ["One Postgres/MySQL primary", "~5-10k writes/s"],
      ["One Redis node", "~100k ops/s, tens of GB"],
      ["One Kafka broker", "hundreds of MB/s"],
      ["1 Gbps network", "~125 MB/s"],
      ["Availability 99.9% / 99.99%", "8.8 h / 52 min down per year"],
    ],
  },
];

export const COMPLEXITY_TABLE: [string, string][] = [
  ["Hash map get/put", "O(1) average"],
  ["Balanced BST / std::map / TreeMap", "O(log n) insert, find, erase, lower_bound"],
  ["Heap push/pop, top", "O(log n), O(1)"],
  ["Sort", "O(n log n)"],
  ["Binary search", "O(log n)"],
  ["BFS / DFS", "O(V + E)"],
  ["Dijkstra (binary heap)", "O((V + E) log V)"],
  ["Union-Find", "≈ O(1) amortized"],
  ["Segment tree / Fenwick", "O(log n) per query/update"],
  ["Subsets / permutations", "O(2ⁿ · n) / O(n! · n)"],
  ["n ≤ 20 → 2ⁿ; n ≤ 500 → n³; n ≤ 5000 → n²; n ≤ 10⁶ → n log n", "what constraints allow"],
];

export interface QuizCard {
  /** Stable index into QUIZ_DECK */
  n: number;
  area: StudyAreaId;
  /** Concept or exercise id to link to */
  itemId: string;
  itemTitle: string;
  question: string;
  /** A written answer (design follow-ups) */
  answer?: string;
  /** Key points to compare with (concept recap) */
  points: string[];
}

/** Every interview question from the lessons plus every design follow-up, in a fixed order. */
export const QUIZ_DECK: QuizCard[] = [
  ...Object.entries(LESSONS).flatMap(([id, lesson]) =>
    lesson.questions.map((question) => ({
      area: ALL_CONCEPTS[id].area,
      itemId: id,
      itemTitle: ALL_CONCEPTS[id].title,
      question,
      points: LESSON_EXTRA[id]?.recap ?? [],
    })),
  ),
  ...Object.entries(WALKTHROUGH_EXTRA).flatMap(([id, x]) =>
    x.followUps.map((f) => ({
      area: ALL_EXERCISES[id].area,
      itemId: id,
      itemTitle: ALL_EXERCISES[id].title,
      question: f.q,
      answer: f.a,
      points: x.recap,
    })),
  ),
].map((c, n) => ({ ...c, n }));

/** Cards for an area ("all" for every area), optionally only those about the given item ids. */
export function quizCards(area: StudyAreaId | "all", onlyItems?: Set<string>): QuizCard[] {
  return QUIZ_DECK.filter((c) => (area === "all" || c.area === area) && (!onlyItems || onlyItems.has(c.itemId)));
}

/** Pick a card from `cards`, avoiding `previous` when there's a choice. `random` in [0, 1). */
export function pickCard(cards: QuizCard[], random: number, previous?: number): QuizCard | null {
  if (cards.length === 0) return null;
  const pool = cards.length > 1 && previous !== undefined ? cards.filter((c) => c.n !== previous) : cards;
  return pool[Math.min(pool.length - 1, Math.floor(random * pool.length))];
}

/** Deterministic number in [0, 1) from a string (FNV-1a), so the quiz shuffles per day without Math.random. */
export function seededRandom(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}
