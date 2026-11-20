import { describe, expect, it } from "vitest";
import { ALL_PATTERNS, DSA_GROUPS, PROBLEMS } from "./dsa";
import {
  CLUES,
  CONSTRAINT_HINTS,
  LEETCODE_TAGS,
  OPTIMIZE_MOVES,
  READING_ROUTINE,
  THINK_PATTERNS,
  THINK_SIGNALS,
  WORKED_EXAMPLES,
} from "./thinking-map";

const patterns = Object.values(THINK_PATTERNS);

/** "pattern" or "pattern/variation" must resolve to real ids. */
function resolves(ref: string): boolean {
  const [pid, vid, ...rest] = ref.split("/");
  if (rest.length) return false;
  const p = THINK_PATTERNS[pid];
  if (!p) return false;
  return vid === undefined || p.variations.some((v) => v.id === vid);
}

/** Every string in the exported data, for text checks. */
function allText(): string[] {
  const out: string[] = [];
  const walk = (x: unknown) => {
    if (typeof x === "string") out.push(x);
    else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") Object.values(x).forEach(walk);
  };
  walk([CONSTRAINT_HINTS, THINK_SIGNALS, THINK_PATTERNS, LEETCODE_TAGS, READING_ROUTINE, CLUES, WORKED_EXAMPLES, OPTIMIZE_MOVES]);
  return out;
}

describe("thinking map: coverage", () => {
  it("every DSA pattern id (except the cses-* source buckets) has a think node", () => {
    const known = new Set<string>();
    for (const p of patterns) {
      known.add(p.id);
      if (p.appPattern) known.add(p.appPattern);
      for (const c of p.covers ?? []) known.add(c);
    }
    const missing = ALL_PATTERNS.map((p) => p.id).filter((id) => !id.startsWith("cses-") && !known.has(id));
    expect(missing).toEqual([]);
  });

  it("appPattern and covers point at real DSA pattern ids", () => {
    const dsaIds = new Set(ALL_PATTERNS.map((p) => p.id));
    for (const p of patterns) {
      if (p.appPattern) expect(dsaIds.has(p.appPattern), `${p.id}.appPattern`).toBe(true);
      for (const c of p.covers ?? []) expect(dsaIds.has(c), `${p.id}.covers ${c}`).toBe(true);
    }
  });

  it("every built-in problem in a pattern group maps to a think node (cses buckets are sources, not patterns)", () => {
    const nodeFor = new Map<string, string>();
    for (const p of patterns) {
      nodeFor.set(p.id, p.id);
      if (p.appPattern) nodeFor.set(p.appPattern, p.id);
      for (const c of p.covers ?? []) nodeFor.set(c, p.id);
    }
    const unmapped: string[] = [];
    for (const group of DSA_GROUPS) {
      for (const pattern of group.patterns) {
        if (pattern.id.startsWith("cses-")) continue;
        if (!nodeFor.has(pattern.id)) unmapped.push(pattern.id);
        for (const pid of pattern.problems) if (!PROBLEMS[pid]) unmapped.push(`${pattern.id}: unknown problem ${pid}`);
      }
    }
    expect(unmapped).toEqual([]);
  });

  it("every LeetCode topic tag is covered by at least one pattern", () => {
    const covered = new Set(patterns.flatMap((p) => p.tags));
    expect(LEETCODE_TAGS.filter((t) => !covered.has(t))).toEqual([]);
  });

  it("pattern tags are official tags", () => {
    const official = new Set(LEETCODE_TAGS);
    for (const p of patterns) for (const t of p.tags) expect(official.has(t), `${p.id}: ${t}`).toBe(true);
  });

  it("the tag list has no duplicates and includes the three non-algorithm tags", () => {
    expect(new Set(LEETCODE_TAGS).size).toBe(LEETCODE_TAGS.length);
    for (const t of ["Database", "Shell", "Concurrency"]) expect(THINK_PATTERNS["not-algorithm"].tags).toContain(t);
  });
});

describe("thinking map: structure", () => {
  it("ids are unique (patterns, variations within a pattern, signals, clues, examples)", () => {
    const dup = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);
    expect(Object.keys(THINK_PATTERNS).length).toBe(patterns.length);
    for (const p of patterns) {
      expect(THINK_PATTERNS[p.id]).toBe(p);
      expect(dup(p.variations.map((v) => v.id)), `variations of ${p.id}`).toEqual([]);
    }
    expect(dup(THINK_SIGNALS.map((s) => s.id))).toEqual([]);
    expect(dup(CLUES.map((c) => c.id))).toEqual([]);
    expect(dup(WORKED_EXAMPLES.map((e) => e.id))).toEqual([]);
    expect(dup(READING_ROUTINE.map((s) => s.id))).toEqual([]);
  });

  it("has the amount of content the plan asks for", () => {
    expect(THINK_SIGNALS.length).toBeGreaterThanOrEqual(12);
    expect(THINK_SIGNALS.length).toBeLessThanOrEqual(16);
    expect(READING_ROUTINE.length).toBeGreaterThanOrEqual(5);
    expect(READING_ROUTINE.length).toBeLessThanOrEqual(6);
    expect(CLUES.length).toBeGreaterThanOrEqual(60);
    expect(WORKED_EXAMPLES.length).toBeGreaterThanOrEqual(20);
    expect(WORKED_EXAMPLES.length).toBeLessThanOrEqual(30);
    expect(OPTIMIZE_MOVES.length).toBeGreaterThanOrEqual(15);
    expect(CONSTRAINT_HINTS.length).toBeGreaterThanOrEqual(8);
    for (const kind of ["constraint", "wording", "input", "output"] as const) {
      expect(CLUES.some((c) => c.kind === kind), kind).toBe(true);
    }
  });

  it("every pattern has text, 2-4 watch-outs and a variations array", () => {
    for (const p of patterns) {
      expect(p.label.length, p.id).toBeGreaterThan(2);
      expect(p.when.length, p.id).toBeGreaterThan(20);
      expect(p.key.length, p.id).toBeGreaterThan(20);
      expect(p.watch.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.watch.length, p.id).toBeLessThanOrEqual(4);
      expect(p.tags.length, p.id).toBeGreaterThan(0);
      for (const v of p.variations) {
        expect(v.label && v.when && v.key, `${p.id}/${v.id}`).toBeTruthy();
      }
    }
  });

  it("patterns with a DSA group entry have 2-6 variations, and a template when they are main patterns", () => {
    for (const p of patterns) {
      if (!p.appPattern) continue;
      expect(p.variations.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.variations.length, p.id).toBeLessThanOrEqual(6);
    }
  });

  it("templates are non-empty Python with a complexity and no tab characters", () => {
    for (const p of patterns) {
      if (!p.template) continue;
      expect(p.template.lang).toBe("python");
      expect(p.template.code.trim().length, p.id).toBeGreaterThan(10);
      expect(p.template.code.includes("\t"), `tab in ${p.id}`).toBe(false);
      expect(p.template.complexity.length, p.id).toBeGreaterThan(3);
    }
  });

  it("most DSA patterns come with a template", () => {
    const withApp = patterns.filter((p) => p.appPattern);
    const withTemplate = withApp.filter((p) => p.template);
    expect(withTemplate.length / withApp.length).toBeGreaterThan(0.9);
  });

  it("every variation example is a real app problem id or a slug: string", () => {
    for (const p of patterns) {
      for (const v of p.variations) {
        for (const e of v.examples ?? []) {
          const ok = PROBLEMS[e] !== undefined || /^slug:[a-z0-9]+(-[a-z0-9]+)*$/.test(e);
          expect(ok, `${p.id}/${v.id}: ${e}`).toBe(true);
        }
      }
    }
  });
});

describe("thinking map: signals", () => {
  it("every signal pattern exists", () => {
    for (const s of THINK_SIGNALS) {
      expect(s.patterns.length, s.id).toBeGreaterThan(0);
      for (const id of s.patterns) expect(THINK_PATTERNS[id], `${s.id}: ${id}`).toBeDefined();
    }
  });

  it("every pattern is in at least one signal", () => {
    const inSignal = new Set(THINK_SIGNALS.flatMap((s) => s.patterns));
    expect(patterns.map((p) => p.id).filter((id) => !inSignal.has(id))).toEqual([]);
  });

  it("has a clearly labelled not-an-algorithm signal", () => {
    const s = THINK_SIGNALS.find((x) => x.id === "not-algorithm");
    expect(s?.label.toLowerCase()).toContain("not an algorithm");
    expect(s?.patterns).toEqual(["not-algorithm"]);
  });
});

describe("thinking map: how to read a problem", () => {
  it("every reading step has a body and 2-4 self-questions", () => {
    for (const s of READING_ROUTINE) {
      expect(s.title.length, s.id).toBeGreaterThan(5);
      expect(s.body.length, s.id).toBeGreaterThan(40);
      expect(s.ask.length, s.id).toBeGreaterThanOrEqual(2);
      expect(s.ask.length, s.id).toBeLessThanOrEqual(4);
    }
  });

  it("every clue points at existing patterns (and variations)", () => {
    for (const c of CLUES) {
      expect(c.points.length, c.id).toBeGreaterThan(0);
      for (const ref of c.points) expect(resolves(ref), `${c.id}: ${ref}`).toBe(true);
      expect(c.phrase.length, c.id).toBeGreaterThan(5);
      expect(c.why.length, c.id).toBeGreaterThan(20);
    }
  });

  it("every pattern is pointed to by at least one clue", () => {
    const pointed = new Set(CLUES.flatMap((c) => c.points.map((r) => r.split("/")[0])));
    expect(patterns.map((p) => p.id).filter((id) => !pointed.has(id))).toEqual([]);
  });

  it("some clues carry a false friend", () => {
    expect(CLUES.filter((c) => c.falseFriend).length).toBeGreaterThanOrEqual(15);
  });

  it("every worked example references real clues, patterns and variations", () => {
    const clueIds = new Set(CLUES.map((c) => c.id));
    for (const e of WORKED_EXAMPLES) {
      expect(e.clues.length, e.id).toBeGreaterThan(0);
      for (const c of e.clues) expect(clueIds.has(c), `${e.id}: clue ${c}`).toBe(true);
      expect(e.steps.length, e.id).toBeGreaterThanOrEqual(3);
      expect(e.steps.length, e.id).toBeLessThanOrEqual(5);
      expect(e.statement.length, e.id).toBeGreaterThan(20);
      expect(e.brute.length, e.id).toBeGreaterThan(20);
      expect(e.trap.length, e.id).toBeGreaterThan(10);
      expect(resolves(e.pattern), `${e.id}: ${e.pattern}`).toBe(true);
      if (e.variation) expect(resolves(`${e.pattern}/${e.variation}`), `${e.id}: variation ${e.variation}`).toBe(true);
      if (e.problem) {
        const ok = PROBLEMS[e.problem] !== undefined || /^slug:[a-z0-9-]+$/.test(e.problem);
        expect(ok, `${e.id}: problem ${e.problem}`).toBe(true);
      }
    }
  });

  it("every signal has at least one worked example", () => {
    for (const s of THINK_SIGNALS) {
      const has = WORKED_EXAMPLES.some((e) => s.patterns.includes(e.pattern));
      expect(has, `no worked example for signal ${s.id}`).toBe(true);
    }
  });

  it("every optimisation move points at an existing pattern (and variation)", () => {
    for (const m of OPTIMIZE_MOVES) {
      expect(m.waste.length).toBeGreaterThan(15);
      expect(m.fix.length).toBeGreaterThan(15);
      expect(resolves(m.pattern), m.pattern).toBe(true);
    }
  });
});

describe("thinking map: text hygiene", () => {
  it("has no emoji or pictographs anywhere", () => {
    const bad = allText().filter((s) => /\p{Extended_Pictographic}/u.test(s));
    expect(bad).toEqual([]);
  });

  it("has no tab characters in any text", () => {
    expect(allText().filter((s) => s.includes("\t"))).toEqual([]);
  });
});
