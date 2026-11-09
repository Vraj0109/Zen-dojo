import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS, validatePack } from "@habit/shared";
import { getCourses } from "./courses";
import {
  checkFeedUpdates,
  compareRevisions,
  getAddedItems,
  getFeedUrl,
  getLessonPatch,
  installFeedPack,
  installPack,
  isLessonPatchReset,
  listLessonPatches,
  removePack,
  resetLessonPatch,
  resolveLesson,
  restoreLessonPatch,
  setFeedUrl,
  setPackItemDone,
} from "./packs";

// These tests open a fresh in-memory database and (for packs) validate Mermaid diagrams, which can take longer than the
// 5-second default when several checks run at the same time.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const sample = () => JSON.parse(readFileSync(new URL("../../../docs/examples/sample-pack.json", import.meta.url), "utf8"));

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 9, 12));
});

describe("pack format version 2", () => {
  it("still accepts version 1 and the old format name, and the new name and version 2", () => {
    expect(validatePack(sample()).ok).toBe(true);
    expect(validatePack({ ...sample(), format: "zendojo-pack", version: 2 }).ok).toBe(true);
    const bad = validatePack({ ...sample(), version: 3 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.join(" ")).toContain('"version" must be 1 or 2');
    const badName = validatePack({ ...sample(), format: "other" });
    if (!badName.ok) expect(badName.errors.join(" ")).toContain("zendojo-pack");
  });

  it("reads revision, target, tags and source, and explains mistakes", () => {
    const pack = { ...sample(), version: 2, revision: "1.2.0", target: { area: "lld", section: "SOLID" } };
    pack.sections[0].items[1] = { ...pack.sections[0].items[1], tags: ["binary-search"], source: "Own words", sourceUrl: "https://example.com/p" };
    const ok = validatePack(pack);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.pack).toMatchObject({ revision: "1.2.0", target: { area: "lld", section: "SOLID" } });
      expect(ok.pack.sections[0].items[1]).toMatchObject({ tags: ["binary-search"], source: "Own words", sourceUrl: "https://example.com/p" });
    }
    const errors = (patch: Record<string, unknown>) => {
      const r = validatePack({ ...sample(), version: 2, ...patch });
      return r.ok ? "" : r.errors.join(" | ");
    };
    expect(errors({ target: { area: "nope" } })).toContain('"target.area" must be one of: sd, lld, core');
    expect(errors({ revision: "not a version!" })).toContain('"revision" must be a short version text');
    const badUrl = sample();
    badUrl.sections[0].items[1].sourceUrl = "javascript:alert(1)";
    expect(validatePack({ ...badUrl, version: 2 }).ok).toBe(false);
  });
});

describe("a pack with a target", () => {
  const targeted = (id = "more-lld", section = "SOLID") => ({
    format: "zendojo-pack",
    version: 2,
    id,
    title: "More LLD",
    description: "",
    target: { area: "lld", section },
    sections: [{ title: "x", items: [{ type: "lesson", id: "extra-lesson", title: "An extra lesson", markdown: "A lesson that is long enough to pass the check." }] }],
  });

  it("adds its items to the study area, stays out of the course list, and is gone when removed", async () => {
    await installPack(targeted());
    expect(await getAddedItems("core")).toEqual([]);
    const [group] = await getAddedItems("lld");
    expect(group).toMatchObject({ section: "SOLID", items: [{ packId: "more-lld", id: "extra-lesson", title: "An extra lesson", type: "lesson", done: false }] });
    expect((await getCourses()).some((c) => c.id === "pack:more-lld")).toBe(false);

    await setPackItemDone("more-lld", "extra-lesson", true);
    expect((await getAddedItems("lld"))[0].items[0].done).toBe(true);

    await removePack("more-lld");
    expect(await getAddedItems("lld")).toEqual([]);
  });

  it("a pack without a target stays its own course", async () => {
    await installPack(sample());
    expect((await getCourses()).some((c) => c.id === "pack:sample-binary-search")).toBe(true);
    expect(await getAddedItems("lld")).toEqual([]);
  });

  it("groups packs that use the same heading, and uses the pack title when there is no section", async () => {
    await installPack(targeted("pack-one"));
    await installPack(targeted("pack-two"));
    const noSection = targeted("pack-three");
    delete (noSection.target as { section?: string }).section;
    await installPack(noSection);
    const groups = await getAddedItems("lld");
    expect(groups.map((g) => [g.section, g.items.length])).toEqual([["SOLID", 2], ["More LLD", 1]]);
  });
});

describe("patch built-in lessons", () => {
  const solidPatchPack = () => ({
    format: "zendojo-pack",
    version: 2,
    id: "solid-fix-pack",
    title: "SOLID Principles Fix",
    description: "Corrected SOLID principles lesson",
    sections: [
      {
        title: "Patches",
        items: [
          {
            type: "patch",
            concept: "lld-solid",
            replace: {
              overview: "Brand new patched overview for SOLID.",
              explain: ["Single responsibility...", "Open/closed...", "Liskov substitution...", "Interface segregation...", "Dependency inversion..."],
              questions: ["Explain DIP with an example."],
              pitfalls: ["Violating SRP by mixing persistence with domain logic."],
            },
          },
        ],
      },
    ],
  });

  it("stores and resolves patch overrides for built-in lessons", async () => {
    // Originally resolves built-in
    const original = LESSONS["lld-solid"];
    expect(await resolveLesson("lld-solid")).toEqual(original);
    expect(await getLessonPatch("lld-solid")).toBeNull();

    // Install pack with patch
    const res = await installPack(solidPatchPack());
    expect(res.ok).toBe(true);

    // Patch now resolves
    const patched = await resolveLesson("lld-solid");
    expect(patched?.overview).toBe("Brand new patched overview for SOLID.");
    expect(await getLessonPatch("lld-solid")).toEqual(solidPatchPack().sections[0].items[0].replace);

    const patchList = await listLessonPatches();
    expect(patchList).toHaveLength(1);
    expect(patchList[0]).toMatchObject({
      concept: "lld-solid",
      packId: "solid-fix-pack",
      isReset: false,
    });
  });

  it("supports resetting a patch to restore the built-in lesson and restoring it", async () => {
    await installPack(solidPatchPack());
    expect((await resolveLesson("lld-solid"))?.overview).toBe("Brand new patched overview for SOLID.");

    // Reset to built-in
    await resetLessonPatch("lld-solid");
    expect(await isLessonPatchReset("lld-solid")).toBe(true);
    expect(await getLessonPatch("lld-solid")).toBeNull();
    expect((await resolveLesson("lld-solid"))?.overview).toBe(LESSONS["lld-solid"].overview);

    // Restore patch
    await restoreLessonPatch("lld-solid");
    expect(await isLessonPatchReset("lld-solid")).toBe(false);
    expect((await resolveLesson("lld-solid"))?.overview).toBe("Brand new patched overview for SOLID.");
  });

  it("removing a pack cleans up its patch overrides and reset state", async () => {
    await installPack(solidPatchPack());
    await resetLessonPatch("lld-solid");
    await removePack("solid-fix-pack");

    expect(await resolveLesson("lld-solid")).toEqual(LESSONS["lld-solid"]);
    expect(await listLessonPatches()).toEqual([]);
    expect(await isLessonPatchReset("lld-solid")).toBe(false);
  });
});

describe("Mermaid validation at install time", () => {
  it("installs cleanly when Mermaid flowchart is valid", async () => {
    const pack = {
      format: "zendojo-pack",
      version: 2,
      id: "mermaid-pack",
      title: "Mermaid Lesson Pack",
      description: "Testing valid mermaid diagram",
      sections: [
        {
          title: "Diagrams",
          items: [
            {
              type: "lesson",
              id: "flow-lesson",
              title: "Flowchart Lesson",
              markdown: "Introduction to flowcharts.\n\n```mermaid\nflowchart TD\n  Start[Start] --> End(End)\n```\nSummary paragraph.",
            },
          ],
        },
      ],
    };
    const res = await installPack(pack);
    expect(res.ok).toBe(true);
  });

  it("rejects invalid Mermaid diagram syntax with a clear error", async () => {
    const pack = {
      format: "zendojo-pack",
      version: 2,
      id: "bad-mermaid-pack",
      title: "Bad Mermaid Pack",
      description: "Testing invalid mermaid diagram",
      sections: [
        {
          title: "Diagrams",
          items: [
            {
              type: "lesson",
              id: "bad-flow-lesson",
              title: "Bad Flowchart Lesson",
              markdown: "Introduction to flowcharts.\n\n```mermaid\nflowchart TD\n  Start[Unclosed node --> End\n```\nSummary paragraph.",
            },
          ],
        },
      ],
    };
    const res = await installPack(pack);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.join(" ")).toContain("invalid Mermaid diagram");
    }
  });
});

describe("content feed and OTA updates", () => {
  it("compares revision versions correctly", () => {
    expect(compareRevisions("1.2.0", "1.1.0")).toBeGreaterThan(0);
    expect(compareRevisions("1.0.0", "1.0.0")).toBe(0);
    expect(compareRevisions("1.0.0", "2.0.0")).toBeLessThan(0);
    expect(compareRevisions("1.10.0", "1.9.0")).toBeGreaterThan(0);
  });

  it("manages feed url in settings", async () => {
    expect(await getFeedUrl()).toBe("");
    await setFeedUrl("https://example.com/feed.json");
    expect(await getFeedUrl()).toBe("https://example.com/feed.json");
  });

  it("fetches feed, compares with installed packs and marks available, update, and up-to-date", async () => {
    // Install pack v1.0.0
    const packV1 = {
      ...sample(),
      id: "pack-alpha",
      revision: "1.0.0",
    };
    await installPack(packV1);

    const packBetaV2 = {
      ...sample(),
      id: "pack-beta",
      revision: "2.0.0",
    };
    await installPack(packBetaV2);

    const feed = {
      format: "zendojo-feed",
      version: 1,
      packs: [
        { id: "pack-alpha", title: "Pack Alpha", version: "1.1.0", url: "https://example.com/alpha.json", description: "Updated alpha" },
        { id: "pack-beta", title: "Pack Beta", version: "2.0.0", url: "https://example.com/beta.json", description: "Same beta" },
        { id: "pack-gamma", title: "Pack Gamma", version: "1.0.0", url: "https://example.com/gamma.json", description: "Brand new gamma" },
      ],
    };

    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(async (url: unknown) => {
      if (String(url) === "https://example.com/feed.json") {
        return new Response(JSON.stringify(feed), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response("Not found", { status: 404 });
    });

    try {
      const res = await checkFeedUpdates("https://example.com/feed.json");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.items).toHaveLength(3);
        const [alpha, beta, gamma] = res.items;
        expect(alpha).toMatchObject({ id: "pack-alpha", status: "update-available", installedRevision: "1.0.0", version: "1.1.0" });
        expect(beta).toMatchObject({ id: "pack-beta", status: "up-to-date", installedRevision: "2.0.0", version: "2.0.0" });
        expect(gamma).toMatchObject({ id: "pack-gamma", status: "available" });
      }
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("installFeedPack validates SHA-256 and installs/updates pack while keeping progress", async () => {
    // Install initial pack
    const initialPack = {
      ...sample(),
      id: "feed-pack-demo",
      revision: "1.0.0",
    };
    await installPack(initialPack);
    await setPackItemDone("feed-pack-demo", "first-true", true);

    const updatedPack = {
      ...sample(),
      id: "feed-pack-demo",
      revision: "1.1.0",
      title: "Updated Demo Pack",
    };
    const packJson = JSON.stringify(updatedPack);
    const correctHash = createHash("sha256").update(packJson).digest("hex");

    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response(packJson, { status: 200, headers: { "content-type": "application/json" } });
    });

    try {
      // Bad hash should fail
      const badRes = await installFeedPack({
        url: "https://example.com/pack.json",
        sha256: "0000000000000000000000000000000000000000000000000000000000000000",
      });
      expect(badRes.ok).toBe(false);
      if (!badRes.ok) expect(badRes.errors[0]).toContain("Checksum verification failed");

      // Correct hash succeeds
      const goodRes = await installFeedPack({
        url: "https://example.com/pack.json",
        sha256: correctHash,
      });
      expect(goodRes.ok).toBe(true);
      if (goodRes.ok) expect(goodRes.replaced).toBe(true);

      // Verify progress on first-true was preserved
      const { getPackProgress, getPack } = await import("./packs");
      const progress = await getPackProgress("feed-pack-demo");
      expect(progress.has("first-true")).toBe(true);
      const pack = await getPack("feed-pack-demo");
      expect(pack?.title).toBe("Updated Demo Pack");
      expect(pack?.revision).toBe("1.1.0");
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
