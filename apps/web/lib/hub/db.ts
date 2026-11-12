// Hub database (plan 0073 A1): the one Turso database `zen-dojo-hub` that holds accounts, sessions, synced rows and public
// profiles for every user. URL and token come from HUB_DATABASE_URL / HUB_DATABASE_AUTH_TOKEN (a file: URL works for tests).
// Nothing runs at import time: the client is opened and migrated on first use, once per process.
import { createClient, type Client } from "@libsql/client";
import { migrateHub } from "./migrations";

const g = globalThis as unknown as { habitHubDb?: Promise<Client> };

function hubUrl(url: string): string {
  return url.startsWith("libsql://") ? "https://" + url.slice("libsql://".length) : url;
}

async function open(): Promise<Client> {
  const url = process.env.HUB_DATABASE_URL;
  if (!url) throw new Error("hub database is not configured (HUB_DATABASE_URL)");
  const client = createClient({ url: hubUrl(url), authToken: process.env.HUB_DATABASE_AUTH_TOKEN || undefined });
  try {
    await migrateHub(client);
  } catch (e) {
    client.close();
    throw e;
  }
  return client;
}

/** The migrated hub client, cached per process. A failed start is not cached, so the next request retries. */
export function getHubDb(): Promise<Client> {
  if (!g.habitHubDb) {
    const p = open();
    g.habitHubDb = p;
    p.catch(() => {
      if (g.habitHubDb === p) g.habitHubDb = undefined;
    });
  }
  return g.habitHubDb;
}

/** Tests: forget the cached client (and close it). */
export async function resetHubDb(): Promise<void> {
  const p = g.habitHubDb;
  g.habitHubDb = undefined;
  if (p) (await p.catch(() => null))?.close();
}
