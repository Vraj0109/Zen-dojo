// pnpm content:fixture
//
// Writes packages/shared/test/fixtures/content-mini.json: a small ContentSnapshot (types.ts) for tests. It seeds an
// in-memory content database from the repo files, reads the pieces it needs back from that database, and writes them
// as one snapshot:
//   - 12 problems: 2 design, 1 "brute: same", 3 with Java, Python and brute force in every language, 6 more function problems
//   - 3 courses (sd, lld, dsa-patterns) with their first 2 lessons each
//   - one doc of each kind (lists cut to 3 items, so the file stays small), plus one LLD project
//   - one 1x1 PNG asset, referenced by an image block in the first fixture lesson (the files have no images yet)
// Run it again after the content changes; commit the result. Tests read the file through seedFixture (test-helpers.ts).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFile = path.join(root, "packages", "shared", "test", "fixtures", "content-mini.json");

const { CONTENT_SCHEMA_VERSION, JUDGE_PROBLEMS, sha256Hex } = await import("@habit/shared");
const { getContentDb, resetContentDbForTests } = await import("@/lib/content-db/client");
const { loadDoc, loadLesson, loadProblem, loadCourse } = await import("@/lib/content-db/load");
const { seedContent, lessonSources, docSources } = await import("@/lib/content-db/seed");

// A 1x1 transparent PNG (67 bytes).
const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const db = await getContentDb({ CONTENT_DATABASE_URL: ":memory:" });
const seeded = await seedContent(db, { actor: "fixture", batch: 50 });
console.log(`seeded in-memory database: ${seeded.changed} entities`);

// ---- problems -------------------------------------------------------------------------------------------------------

const all = new Map();
for (const id of Object.keys(JUDGE_PROBLEMS).sort()) all.set(id, await loadProblem(db, id));

const codeLangs = (p, variant) => {
  const block = p.solution.sections.flatMap((s) => s.blocks).find((b) => b.type === "code" && b.variant === variant);
  return block ? Object.keys(block.code) : [];
};
const hasBruteSame = (p) => p.solution.sections.some((s) => s.blocks.some((b) => b.label === "brute-same"));
const allThreeLangs = (p) => ["cpp", "java", "python"].every((l) => codeLangs(p, "optimal").includes(l)) && ["cpp", "java", "python"].every((l) => codeLangs(p, "brute").includes(l));

const picked = [];
const take = (n, pred) => {
  let count = 0;
  for (const p of all.values()) {
    if (count >= n) break;
    if (picked.includes(p)) continue;
    if (pred(p)) {
      picked.push(p);
      count++;
    }
  }
};
take(2, (p) => p.row.kind === "design");
take(1, (p) => p.row.kind === "function" && hasBruteSame(p));
take(3, (p) => p.row.kind === "function" && allThreeLangs(p));
// Six more function problems from different sources, so the fixture is not one site's problems only.
const sources = new Set();
for (const p of [...all.values()]) {
  if (picked.length >= 12) break;
  if (picked.includes(p) || p.row.kind !== "function" || sources.has(p.row.source)) continue;
  sources.add(p.row.source);
  picked.push(p);
}
for (const p of [...all.values()]) {
  if (picked.length >= 12) break;
  if (!picked.includes(p) && p.row.kind === "function") picked.push(p);
}
if (picked.length !== 12) throw new Error(`expected 12 fixture problems, got ${picked.length}`);

// ---- lessons --------------------------------------------------------------------------------------------------------

const lessonIdsOf = (courseId) =>
  lessonSources()
    .filter((s) => s.ctx.courseId === courseId)
    .sort((a, b) => a.ctx.ord - b.ctx.ord || a.id.localeCompare(b.id))
    .slice(0, 2)
    .map((s) => s.id);

const courseIds = ["sd", "lld", "dsa-patterns"];
const courses = [];
const lessons = [];
for (const id of courseIds) {
  const c = await loadCourse(db, id);
  if (!c) throw new Error(`course ${id} is missing from the seeded database`);
  courses.push(c);
  for (const lessonId of lessonIdsOf(id)) {
    const l = await loadLesson(db, lessonId);
    if (!l) throw new Error(`lesson ${lessonId} is missing from the seeded database`);
    lessons.push(l);
  }
}

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

// ---- docs -----------------------------------------------------------------------------------------------------------

/** Keeps the shape of a body and cuts every list and every object to its first 3 entries. */
function trim(v) {
  if (Array.isArray(v)) return v.slice(0, 3).map(trim);
  if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).slice(0, 3).map(([k, x]) => [k, trim(x)]));
  return v;
}

const docs = [];
const seenKinds = new Set();
for (const src of docSources()) {
  if (seenKinds.has(src.kind)) continue; // one doc per kind (the first LLD project only)
  seenKinds.add(src.kind);
  const d = await loadDoc(db, src.kind, src.id);
  if (!d) throw new Error(`doc ${src.kind}:${src.id} is missing from the seeded database`);
  docs.push({ row: { kind: d.row.kind, id: d.row.id, body: trim(d.row.body) } });
}

// ---- snapshot -------------------------------------------------------------------------------------------------------

const entities = [
  ...courses.map((value) => ({ kind: "course", value })),
  ...lessons.map((value) => ({ kind: "lesson", value })),
  ...picked.map((value) => ({ kind: "problem", value })),
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
  `wrote ${path.relative(root, outFile)}: ${picked.length} problems, ${courses.length} courses, ${lessons.length} lessons, ${docs.length} docs, ${snapshot.assets.length} asset`,
);
