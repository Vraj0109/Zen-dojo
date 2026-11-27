// pnpm content:seed-db [--url <libsql url>] [--dry-run]
//
// Copies every built-in course, lesson, problem and doc from the repo files into the content database (plan 0112 step 5).
// Without --url it writes to this computer's data/content.db. With --url it writes to that database, and the token comes
// from CONTENT_DATABASE_AUTH_TOKEN (a full-access token: the seed writes). Running it again changes nothing.
// --dry-run writes nothing and prints what a real run would change.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  if (v === undefined || v.startsWith("--")) {
    console.error(`${name} needs a value`);
    process.exit(1);
  }
  args.splice(i, 2);
  return v;
};
const has = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
};

const url = flag("--url");
const dryRun = has("--dry-run");
if (args.length) {
  console.error(`Unknown arguments: ${args.join(" ")}`);
  console.error("Usage: pnpm content:seed-db [--url <libsql url>] [--dry-run]");
  process.exit(1);
}

const { contentDatabaseUrl, getContentDb, resetContentDbForTests } = await import("@/lib/content-db/client");
const { seedContent } = await import("@/lib/content-db/seed");

const target = url ?? contentDatabaseUrl({});
const token = process.env.CONTENT_DATABASE_AUTH_TOKEN || undefined;
if (url && !url.startsWith("file:") && !token) {
  console.warn("warning: --url is remote but CONTENT_DATABASE_AUTH_TOKEN is not set; the write will be refused.");
}

let seededFrom = "unknown";
try {
  seededFrom = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
} catch {
  console.warn("warning: git is not available; content_meta.seeded_from is set to \"unknown\".");
}

const started = Date.now();
const db = await getContentDb({ CONTENT_DATABASE_URL: target, CONTENT_DATABASE_AUTH_TOKEN: token });
const report = await seedContent(db, { actor: "seed", batch: 50, dryRun, seededFrom });
await resetContentDbForTests();

const c = report.counts;
console.log(`content:seed-db  target ${url ? target : target.replace(/^file:/, "")}${dryRun ? "  (dry run: nothing written)" : ""}`);
console.log("rows from the files:");
for (const [table, n] of Object.entries(c)) console.log(`  ${table.padEnd(14)} ${String(n).padStart(6)}`);
console.log(`${report.changed} changed, ${report.unchanged} unchanged`);
console.log(
  `  by kind: course ${report.changedByKind.course}, lesson ${report.changedByKind.lesson}, problem ${report.changedByKind.problem}, doc ${report.changedByKind.doc}`,
);
console.log(`final content version: ${report.version}`);
console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
