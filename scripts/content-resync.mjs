// pnpm content:resync [--url <libsql url>]
//
// Owner only (plan 0115 rule 6). Raises the content epoch by one, so every copy of the content downloads its followed
// units again on its next sync. Writes one admin_audit row (action "resync", actor "owner").
// Without --url it changes this computer's data/content.db. With --url it changes that database, and the token comes
// from CONTENT_DATABASE_AUTH_TOKEN (a full-access token). A remote --url without the token is refused.
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

const url = flag("--url");
if (args.length) {
  console.error(`Unknown arguments: ${args.join(" ")}`);
  console.error("Usage: pnpm content:resync [--url <libsql url>]");
  process.exit(1);
}

const { contentDatabaseUrl, getContentDb, resetContentDbForTests } = await import("@/lib/content-db/client");
const { bumpContentEpoch } = await import("@/lib/content-sync/resync");

const target = url ?? contentDatabaseUrl({});
const isLocal = target === ":memory:" || target.startsWith("file:");
const token = process.env.CONTENT_DATABASE_AUTH_TOKEN || undefined;
if (!isLocal && !token) {
  console.error("content:resync needs CONTENT_DATABASE_AUTH_TOKEN for a remote database (the owner's full-access token).");
  process.exit(1);
}

try {
  const db = await getContentDb({ CONTENT_DATABASE_URL: target, CONTENT_DATABASE_AUTH_TOKEN: token });
  const { from, to } = await bumpContentEpoch(db, Date.now());
  await resetContentDbForTests();
  console.log(`content:resync  target ${isLocal ? target.replace(/^file:/, "") : url}`);
  console.log(`content epoch ${from} -> ${to}`);
  console.log("Every copy downloads its followed units again on its next sync.");
} catch (err) {
  console.error("content:resync failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
