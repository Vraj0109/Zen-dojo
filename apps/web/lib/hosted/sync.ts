// Plan 0058 step 5: the hosted site is "another device". Each user's own database is kept in step with the cloud
// copy by the normal sync engine. There is no background poller on serverless hosting, so sync runs on request
// (throttled) and after each mutation. Never log rows, tokens or user ids here.

import { linkAccount, runSync, getSyncStatus, type RunSyncOptions, type SyncRunResult } from "../sync-engine";
import type { AnyDbClient } from "../sync-schema";

/** At most one on-request sync per user in this window. */
export const SYNC_THROTTLE_MS = 20_000;
const MAX_TRACKED = 500;

export type HostedSyncDeps = {
  /** The user's database. Defaults to `getDbFor(userId)` (lib/db.ts). */
  db?: AnyDbClient;
  fetch?: RunSyncOptions["fetch"];
  now?: () => number;
};

const lastStart = new Map<string, number>();

/** Test helper: forget the throttle state. */
export function resetHostedSyncState(): void {
  lastStart.clear();
}

function remember(userId: string, at: number): void {
  lastStart.delete(userId);
  lastStart.set(userId, at);
  if (lastStart.size > MAX_TRACKED) {
    const oldest = lastStart.keys().next().value;
    if (oldest !== undefined) lastStart.delete(oldest);
  }
}

async function dbFor(userId: string, deps: HostedSyncDeps): Promise<AnyDbClient> {
  if (deps.db) return deps.db;
  const mod = (await import("../db")) as unknown as { getDbFor: (id: string) => Promise<unknown> };
  return (await mod.getDbFor(userId)) as AnyDbClient;
}

async function link(userId: string, db: AnyDbClient): Promise<SyncRunResult | null> {
  const status = await getSyncStatus(db);
  if (status.account === userId) return null;
  try {
    await linkAccount(userId, db);
    return null;
  } catch (e) {
    if (e instanceof Error && e.name === "account-mismatch") {
      return { state: "account-mismatch", pushed: 0, pulled: 0, message: "This database is linked to another account." };
    }
    throw e;
  }
}

async function run(userId: string, deps: HostedSyncDeps): Promise<SyncRunResult> {
  const db = await dbFor(userId, deps);
  // First sign-in: link the (empty) database to the account, then the run below pulls everything.
  const linked = await link(userId, db);
  if (linked) return linked;
  return runSync({ db, fetch: deps.fetch, now: deps.now, getUserId: async () => userId });
}

/**
 * Called from the root server component for signed-in hosted users. Skips when this user synced less than
 * SYNC_THROTTLE_MS ago. The engine's own head check keeps an idle run to one tiny request. Never throws.
 */
export async function syncOnRequest(userId: string, deps: HostedSyncDeps = {}): Promise<SyncRunResult> {
  const now = (deps.now ?? Date.now)();
  const last = lastStart.get(userId);
  if (last !== undefined && now - last < SYNC_THROTTLE_MS) {
    return { state: "throttled", pushed: 0, pulled: 0 };
  }
  remember(userId, now);
  try {
    return await run(userId, deps);
  } catch {
    return { state: "error", pushed: 0, pulled: 0, message: "Sync stopped because of an unexpected problem." };
  }
}

/** Pushes what a mutation just wrote. Not throttled (the engine merges overlapping runs). Never throws. */
export async function syncAfterMutation(userId: string, deps: HostedSyncDeps = {}): Promise<SyncRunResult> {
  remember(userId, (deps.now ?? Date.now)());
  try {
    return await run(userId, deps);
  } catch {
    return { state: "error", pushed: 0, pulled: 0, message: "Sync stopped because of an unexpected problem." };
  }
}
