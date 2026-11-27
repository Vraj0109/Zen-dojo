// Test helpers for the content database. Not imported by app code.
// The fixture is packages/shared/test/fixtures/content-mini.json (written by scripts/content-fixture.mjs).
import { specFromContent, type ContentDoc, type ContentLesson, type ContentProblem, type ContentSnapshot, type ProblemSpec } from "@habit/shared";
import { stressFor } from "@habit/shared/stress-registry";
import type { ContentDb } from "./client";
import { putAsset, upsertCourse, upsertDoc, upsertLesson, upsertProblem } from "./write";
import fixtureJson from "../../../../packages/shared/test/fixtures/content-mini.json";

/** The committed fixture, read fresh each time (tests may not share one object). */
export function loadFixtureSnapshot(): ContentSnapshot {
  return structuredClone(fixtureJson as unknown as ContentSnapshot);
}

/**
 * Writes the fixture into an (empty or seeded) content database through the write helpers, in one transaction. Assets
 * first, then courses, lessons, problems and docs. Returns the snapshot it wrote.
 */
export async function seedFixture(db: ContentDb, actor = "fixture"): Promise<ContentSnapshot> {
  const snapshot = loadFixtureSnapshot();
  await db.transaction(async (tx) => {
    for (const a of snapshot.assets) {
      const r = await putAsset(tx, Buffer.from(a.base64, "base64"), a.mime, actor, a.width !== null && a.height !== null ? { width: a.width, height: a.height } : undefined);
      if (r.id !== a.id) throw new Error(`fixture asset ${a.id} hashes to ${r.id}`);
    }
    for (const e of snapshot.entities) {
      if (e.kind === "course") await upsertCourse(tx, e.value, actor);
      else if (e.kind === "lesson") await upsertLesson(tx, e.value, actor);
      else if (e.kind === "problem") await upsertProblem(tx, e.value, actor);
      else await upsertDoc(tx, e.value, actor);
    }
  });
  return snapshot;
}

const FIXTURE = loadFixtureSnapshot();
const values = <T>(kind: string) => FIXTURE.entities.filter((e) => e.kind === kind).map((e) => e.value as T);

/** A fixture problem by id (a fresh copy). Throws when the fixture does not have it. */
export function fixtureProblem(id: string): ContentProblem {
  const p = values<ContentProblem>("problem").find((x) => x.row.id === id);
  if (!p) throw new Error(`problem ${id} is not in the content fixture (scripts/content-fixture.mjs)`);
  return structuredClone(p);
}

/** The judge spec of a fixture problem, with its stress inputs, as the app builds it from the content database. */
export function fixtureSpec(id: string): ProblemSpec {
  return specFromContent(fixtureProblem(id), stressFor(id));
}

/** Every fixture problem's judge spec, by id. */
export function fixtureSpecs(): Record<string, ProblemSpec> {
  return Object.fromEntries(values<ContentProblem>("problem").map((p) => [p.row.id, specFromContent(structuredClone(p), stressFor(p.row.id))]));
}

/** A fixture lesson by id (a fresh copy). */
export function fixtureLesson(id: string): ContentLesson {
  const l = values<ContentLesson>("lesson").find((x) => x.row.id === id);
  if (!l) throw new Error(`lesson ${id} is not in the content fixture (scripts/content-fixture.mjs)`);
  return structuredClone(l);
}

/** A fixture doc's body (a fresh copy). */
export function fixtureDoc<T = unknown>(kind: string, id = "main"): T {
  const d = values<ContentDoc>("doc").find((x) => x.row.kind === kind && x.row.id === id);
  if (!d) throw new Error(`doc ${kind}:${id} is not in the content fixture (scripts/content-fixture.mjs)`);
  return structuredClone(d.row.body) as T;
}
