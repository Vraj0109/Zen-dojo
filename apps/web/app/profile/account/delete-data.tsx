"use client";

import { useCallback, useEffect, useState } from "react";

type CloudScope = "data" | "account";

interface LocalSummaryCounts {
  solves: number;
  notes: number;
  runs: number;
  tasks: number;
  other: number;
}

export function DeleteCloudData({
  signedIn,
  accountName,
}: {
  signedIn: boolean;
  accountName?: string | null;
}) {
  const [scope, setScope] = useState<CloudScope>("data");
  const [understood, setUnderstood] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [lastDeleted, setLastDeleted] = useState<Record<string, number> | null>(null);
  const [completedScope, setCompletedScope] = useState<CloudScope | null>(null);

  if (!signedIn) {
    return (
      <section className="space-y-3 rounded-xl border border-line bg-surface p-6">
        <div className="border-b border-line pb-3">
          <h2 className="text-base font-semibold">Cloud data</h2>
          <p className="mt-1 text-xs text-muted">Manage or delete data stored in your cloud account.</p>
        </div>
        <p className="text-sm text-muted">
          You are not signed in. Cloud data deletion requires signing in with your account.
        </p>
      </section>
    );
  }

  async function handleDelete() {
    if (confirmText !== "DELETE" || !understood || busy) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/account/cloud-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, confirm: "DELETE" }),
      });

      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        deleted?: Record<string, number>;
        error?: string;
        message?: string;
      } | null;

      if (!res.ok || !body?.ok) {
        if (res.status === 429) {
          const retryAfter = res.headers.get("retry-after") || res.headers.get("Retry-After");
          if (retryAfter) {
            setError(`Rate limit reached. Please wait ${retryAfter} seconds before trying again.`);
          } else {
            setError(body?.message || "Rate limit reached. Please wait before trying again.");
          }
        } else if (res.status === 401) {
          setError("Your session expired. Please sign in again to delete cloud data.");
        } else {
          setError(body?.error || body?.message || "Failed to delete cloud data. Please try again.");
        }
        return;
      }

      setSuccess(true);
      setCompletedScope(scope);
      setLastDeleted(body.deleted ?? {});
      setConfirmText("");
      setUnderstood(false);
    } catch {
      setError("An unexpected network error occurred. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const isConfirmValid = confirmText === "DELETE" && understood;

  return (
    <section className="space-y-4 rounded-xl border border-line bg-surface p-6">
      <div className="border-b border-line pb-3">
        <h2 className="text-base font-semibold">Cloud data</h2>
        <p className="mt-1 text-xs text-muted">
          Deletes all data stored under your account{accountName ? ` (${accountName})` : ""} in the Cloudflare D1 cloud database.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-background p-3 text-xs text-muted">
        <span className="font-semibold text-foreground">Notice:</span> This unlinks this device, but does NOT touch local data stored on this device or other devices.
      </div>

      {success && (
        <div role="status" className="space-y-3 rounded-lg border border-diff-easy/30 bg-diff-easy/10 p-4 text-sm">
          <div className="font-semibold text-diff-easy">
            {completedScope === "account" ? "Cloud account closed and data deleted" : "Cloud progress data deleted"}
          </div>
          <p className="text-xs text-muted">
            {completedScope === "account"
              ? "Your account and all associated cloud data have been removed. Any active sessions were invalidated."
              : "All synced progress data was removed from the cloud. This device has been unlinked."}
          </p>
          {lastDeleted && Object.keys(lastDeleted).length > 0 && (
            <div className="space-y-1 border-t border-diff-easy/20 pt-2 text-xs">
              <div className="font-medium">Deleted cloud records:</div>
              {Object.entries(lastDeleted).map(([table, count]) => (
                <div key={table} className="flex justify-between font-mono text-muted">
                  <span>{table}</span>
                  <span className="font-sans font-medium text-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <fieldset className="space-y-3" disabled={busy}>
        <legend className="text-sm font-medium">Deletion scope:</legend>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="cloud-scope"
            value="data"
            checked={scope === "data"}
            onChange={() => setScope("data")}
            className="mt-1 size-4 border-line text-accent focus:ring-accent"
          />
          <div>
            <div className="text-sm font-medium">Delete cloud progress only</div>
            <div className="text-xs text-muted">Keeps account active, removes synced data and quota.</div>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="cloud-scope"
            value="account"
            checked={scope === "account"}
            onChange={() => setScope("account")}
            className="mt-1 size-4 border-line text-accent focus:ring-accent"
          />
          <div>
            <div className="text-sm font-medium">Delete cloud progress and close account</div>
            <div className="text-xs text-muted">Removes synced data, sessions, and user record.</div>
          </div>
        </label>
      </fieldset>

      <div className="space-y-3 pt-2">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            disabled={busy}
            className="mt-0.5 size-4 rounded border-line text-accent focus:ring-accent"
          />
          <span className="text-sm font-medium text-diff-hard">I understand this cannot be undone</span>
        </label>

        <div className="space-y-1.5">
          <label htmlFor="confirm-cloud-delete-input" className="block text-sm">
            Type <span className="font-mono font-bold text-diff-hard">DELETE</span> to confirm:
          </label>
          <input
            id="confirm-cloud-delete-input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={busy}
            placeholder="DELETE"
            autoComplete="off"
            className="w-full max-w-xs rounded-md border border-line bg-background px-3 py-1.5 text-sm font-mono placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-diff-hard/30 bg-diff-hard/10 p-3 text-sm text-diff-hard">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={!isConfirmValid || busy}
          className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {busy ? "Deleting..." : "Delete cloud data"}
        </button>
      </div>
    </section>
  );
}

export function DeleteLocalData() {
  const [counts, setCounts] = useState<LocalSummaryCounts | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [keepSettings, setKeepSettings] = useState(true);
  const [includeImported, setIncludeImported] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [lastRemoved, setLastRemoved] = useState<Record<string, number> | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/account/local-summary");
      if (!res.ok) throw new Error("bad status");
      const data = (await res.json()) as { ok?: boolean; counts?: LocalSummaryCounts };
      if (data.ok && data.counts) {
        setCounts(data.counts);
      } else {
        throw new Error("Invalid response");
      }
    } catch {
      setSummaryError("Could not load current data counts for this device.");
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void fetchSummary();
  }, [fetchSummary]);

  async function handleErase() {
    if (confirmText !== "DELETE" || !understood || busy) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/account/local-erase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE", keepSettings, includeImported }),
      });

      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        removed?: Record<string, number>;
        error?: string;
      } | null;

      if (!res.ok || !body?.ok) {
        setError(body?.error || "Failed to erase local data. Please try again.");
        return;
      }

      setSuccess(true);
      setLastRemoved(body.removed ?? {});
      setConfirmText("");
      setUnderstood(false);

      // Refresh the summary to show the updated (zeroed) counts
      void fetchSummary();
    } catch {
      setError("An unexpected network error occurred. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const isConfirmValid = confirmText === "DELETE" && understood;

  return (
    <section className="space-y-4 rounded-xl border border-line bg-surface p-6">
      <div className="border-b border-line pb-3">
        <h2 className="text-base font-semibold">Data on this device</h2>
        <p className="mt-1 text-xs text-muted">Erase your local progress and stored history on this device.</p>
      </div>

      <div className="rounded-lg border border-line bg-background p-3 text-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Current local data:</div>
        {loadingSummary ? (
          <p className="text-xs text-muted">Loading data counts...</p>
        ) : summaryError ? (
          <p className="text-xs text-diff-hard">{summaryError}</p>
        ) : counts ? (
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
            <div className="rounded border border-line/60 bg-surface p-2.5">
              <div className="text-muted">Solves</div>
              <div className="mt-0.5 text-base font-semibold">{counts.solves}</div>
            </div>
            <div className="rounded border border-line/60 bg-surface p-2.5">
              <div className="text-muted">Notes</div>
              <div className="mt-0.5 text-base font-semibold">{counts.notes}</div>
            </div>
            <div className="rounded border border-line/60 bg-surface p-2.5">
              <div className="text-muted">Code runs</div>
              <div className="mt-0.5 text-base font-semibold">{counts.runs}</div>
            </div>
            <div className="rounded border border-line/60 bg-surface p-2.5">
              <div className="text-muted">Tasks</div>
              <div className="mt-0.5 text-base font-semibold">{counts.tasks}</div>
            </div>
            <div className="rounded border border-line/60 bg-surface p-2.5">
              <div className="text-muted">Other</div>
              <div className="mt-0.5 text-base font-semibold">{counts.other}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-line bg-background p-3 text-sm">
        <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M4 16v1a2 2 0 002 2h8a2 2 0 002-2v-1M10 3v10m0 0l-3-3m3 3l3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>
          Before deleting, consider downloading a backup first:{" "}
          <a href="/api/backup" download className="font-medium text-accent hover:underline">
            Download backup
          </a>
        </span>
      </div>

      <div className="rounded-lg border border-line bg-background p-3 text-xs text-muted">
        <span className="font-semibold text-foreground">Notice:</span> Erasing local data will NOT delete your cloud copy if you are signed in; sync triggers are silenced so no deletions are sent to the cloud.
      </div>

      {success && (
        <div role="status" className="space-y-3 rounded-lg border border-diff-easy/30 bg-diff-easy/10 p-4 text-sm">
          <div className="font-semibold text-diff-easy">Data on this device erased</div>
          <p className="text-xs text-muted">
            All local progress data has been removed. Sync triggers were silenced so no deletions were sent to the cloud.
          </p>
          {lastRemoved && Object.keys(lastRemoved).length > 0 && (
            <div className="space-y-1 border-t border-diff-easy/20 pt-2 text-xs">
              <div className="font-medium">Removed local records:</div>
              {Object.entries(lastRemoved).map(([table, count]) => (
                <div key={table} className="flex justify-between font-mono text-muted">
                  <span>{table}</span>
                  <span className="font-sans font-medium text-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:bg-background cursor-pointer"
            >
              Reload page
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2.5" aria-disabled={busy}>
        <div className="text-sm font-medium">Options:</div>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={keepSettings}
            onChange={(e) => setKeepSettings(e.target.checked)}
            disabled={busy}
            className="mt-0.5 size-4 rounded border-line text-accent focus:ring-accent"
          />
          <div>
            <div className="text-sm">Keep settings (extension pairing token, UI preferences)</div>
            <div className="text-xs text-muted">Preserves local configuration while erasing progress.</div>
          </div>
        </label>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeImported}
            onChange={(e) => setIncludeImported(e.target.checked)}
            disabled={busy}
            className="mt-0.5 size-4 rounded border-line text-accent focus:ring-accent"
          />
          <div>
            <div className="text-sm">Also delete imported problem packs</div>
            <div className="text-xs text-muted">Deletes imported problems and pack definitions from this device.</div>
          </div>
        </label>
      </div>

      <div className="space-y-3 pt-2">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            disabled={busy}
            className="mt-0.5 size-4 rounded border-line text-accent focus:ring-accent"
          />
          <span className="text-sm font-medium text-diff-hard">I understand this cannot be undone</span>
        </label>

        <div className="space-y-1.5">
          <label htmlFor="confirm-local-erase-input" className="block text-sm">
            Type <span className="font-mono font-bold text-diff-hard">DELETE</span> to confirm:
          </label>
          <input
            id="confirm-local-erase-input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={busy}
            placeholder="DELETE"
            autoComplete="off"
            className="w-full max-w-xs rounded-md border border-line bg-background px-3 py-1.5 text-sm font-mono placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-diff-hard/30 bg-diff-hard/10 p-3 text-sm text-diff-hard">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleErase}
          disabled={!isConfirmValid || busy}
          className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {busy ? "Deleting data on this device..." : "Delete data on this device"}
        </button>
      </div>
    </section>
  );
}
