// pnpm content:verify [--db <file> | --origin <url>]
//
// Runs the content checks (verifyContent, plan 0117 step 2) on a content database and prints one line per issue:
//   error   problem lc-1: Problem has no test cases (role: 'test')
//   warning lesson sd-caching: ...
// Exit code 1 when any issue is an error, 2 on bad arguments. Read-only: it never migrates or writes the database.
//   --db <file>     a content database file (default: data/content.db in this repo)
//   --origin <url>  download the hosted content first (the same download as content:snapshot) into a temp file
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./lib/register-ts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const usage = "Usage: pnpm content:verify [--db <file> | --origin <url>]";

const args = process.argv.slice(2);
function takeFlag(name) {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  if (v === undefined || v.startsWith("--")) {
    console.error(`${name} needs a value.\n${usage}`);
    process.exit(2);
  }
  args.splice(i, 2);
  return v;
}

const dbFlag = takeFlag("--db");
const originFlag = takeFlag("--origin");
if (args.length) {
  console.error(`Unknown arguments: ${args.join(" ")}\n${usage}`);
  process.exit(2);
}
if (dbFlag && originFlag) {
  console.error(`Use --db or --origin, not both.\n${usage}`);
  process.exit(2);
}

let tempDir;
let file;
let label;
if (originFlag) {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "content-verify-"));
  file = path.join(tempDir, "content.db");
  label = originFlag;
  console.log(`content:verify downloading ${originFlag}`);
  const snapshot = path.join(root, "scripts", "content-snapshot.mjs");
  const run = spawnSync(process.execPath, [snapshot, "--out", file, "--origin", originFlag], { stdio: "inherit" });
  if (run.status !== 0) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.error("content:verify could not download the content.");
    process.exit(1);
  }
} else {
  file = path.resolve(dbFlag ?? path.join(root, "data", "content.db"));
  label = file;
}

const cleanup = () => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
};

async function main() {
  const { openContentFile, loadSnapshotFromDb, verifyDb } = await import("../apps/web/lib/content-db/verify-db.ts");
  const { getSchemaVersion, getContentVersion } = await import("../apps/web/lib/content-db/meta.ts");

  let opened;
  try {
    opened = openContentFile(file);
  } catch (err) {
    console.error(`content:verify ${err instanceof Error ? err.message : err}`);
    console.error("Get a copy with: pnpm content:pull, or pass --origin <url>.");
    return 2;
  }
  try {
    const { db } = opened;
    const snapshot = await loadSnapshotFromDb(db);
    const issues = await verifyDb(db);
    const version = await getContentVersion(db);
    const schema = await getSchemaVersion(db);

    const counts = { course: 0, lesson: 0, problem: 0, doc: 0 };
    for (const e of snapshot.entities) counts[e.kind]++;
    console.log(`content:verify  source ${label}`);
    console.log(`content version ${version}, schema ${schema}, ${snapshot.assets.length} images`);
    console.log(`entities: ${counts.course} courses, ${counts.lesson} lessons, ${counts.problem} problems, ${counts.doc} docs`);

    for (const issue of issues) {
      console.log(`${issue.level.padEnd(7)} ${issue.entity} ${issue.id}: ${issue.message}`);
    }
    const errors = issues.filter((i) => i.level === "error").length;
    const warnings = issues.length - errors;
    console.log(`\n${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}`);
    return errors > 0 ? 1 : 0;
  } finally {
    opened.close();
  }
}

let code = 1;
try {
  code = await main();
} catch (err) {
  console.error("content:verify failed:", err instanceof Error ? err.message : err);
  code = 1;
} finally {
  cleanup();
}
process.exit(code);
