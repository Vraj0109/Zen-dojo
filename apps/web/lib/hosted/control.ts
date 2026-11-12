import { createClient, type Client } from "@libsql/client";

/** The control database maps a signed-in user to their own hosted database (plan 0058). Only used when HABIT_HOSTED=1. */
const SCHEMA = `CREATE TABLE IF NOT EXISTS hosted_users (
  user_id TEXT PRIMARY KEY,
  db_url TEXT NOT NULL,
  created_at TEXT NOT NULL
)`;

const globalForControl = globalThis as unknown as { habitControl?: Client };

/** The control client, opened on first use from CONTROL_DATABASE_URL / CONTROL_DATABASE_AUTH_TOKEN. */
export function getControlClient(env: Record<string, string | undefined> = process.env): Client {
  if (!globalForControl.habitControl) {
    const url = env.CONTROL_DATABASE_URL;
    if (!url) throw new Error("CONTROL_DATABASE_URL is not set");
    // HTTPS, not WebSocket: a Worker cannot reuse a socket across requests.
    const httpUrl = url.startsWith("libsql://") ? "https://" + url.slice("libsql://".length) : url;
    globalForControl.habitControl = createClient(
      env.CONTROL_DATABASE_AUTH_TOKEN ? { url: httpUrl, authToken: env.CONTROL_DATABASE_AUTH_TOKEN } : { url: httpUrl },
    );
  }
  return globalForControl.habitControl;
}

export async function ensureControlSchema(client: Client): Promise<void> {
  await client.execute(SCHEMA);
}

/** The user's database URL, or null when none was provisioned yet. */
export async function getHostedUser(client: Client, userId: string): Promise<{ dbUrl: string; createdAt: string } | null> {
  await ensureControlSchema(client);
  const { rows } = await client.execute({ sql: "SELECT db_url, created_at FROM hosted_users WHERE user_id = ?", args: [userId] });
  const row = rows[0];
  return row ? { dbUrl: String(row[0]), createdAt: String(row[1]) } : null;
}

/** Records the mapping. A second insert for the same user is a no-op (the first one wins). */
export async function insertHostedUser(client: Client, userId: string, dbUrl: string, now: Date = new Date()): Promise<void> {
  await ensureControlSchema(client);
  await client.execute({
    sql: "INSERT OR IGNORE INTO hosted_users (user_id, db_url, created_at) VALUES (?, ?, ?)",
    args: [userId, dbUrl, now.toISOString()],
  });
}

export async function deleteHostedUser(client: Client, userId: string): Promise<void> {
  await ensureControlSchema(client);
  await client.execute({ sql: "DELETE FROM hosted_users WHERE user_id = ?", args: [userId] });
}
