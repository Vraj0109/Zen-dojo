"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import {
  flushSyncQueue,
  getSyncInfo,
  subscribeSyncInfo,
  type SyncStatus as SyncStatusState,
  type SyncStatusInfo,
} from "@/lib/sync-manager";
import type { CurrentUser } from "@/lib/sync-queue";

const emptySubscribe = () => () => {};

export interface SyncStatusProps {
  className?: string;
  showSyncButton?: boolean;
  compact?: boolean;
  user?: CurrentUser | null;
  db?: unknown;
}

export function SyncStatus({
  className = "",
  showSyncButton = true,
  compact = false,
  user: propUser,
}: SyncStatusProps) {
  const [info, setInfo] = useState<SyncStatusInfo>(() => getSyncInfo());
  const [isPending, startTransition] = useTransition();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [dismissed, setDismissed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return subscribeSyncInfo((newInfo) => {
      setInfo(newInfo);
    });
  }, []);

  // Determine if the user is signed in
  const isGuest = propUser !== undefined
    ? Boolean(!propUser || propUser.isGuest || propUser.id === "local")
    : info.status === "signed-out";
  const signedIn = !isGuest;

  // Determine if first-link adoption has been dismissed in localStorage
  const isDismissed =
    dismissed ||
    (mounted &&
      (() => {
        try {
          return Boolean(localStorage.getItem("zen-dojo:adopt-dismissed"));
        } catch {
          return false;
        }
      })());

  // First-link prompt: when signed in, GET /api/sync/status says account is null and database has rows / pending > 0
  const hasRows = info.hasRows;
  const hasData = hasRows !== undefined ? hasRows : (info.pending > 0 || info.account === null);
  const showFirstLinkPrompt = Boolean(mounted && !isDismissed && signedIn && info.account === null && hasData);

  const handleSyncNow = () => {
    if (info.status === "syncing" || isPending) return;
    startTransition(async () => {
      try {
        await flushSyncQueue();
      } catch {
        // error state is handled by syncManager status
      }
    });
  };

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      const res = await fetch("/api/sync/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Failed to link account:", err);
      } else {
        await flushSyncQueue();
      }
      try {
        localStorage.setItem("zen-dojo:adopt-dismissed", "1");
      } catch {
        // Ignore storage errors
      }
      setDismissed(true);
    } catch (err) {
      console.error("Failed to link account:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDismissFirstLink = () => {
    try {
      localStorage.setItem("zen-dojo:adopt-dismissed", "1");
    } catch {
      // Ignore storage errors
    }
    setDismissed(true);
  };

  if (!mounted) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-2.5 py-1 text-xs text-muted ${className}`}
        aria-hidden="true"
      >
        <span className="inline-block size-2 rounded-full bg-line" />
        <span className="text-[11px]">Sync</span>
      </div>
    );
  }

  const status: SyncStatusState = info.status;
  const isSyncing = status === "syncing" || isPending;

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-foreground shadow-xs transition-colors ${className}`}
      >
        {/* Signed-out state */}
        {status === "signed-out" && (
          <div className="flex items-center gap-1.5 text-muted">
            <svg
              className="size-3.5 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M13.5 10.5A3.5 3.5 0 0 0 12 4.2 5 5 0 0 0 3 6.5a3 3 0 0 0 .5 5.9h9.5" />
            </svg>
            {!compact ? (
              <Link
                href="/login"
                className="text-[11px] hover:text-foreground transition-colors underline-offset-2 hover:underline"
              >
                Sign in to sync
              </Link>
            ) : (
              <Link
                href="/login"
                title="Sign in to sync"
                aria-label="Sign in to sync"
                className="hover:text-foreground transition-colors"
              >
                <span className="sr-only">Sign in to sync</span>
              </Link>
            )}
          </div>
        )}

        {/* Account mismatch state */}
        {status === "account-mismatch" && (
          <div className="flex items-center gap-1.5 text-diff-hard" title="This device is linked to another account.">
            <svg
              className="size-3.5 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="7" />
              <path d="M8 5v4M8 12h.01" />
            </svg>
            {!compact && (
              <span className="text-[11px] font-medium">
                This device is linked to another account.
              </span>
            )}
          </div>
        )}

        {/* Throttled state */}
        {status === "throttled" && (
          <div className="flex items-center gap-1.5 text-amber-500">
            <svg
              className="size-3.5 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="7" />
              <path d="M8 4v4l2.5 2.5" />
            </svg>
            {!compact && (
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Sync paused, retrying...
              </span>
            )}
          </div>
        )}

        {/* Synced state */}
        {status === "synced" && (
          <div className="flex items-center gap-1.5 text-diff-easy">
            <svg
              className="size-3.5 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M13.5 10.5A3.5 3.5 0 0 0 12 4.2 5 5 0 0 0 3 6.5a3 3 0 0 0 .5 5.9h9.5" />
              <path d="m5.5 9 2 2 4-4" />
            </svg>
            {!compact && <span className="text-[11px] font-medium">Synced</span>}
          </div>
        )}

        {/* Syncing in progress */}
        {isSyncing && (
          <div className="flex items-center gap-1.5 text-amber-500">
            <svg
              className="size-3.5 shrink-0 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            {!compact && (
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Syncing...
              </span>
            )}
          </div>
        )}

        {/* Offline state */}
        {status === "offline" && (
          <div
            className="flex items-center gap-1.5 text-muted"
            title="Working offline. Changes are saved locally."
          >
            <svg
              className="size-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 2l20 20M8.5 8.5A4.5 4.5 0 0 0 5 13a4.5 4.5 0 0 0 4.5 4.5h9a4.5 4.5 0 0 0 2.5-.76M19.5 14a4.5 4.5 0 0 0-4-6.32 7 7 0 0 0-10.3 3.68" />
            </svg>
            {!compact && <span className="text-[11px]">Offline (local only)</span>}
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex items-center gap-1.5 text-diff-hard">
            <svg
              className="size-3.5 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="7" />
              <path d="M8 5v4M8 12h.01" />
            </svg>
            {!compact && <span className="text-[11px] font-medium">Sync error</span>}
            <button
              type="button"
              onClick={handleSyncNow}
              className="ml-1 underline text-[11px] font-semibold hover:text-foreground cursor-pointer"
              title="Retry synchronization"
            >
              Retry
            </button>
          </div>
        )}

        {/* Ready / Idle state */}
        {status === "idle" && (
          <div className="flex items-center gap-1.5 text-muted">
            <svg
              className="size-3.5 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M13.5 10.5A3.5 3.5 0 0 0 12 4.2 5 5 0 0 0 3 6.5a3 3 0 0 0 .5 5.9h9.5" />
            </svg>
            {!compact && <span className="text-[11px]">Ready</span>}
          </div>
        )}

        {/* "Sync now" action button */}
        {showSyncButton &&
          status !== "error" &&
          status !== "signed-out" &&
          status !== "account-mismatch" && (
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing || status === "offline"}
              className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${
                compact ? "size-5 justify-center p-0" : ""
              }`}
              title={status === "offline" ? "Cannot sync while offline" : "Sync now with cloud"}
              aria-label="Sync now"
            >
              <svg
                className={`size-3 shrink-0 ${isSyncing ? "animate-spin" : ""}`}
                viewBox="0 0 16 16"
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
              {!compact && <span>Sync now</span>}
            </button>
          )}
      </div>

      {/* First-link upload modal prompt */}
      {showFirstLinkPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="first-link-heading"
          aria-describedby="first-link-desc"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-5 shadow-lg space-y-4">
            <div className="space-y-1">
              <h3 id="first-link-heading" className="text-sm font-semibold text-foreground">
                Upload this device&apos;s progress to your account?
              </h3>
              <p id="first-link-desc" className="text-xs text-muted leading-relaxed">
                Connect your local progress and habits to your account so you can sync across devices.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleDismissFirstLink}
                disabled={isUploading}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:bg-background hover:text-foreground transition-colors cursor-pointer"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const SyncStatusPill = SyncStatus;
export default SyncStatus;
