import { describe, expect, it } from "vitest";
import { checkHosted } from "./check-hosted";

const ORIGIN = "https://site.test";

type Route = { status?: number; body?: unknown; etag?: string | null; raw?: string };

/**
 * A fake site. Keys are the decoded path plus query, for example "/api/content/unit/course:sd?v=7". Unknown routes answer 404.
 * `overrides` replace or remove (null) a default route.
 */
function fakeSite(overrides: Record<string, Route | null> = {}) {
  const defaults: Record<string, Route> = {
    "/api/content/version": { body: { version: 7, schema: 1, epoch: 1 } },
    "/api/content/units?v=7": {
      body: [
        { unit: "course:sd", title: "System design", kind: "course", count: 3, bytes: 900, rev: "a" },
        { unit: "problems:arrays", title: "Arrays", kind: "problems", count: 40, bytes: 9000, rev: "b" },
        { unit: "problems:other", title: "Other", kind: "problems", count: 5, bytes: 800, rev: "c" },
        { unit: "docs", title: "Docs", kind: "docs", count: 2, bytes: 300, rev: "d" },
      ],
    },
    "/api/content/unit/course:sd?v=7": {
      body: { entities: [{ kind: "course", value: { row: { id: "sd" } } }, { kind: "lesson", value: { row: { id: "sd-caching" } } }] },
    },
    "/api/content/unit/problems:arrays?v=7": {
      body: { entities: [{ kind: "problem", value: { row: { id: "lc-1" } } }] },
    },
    "/api/content/unit/problems:other?v=7": {
      body: { entities: [{ kind: "problem", value: { row: { id: "lc-9" } } }] },
    },
    "/api/content/problems/lc-1?v=7": { body: { row: { id: "lc-1" } }, etag: '"rev-lc-1"' },
  };
  const routes = { ...defaults };
  for (const [key, route] of Object.entries(overrides)) {
    if (route === null) delete routes[key];
    else routes[key] = route;
  }
  const seen: string[] = [];
  const fetchStub = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const key = `${decodeURIComponent(url.pathname)}${url.search}`;
    seen.push(key);
    const route = routes[key];
    if (!route) return new Response("Not found", { status: 404 });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (route.etag) headers.ETag = route.etag;
    const text = route.raw ?? JSON.stringify(route.body);
    return new Response(text, { status: route.status ?? 200, headers });
  }) as typeof fetch;
  return { fetch: fetchStub, seen };
}

function stepNamed(result: Awaited<ReturnType<typeof checkHosted>>, name: string) {
  const step = result.steps.find((s) => s.name === name);
  if (!step) throw new Error(`no step ${name}`);
  return step;
}

describe("checkHosted", () => {
  it("passes every step on a healthy site and reports the counts", async () => {
    const site = fakeSite();
    const result = await checkHosted({ origin: `${ORIGIN}/`, fetch: site.fetch });
    expect(result.ok).toBe(true);
    expect(result.steps.map((s) => s.name)).toEqual(["version", "units", "unit page", "problem"]);
    expect(result.steps.every((s) => s.ok)).toBe(true);
    expect(result.version).toBe(7);
    expect(result.epoch).toBe(1);
    expect(result.schema).toBe(1);
    expect(result.units).toBe(4);
    expect(result.problems).toBe(45);
    expect(site.seen).toContain("/api/content/problems/lc-1?v=7");
  });

  it("fails the version step when the version route is missing, and marks the rest not run", async () => {
    const site = fakeSite({ "/api/content/version": null });
    const result = await checkHosted({ origin: ORIGIN, fetch: site.fetch });
    expect(result.ok).toBe(false);
    expect(stepNamed(result, "version").ok).toBe(false);
    expect(stepNamed(result, "version").detail).toContain("404");
    expect(stepNamed(result, "units").detail).toContain("not run");
    expect(stepNamed(result, "problem").ok).toBe(false);
  });

  it("fails the units step when the unit list is empty", async () => {
    const site = fakeSite({ "/api/content/units?v=7": { body: [] } });
    const result = await checkHosted({ origin: ORIGIN, fetch: site.fetch });
    expect(result.ok).toBe(false);
    expect(stepNamed(result, "version").ok).toBe(true);
    expect(stepNamed(result, "units").ok).toBe(false);
    expect(stepNamed(result, "units").detail).toContain("empty");
  });

  it("fails the unit page step when the first unit page is 404", async () => {
    const site = fakeSite({ "/api/content/unit/course:sd?v=7": null });
    const result = await checkHosted({ origin: ORIGIN, fetch: site.fetch });
    expect(result.ok).toBe(false);
    expect(stepNamed(result, "unit page").ok).toBe(false);
    expect(stepNamed(result, "unit page").detail).toContain("404");
    expect(stepNamed(result, "problem").detail).toContain("not run");
  });

  it("fails the version step when the site schema is newer than this app", async () => {
    const site = fakeSite({ "/api/content/version": { body: { version: 7, schema: 99, epoch: 1 } } });
    const result = await checkHosted({ origin: ORIGIN, fetch: site.fetch });
    expect(result.ok).toBe(false);
    const step = stepNamed(result, "version");
    expect(step.ok).toBe(false);
    expect(step.detail).toContain("newer app version");
    expect(result.version).toBeUndefined();
  });

  it("fails the problem count step when the count differs from expectProblems", async () => {
    const site = fakeSite();
    const result = await checkHosted({ origin: ORIGIN, fetch: site.fetch, expectProblems: 486 });
    expect(result.ok).toBe(false);
    const step = stepNamed(result, "problem count");
    expect(step.ok).toBe(false);
    expect(step.detail).toContain("45");
    expect(step.detail).toContain("486");
  });

  it("passes the problem count step when expectProblems matches", async () => {
    const site = fakeSite();
    const result = await checkHosted({ origin: ORIGIN, fetch: site.fetch, expectProblems: 45 });
    expect(result.ok).toBe(true);
    expect(stepNamed(result, "problem count").ok).toBe(true);
  });

  it("finds a problem in a problems unit when the first unit page has none", async () => {
    const site = fakeSite({
      "/api/content/units?v=7": {
        body: [
          { unit: "docs", title: "Docs", kind: "docs", count: 2, bytes: 300, rev: "d" },
          { unit: "problems:arrays", title: "Arrays", kind: "problems", count: 40, bytes: 9000, rev: "b" },
        ],
      },
      "/api/content/unit/docs?v=7": { body: { entities: [{ kind: "doc", value: {} }] } },
    });
    const result = await checkHosted({ origin: ORIGIN, fetch: site.fetch });
    expect(result.ok).toBe(true);
    expect(stepNamed(result, "problem").detail).toContain("lc-1");
  });

  it("fails the problem step when the problem has no ETag", async () => {
    const site = fakeSite({ "/api/content/problems/lc-1?v=7": { body: { row: { id: "lc-1" } } } });
    const result = await checkHosted({ origin: ORIGIN, fetch: site.fetch });
    expect(result.ok).toBe(false);
    expect(stepNamed(result, "problem").detail).toContain("ETag");
  });

  it("records a network error as a failed step instead of throwing", async () => {
    const broken = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const result = await checkHosted({ origin: ORIGIN, fetch: broken });
    expect(result.ok).toBe(false);
    expect(stepNamed(result, "version").detail).toContain("could not be reached");
  });
});
