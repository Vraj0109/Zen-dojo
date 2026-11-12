import { beforeEach, describe, expect, it } from "vitest";
// @ts-expect-error -- this @types/node has no declarations for node:sqlite (it exists at runtime)
import { DatabaseSync } from "node:sqlite";
import { eq } from "drizzle-orm";
import { clearUserDbCacheForTest, dropHostedUserData, getDbFor, MIGRATIONS } from "../db";
import * as schema from "../schema";
import { createDoClient, type UserDbNamespace, type UserDbStub } from "./do-client";
import { UserDbCore, type UserDbStorage } from "./user-db-core";

/** An in-memory stand-in for a Durable Object's `ctx.storage`, backed by node:sqlite (the key-value API lives in a table so it rolls back with the SQL). */
function fakeStorage(): UserDbStorage {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE _cf_KV (k TEXT PRIMARY KEY, v TEXT)");
  let depth = 0;
  return {
    sql: {
      exec(query: string, ...bindings: unknown[]) {
        const script = bindings.length === 0 && /;\s*\S/.test(query);
        if (script) {
          db.exec(query);
          return { columnNames: [], raw: () => [], rowsWritten: 0 };
        }
        const stmt = db.prepare(query);
        stmt.setReturnArrays(true);
        const names: string[] = stmt.columns().map((c: { name: string }) => c.name);
        const rows: unknown[][] = stmt.all(...bindings);
        return { columnNames: names, raw: () => rows, rowsWritten: 0 };
      },
    },
    transactionSync<T>(fn: () => T): T {
      if (depth++ > 0) throw new Error("nested transactionSync is not used");
      db.exec("BEGIN");
      try {
        const r = fn();
        db.exec("COMMIT");
        return r;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      } finally {
        depth--;
      }
    },
    kv: {
      get: (k) => {
        const r = db.prepare("SELECT v FROM _cf_KV WHERE k = ?").get(k) as { v: string } | undefined;
        return r ? JSON.parse(r.v) : undefined;
      },
      put: (k, v) => void db.prepare("INSERT OR REPLACE INTO _cf_KV (k, v) VALUES (?, ?)").run(k, JSON.stringify(v)),
      delete: (k) => void db.prepare("DELETE FROM _cf_KV WHERE k = ?").run(k),
    },
  };
}

/** What the Durable Object RPC does: arguments and results cross a structured clone. */
function stubFor(core: UserDbCore): UserDbStub {
  const wire = <T,>(v: T): T => structuredClone(v);
  return {
    exec: async (s) => wire(core.exec(wire(s))),
    batch: async (s) => wire(core.batch(wire(s))),
    execMulti: async (s) => core.execMulti(s),
    schemaVersion: async () => core.schemaVersion(),
    migrate: async (m) => core.migrate(wire(m)),
    dropAll: async () => core.dropAll(),
  };
}

const newClient = () => createDoClient(stubFor(new UserDbCore(fakeStorage())));

describe("Durable Object adapter (execute, rows, batch)", () => {
  it("binds arguments and returns libSQL-shaped rows", async () => {
    const c = newClient();
    await c.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT, done INTEGER, note TEXT)");
    const ins = await c.execute({ sql: "INSERT INTO t (name, done, note) VALUES (?, ?, ?)", args: ["a", true, undefined as never] });
    expect(ins.rowsAffected).toBe(1);
    expect(ins.lastInsertRowid).toBe(BigInt(1));
    const rs = await c.execute({ sql: "SELECT id, name, done, note FROM t WHERE name = ?", args: ["a"] });
    expect(rs.columns).toEqual(["id", "name", "done", "note"]);
    expect(rs.rows).toHaveLength(1);
    const row = rs.rows[0];
    expect(row[1]).toBe("a");
    expect(row.name).toBe("a");
    expect(row.done).toBe(1);
    expect(row.note).toBeNull();
    expect(Object.keys(row)).toEqual(["0", "1", "2", "3", "id", "name", "done", "note"]);
    const upd = await c.execute({ sql: "UPDATE t SET name = ?", args: ["b"] });
    expect(upd.rowsAffected).toBe(1);
    expect(upd.lastInsertRowid).toBeUndefined();
  });

  it("rejects named arguments clearly", async () => {
    await expect(newClient().execute({ sql: "SELECT :a", args: { a: 1 } })).rejects.toThrow(/Named arguments/);
  });

  it("batch is atomic: a failing statement rolls back the earlier ones", async () => {
    const c = newClient();
    await c.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)");
    await expect(
      c.batch([{ sql: "INSERT INTO t (v) VALUES (?)", args: ["x"] }, "INSERT INTO missing (v) VALUES (1)"], "write"),
    ).rejects.toThrow();
    expect((await c.execute("SELECT COUNT(*) AS n FROM t")).rows[0].n).toBe(0);
    const ok = await c.batch([{ sql: "INSERT INTO t (v) VALUES (?)", args: ["x"] }, "SELECT v FROM t"], "write");
    expect(ok[0].rowsAffected).toBe(1);
    expect(ok[1].rows[0].v).toBe("x");
  });

  it("executeMultiple drops BEGIN/COMMIT (the object owns the transaction) and runs trigger scripts", async () => {
    const c = newClient();
    await c.executeMultiple(
      "BEGIN;\nCREATE TABLE a (v INTEGER);\nCREATE TABLE log (n INTEGER);\nCREATE TRIGGER a_ins AFTER INSERT ON a BEGIN INSERT INTO log VALUES (new.v); END;\nCOMMIT;",
    );
    await c.execute("INSERT INTO a VALUES (7)");
    expect((await c.execute("SELECT n FROM log")).rows[0].n).toBe(7);
  });

  it("transaction buffers writes into one atomic batch and refuses reads", async () => {
    const c = newClient();
    await c.execute("CREATE TABLE t (v TEXT)");
    const tx = await c.transaction("write");
    await tx.execute({ sql: "INSERT INTO t VALUES (?)", args: ["1"] });
    await expect(tx.execute("SELECT * FROM t")).rejects.toThrow(/Reads inside/);
    await tx.rollback();
    expect((await c.execute("SELECT COUNT(*) AS n FROM t")).rows[0].n).toBe(0);
    const tx2 = await c.transaction("write");
    await tx2.execute({ sql: "INSERT INTO t VALUES (?)", args: ["2"] });
    await tx2.commit();
    expect((await c.execute("SELECT COUNT(*) AS n FROM t")).rows[0].n).toBe(1);
  });
});

describe("Durable Object migrations", () => {
  it("runs each migration once and records the version (PRAGMA user_version)", async () => {
    const core = new UserDbCore(fakeStorage());
    const c = createDoClient(stubFor(core));
    const m = ["CREATE TABLE a (v TEXT);", "ALTER TABLE a ADD COLUMN w TEXT;"];
    await c.applyMigrations(m);
    await c.applyMigrations(m); // second time: nothing runs (would fail on CREATE TABLE)
    expect(core.schemaVersion()).toBe(2);
    expect((await c.execute("PRAGMA user_version")).rows[0][0]).toBe(2);
    await c.applyMigrations([...m, "CREATE TABLE b (v TEXT);"]);
    expect(core.schemaVersion()).toBe(3);
  });

  it("a failing migration leaves the previous version and its own changes undone", async () => {
    const core = new UserDbCore(fakeStorage());
    expect(() => core.migrate(["CREATE TABLE a (v TEXT);", "CREATE TABLE b (v TEXT); CREATE TABLE a (v TEXT);"])).toThrow();
    expect(core.schemaVersion()).toBe(1);
    const c = createDoClient(stubFor(core));
    await expect(c.execute("SELECT * FROM b")).rejects.toThrow();
  });

  it("every shipped migration fits one Durable Object statement (100 KB) and the whole list applies", () => {
    for (const m of MIGRATIONS) expect(new TextEncoder().encode(m).length).toBeLessThan(100_000);
    const core = new UserDbCore(fakeStorage());
    core.migrate(MIGRATIONS);
    expect(core.schemaVersion()).toBe(MIGRATIONS.length);
  });

  it("delete-my-data drops every table and the next migrate starts fresh", () => {
    const core = new UserDbCore(fakeStorage());
    core.migrate(MIGRATIONS);
    const { dropped } = core.dropAll();
    expect(dropped).toBeGreaterThan(10);
    expect(core.schemaVersion()).toBe(0);
    core.migrate(MIGRATIONS);
    expect(core.schemaVersion()).toBe(MIGRATIONS.length);
  });
});

describe("getDbFor on Cloudflare", () => {
  beforeEach(() => clearUserDbCacheForTest());

  function namespace() {
    const cores = new Map<string, UserDbCore>();
    const asked: string[] = [];
    const ns: UserDbNamespace = {
      idFromName: (name) => (asked.push(name), name),
      get: (id) => {
        const key = String(id);
        if (!cores.has(key)) cores.set(key, new UserDbCore(fakeStorage()));
        return stubFor(cores.get(key)!);
      },
    };
    return { ns, cores, asked };
  }

  it("uses one Durable Object per user (id from the user id), migrates once and works with Drizzle", async () => {
    const { ns, cores, asked } = namespace();
    const a1 = await getDbFor("user-a", { namespace: ns });
    const a2 = await getDbFor("user-a", { namespace: ns });
    expect(a2).toBe(a1);
    await a1.insert(schema.settings).values({ key: "k", value: "v" });
    const row = await a1.select().from(schema.settings).where(eq(schema.settings.key, "k"));
    expect(row).toEqual([{ key: "k", value: "v" }]);
    const b = await getDbFor("user-b", { namespace: ns });
    expect(await b.select().from(schema.settings)).toEqual([]); // isolated from user-a
    expect(asked).toEqual(["user-a", "user-b"]);
    expect(cores.get("user-a")!.schemaVersion()).toBe(MIGRATIONS.length);
  });

  it("needs no control database, provisioning or Turso settings", async () => {
    const { ns } = namespace();
    await expect(getDbFor("u", { namespace: ns, env: {} })).resolves.toBeTruthy();
  });

  it("dropHostedUserData drops the user's tables and is a no-op without the binding", async () => {
    const { ns, cores } = namespace();
    await getDbFor("u", { namespace: ns });
    const r = await dropHostedUserData("u", { namespace: ns });
    expect(r?.dropped).toBeGreaterThan(10);
    expect(cores.get("u")!.schemaVersion()).toBe(0);
    expect(await dropHostedUserData("u")).toBeNull(); // no Workers context in Node
  });
});

describe("big multi-row inserts", () => {
  it("splits an insert over the 100-parameter limit into an atomic batch", async () => {
    const { splitMultiRowInsert } = await import("./do-client");
    const rows = 20;
    const tuple = "(null, ?, ?, ?, ?, ?, ?, ?, ?, null)";
    const sql = `insert into "tasks" ("id", "date", "scope", "template_key", "title", "category", "xp", "minutes", "status", "done_on") values ${Array(rows).fill(tuple).join(", ")}`;
    const args = Array.from({ length: rows * 8 }, (_, i) => i);
    const parts = splitMultiRowInsert({ sql, args });
    expect(parts).not.toBeNull();
    expect(parts!.length).toBeGreaterThan(1);
    expect(parts!.every((p) => (p.args?.length ?? 0) <= 90)).toBe(true);
    expect(parts!.flatMap((p) => p.args ?? [])).toEqual(args);
    expect(splitMultiRowInsert({ sql: "insert into t (a) values (?)", args: [1] })).toBeNull();
  });
});
