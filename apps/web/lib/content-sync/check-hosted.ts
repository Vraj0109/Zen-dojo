// Checks a hosted site's public content API end to end (plan 0117 step 1 preparation, wave 3 AG11). Pure: the fetch is
// injected, and nothing here is server-only, so the CLI (scripts/content-check-hosted.mjs) and the tests share it.
import { CONTENT_SCHEMA_VERSION } from "@habit/shared";

export type CheckStep = { name: string; ok: boolean; detail: string };

export type CheckHostedOptions = {
  /** Origin of the hosted site, for example https://example.vercel.app (a trailing slash is removed). */
  origin: string;
  /** fetch, injected. The CLI passes the global one with a timeout. */
  fetch: typeof fetch;
  /** When set, the number of problems on the site must equal this. */
  expectProblems?: number;
};

export type CheckHostedResult = {
  ok: boolean;
  steps: CheckStep[];
  /** Set when the version step passes. */
  version?: number;
  epoch?: number;
  schema?: number;
  /** Number of download units (courses, problem patterns, docs). */
  units?: number;
  /** Number of problems: the entity count of every "problems" unit. */
  problems?: number;
};

type UnitRow = { unit: string; kind: string; count: number };

class StepFailure extends Error {}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function getOk(f: typeof fetch, origin: string, path: string): Promise<Response> {
  let res: Response;
  try {
    res = await f(`${origin}${path}`, { headers: { Accept: "application/json" } });
  } catch (err) {
    throw new StepFailure(`${path} could not be reached (${messageOf(err)})`);
  }
  if (!res.ok) throw new StepFailure(`${path} answered ${res.status}`);
  return res;
}

async function readJson(res: Response, path: string): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    throw new StepFailure(`${path} did not return JSON`);
  }
}

/** The ids of the problem entities in one unit page. */
function problemIdsIn(entities: unknown[]): string[] {
  const ids: string[] = [];
  for (const e of entities) {
    if (!isObject(e) || e.kind !== "problem" || !isObject(e.value) || !isObject(e.value.row)) continue;
    if (typeof e.value.row.id === "string") ids.push(e.value.row.id);
  }
  return ids;
}

function entitiesOf(body: unknown, path: string): unknown[] {
  if (!isObject(body) || !Array.isArray(body.entities)) throw new StepFailure(`${path} has no entities list`);
  return body.entities;
}

/**
 * Runs the checks in order: version, units, one unit page, one problem (200 JSON with an ETag), and optionally the problem
 * count. A step that cannot run because an earlier one failed is recorded as "not run". Never throws: every failure is a
 * step with its reason.
 */
export async function checkHosted(opts: CheckHostedOptions): Promise<CheckHostedResult> {
  const origin = opts.origin.trim().replace(/\/+$/, "");
  const f = opts.fetch;
  const steps: CheckStep[] = [];
  const result: CheckHostedResult = { ok: false, steps };

  const run = async (name: string, fn: () => Promise<string>): Promise<void> => {
    try {
      steps.push({ name, ok: true, detail: await fn() });
    } catch (err) {
      const detail = err instanceof StepFailure ? err.message : `unexpected error: ${messageOf(err)}`;
      steps.push({ name, ok: false, detail });
    }
  };
  const skip = (name: string, why: string) => steps.push({ name, ok: false, detail: `not run: ${why}` });

  // 1. Version, schema and epoch.
  let version: number | undefined;
  await run("version", async () => {
    const path = "/api/content/version";
    const body = await readJson(await getOk(f, origin, path), path);
    if (!isObject(body) || typeof body.version !== "number" || typeof body.schema !== "number" || typeof body.epoch !== "number") {
      throw new StepFailure("the answer has no numeric version, schema and epoch");
    }
    if (body.schema > CONTENT_SCHEMA_VERSION) {
      throw new StepFailure(`New content needs a newer app version (site schema ${body.schema}, this app ${CONTENT_SCHEMA_VERSION})`);
    }
    version = body.version;
    result.version = body.version;
    result.epoch = body.epoch;
    result.schema = body.schema;
    return `version ${body.version}, schema ${body.schema}, epoch ${body.epoch}`;
  });

  // 2. Unit list.
  let units: UnitRow[] = [];
  if (version === undefined) {
    skip("units", "the version check failed");
  } else {
    const v = version;
    await run("units", async () => {
      const path = `/api/content/units?v=${v}`;
      const list = await readJson(await getOk(f, origin, path), path);
      if (!Array.isArray(list) || list.length === 0) throw new StepFailure("the unit list is empty");
      const rows: UnitRow[] = [];
      for (const u of list) {
        if (!isObject(u) || typeof u.unit !== "string" || typeof u.kind !== "string" || typeof u.count !== "number") {
          throw new StepFailure("a unit in the list has no unit, kind or count");
        }
        rows.push({ unit: u.unit, kind: u.kind, count: u.count });
      }
      units = rows;
      result.units = rows.length;
      const total = rows.reduce((sum, r) => sum + r.count, 0);
      const problemUnits = rows.filter((r) => r.kind === "problems");
      const problems = problemUnits.reduce((sum, r) => sum + r.count, 0);
      result.problems = problems;
      return `${rows.length} units, ${total} entities, ${problems} problems in ${problemUnits.length} problem units`;
    });
  }

  // Fetches the first page of one unit. Used by step 3, and by step 4 when the first unit has no problem.
  const fetchUnitPage = async (unit: UnitRow): Promise<unknown[]> => {
    const path = `/api/content/unit/${encodeURIComponent(unit.unit)}?v=${version}`;
    const entities = entitiesOf(await readJson(await getOk(f, origin, path), path), path);
    if (entities.length === 0) throw new StepFailure(`unit ${unit.unit} has no entities`);
    return entities;
  };

  // 3. One unit page (the first unit in the list).
  let firstPage: unknown[] | undefined;
  if (version === undefined) {
    skip("unit page", "the version check failed");
  } else if (units.length === 0) {
    skip("unit page", "the unit list failed");
  } else {
    const first = units[0];
    await run("unit page", async () => {
      firstPage = await fetchUnitPage(first);
      return `unit ${first.unit}: ${firstPage.length} entities on page 1`;
    });
  }

  // 4. One problem, with an ETag. Its id comes from the first unit page, or from the first problems unit when that has none.
  if (version === undefined) {
    skip("problem", "the version check failed");
  } else if (!firstPage) {
    skip("problem", "the unit page failed");
  } else {
    const v = version;
    const pageEntities = firstPage;
    await run("problem", async () => {
      let id = problemIdsIn(pageEntities)[0];
      if (!id) {
        const pu = units.find((u) => u.kind === "problems" && u.count > 0);
        if (!pu) throw new StepFailure("no problem to check: the site has no problems unit");
        id = problemIdsIn(await fetchUnitPage(pu))[0];
        if (!id) throw new StepFailure(`unit ${pu.unit} has no problem to check`);
      }
      const path = `/api/content/problems/${encodeURIComponent(id)}?v=${v}`;
      const res = await getOk(f, origin, path);
      const body = await readJson(res, path);
      if (!isObject(body) || !isObject(body.row) || body.row.id !== id) {
        throw new StepFailure(`${path} did not return problem ${id}`);
      }
      const etag = res.headers.get("etag");
      if (!etag) throw new StepFailure(`${path} sent no ETag header`);
      return `problem ${id}: 200, ETag ${etag}`;
    });
  }

  // 5. Optional: the problem count must match.
  if (opts.expectProblems !== undefined) {
    if (result.problems === undefined) {
      skip("problem count", "the unit list failed");
    } else {
      const got = result.problems;
      const want = opts.expectProblems;
      steps.push({
        name: "problem count",
        ok: got === want,
        detail: got === want ? `${got} problems, as expected` : `${got} problems, expected ${want}`,
      });
    }
  }

  result.ok = steps.length > 0 && steps.every((s) => s.ok);
  return result;
}
