// Makes sure a build has a content database to read (plan 0114 step 6b). Run from apps/web's `prebuild`.
//
// - CONTENT_DATABASE_URL set (hosted builds, Vercel): nothing to do, the build reads that database.
// - data/content.db exists: nothing to do, it is never overwritten.
// - Otherwise: create data/content.db with the current schema and load the committed test fixture
//   (packages/shared/test/fixtures/content-mini.json) when it exists. Without the fixture the database is empty and a
//   warning says so. The file is written under a temporary name first, so a crash never leaves a half-filled content.db.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const target = path.join(dataDir, "content.db");
const temp = `${target}.tmp`;
const fixturePath = path.join(root, "packages", "shared", "test", "fixtures", "content-mini.json");

async function main() {
  if (process.env.CONTENT_DATABASE_URL) return;
  if (existsSync(target)) return;

  // The repo's TypeScript (apps/web/lib/content-db) is imported directly, the same way scripts/content.mjs does it.
  register("./lib/register-ts.mjs", import.meta.url);
  const { getContentDb, resetContentDbForTests } = await import("../apps/web/lib/content-db/client.ts");

  mkdirSync(dataDir, { recursive: true });
  rmSync(temp, { force: true });
  const db = await getContentDb({ CONTENT_DATABASE_URL: `file:${temp.replaceAll("\\", "/")}` });

  const hasFixture = existsSync(fixturePath);
  let problemCount = 0;
  if (hasFixture) {
    const snapshot = JSON.parse(readFileSync(fixturePath, "utf8"));
    const write = await import("../apps/web/lib/content-db/write.ts");
    await db.transaction(async (tx) => {
      for (const a of snapshot.assets ?? []) {
        await write.putAsset(tx, Buffer.from(a.base64, "base64"), a.mime, "fixture", a.width && a.height ? { width: a.width, height: a.height } : undefined);
      }
      for (const e of snapshot.entities) {
        if (e.kind === "problem") {
          problemCount++;
          await write.upsertProblem(tx, e.value, "fixture");
        } else if (e.kind === "lesson") await write.upsertLesson(tx, e.value, "fixture");
        else if (e.kind === "course") await write.upsertCourse(tx, e.value, "fixture");
        else if (e.kind === "doc") await write.upsertDoc(tx, e.value, "fixture");
      }
    });
  }
  // On Windows the temp file can stay locked after the client closes, so it is never renamed. SQLite writes a clean,
  // complete copy to a second file that nobody has open; only that file is renamed into place.
  const part = `${target}.part`;
  rmSync(part, { force: true });
  await db.$client.execute(`VACUUM INTO '${part.replaceAll("\\", "/").replaceAll("'", "''")}'`);
  await resetContentDbForTests();

  if (existsSync(target)) {
    rmSync(part, { force: true });
  } else {
    renameSync(part, target);
  }
  try {
    rmSync(temp, { force: true });
  } catch {
    // still locked on Windows: harmless leftover (git-ignored), removed on the next run
  }
  if (!existsSync(target)) throw new Error("content.db was not created");
  if (hasFixture) {
    console.log(`content: using the test fixture (${problemCount} problems)`);
  } else {
    console.warn("content: no test fixture yet (packages/shared/test/fixtures/content-mini.json); created an empty content database");
  }
}

main().catch((err) => {
  console.error("content: could not create the content database", err);
  process.exit(1);
});
