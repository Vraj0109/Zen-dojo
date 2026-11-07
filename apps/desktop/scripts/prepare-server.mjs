// Build the web app as a self-contained Next.js server and copy it to apps/desktop/server/,
// which electron-builder ships as an extra resource (outside the asar archive).
//
//   node scripts/prepare-server.mjs
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(desktop, "..", "..");
const web = path.join(root, "apps", "web");
const standalone = path.join(web, ".next", "standalone");
const out = path.join(desktop, "server");

console.log("> Building the web app (standalone output)");
const build = spawnSync("pnpm --filter web build", {
  cwd: root,
  stdio: "inherit",
  shell: true, // finds pnpm.cmd on Windows
  env: { ...process.env, HABIT_STANDALONE: "1", NEXT_TELEMETRY_DISABLED: "1" },
});
if (build.status !== 0) process.exit(build.status ?? 1);
if (!existsSync(path.join(standalone, "apps", "web", "server.js"))) {
  console.error(`No server.js in ${standalone}; did the standalone build run?`);
  process.exit(1);
}

console.log("> Copying the server to apps/desktop/server");
rmSync(out, { recursive: true, force: true });
// The app code, without pnpm's symlinked apps/web/node_modules (Node finds those packages in the flat
// node_modules below). Turbopack's aliases in .next/node_modules (e.g. @libsql/client-<hash>) are
// copied as real folders.
const appModules = path.join(standalone, "apps", "web", "node_modules");
cpSync(path.join(standalone, "apps"), path.join(out, "apps"), {
  recursive: true,
  dereference: true,
  filter: (src) => src !== appModules,
});
for (const f of readdirSync(standalone, { withFileTypes: true })) {
  if (f.isFile()) cpSync(path.join(standalone, f.name), path.join(out, f.name));
}
// pnpm links packages (node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>), and installers drop symlinks.
// Copy each package once into a flat node_modules instead, like npm's layout.
hoistPackages(path.join(standalone, "node_modules", ".pnpm"), path.join(out, "node_modules"));
cpSync(path.join(web, ".next", "static"), path.join(out, "apps", "web", ".next", "static"), { recursive: true });
if (existsSync(path.join(web, "public"))) {
  cpSync(path.join(web, "public"), path.join(out, "apps", "web", "public"), { recursive: true });
}

// Never ship personal files that file tracing may have picked up (your database, logs, env files, the plan PDF).
for (const name of ["data", "logs", ".env", "SPEC.md"]) rmSync(path.join(out, name), { recursive: true, force: true });
const personal = walk(out).filter((f) => /\.(db|db-wal|db-shm|pdf|log)$/i.test(f) || /[\\/]\.env(\.|$)/.test(f));
if (personal.length) {
  console.error("Refusing to bundle personal files:\n  " + personal.join("\n  "));
  process.exit(1);
}

const mb = walk(out).reduce((sum, f) => sum + statSync(f).size, 0) / 1e6;
console.log(`> Done: ${out} (${mb.toFixed(0)} MB)`);

/**
 * Turn pnpm's store into npm's layout: each package once in `dest`, and when two versions are needed,
 * the less-used one nested under the packages that depend on it (dest/<pkg>/node_modules/<dep>).
 * @param {string} store node_modules/.pnpm
 * @param {string} dest
 */
function hoistPackages(store, dest) {
  /** Store entries (e.g. "next@16.4.5_…") with the package each one holds and the entries it links to. */
  const entries = [];
  for (const entry of readdirSync(store)) {
    const modules = path.join(store, entry, "node_modules");
    if (entry === "node_modules" || !existsSync(modules)) continue;
    /** @type {string | undefined} */
    let own;
    /** @type {Map<string, string>} dep name -> store entry */
    const deps = new Map();
    for (const name of packageNames(modules)) {
      const p = path.join(modules, name);
      if (lstatSync(p).isSymbolicLink()) {
        deps.set(name, path.relative(store, realpathSync(p)).split(path.sep)[0]);
      } else own = name;
    }
    if (own) entries.push({ entry, name: own, src: path.join(modules, own), deps });
  }

  // Top level: per package name, the version most other packages link to.
  /** @type {Map<string, Map<string, number>>} */
  const uses = new Map();
  for (const e of entries) uses.set(e.name, uses.get(e.name) ?? new Map([[e.entry, 0]])).get(e.name)?.set(e.entry, 0);
  for (const e of entries) for (const [n, target] of e.deps) uses.get(n)?.set(target, (uses.get(n)?.get(target) ?? 0) + 1);
  /** @type {Map<string, string>} */
  const top = new Map();
  for (const [n, counts] of uses) top.set(n, [...counts].sort((a, b) => b[1] - a[1])[0][0]);

  const byEntry = new Map(entries.map((e) => [e.entry, e]));
  for (const e of entries) if (top.get(e.name) === e.entry) cpSync(e.src, path.join(dest, e.name), { recursive: true, dereference: true });
  let nested = 0;
  for (const e of entries) {
    if (top.get(e.name) !== e.entry) continue;
    for (const [n, target] of e.deps) {
      if (top.get(n) === target) continue;
      const dep = byEntry.get(target);
      if (!dep) continue;
      cpSync(dep.src, path.join(dest, e.name, "node_modules", n), { recursive: true, dereference: true });
      nested++;
      if ([...dep.deps].some(([dn, dt]) => top.get(dn) !== dt)) {
        console.error(`${dep.entry} needs nested versions two levels deep; not supported.`);
        process.exit(1);
      }
    }
  }
  console.log(`> Bundled ${top.size} packages${nested ? ` (${nested} nested for version differences)` : ""}`);
}

/** @param {string} modules @returns {string[]} e.g. ["next", "@libsql/client"] */
function packageNames(modules) {
  return readdirSync(modules).flatMap((n) =>
    n.startsWith("@") ? readdirSync(path.join(modules, n)).map((s) => `${n}/${s}`) : n.startsWith(".") ? [] : [n],
  );
}

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
