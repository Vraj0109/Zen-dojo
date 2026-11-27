// Test helpers for the content database. Not imported by app code.
// The fixture is packages/shared/test/fixtures/content-mini.json (written by scripts/content-fixture.mjs).
import { readFileSync } from "node:fs";
import type { ContentSnapshot } from "@habit/shared";
import type { ContentDb } from "./client";
import { putAsset, upsertCourse, upsertDoc, upsertLesson, upsertProblem } from "./write";

const FIXTURE_URL = new URL("../../../../packages/shared/test/fixtures/content-mini.json", import.meta.url);

/** The committed fixture, read fresh each time (tests may not share one object). */
export function loadFixtureSnapshot(): ContentSnapshot {
  return JSON.parse(readFileSync(FIXTURE_URL, "utf8")) as ContentSnapshot;
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
