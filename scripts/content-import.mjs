// pnpm content:import <snapshot.db|pack.json> [--url <libsql url>] [--allow-errors]
//
// Owner only (plan 0117 step 3). Writes a snapshot (a content database file, from content:snapshot or a backup) or a
// content pack (JSON, docs/content-packs.md) into a content database through the write helpers, actor "import". Every
// entity that changes gets one admin_audit row (action "import", actor "owner"), and the content epoch goes up by one,
// so every copy downloads its followed units again. Entities are only added or replaced, never removed.
//   --url <libsql url>  the target. Without it: this computer's data/content.db. A remote URL needs
//                       CONTENT_DATABASE_AUTH_TOKEN (the owner's full-access token).
//   --allow-errors      import even when verifyContent reports errors (default: refuse, and print the errors)
// Packs are checked with verifyContent too, without the roadmap coverage rule (a pack adds a few problems, not the roadmap).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./lib/register-ts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const usage = "Usage: pnpm content:import <snapshot.db|pack.json> [--url <libsql url>] [--allow-errors]";

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
function takeBool(name) {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
}

const url = takeFlag("--url");
const allowErrors = takeBool("--allow-errors");
if (args.length !== 1 || args[0].startsWith("--")) {
  console.error(`${args.length ? `Unknown arguments: ${args.join(" ")}\n` : ""}${usage}`);
  process.exit(2);
}
const input = path.resolve(args[0]);

async function main() {
  const { loadSnapshotFromDb, openContentFile } = await import("../apps/web/lib/content-db/verify-db.ts");
  const { importSnapshot, packToSnapshot } = await import("../apps/web/lib/content-db/import.ts");
  const { contentDatabaseUrl, getContentDb, resetContentDbForTests } = await import("../apps/web/lib/content-db/client.ts");
  const { verifyContent } = await import("@habit/shared");

  if (!fs.existsSync(input)) {
    console.error(`content:import no such file: ${input}`);
    return 2;
  }

  // 1. Read the input as a snapshot (a .db file) or a pack (.json).
  let snapshot;
  let warnings = [];
  let isPack = false;
  if (input.endsWith(".json")) {
    isPack = true;
    const packed = packToSnapshot(JSON.parse(fs.readFileSync(input, "utf8")));
    snapshot = packed.snapshot;
    warnings = packed.warnings;
  } else {
    const opened = openContentFile(input);
    try {
      snapshot = await loadSnapshotFromDb(opened.db);
    } finally {
      opened.close();
    }
  }

  // 2. Check it. Errors stop the import unless --allow-errors.
  const issues = verifyContent(snapshot, isPack ? { checkRoadmapFocus: false } : undefined);
  for (const w of warnings) console.log(`warning pack: ${w}`);
  for (const issue of issues) console.log(`${issue.level.padEnd(7)} ${issue.entity} ${issue.id}: ${issue.message}`);
  const errors = issues.filter((i) => i.level === "error").length;
  if (errors && !allowErrors) {
    console.error(`content:import refused: ${errors} error${errors === 1 ? "" : "s"} (use --allow-errors to import anyway).`);
    return 1;
  }

  // 3. Write it to the target.
  const target = url ?? contentDatabaseUrl({});
  const isLocal = target === ":memory:" || target.startsWith("file:");
  const token = process.env.CONTENT_DATABASE_AUTH_TOKEN || undefined;
  if (!isLocal && !token) {
    console.error("content:import needs CONTENT_DATABASE_AUTH_TOKEN for a remote database (the owner's full-access token).");
    return 1;
  }

  const db = await getContentDb({ CONTENT_DATABASE_URL: target, CONTENT_DATABASE_AUTH_TOKEN: token });
  try {
    const report = await importSnapshot(db, snapshot);
    console.log(`content:import  ${input}  ->  ${isLocal ? target.replace(/^file:/, "") : url}`);
    console.log(`${report.entities} entities: ${report.changed} changed, ${report.unchanged} unchanged`);
    console.log(
      `  by kind: course ${report.changedByKind.course}, lesson ${report.changedByKind.lesson}, problem ${report.changedByKind.problem}, doc ${report.changedByKind.doc}`,
    );
    console.log(`${report.assets} images stored`);
    console.log(`content epoch ${report.epoch.from} -> ${report.epoch.to}`);
    return 0;
  } finally {
    await resetContentDbForTests();
  }
}

let code = 1;
try {
  code = await main();
} catch (err) {
  console.error("content:import failed:", err instanceof Error ? err.message : err);
  code = 1;
}
process.exit(code);
