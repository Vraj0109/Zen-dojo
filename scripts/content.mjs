// pnpm content:add <file.json>       add one item, or a list of items (missing test outputs are computed)
// pnpm content:sync <folder>         add or update every *.json in a folder; unchanged files are skipped; --prune removes items whose file is gone
// pnpm content:list                  list stored items
// pnpm content:remove <id>           remove one item (the built-in content comes back)
// pnpm content:export <file.json>    write every stored item to one file
// pnpm content:seed                  copy every built-in problem into the database (optional, for a hosted copy)
//
// Without --url the command writes straight to this computer's database (DATABASE_URL, or data/habit.db; it asks for --yes
// before touching the real data/habit.db). With --url <app> --token <t> it talks to a running or hosted app through
// /api/admin/content (the app needs CONTENT_ADMIN_TOKEN). Formats: docs/content-editing.md, section "Add one thing".
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const has = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
};
const url = flag("--url")?.replace(/\/$/, "");
const token = flag("--token") ?? process.env.CONTENT_ADMIN_TOKEN;
const yes = has("--yes");
const prune = has("--prune");
const [command, target] = args;

const fail = (...lines) => {
  for (const l of lines) console.error(l);
  process.exit(1);
};
const usage = () =>
  fail(
    "Usage: pnpm content:add <file.json> | content:sync <folder> | content:list | content:remove <id> | content:export <file> | content:seed",
    "Add --url <app> --token <token> to use a running or hosted app.",
  );
if (!["add", "sync", "list", "remove", "export", "seed"].includes(command ?? "")) usage();

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    return fail(`Cannot read ${file} as JSON: ${e.message}`);
  }
};
const show = (r, label) => {
  if (r.ok) console.log(`${r.changed ? "stored " : "same   "} ${r.id}${r.warnings?.length ? "  (" + r.warnings.join(" ") + ")" : ""}`);
  else {
    console.error(`REFUSED ${label}:`);
    r.errors.forEach((m, i) => console.error(`  ${i + 1}. ${m}`));
  }
  return r.ok;
};

async function api(method, query, body) {
  if (!token) fail("Give --token <token> (or set CONTENT_ADMIN_TOKEN).");
  const res = await fetch(`${url}/api/admin/content${query}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404 && !query) fail("The app answered 404: it has no CONTENT_ADMIN_TOKEN set, or the address is wrong.");
  const text = await res.text();
  try {
    return { status: res.status, json: JSON.parse(text) };
  } catch {
    return { status: res.status, json: { error: text.slice(0, 200) } };
  }
}

let local;
async function direct() {
  if (local) return local;
  const { databaseUrl } = await import("@/lib/db");
  const db = databaseUrl();
  if (/data\/habit\.db$/.test(db) && !yes) fail(`This would change your real data (${db}).`, "Close the app and add --yes, or point DATABASE_URL at another file, or use --url with a running app.");
  local = { ...(await import("@/lib/content")), ...(await import("@/lib/content-admin")) };
  return local;
}

let bad = 0;
const results = (r, label) => (r.json.results ?? [{ ok: false, errors: [r.json.error ?? "failed"] }]).forEach((x) => show(x, label) || bad++);

if (command === "add") {
  if (!target || !existsSync(target)) fail("Usage: pnpm content:add <file.json>", target ? `No such file: ${target}` : "");
  const data = readJson(target);
  if (url) results(await api("POST", "", data), target);
  else (await (await direct()).addItems(data)).forEach((x) => show(x, target) || bad++);
} else if (command === "sync") {
  if (!target || !existsSync(target) || !statSync(target).isDirectory()) fail("Usage: pnpm content:sync <folder>");
  const files = readdirSync(target).filter((f) => f.endsWith(".json")).sort();
  const source = `sync:${path.basename(path.resolve(target))}`;
  const seen = new Set();
  for (const f of files) {
    const data = readJson(path.join(target, f));
    if (url) results(await api("POST", "", data), f);
    else {
      for (const x of await (await direct()).addItems(data, source)) {
        if (x.ok) seen.add(x.id);
        show(x, f) || bad++;
      }
    }
  }
  if (prune) {
    if (url) console.error("--prune only works on a local database (it needs to know which items came from this folder). Nothing was removed.");
    else {
      const c = await direct();
      for (const row of await c.listItems()) {
        if (row.source === source && !seen.has(row.id) && (await c.deleteItem(row.id))) console.log(`removed ${row.id}`);
      }
    }
  }
} else if (command === "list") {
  const rows = url ? ((await api("GET", "")).json.items ?? []) : await (await direct()).listItems();
  for (const r of rows) console.log(`${r.id.padEnd(40)} ${r.type.padEnd(8)} ${r.source.padEnd(14)} ${r.rev}`);
  if (rows.length === 0) console.log("No stored items.");
} else if (command === "remove") {
  if (!target) usage();
  if (url) {
    const r = await api("DELETE", `?id=${encodeURIComponent(target)}`);
    console.log(r.status === 200 ? `removed ${target}` : r.json.error);
    if (r.status !== 200) bad++;
  } else {
    const ok = await (await direct()).deleteItem(target);
    console.log(ok ? `removed ${target}` : `No such item: ${target}`);
    if (!ok) bad++;
  }
} else if (command === "export") {
  if (!target) usage();
  const rows = url
    ? await Promise.all(((await api("GET", "")).json.items ?? []).map(async (r) => (await api("GET", `?id=${encodeURIComponent(r.id)}`)).json))
    : await (await direct()).listItems();
  const mine = rows.filter((r) => r.source !== "builtin");
  writeFileSync(target, JSON.stringify(mine.map((r) => r.item), null, 2) + "\n");
  console.log(`wrote ${mine.length} items to ${target}`);
} else if (command === "seed") {
  if (url) fail("content:seed works on a local database only.");
  console.log(`stored ${await (await direct()).seedBuiltinProblems()} built-in problems as items (source builtin)`);
}
process.exit(bad > 0 ? 1 : 0);
