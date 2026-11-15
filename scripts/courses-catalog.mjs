// pnpm courses:catalog <courses-repo-dir>
// Builds catalog.json for the course library repo (Vraj0109/zen-dojo-courses) from every courses/*.json.
// Uses the same validatePack as the app. Fails (exit 1) if any pack is invalid, has a "target", or has no "revision".
// See docs/content-packs.md, "Course library".
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir || dir.startsWith("-")) {
  console.error("Usage: pnpm courses:catalog <courses-repo-dir>");
  process.exit(2);
}

const { DEFAULT_COURSE_CATALOG_URL, FEED_FORMAT, FEED_VERSION, PACK_LIMITS, packItems, validateFeed, validatePack } = await import("@habit/shared");
const base = DEFAULT_COURSE_CATALOG_URL.slice(0, DEFAULT_COURSE_CATALOG_URL.lastIndexOf("/") + 1);

let files;
try {
  files = readdirSync(join(dir, "courses")).filter((f) => f.endsWith(".json")).sort();
} catch (e) {
  console.error(`Cannot read ${join(dir, "courses")}: ${e.message}`);
  process.exit(2);
}

const problems = [];
const packs = [];
for (const f of files) {
  const bytes = readFileSync(join(dir, "courses", f));
  const where = `courses/${f}`;
  if (bytes.length > PACK_LIMITS.bytes) {
    problems.push(`${where}: over 2 MB, which the app refuses.`);
    continue;
  }
  let json;
  try {
    json = JSON.parse(bytes.toString("utf8"));
  } catch (e) {
    problems.push(`${where}: not valid JSON: ${e.message}`);
    continue;
  }
  const check = validatePack(json);
  if (!check.ok) {
    problems.push(...check.errors.map((m) => `${where}: ${m}`));
    continue;
  }
  const p = check.pack;
  const before = problems.length;
  if (p.target) problems.push(`${where}: library courses must not have a "target" (they are courses of their own).`);
  if (!p.revision) problems.push(`${where}: "revision" is required for library courses (for example "1.0.0").`);
  if (`${p.id}.json` !== f) problems.push(`${where}: the file name must be the pack id ("${p.id}.json").`);
  if (problems.length > before) continue;
  packs.push({
    id: p.id,
    title: p.title,
    description: p.description,
    version: p.revision,
    url: `${base}courses/${f}`,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    items: packItems(p).length,
    category: p.category ?? "Other",
  });
}

if (problems.length > 0) {
  console.error(`${problems.length} problem${problems.length === 1 ? "" : "s"} found:`);
  problems.forEach((m, i) => console.error(`  ${i + 1}. ${m}`));
  process.exit(1);
}

packs.sort((a, b) => a.title.localeCompare(b.title, "en"));
const catalog = { format: FEED_FORMAT, version: FEED_VERSION, packs };
const feed = validateFeed(catalog);
if (!feed.ok) {
  console.error(`The catalog is not a valid feed: ${feed.errors.join(" | ")}`);
  process.exit(1);
}
writeFileSync(join(dir, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
for (const p of packs) console.log(`${p.id} ${p.version} ${p.category}: "${p.title}", ${p.items} item(s), ${p.bytes} bytes`);
console.log(`Wrote ${join(dir, "catalog.json")} with ${packs.length} course${packs.length === 1 ? "" : "s"}.`);
