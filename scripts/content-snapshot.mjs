// Download all content units from the hosted site and write a ready, migrated content.db (plan 0115 step 5, 9).
//
//   node scripts/content-snapshot.mjs --out <file.db> [--origin <url>]
//
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Hook typescript imports for @habit/shared and @/...
register("./lib/register-ts.mjs", import.meta.url);

const { CONTENT_SCHEMA_VERSION, validateSnapshotChunk } = await import("@habit/shared");
const { CONTENT_MIGRATIONS } = await import("../apps/web/lib/content-db/migrations.ts");
const { applyUnits } = await import("../apps/web/lib/content-sync/apply.ts");
const schema = await import("../apps/web/lib/content-db/schema.ts");
const { createClient } = await import("@libsql/client");
const { drizzle } = await import("drizzle-orm/libsql");

const args = process.argv.slice(2);
function getFlag(name) {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  if (!v || v.startsWith("--")) {
    console.error(`Flag ${name} requires a value`);
    process.exit(1);
  }
  return v;
}

const outPath = getFlag("--out");
const originFlag = getFlag("--origin");

if (!outPath) {
  console.error("Usage: node scripts/content-snapshot.mjs --out <file.db> [--origin <url>]");
  process.exit(1);
}

const targetFile = path.resolve(outPath);
const tempFile = `${targetFile}.tmp-${Date.now()}`;
const origin = (originFlag || process.env.PUBLIC_SITE_URL || process.env.CONTENT_ORIGIN || "https://zen-dojo-lovat.vercel.app").replace(/\/+$/, "");

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`GET ${url} failed with ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  console.log(`content:snapshot fetching from ${origin}`);

  // 1. Get version & schema
  const versionInfo = await fetchJson(`${origin}/api/content/version`);
  if (
    !versionInfo ||
    typeof versionInfo.version !== "number" ||
    typeof versionInfo.schema !== "number" ||
    typeof versionInfo.epoch !== "number"
  ) {
    throw new Error(`Invalid version response from ${origin}/api/content/version`);
  }
  const { version, schema: remoteSchema, epoch } = versionInfo;
  if (remoteSchema > CONTENT_SCHEMA_VERSION) {
    throw new Error(
      `Server schema version (${remoteSchema}) is newer than client schema version (${CONTENT_SCHEMA_VERSION}). A newer app version is required.`,
    );
  }

  // 2. Get list of units
  const units = await fetchJson(`${origin}/api/content/units?v=${version}`);
  if (!Array.isArray(units)) {
    throw new Error(`Invalid units response from ${origin}/api/content/units?v=${version}`);
  }
  console.log(`content:snapshot found ${units.length} units (content version ${version})`);

  // 3. Download each unit's pages
  /** @type {import("../apps/web/lib/content-sync/apply.ts").UnitPage[]} */
  const unitPages = [];
  let totalEntities = 0;
  let totalAssets = 0;

  for (const u of units) {
    if (!u.unit) continue;
    for (let pageNum = 0; ; pageNum++) {
      const pageUrl = `${origin}/api/content/unit/${encodeURIComponent(u.unit)}?v=${version}&page=${pageNum}`;
      const res = await fetch(pageUrl, { headers: { Accept: "application/json" } });
      if (res.status === 404 && pageNum === 0) {
        // Unit has no live entities
        break;
      }
      if (!res.ok) {
        throw new Error(`Failed to download unit ${u.unit} page ${pageNum}: ${res.status}`);
      }
      const pageData = await res.json();
      const checked = validateSnapshotChunk(pageData);
      if (!checked.ok) {
        throw new Error(`Invalid snapshot chunk for unit ${u.unit} page ${pageNum}: ${checked.errors.join("; ")}`);
      }
      unitPages.push({ unit: u.unit, entities: checked.value.entities, assets: checked.value.assets });
      totalEntities += checked.value.entities.length;
      totalAssets += checked.value.assets.length;
      if (pageData.next === undefined || pageData.next === null) break;
    }
  }

  console.log(`content:snapshot downloaded ${unitPages.length} pages (${totalEntities} entities, ${totalAssets} assets)`);

  // 4. Create and migrate local content database
  mkdirSync(path.dirname(targetFile), { recursive: true });
  rmSync(tempFile, { force: true });

  const client = createClient({ url: `file:${tempFile.replaceAll("\\", "/")}` });
  try {
    // Run migrations
    for (let v = 0; v < CONTENT_MIGRATIONS.length; v++) {
      await client.executeMultiple(`BEGIN;\n${CONTENT_MIGRATIONS[v]}\nPRAGMA user_version = ${v + 1};\nCOMMIT;`);
    }

    const db = drizzle(client, { schema });
    // Apply units in a single transaction; the copy records the epoch it was downloaded at (plan 0115 rule 6).
    await applyUnits(db, unitPages, { version, epoch });
  } finally {
    client.close();
  }

  // 5. Replace target file atomically
  if (existsSync(targetFile)) {
    rmSync(targetFile, { force: true });
  }
  renameSync(tempFile, targetFile);

  // Companion version file for fast lookup
  writeFileSync(`${targetFile}.version`, String(version));

  console.log(`content:snapshot wrote ${targetFile} (version ${version}, epoch ${epoch})`);
}

main().catch((err) => {
  console.error("content:snapshot failed:", err.message || err);
  try {
    rmSync(tempFile, { force: true });
  } catch {}
  process.exit(1);
});
