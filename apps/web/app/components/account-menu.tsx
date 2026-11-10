"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SyncStatus } from "@/app/components/sync-status";
import { flushSyncQueue, getSyncStatus, subscribeSyncStatus, type SyncStatus as SyncStatusState } from "@/lib/sync-manager";

type Device = { id: string; name: string | null; createdAt: number | null; lastSeenAt: number | null; current: boolean };

type RawDevice = { id?: unknown; name?: unknown; created_at?: unknown; last_seen_at?: unknown; current?: unknown };

function toMs(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null;
  return v < 1e12 ? v * 1000 : v;
}

function parseDevices(body: unknown): Device[] {
  const list = Array.isArray(body) ? body : body && typeof body === "object" && Array.isArray((body as { devices?: unknown }).devices) ? (body as { devices: unknown[] }).devices : [];
  return (list as RawDevice[])
    .filter((d) => typeof d.id === "string")
    .map((d) => ({
      id: d.id as string,
      name: typeof d.name === "string" && d.name ? d.name : null,
      createdAt: toMs(d.created_at),
      lastSeenAt: toMs(d.last_seen_at),
      current: d.current === true,
    }));
}

function when(ms: number | null): string {
  return ms ? new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "unknown";
}

/** Small link for other pages (for example the settings page) that points at the account page. */
export function AccountLink({ signedIn }: { signedIn: boolean }) {
  return (
    <Link href="/profile/account" className="text-accent hover:underline">
      {signedIn ? "Account and devices" : "Sign in to sync"}
    </Link>
  );
}

const SYNC_WORDS: Record<SyncStatusState, string> = {
  idle: "Signed in. Ready to sync.",
  syncing: "Syncing your progress now.",
  synced: "Signed in. Your progress is up to date.",
  offline: "Signed in, but this device is offline. Changes are saved here and sync when you are back online.",
  error: "Signed in, but the last sync failed. Try again.",
  "signed-out": "Signed out. Progress stays on this device only.",
  throttled: "Signed in. Sync is paused for a moment and will retry on its own.",
};

/** Live sync status with a Sync now button. Needs JavaScript (sync runs in the browser). */
export function SyncPanel({ signedIn }: { signedIn: boolean }) {
  const [status, setStatus] = useState<SyncStatusState>(() => getSyncStatus());
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeSyncStatus(setStatus), []);

  async function syncNow() {
    if (busy) return;
    setBusy(true);
    try {
      await flushSyncQueue();
    } catch {
      // the status text shows the failure
    } finally {
      setBusy(false);
    }
  }

  const syncing = busy || status === "syncing";
  const words = signedIn ? SYNC_WORDS[status] : "Signed out. Progress stays on this device only.";

  return (
    <section aria-labelledby="sync-title" className="space-y-3">
      <h2 id="sync-title" className="text-base font-semibold">Sync</h2>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4">
        <SyncStatus showSyncButton={false} />
        <p className="min-w-0 flex-1 basis-48 text-sm text-muted">{words}</p>
        {signedIn ? (
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing || status === "offline"}
            className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              viewBox="0 0 16 16"
              className={`size-4 shrink-0 ${syncing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1 8a7 7 0 0 1 12-4.9L15 5M15 1v4h-4" />
              <path d="M15 8a7 7 0 0 1-12 4.9L1 11M1 15v-4h4" />
            </svg>
            Sync now
          </button>
        ) : null}
      </div>
    </section>
  );
}

/** Sign out button. A real form, so it works without JavaScript. */
export function SignOutButton() {
  return (
    <form action="/auth/logout" method="post">
      <button type="submit" className="rounded-md border border-line px-4 py-2 text-sm hover:bg-background">Sign out</button>
    </form>
  );
}

/** Device list with per-device sign out. Needs JavaScript (DELETE request). */
export function DeviceList() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/devices", { cache: "no-store" });
      if (res.status === 401) {
        setError("Your session ended. Sign in again to see your devices.");
        setDevices([]);
        return;
      }
      if (!res.ok) throw new Error("bad status");
      setDevices(parseDevices(await res.json()));
      setError(null);
    } catch {
      setError("Could not load your devices. Try again in a moment.");
      setDevices((d) => d ?? []);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load();
  }, [load]);

  async function signOutDevice(device: Device) {
    setBusy(device.id);
    try {
      const res = await fetch(`/api/auth/devices?id=${encodeURIComponent(device.id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error("bad status");
      if (device.current) {
        window.location.reload();
        return;
      }
      await load();
    } catch {
      setError("Could not sign that device out. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="devices-title" className="space-y-3">
      <h2 id="devices-title" className="text-base font-semibold">Signed-in devices</h2>
      {error ? <p role="alert" className="text-sm text-diff-hard">{error}</p> : null}
      {devices === null ? (
        <div className="h-20 rounded-xl border border-line bg-surface" />
      ) : devices.length === 0 ? (
        <p className="text-sm text-muted">No devices to show.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {devices.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {d.name ?? "Unnamed device"}
                  {d.current ? <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs font-normal text-muted">This device</span> : null}
                </div>
                <div className="text-xs text-muted">Signed in {when(d.createdAt)}. Last active {when(d.lastSeenAt)}.</div>
              </div>
              <button
                type="button"
                disabled={busy === d.id}
                onClick={() => signOutDevice(d)}
                className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-background disabled:opacity-60"
              >
                {d.current ? "Sign out this device" : "Sign out"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">
        A device you sign out stops syncing at once. Its access can last up to 15 minutes while its short-lived token runs out.
      </p>
    </section>
  );
}
