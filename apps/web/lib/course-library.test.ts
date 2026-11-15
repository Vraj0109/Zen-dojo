import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COURSE_CATALOG_URL } from "@habit/shared";
import { getCourses } from "./courses";
import { getCourseLibrary, getPack, getPackProgress, installLibraryCourse, installPack, resetCourseLibraryMemo, setPackItemDone } from "./packs";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const sample = () => JSON.parse(readFileSync(new URL("../../../docs/examples/sample-pack.json", import.meta.url), "utf8"));
const PACK_URL = "https://raw.githubusercontent.com/Vraj0109/zen-dojo-courses/main/courses/";

function course(id: string, revision: string, extra: Record<string, unknown> = {}) {
  return { ...sample(), id, revision, title: `Course ${id}`, ...extra };
}

/** Serves a catalog plus pack files; `files` maps a URL to its exact text. Unknown URLs answer 404. */
function serve(files: Record<string, string>) {
  const fn = vi.fn(async (u: URL | string) => {
    const text = files[String(u)];
    return text === undefined ? new Response("Not Found", { status: 404 }) : new Response(text, { status: 200 });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function catalogFor(packs: { pack: Record<string, unknown>; text?: string; entry?: Record<string, unknown> }[]) {
  const files: Record<string, string> = {};
  const entries = packs.map(({ pack, text, entry }) => {
    const body = text ?? JSON.stringify(pack);
    const url = `${PACK_URL}${pack.id}.json`;
    files[url] = body;
    return { id: pack.id, title: pack.title, version: pack.revision, url, sha256: createHash("sha256").update(body).digest("hex"), bytes: body.length, items: 3, category: "Tools", ...entry };
  });
  files[DEFAULT_COURSE_CATALOG_URL] = JSON.stringify({ format: "zendojo-feed", version: 1, packs: entries });
  return files;
}

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  resetCourseLibraryMemo();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 15, 12));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("course library", () => {
  it("shows available, installed, update and tooNew states", async () => {
    await installPack(course("inst", "1.0.0"));
    await installPack(course("old", "1.0.0"));
    serve(
      catalogFor([
        { pack: course("avail", "1.0.0") },
        { pack: course("inst", "1.0.0") },
        { pack: course("old", "1.1.0") },
        { pack: course("future", "1.0.0"), entry: { minAppVersion: "99.0.0" } },
      ]),
    );
    const lib = await getCourseLibrary("0.9.1");
    expect(lib.ok).toBe(true);
    if (!lib.ok) return;
    expect(lib.offline).toBe(false);
    const by = Object.fromEntries(lib.courses.map((c) => [c.id, c]));
    expect(by.avail).toMatchObject({ state: "available", tooNew: false, category: "Tools" });
    expect(by.inst).toMatchObject({ state: "installed", installedRevision: "1.0.0" });
    expect(by.old).toMatchObject({ state: "update", installedRevision: "1.0.0" });
    expect(by.future).toMatchObject({ state: "available", tooNew: true });
  });

  it("keeps the catalog in memory for an hour, then falls back to the saved copy when offline", async () => {
    const fetchFn = serve(catalogFor([{ pack: course("avail", "1.0.0") }]));
    expect((await getCourseLibrary()).courses).toHaveLength(1);
    await getCourseLibrary();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date(2026, 10, 15, 14));
    serve({});
    const lib = await getCourseLibrary();
    expect(lib).toMatchObject({ ok: true, offline: true });
    expect(lib.courses.map((c) => c.id)).toEqual(["avail"]);

    // A new process (memory gone) still has the saved copy.
    resetCourseLibraryMemo();
    expect(await getCourseLibrary()).toMatchObject({ ok: true, offline: true });
  });

  it("returns an error and no courses when the catalog is missing and nothing is cached (404)", async () => {
    serve({});
    const lib = await getCourseLibrary();
    expect(lib.ok).toBe(false);
    expect(lib.courses).toEqual([]);
    if (!lib.ok) expect(lib.error).toContain("404");
  });

  it("installs a course by id and shows it as a Learn course", async () => {
    serve(catalogFor([{ pack: course("avail", "1.0.0") }]));
    const r = await installLibraryCourse("avail");
    expect(r).toMatchObject({ ok: true, id: "avail", replaced: false });
    expect((await getCourses()).some((c) => c.id === "pack:avail")).toBe(true);
    expect((await getCourseLibrary()).courses[0].state).toBe("installed");
  });

  it("refuses an unknown id, a missing or wrong checksum, a too-new course, and a mismatched id", async () => {
    const files = catalogFor([
      { pack: course("nosha", "1.0.0"), entry: { sha256: undefined } },
      { pack: course("tampered", "1.0.0"), entry: { sha256: "0".repeat(64) } },
      { pack: course("future", "1.0.0"), entry: { minAppVersion: "99.0.0" } },
      { pack: course("other", "1.0.0"), text: JSON.stringify(course("someone-else", "1.0.0")) },
    ]);
    serve(files);
    expect(await installLibraryCourse("nope")).toMatchObject({ ok: false });
    const nosha = await installLibraryCourse("nosha");
    expect(nosha.ok).toBe(false);
    if (!nosha.ok) expect(nosha.errors[0]).toContain("checksum");
    const tampered = await installLibraryCourse("tampered");
    expect(tampered.ok).toBe(false);
    if (!tampered.ok) expect(tampered.errors[0]).toContain("does not match");
    expect(await installLibraryCourse("future")).toMatchObject({ ok: false });
    expect(await installLibraryCourse("other")).toMatchObject({ ok: false });
    for (const id of ["nosha", "tampered", "future", "other", "someone-else"]) expect(await getPack(id)).toBeNull();
  });

  it("updating keeps progress on items that still exist", async () => {
    await installPack(course("upd", "1.0.0"));
    await setPackItemDone("upd", "first-true", true);
    serve(catalogFor([{ pack: course("upd", "1.1.0", { title: "Course upd v2" }) }]));
    const r = await installLibraryCourse("upd");
    expect(r).toMatchObject({ ok: true, replaced: true });
    expect((await getPackProgress("upd")).has("first-true")).toBe(true);
    expect((await getPack("upd"))?.revision).toBe("1.1.0");
  });
});
