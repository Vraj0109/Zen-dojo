// Render tests for the Pattern map (plan 0091). The views are rendered to static HTML (no browser, no database): the
// server-rendered markup is what people see without JS, so it must already hold the constraints, every signal, the
// tree and the reading routine. Named .test.ts (not .tsx) because the repo's vitest include only matches .test.ts.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CLUES,
  CONSTRAINT_HINTS,
  LEETCODE_TAGS,
  OPTIMIZE_MOVES,
  PROBLEMS,
  READING_ROUTINE,
  THINK_PATTERNS,
  THINK_SIGNALS,
  WORKED_EXAMPLES,
  type Clue,
  type OptimizeMove,
  type Problem,
  type ReadStep,
  type ThinkPattern,
  type WorkedExample,
} from "@habit/shared";
import { ClueDictionary } from "./clue-dictionary";
import { GroupsView, type GroupData } from "./groups-view";
import {
  masteryForThink,
  masteryState,
  nodeHref,
  parseNode,
  parseView,
  pointRef,
  problemLink,
  progressByPattern,
  thinkPatternData,
} from "./lib";
import { ReadView } from "./read-view";
import { RecallView, type RecallCard } from "./recall-view";
import { ThinkMap } from "./think-map";
import { ThinkView } from "./think-view";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const text = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, " ");

// ---- small fixture so the assertions hold whatever the real content holds

const fixturePattern: ThinkPattern = {
  id: "sliding-window",
  label: "Sliding window",
  when: "Longest or shortest part with a rule",
  key: "Two indices only move forward.",
  watch: ["Negative numbers break the shrink step."],
  template: { lang: "python", code: "l = 0\nfor r in range(n):\n    pass", complexity: "O(n) time" },
  variations: [
    { id: "fixed", label: "Fixed size k", when: "Window length is given", key: "Add one, drop one.", examples: ["lc-3", "slug:minimum-window-substring"] },
    { id: "longest", label: "Longest valid window", when: "At most K distinct", key: "Expand, then shrink while invalid." },
  ],
  features: {},
  tags: ["Sliding Window"],
  appPattern: "sliding-window",
};
const fixtureLeaf: ThinkPattern = { ...fixturePattern, id: "kadane", label: "Kadane", variations: [], appPattern: "kadane" };
const fixtureSignals = [
  { id: "contiguous", label: "Best contiguous part", when: "Subarray or substring with a rule", patterns: ["sliding-window", "kadane"] },
  { id: "pairs", label: "Pairs in sorted data", when: "Two items that match", patterns: ["kadane"] },
];
const fixturePatterns = Object.fromEntries([fixturePattern, fixtureLeaf].map((p) => [p.id, thinkPatternData(p, {})]));

const fixtureClues: Clue[] = [
  { id: "c1", kind: "wording", phrase: "longest substring with at most k distinct", points: ["sliding-window/longest"], why: "A rule on a contiguous part.", falseFriend: "Subsequence is not contiguous." },
  { id: "c2", kind: "constraint", phrase: "n up to 10^5", points: ["kadane"], why: "Needs O(n log n) or better." },
];
const fixtureRoutine: ReadStep[] = [{ id: "r1", title: "Read the constraints", body: "Turn n into a budget.", ask: ["How big is n?"] }];
const fixtureExamples: WorkedExample[] = [
  { id: "e1", title: "Longest quiet stretch", statement: "Find the longest run with at most two kinds of fruit.", clues: ["c1"], steps: ["Spot the rule.", "Expand right."], brute: "Check every start and end: O(n^2).", pattern: "sliding-window", variation: "longest", trap: "Forgetting to shrink.", problem: "slug:fruit-into-baskets" },
];
const fixtureMoves: OptimizeMove[] = [{ waste: "Recomputes a range sum", fix: "Store running totals", pattern: "sliding-window" }];

describe("helpers", () => {
  it("parses views and nodes", () => {
    expect(parseView(undefined)).toBe("think");
    expect(parseView("read")).toBe("read");
    expect(parseView("find")).toBe("think");
    expect(parseNode("a/b")).toEqual({ pattern: "a", variation: "b" });
    expect(parseNode("a")).toEqual({ pattern: "a" });
    expect(parseNode(undefined)).toBeNull();
    expect(pointRef("x/y")).toEqual({ pattern: "x", variation: "y" });
    expect(nodeHref({ pattern: "a", variation: "b" })).toBe("/revise?tab=map&view=think&node=a%2Fb");
  });

  it("works out mastery: solid, shaky, not started", () => {
    expect(masteryState(0, 4)).toBe("none");
    expect(masteryState(2, 4)).toBe("shaky");
    expect(masteryState(4, 4)).toBe("solid");
    expect(masteryState(4, 4, true)).toBe("shaky");
    expect(masteryState(0, 0)).toBe("untracked");
    const prog = progressByPattern([
      { id: "a", items: [{ status: { state: "solved", resolveDue: false } }, { status: { state: "resolved" } }] },
      { id: "b", items: [{ status: { state: "solved", resolveDue: true } }] },
      { id: "c", items: [{ status: { state: "unsolved" } }] },
    ]);
    expect(prog.a.state).toBe("solid");
    expect(prog.b.state).toBe("shaky");
    expect(prog.c.state).toBe("none");
    const think = masteryForThink({ [fixturePattern.id]: fixturePattern }, { "sliding-window": prog.a });
    expect(think["sliding-window"].state).toBe("solid");
  });

  it("links problems inside the app or to LeetCode", () => {
    expect(problemLink("slug:two-sum", {})).toMatchObject({ href: "https://leetcode.com/problems/two-sum/", external: true, label: "Two Sum" });
    expect(problemLink("lc-3", {}).external).toBe(false);
    expect(problemLink("lc-3", { "lc-3": { title: "Longest Substring" } as Problem }).label).toBe("Longest Substring");
  });
});

describe("thinking map", () => {
  it("server-renders every signal as a branch, the patterns inside and the selected card", () => {
    const out = html(createElement(ThinkMap, { signals: fixtureSignals, patterns: fixturePatterns, mastery: { "sliding-window": { state: "shaky", solved: 1, total: 4 } }, initialNode: { pattern: "sliding-window", variation: "fixed" } }));
    const t = text(out);
    for (const s of fixtureSignals) expect(t).toContain(s.label);
    expect(out).toContain("<details");
    expect(out).toContain("New problem");
    expect(t).toContain("Sliding window");
    // the card for the node in the URL: a variation of the pattern, with its examples
    expect(t).toContain("A variation of Sliding window");
    expect(t).toContain("Add one, drop one.");
    expect(t).toContain("Minimum Window Substring");
    expect(out).toContain('href="/dsa/pattern/sliding-window?tab=practice"');
    // leaves are plain links, so they work without JS
    expect(out).toContain('href="/revise?tab=map&amp;view=think&amp;node=sliding-window%2Flongest"');
  });

  it("shows the pattern's template and watch-outs when a pattern is selected", () => {
    const out = html(createElement(ThinkMap, { signals: fixtureSignals, patterns: fixturePatterns, mastery: {}, initialNode: { pattern: "sliding-window" } }));
    const t = text(out);
    expect(t).toContain("Watch out for");
    expect(t).toContain("Negative numbers break the shrink step.");
    expect(t).toContain("O(n) time");
    expect(out).toContain("for r in range(n):");
  });

  it("opens the branch of the node in the URL and falls back for an unknown node", () => {
    const out = html(createElement(ThinkMap, { signals: fixtureSignals, patterns: fixturePatterns, mastery: {}, initialNode: { pattern: "kadane" } }));
    expect(out).toMatch(/<details class="pm-grp" open="">/);
    expect(() => html(createElement(ThinkMap, { signals: fixtureSignals, patterns: fixturePatterns, mastery: {}, initialNode: { pattern: "nope" } }))).not.toThrow();
  });

  it("renders without content (agent A may not have filled the data yet)", () => {
    expect(text(html(createElement(ThinkMap, { signals: [], patterns: {}, mastery: {}, initialNode: null })))).toContain("no content yet");
  });

  it("renders the real signals", () => {
    const patterns = Object.fromEntries(Object.values(THINK_PATTERNS).map((p) => [p.id, thinkPatternData(p, PROBLEMS)]));
    const out = html(createElement(ThinkMap, { signals: THINK_SIGNALS, patterns, mastery: {}, initialNode: null }));
    const t = text(out);
    for (const s of THINK_SIGNALS) expect(t).toContain(text(html(createElement("i", null, s.label))).trim());
  });
});

describe("how to read a problem", () => {
  it("renders the routine, clues, worked examples (answer behind details) and moves from fixtures", () => {
    const out = html(createElement(ReadView, { routine: fixtureRoutine, clues: fixtureClues, examples: fixtureExamples, moves: fixtureMoves, patterns: { "sliding-window": fixturePattern, kadane: fixtureLeaf }, problems: {} }));
    const t = text(out);
    expect(t).toContain("Read the constraints");
    expect(t).toContain("How big is n?");
    expect(t).toContain("longest substring with at most k distinct");
    expect(t).toContain("False friend.");
    // a clue links to its pattern in the thinking map
    expect(out).toContain("node=sliding-window%2Flongest");
    expect(t).toContain("Show the reasoning");
    expect(out).toMatch(/<details[^>]*>\s*<summary[^>]*>[\s\S]*Show the reasoning/);
    expect(out).not.toMatch(/<details[^>]*open/);
    expect(t).toContain("Brute force");
    expect(t).toContain("The trap.");
    expect(out).toContain("https://leetcode.com/problems/fruit-into-baskets/");
    expect(out).toContain('class="pm-moves"');
    expect(t).toContain("Recomputes a range sum");
  });

  it("renders the real routine, clues, examples and moves", () => {
    const out = html(createElement(ReadView, { routine: READING_ROUTINE, clues: CLUES, examples: WORKED_EXAMPLES, moves: OPTIMIZE_MOVES, patterns: THINK_PATTERNS, problems: PROBLEMS }));
    const t = text(out);
    for (const s of READING_ROUTINE) expect(t).toContain(text(s.title).trim());
    expect(out).toContain('id="routine"');
    expect(out).toContain('id="moves"');
  });

  it("clue dictionary shows every clue when JS has not filtered yet", () => {
    const data = fixtureClues.map((c) => ({ id: c.id, kind: c.kind, phrase: c.phrase, why: c.why, falseFriend: c.falseFriend, points: [{ label: "Sliding window", href: nodeHref(pointRef(c.points[0])) }] }));
    const t = text(html(createElement(ClueDictionary, { clues: data })));
    expect(t).toContain("2 of 2 clues");
    expect(t).toContain("Constraint clues");
    expect(t).toContain("Wording clues");
  });
});

describe("pattern groups and recall", () => {
  const groups: GroupData[] = [
    { id: "arrays", title: "Arrays, strings, hashing", short: "Arrays and strings", patterns: [{ id: "hash-map", name: "Hash map / counting", recognize: "Pairs, duplicates", solved: 2, total: 4, state: "shaky", thinkId: "hash-map", idea: "Remember what you have seen." }] },
  ];

  it("renders the mind map, the detail card and the narrow list", () => {
    const out = html(createElement(GroupsView, { groups, sources: [{ id: "cses-intro", title: "CSES: introductory problems", solved: 1, total: 10 }] }));
    const t = text(out);
    expect(out).toContain("<svg");
    expect(t).toContain("Arrays and strings");
    expect(t).toContain("Hash map / counting");
    expect(t).toContain("Spot it when");
    expect(t).toContain("Practice sources");
    expect(out).toContain('href="/dsa/pattern/hash-map"');
  });

  it("renders the first recall card with a Show button", () => {
    const cards: RecallCard[] = [{ id: "clue:c1", cue: "longest substring with at most k distinct", source: "clue", answer: "Sliding window", idea: "Contiguous rule.", node: "sliding-window", state: "none" }];
    const t = text(html(createElement(RecallView, { cards })));
    expect(t).toContain("Card 1 of 1");
    expect(t).toContain("longest substring with at most k distinct");
    expect(t).toContain("Show the pattern");
    expect(t).not.toContain("Contiguous rule.");
    expect(t).toContain("nothing is saved");
  });
});

describe("thinking map view with the real data", () => {
  // The content the page reads from the database, here taken from the old constants.
  const realThink = { hints: CONSTRAINT_HINTS, signals: THINK_SIGNALS, patterns: THINK_PATTERNS, tags: LEETCODE_TAGS, problems: PROBLEMS };

  it("renders the constraints strip and every signal", () => {
    const out = html(createElement(ThinkView, { mastery: {}, ...realThink }));
    const t = text(out);
    expect(t).toContain("Step 1");
    if (THINK_SIGNALS.length > 0) expect(t).toContain("Step 2");
    for (const c of CONSTRAINT_HINTS) expect(t).toContain(text(html(createElement("i", null, c.n))).trim());
    for (const s of THINK_SIGNALS) expect(t).toContain(text(html(createElement("i", null, s.label))).trim());
  });

  it("opens the node from ?node= (a clue links here)", () => {
    const first = THINK_SIGNALS[0]?.patterns[0];
    if (!first) return;
    const out = html(createElement(ThinkView, { mastery: {}, node: first, ...realThink }));
    expect(out).toContain(`aria-current="true"`);
  });
});
