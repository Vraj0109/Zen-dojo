import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markSolved } from "./dsa";
import { getWeekFocus, taskLink } from "./focus";
import { logPractice, saveConcept } from "./study";

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 7, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getWeekFocus", () => {
  it("links week 2 to its patterns, next unsolved problem and concepts", async () => {
    const f = await getWeekFocus(2);
    expect(f.dsa.items.map((i) => i.id)).toEqual(["hash-map", "prefix-sums", "two-pointers", "sliding-window"]);
    expect(f.dsa.href).toBe("/dsa?group=arrays#p-hash-map");
    expect(f.dsa.next).toMatchObject({ id: "lc-1", href: "/dsa/lc-1" });
    expect(f.sd.next).toMatchObject({ id: "sd-networking", href: "/study/sd/sd-networking", detail: "Not started", kind: "concept" });

    await markSolved("lc-1");
    await saveConcept("sd-networking", { confidence: 4, checked: [], notes: "" });
    const after = await getWeekFocus(2);
    expect(after.dsa.next?.id).not.toBe("lc-1");
    expect(after.dsa.items[0].detail).toMatch(/^1\/\d+ solved$/);
    expect(after.sd.items[0]).toMatchObject({ done: true, detail: "Solid" });
    expect(after.sd.next?.id).toBe("sd-apis");
  });

  it("uses a DSA filter for weeks without patterns, and tracks design practice", async () => {
    const f = await getWeekFocus(13);
    expect(f.dsa.items).toEqual([]);
    expect(f.dsa.href).toBe("/dsa?difficulty=hard&status=unsolved");
    expect(f.dsa.next).toBeNull();
    expect(f.sd.next).toMatchObject({ id: "sdd-payments", kind: "exercise", detail: "Not practiced" });

    await logPractice("sdd-payments", { minutes: 45, scores: { req: 4 }, notes: "", link: "" });
    expect((await getWeekFocus(13)).sd.items[0]).toMatchObject({ done: true, detail: "Practiced 1×" });
  });

  it("clamps the week", async () => {
    expect((await getWeekFocus(0)).weekNo).toBe(1);
    expect((await getWeekFocus(40)).weekNo).toBe(16);
  });
});

describe("taskLink", () => {
  it("sends each task to where the work happens", async () => {
    const f = await getWeekFocus(6);
    const none = { resolve: 0 };
    expect(taskLink({ templateKey: "dsa-warmup", category: "dsa" }, f, none)?.href).toBe(f.dsa.next!.href);
    expect(taskLink({ templateKey: "dsa-warmup", category: "dsa" }, f, { resolve: 2 })).toEqual({ href: "/dsa?status=due", label: "2 re-solves due" });
    expect(taskLink({ templateKey: "deep-block", category: "sd" }, f, none)?.href).toBe("/study/sd/sd-caching");
    expect(taskLink({ templateKey: "week-other", category: "beh_lld" }, f, none)?.href).toBe("/study/lld/lldp-parking-lot");
    expect(taskLink({ templateKey: "review", category: "other" }, f, { resolve: 0, studyArea: "core" })?.href).toBe("/study/core");
    expect(taskLink({ templateKey: "behavioral", category: "beh_lld" }, f, none)).toBeNull();
    expect(taskLink({ templateKey: null, category: "sd" }, f, none)?.href).toBe("/study/sd");
    expect(taskLink({ templateKey: null, category: "mock_app" }, f, none)).toBeNull();
  });

  it("prefers a design for the weekend design session", async () => {
    const f = await getWeekFocus(7);
    expect(taskLink({ templateKey: "design-session", category: "sd" }, f, { resolve: 0 })?.href).toBe("/study/sd/sdd-url-shortener");
    expect(taskLink({ templateKey: "deep-block", category: "sd" }, f, { resolve: 0 })?.href).toBe("/study/sd/sd-rate-limit");
  });
});
