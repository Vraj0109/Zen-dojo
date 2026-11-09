// pnpm pack:check <file.json>
// Checks a content pack with the same code the app uses when you import it, and says what is wrong in plain words.
// No network, no compiler needed. Exit code 0 = the pack would import, 1 = it would not.
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file || file.startsWith("-")) {
  console.error("Usage: pnpm pack:check <pack.json>");
  process.exit(2);
}

const { validatePack, packItems } = await import("@habit/shared");

let text;
try {
  text = readFileSync(file, "utf8");
} catch (e) {
  console.error(`Cannot read ${file}: ${e.message}`);
  process.exit(2);
}
if (text.length > 2_000_000) {
  console.error(`${file} is over 2 MB, which the app refuses to import.`);
  process.exit(1);
}
let json;
try {
  json = JSON.parse(text);
} catch (e) {
  console.error(`${file} is not valid JSON: ${e.message}`);
  process.exit(1);
}

const check = validatePack(json);
if (!check.ok) {
  console.error(`${file}: ${check.errors.length} problem${check.errors.length === 1 ? "" : "s"} found:`);
  check.errors.forEach((m, i) => console.error(`  ${i + 1}. ${m}`));
  if (check.errors.some((m) => m.includes('"output"'))) console.error("Hint: if tests have no \"output\" yet, this is a draft. Run pnpm pack:build <draft> -o <pack> to write the outputs from the C++ solution.");
  process.exit(1);
}
const items = packItems(check.pack);
const problems = items.filter((i) => i.type === "problem");
console.log(`OK: "${check.pack.title}" (${check.pack.id}): ${check.pack.sections.length} section(s), ${items.length - problems.length} lesson(s), ${problems.length} problem(s).`);
for (const w of check.warnings) console.log(`Warning: ${w}`);
