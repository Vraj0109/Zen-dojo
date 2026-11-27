// pnpm content:check-hosted [--origin <url>] [--expect-problems N]
//
// Checks the hosted site's public content API (plan 0115, wave 3 AG11): the version, the unit list, one unit page and
// one problem with its ETag. Prints one PASS or FAIL line per step and a summary. Exit code 0 when every step passes,
// 1 when any step fails, 2 on bad arguments. Read-only: no secrets are sent.
//   --origin <url>       the site to check (default: CONTENT_ORIGIN, HUB_URL without /hub, PUBLIC_SITE_URL, or
//                        https://zen-dojo-lovat.vercel.app)
//   --expect-problems N  also check that the site has exactly N problems (the seeded count is 486)
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import "./lib/register-ts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const usage = "Usage: pnpm content:check-hosted [--origin <url>] [--expect-problems N]";
const REQUEST_TIMEOUT_MS = 20_000;

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

const originFlag = takeFlag("--origin");
const expectFlag = takeFlag("--expect-problems");
if (args.length) {
  console.error(`Unknown arguments: ${args.join(" ")}\n${usage}`);
  process.exit(2);
}

let expectProblems;
if (expectFlag !== undefined) {
  if (!/^\d+$/.test(expectFlag)) {
    console.error(`--expect-problems must be a whole number.\n${usage}`);
    process.exit(2);
  }
  expectProblems = Number(expectFlag);
}

const { contentOrigin } = await import(pathToFileURL(path.join(root, "apps", "web", "lib", "content-sync", "origin.ts")).href);
const { checkHosted } = await import(pathToFileURL(path.join(root, "apps", "web", "lib", "content-sync", "check-hosted.ts")).href);

const origin = (originFlag ?? contentOrigin()).replace(/\/+$/, "");
const fetchWithTimeout = (input, init = {}) => fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

console.log(`content:check-hosted  ${origin}${expectProblems === undefined ? "" : `  (expect ${expectProblems} problems)`}`);

const result = await checkHosted({ origin, fetch: fetchWithTimeout, expectProblems });
for (const step of result.steps) {
  console.log(`${step.ok ? "PASS" : "FAIL"}  ${step.name.padEnd(14)} ${step.detail}`);
}

const passed = result.steps.filter((s) => s.ok).length;
const counts = [
  result.version !== undefined ? `version ${result.version}` : null,
  result.schema !== undefined ? `schema ${result.schema}` : null,
  result.epoch !== undefined ? `epoch ${result.epoch}` : null,
  result.units !== undefined ? `${result.units} units` : null,
  result.problems !== undefined ? `${result.problems} problems` : null,
].filter(Boolean);
if (counts.length) console.log(`site: ${counts.join(", ")}`);
console.log(result.ok ? `OK: ${passed} of ${result.steps.length} steps passed.` : `FAILED: ${passed} of ${result.steps.length} steps passed.`);
process.exit(result.ok ? 0 : 1);
