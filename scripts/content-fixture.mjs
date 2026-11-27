// pnpm content:fixture --db <content.db>
//
// Writes packages/shared/test/fixtures/content-mini.json: a small ContentSnapshot (types.ts) for tests, read from a
// content database (get one with `pnpm content:snapshot --out <file.db>` or `pnpm content:pull`). The ids are fixed
// below, so running it again only picks up edits to those items:
//   - problems: two design problems, one "brute: same", several with Java, Python and brute force, and the problems the
//     tests name (Two Sum, Subarray Sum Equals K, Clone Graph, ...)
//   - the 4 courses (sd, lld, core, dsa-patterns) whole, and a few lessons of each
//   - one doc of each kind with its list cut to the first 3 entries (each kept whole), except the DSA roadmap list and pattern groups, which stay whole
//     and the reading list, so those views have their real shape; one LLD project
//   - one 1x1 PNG asset, referenced by an image block in the first fixture lesson
// Commit the result. Tests read it through seedFixture (apps/web/lib/content-db/test-helpers.ts) and the vitest global
// setup (apps/web/test/content-global-setup.ts).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFile = path.join(root, "packages", "shared", "test", "fixtures", "content-mini.json");

const args = process.argv.slice(2);
const dbArg = args[args.indexOf("--db") + 1];
if (!args.includes("--db") || !dbArg) {
  console.error("Usage: pnpm content:fixture --db <content.db>   (get one with pnpm content:snapshot --out <file.db>)");
  process.exit(1);
}
const dbFile = path.resolve(dbArg);
if (!existsSync(dbFile)) {
  console.error(`No content database at ${dbFile}.`);
  process.exit(1);
}

const PROBLEMS = [
  // design
  "lc-1146", "lc-146",
  // brute: same, and one problem from each source
  "abc151-a", "abc153-a", "c-atc-abc081-b", "c-atc-abc088-b", "c-atc-abc143-b", "c-cf-1030a", "c-euler-1",
  "c-kattis-autori", "c-rabin-karp", "cses-apartments",
  // named by tests
  "lc-1", "lc-3", "lc-20", "lc-42", "lc-49", "lc-70", "lc-92", "lc-105", "lc-128", "lc-133", "lc-239", "lc-297",
  "lc-347", "lc-560", "cses-weird-algorithm", "cses-increasing-array", "cses-missing-number",
  // judge tests: list, tree, design and stress cases
  "lc-11", "lc-15", "lc-76", "lc-98", "lc-102", "lc-173", "lc-200", "lc-230", "lc-355", "lc-362", "lc-382", "lc-528",
];
const COURSES = ["sd", "lld", "core", "dsa-patterns"];
const LESSONS = [
  "sd-networking", "sd-apis", "sd-caching", "sd-cap", "sdd-url-shortener", "sdd-chat", "sdd-payments",
  "lld-oop", "lld-solid", "lldp-parking-lot",
  "os-deadlocks",
  "pattern-hash-map", "pattern-prefix-sums",
];
const WHOLE_DOCS = new Set(["dsa-problems", "dsa-groups", "reading"]);
const LLD_PROJECT = "lldp-parking-lot";

const { CONTENT_SCHEMA_VERSION, sha256Hex } = await import("@habit/shared");
const { getContentDb, resetContentDbForTests } = await import("@/lib/content-db/client");
const { loadDoc, loadLesson, loadProblem, loadCourse } = await import("@/lib/content-db/load");

// A 1x1 transparent PNG (67 bytes).
const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAAABJRU5ErkJggg==";

const db = await getContentDb({ CONTENT_DATABASE_URL: `file:${dbFile.replaceAll("\\", "/")}` });
const need = async (what, load) => {
  const v = await load();
  if (!v) throw new Error(`${what} is missing from ${dbFile}`);
  return v;
};

const problems = [];
for (const id of PROBLEMS) problems.push(await need(`problem ${id}`, () => loadProblem(db, id)));
const courses = [];
for (const id of COURSES) courses.push(await need(`course ${id}`, () => loadCourse(db, id)));
const lessons = [];
for (const id of LESSONS) lessons.push(await need(`lesson ${id}`, () => loadLesson(db, id)));

// One image block in the first fixture lesson, so the snapshot exercises assets.
const assetBytes = Buffer.from(PNG_BASE64, "base64");
const assetId = sha256Hex(new Uint8Array(assetBytes));
const firstSection = lessons[0].page.sections[0];
firstSection.blocks.push({
  id: "fixture-image-block",
  ord: firstSection.blocks.length,
  type: "image",
  body: "A 1 by 1 pixel test image.",
  caption: null,
  variant: null,
  label: null,
  timeComplexity: null,
  spaceComplexity: null,
  assetId,
  code: {},
});

/** Keeps the first 3 entries of a list-like body (or of an object keyed by id); each entry stays whole. */
function trim(v) {
  if (Array.isArray(v)) return v.slice(0, 3);
  if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).slice(0, 3));
  return v;
}

const docRows = (await db.$client.execute("SELECT kind, id FROM docs WHERE deleted = 0 ORDER BY kind, id")).rows;
const docs = [];
const seenKinds = new Set();
for (const r of docRows) {
  const kind = String(r.kind);
  const id = String(r.id);
  if (seenKinds.has(kind)) continue;
  if (kind === "lld-project" && id !== LLD_PROJECT) continue;
  seenKinds.add(kind);
  const d = await need(`doc ${kind}:${id}`, () => loadDoc(db, kind, id));
  docs.push({ row: { kind, id, body: WHOLE_DOCS.has(kind) ? d.row.body : trim(d.row.body) } });
}

const entities = [
  ...courses.map((value) => ({ kind: "course", value })),
  ...lessons.map((value) => ({ kind: "lesson", value })),
  ...problems.map((value) => ({ kind: "problem", value })),
  ...docs.map((value) => ({ kind: "doc", value })),
];
const snapshot = {
  schema: CONTENT_SCHEMA_VERSION,
  version: entities.length,
  entities,
  assets: [{ id: assetId, mime: "image/png", base64: PNG_BASE64, width: 1, height: 1 }],
};

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
await resetContentDbForTests();

console.log(
  `wrote ${path.relative(root, outFile)}: ${problems.length} problems, ${courses.length} courses, ${lessons.length} lessons, ${docs.length} docs, ${snapshot.assets.length} asset`,
);
process.exit(0);
