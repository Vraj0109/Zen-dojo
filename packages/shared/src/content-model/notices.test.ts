import { describe, expect, it } from "vitest";
import { followedUnitsDesktop, noticesFrom, refreshNotice, summaryLine } from "./notices";
import type { ChangeEntry, Notice } from "./types";

function change(over: Partial<ChangeEntry> & Pick<ChangeEntry, "version" | "entity" | "id" | "units">): ChangeEntry {
  return { op: "upsert", rev: "r", parts: ["hints"], note: null, notify: true, ...over };
}

const titles = (entity: string, id: string) => ({ title: `${entity} ${id} title`, unitTitle: `Unit of ${id}` });

describe("noticesFrom", () => {
  it("keeps only changes marked notify, and only for followed units", () => {
    const entries = [
      change({ version: 1, entity: "lesson", id: "sd-cache", units: ["course:sd"], notify: true, note: "New diagram" }),
      change({ version: 2, entity: "lesson", id: "sd-typo", units: ["course:sd"], notify: false, note: "Typo" }),
      change({ version: 3, entity: "problem", id: "lc-9", units: ["problems:graph"], notify: true, note: "Solution" }),
    ];
    const out = noticesFrom(entries, new Set(["course:sd"]), titles);
    expect(out.map((n) => n.id)).toEqual([1]);
    expect(out[0].unit).toBe("course:sd");
  });

  it("a lesson moved between courses notifies followers of the new course", () => {
    const entries = [change({ version: 5, entity: "lesson", id: "sd-cache", units: ["course:sd", "course:sys"], note: "Moved" })];
    expect(noticesFrom(entries, new Set(["course:sys"]), titles)[0].unit).toBe("course:sys");
    expect(noticesFrom(entries, new Set(["course:sd"]), titles)[0].unit).toBe("course:sd");
    expect(noticesFrom(entries, new Set(["course:other"]), titles)).toEqual([]);
  });

  it("merges several changes to one entity into one notice with the notes joined", () => {
    const entries = [
      change({ version: 7, entity: "problem", id: "lc-1", units: ["problems:hash-map"], parts: ["hints"], note: "Hint fixed" }),
      change({ version: 8, entity: "problem", id: "lc-1", units: ["problems:hash-map"], parts: ["section:so-a", "asset:as1"], note: "Added a Java solution" }),
    ];
    const out = noticesFrom(entries, new Set(["problems:hash-map"]), titles, 1234);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      id: 8,
      unit: "problems:hash-map",
      unitTitle: "Unit of lc-1",
      entity: "problem",
      entityId: "lc-1",
      title: "problem lc-1 title",
      sectionId: "so-a",
      note: "Hint fixed; Added a Java solution",
      at: 1234,
    });
  });

  it("sectionId is null when no section part changed", () => {
    const out = noticesFrom([change({ version: 1, entity: "lesson", id: "x", units: ["course:sd"], parts: ["meta"], note: "Title" })], new Set(["course:sd"]), titles);
    expect(out[0].sectionId).toBeNull();
  });

  it("returns newest first", () => {
    const entries = [
      change({ version: 1, entity: "lesson", id: "a", units: ["course:sd"] }),
      change({ version: 3, entity: "lesson", id: "b", units: ["course:sd"] }),
      change({ version: 2, entity: "lesson", id: "c", units: ["course:sd"] }),
    ];
    expect(noticesFrom(entries, new Set(["course:sd"]), titles).map((n) => n.id)).toEqual([3, 2, 1]);
  });
});

describe("summaryLine", () => {
  const notice = (over: Partial<Notice> = {}): Notice => ({
    id: 1,
    unit: "course:sd",
    unitTitle: "System design",
    entity: "lesson",
    entityId: "sd-cache",
    title: "Caching",
    sectionId: null,
    note: "New diagram",
    at: 0,
    ...over,
  });

  it("says one update with its unit and note", () => {
    expect(summaryLine([notice()])).toBe("1 update: System design: New diagram");
  });

  it("falls back to the title when the note is empty", () => {
    expect(summaryLine([notice({ note: "" })])).toBe("1 update: System design: Caching was updated");
  });

  it("counts several updates", () => {
    expect(summaryLine([notice(), notice({ id: 2 }), notice({ id: 3 })])).toBe("3 updates in courses you follow");
  });

  it("says there is nothing new for no notices", () => {
    expect(summaryLine([])).toBe("No new updates");
  });
});

describe("followedUnitsDesktop", () => {
  it("is started plus follow, minus mute, and mute wins over started", () => {
    const out = followedUnitsDesktop({
      startedUnits: ["course:sd", "problems:dp"],
      follow: ["docs", "course:sys"],
      mute: ["problems:dp", "course:nothing"],
    });
    expect([...out].sort()).toEqual(["course:sd", "course:sys", "docs"]);
  });

  it("is empty when nothing is started or followed", () => {
    expect(followedUnitsDesktop({ startedUnits: [], follow: [], mute: [] }).size).toBe(0);
  });
});

describe("refreshNotice", () => {
  it("is the all-unit notice for a full refresh, stored at the given time", () => {
    const n = refreshNotice(1_700_000_000_000);
    expect(n).toEqual({
      id: 0,
      unit: "all",
      unitTitle: "All content",
      entity: "course",
      entityId: "",
      title: "Content was refreshed",
      sectionId: null,
      note: "The whole content was downloaded again.",
      at: 1_700_000_000_000,
    });
  });
});
