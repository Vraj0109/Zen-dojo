import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pickBoss, getBossView, saveBossFight } from "./boss";
import { addDiagram, getDiagramImage, getDiagrams, sniffImage } from "./diagrams";
import { getDsaView, markSolved } from "./dsa";
import { filterProblems, parseDsaFilters } from "./dsa-filters";
import { getPatternNotes, savePatternNote } from "./pattern-notes";
import { addCustomReading, getReadingFor, getReadingList, setReadingDone } from "./reading";
import { applySkips, getReviewQueue } from "./review";
import { getStats } from "./stats";
import { clearStruggles, logStruggle, openStruggles } from "./struggles";
import { getConceptDetail, logPractice, rateConcept, saveConcept } from "./study";
import { getTodayView } from "./tasks";
import { focusMinutes, logFocus, patternTimerId } from "./timer";

const setDay = (d: number) => vi.setSystemTime(new Date(2026, 10, d, 12));

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  setDay(7);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("stuck list", () => {
  it("comes back after 3 days and clears on a cold solve", async () => {
    expect(await logStruggle("lc-1", "hint", "forgot the hash map")).toBe(true);
    expect(await logStruggle("lc-1", "nonsense", "")).toBe(false);
    expect(await logStruggle("not-a-problem", "hint", "")).toBe(false);

    let open = (await openStruggles()).get("lc-1")!;
    expect(open).toMatchObject({ kind: "hint", reason: "forgot the hash map", due: false, dueOn: "2026-11-10" });
    expect((await getDsaView()).groups[0].patterns[0].items.find((p) => p.id === "lc-1")!.struggling).toBe(true);

    setDay(10);
    open = (await openStruggles()).get("lc-1")!;
    expect(open.due).toBe(true);
    expect((await getReviewQueue()).map((i) => `${i.kind}:${i.id}`)).toContain("struggle:lc-1");

    await clearStruggles("lc-1");
    expect((await openStruggles()).has("lc-1")).toBe(false);
  });

  it("filters the DSA list to problems on the stuck list", async () => {
    await logStruggle("lc-560", "failed", "");
    const dsa = await getDsaView();
    const res = filterProblems(dsa.groups.flatMap((g) => g.patterns), parseDsaFilters({ status: "stuck" }));
    expect(res.map((r) => r.problem.id)).toEqual(["lc-560"]);
  });
});

describe("review queue", () => {
  it("collects stuck problems, re-solves, shaky concepts and designs due", async () => {
    setDay(1);
    await markSolved("lc-1"); // re-solve due 14 days later
    await saveConcept("sd-caching", { confidence: 2, checked: [], notes: "" });
    await logPractice("sdd-chat", { minutes: 30, scores: { req: 2 }, notes: "", link: "" }); // score 2 → again in 7 days
    await logStruggle("lc-560", "failed", "prefix sum + hashmap");
    expect(await getReviewQueue()).toEqual([]);

    setDay(16);
    const q = await getReviewQueue();
    expect(q.map((i) => `${i.kind}:${i.id}`)).toEqual(["struggle:lc-560", "resolve:lc-1", "concept:sd-caching", "exercise:sdd-chat"]);
    expect(q[0]).toMatchObject({ title: "560. Subarray Sum Equals K", href: "/dsa/lc-560" });
    expect(applySkips(q, ["struggle:lc-560"]).map((i) => i.id)).toEqual(["lc-1", "sd-caching", "sdd-chat", "lc-560"]);

    // Quick rating keeps ticked points and notes, and clears it from the queue once covered
    await saveConcept("sd-caching", { confidence: 2, checked: [0, 2], notes: "TTL jitter" });
    setDay(23);
    await rateConcept("sd-caching", 4);
    expect((await getConceptDetail("sd-caching"))!.progress).toMatchObject({ confidence: 4, checked: [0, 2], notes: "TTL jitter" });
    expect((await getReviewQueue()).some((i) => i.id === "sd-caching")).toBe(false);
  });
});

describe("focus timer", () => {
  it("logs minutes to known items and counts them in hours studied", async () => {
    expect(await logFocus("lc-1", 25)).toBe(true);
    expect(await logFocus("sd-caching", 50.4)).toBe(true);
    expect(await logFocus("sd-caching", 0)).toBe(false);
    expect(await logFocus("unknown", 10)).toBe(false);
    expect(await logFocus("boss", 9999)).toBe(true); // capped at 600
    expect(await focusMinutes("sd-caching")).toBe(50);
    expect((await getStats()).totals.hours).toBe(Math.round(((25 + 50 + 600) / 60) * 10) / 10);
  });

  it("accepts DSA pattern guides, but only real patterns", async () => {
    expect(await logFocus(patternTimerId("sliding-window"), 20)).toBe(true);
    expect(await logFocus(patternTimerId("not-a-pattern"), 20)).toBe(false);
    expect(await focusMinutes(patternTimerId("sliding-window"))).toBe(20);
  });
});

describe("boss fight", () => {
  it("picks one medium and one hard, stable per day and seed", () => {
    const c = (id: string, difficulty: string) => ({ problem: { id, difficulty } });
    const list = [c("a", "medium"), c("b", "hard"), c("c", "medium"), c("d", "hard")];
    const picks = pickBoss(list, "2026-11-07:0");
    expect(picks.map((p) => p.problem.difficulty).sort()).toEqual(["hard", "medium"]);
    expect(pickBoss(list, "2026-11-07:0")).toEqual(picks);
  });

  it("picks unsolved problems from reached patterns and records the result", async () => {
    await getTodayView(); // creates today's tasks (Saturday: includes the timed set)
    const v = await getBossView();
    expect(v.picks).toHaveLength(2);
    for (const p of v.picks) {
      expect(p.problem.status.state).toBe("unsolved");
      expect(["medium", "hard"]).toContain(p.problem.difficulty);
    }
    const [a, b] = v.picks.map((p) => p.problem.id);
    expect(await saveBossFight({ results: [{ problemId: a, result: "solved" }, { problemId: b, result: "failed" }], minutes: 110, notes: "" })).toBe(true);

    const dsa = await getDsaView();
    const all = dsa.groups.flatMap((g) => g.patterns.flatMap((p) => p.items));
    expect(all.find((p) => p.id === a)!.status.state).toBe("solved");
    expect(all.find((p) => p.id === b)!.struggling).toBe(true);
    const today = await getTodayView();
    expect(today.dayTasks.find((t) => t.templateKey === "timed-set")!.status).toBe("done");
    expect((await getBossView()).foughtToday).toMatchObject({ minutes: 110 });
  });
});

describe("reading list", () => {
  it("tracks built-in and custom readings per item", async () => {
    const before = await getReadingFor("sd-caching");
    expect(before.some((r) => r.id === "memcache-fb")).toBe(true);
    await setReadingDone("memcache-fb", true);
    await setReadingDone("not-a-reading", true); // ignored
    expect(await addCustomReading("sd-caching", "My notes", "https://example.com/cache")).toBe(true);
    expect(await addCustomReading("sd-caching", "bad", "javascript:alert(1)")).toBe(false);
    expect(await addCustomReading("nope", "x", "https://example.com")).toBe(false);

    const after = await getReadingFor("sd-caching");
    expect(after.find((r) => r.id === "memcache-fb")!.done).toBe(true);
    const custom = after.find((r) => r.kind === "custom")!;
    expect(custom).toMatchObject({ title: "My notes", url: "https://example.com/cache", done: false });
    await setReadingDone(custom.id, true);
    expect((await getReadingList()).find((r) => r.id === custom.id)!.done).toBe(true);
  });
});

describe("diagrams", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

  it("sniffs real image types and rejects others", () => {
    expect(sniffImage(png)).toBe("image/png");
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });

  it("stores links and images for designs only", async () => {
    expect(await addDiagram({ itemId: "sdd-chat", title: "v1", url: "https://excalidraw.com/#x", image: null })).toMatchObject({ ok: true });
    const img = await addDiagram({ itemId: "sdd-chat", title: "photo", url: "", image: png });
    expect(img.ok).toBe(true);
    expect(await addDiagram({ itemId: "sd-caching", title: "", url: "https://x.y", image: null })).toMatchObject({ ok: false });
    expect(await addDiagram({ itemId: "sdd-chat", title: "", url: "", image: new TextEncoder().encode("<svg/>") })).toMatchObject({ ok: false });
    expect(await addDiagram({ itemId: "sdd-chat", title: "", url: "", image: null })).toMatchObject({ ok: false });

    const list = await getDiagrams("sdd-chat");
    expect(list.map((d) => d.title)).toEqual(["photo", "v1"]);
    expect(list[0].hasImage).toBe(true);
    const served = await getDiagramImage(img.ok ? img.id : 0);
    expect(served?.mime).toBe("image/png");
    expect([...served!.bytes]).toEqual([...png]);
  });
});

describe("pattern cheat sheets", () => {
  it("saves per pattern and shows on the DSA view", async () => {
    expect(await savePatternNote("sliding-window", { template: "int l = 0;", recognize: "contiguous + constraint", language: "Java" })).toBe(true);
    expect(await savePatternNote("nope", { template: "", recognize: "", language: "" })).toBe(false);
    expect((await getPatternNotes()).get("sliding-window")).toMatchObject({ template: "int l = 0;", language: "Java" });
    const sw = (await getDsaView()).groups.flatMap((g) => g.patterns).find((p) => p.id === "sliding-window")!;
    expect(sw.note).toMatchObject({ recognize: "contiguous + constraint" });
  });
});

describe("diagram upload route", () => {
  it("only accepts same-origin posts and redirects back to the design", async () => {
    const { POST } = await import("@/app/api/diagrams/route");
    const form = () => {
      const f = new FormData();
      f.set("itemId", "sdd-chat");
      f.set("url", "https://excalidraw.com/#abc");
      return f;
    };
    const post = (origin: string | null) =>
      POST(new Request("http://localhost:3000/api/diagrams", { method: "POST", body: form(), headers: origin ? { Origin: origin } : {} }));
    expect((await post("https://evil.example")).status).toBe(403);
    expect((await post(null)).status).toBe(403);
    const ok = await post("http://localhost:3000");
    expect(ok.status).toBe(303);
    expect(ok.headers.get("location")).toBe("http://localhost:3000/study/sd/sdd-chat#diagrams");
    expect(await getDiagrams("sdd-chat")).toHaveLength(1);
  });
});
