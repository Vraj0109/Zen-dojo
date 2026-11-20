"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import {
  flushSyncQueue,
  getSyncInfo,
  subscribeSyncInfo,
  type SyncStatus as SyncStatusState,
  type SyncStatusInfo,
} from "@/lib/sync-manager";
import type { CurrentUser } from "@/lib/sync-queue";
import { buttonClass } from "../ui";

const emptySubscribe = () => () => {};

/** The one status the pill shows: a pending "Sync now" counts as syncing. */
export function shownStatus(status: SyncStatusState, isPending: boolean): SyncStatusState {
  return isPending ? "syncing" : status;
}

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
  const [uploadFailed, setUploadFailed] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

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
    setUploadFailed(false);
    try {
      const res = await fetch("/api/sync/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        // Keep the prompt open so the person can try again; nothing was linked.
        setUploadFailed(true);
        return;
      }
      await flushSyncQueue();
      try {
        localStorage.setItem("zen-dojo:adopt-dismissed", "1");
      } catch {
        // Ignore storage errors
      }
      setDismissed(true);
    } catch {
      setUploadFailed(true);
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

  // First-link dialog keyboard: focus moves in when it appears, Tab stays inside it, Escape is "Not now".
  useEffect(() => {
    if (!showFirstLinkPrompt) return;
    const root = dialogRef.current;
    root?.querySelector<HTMLElement>("button:not([disabled])")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismissFirstLink();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const items = [...root.querySelectorAll<HTMLElement>("button:not([disabled])")];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // handleDismissFirstLink only touches storage and state setters.
  }, [showFirstLinkPrompt]);

  if (!mounted) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-2.5 py-1 text-xs text-muted ${className}`}
        aria-hidden="true"
      >
        <span className="inline-block size-2 rounded-full bg-line" />
        <span className="text-xs">Sync</span>
      </div>
    );
  }

  const status: SyncStatusState = info.status;
  const shown = shownStatus(status, isPending);
  const isSyncing = shown === "syncing";

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-foreground shadow-xs transition-colors ${className}`}
      >
        {/* Signed-out state */}
        {shown === "signed-out" && (
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
                className="inline-flex min-h-8 items-center text-xs hover:text-foreground transition-colors underline-offset-2 hover:underline [@media(pointer:coarse)]:min-h-11"
              >
                Sign in to sync
              </Link>
            ) : (
              <Link
                href="/login"
                title="Sign in to sync"
                aria-label="Sign in to sync"
                className="grid size-8 place-items-center rounded-full hover:text-foreground transition-colors [@media(pointer:coarse)]:size-11"
              >
                <span className="sr-only">Sign in to sync</span>
              </Link>
            )}
          </div>
        )}

        {/* Account mismatch state */}
        {shown === "account-mismatch" && (
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
              <span className="text-xs font-medium">
                This device is linked to another account.
              </span>
            )}
          </div>
        )}

        {/* Throttled state */}
        {shown === "throttled" && (
          <div className="flex items-center gap-1.5 text-warning">
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
              <span className="text-xs font-medium text-warning">
                Sync paused, retrying...
              </span>
            )}
          </div>
        )}

        {/* Synced state */}
        {shown === "synced" && (
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
            {!compact && <span className="text-xs font-medium">Synced</span>}
          </div>
        )}

        {/* Syncing in progress */}
        {shown === "syncing" && (
          <div className="flex items-center gap-1.5 text-warning">
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
              <span className="text-xs font-medium text-warning">
                Syncing...
              </span>
            )}
          </div>
        )}

        {/* Offline state */}
        {shown === "offline" && (
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
            {!compact && <span className="text-xs">Offline (local only)</span>}
          </div>
        )}

        {/* Error state */}
        {shown === "error" && (
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
            {!compact && <span className="text-xs font-medium">Sync error</span>}
            <button
              type="button"
              onClick={handleSyncNow}
              className="ml-1 inline-flex min-h-8 items-center underline text-xs font-semibold hover:text-foreground cursor-pointer [@media(pointer:coarse)]:min-h-11"
              title="Retry synchronization"
            >
              Retry
            </button>
          </div>
        )}

        {/* Ready / Idle state */}
        {shown === "idle" && (
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
            {!compact && <span className="text-xs">Ready</span>}
          </div>
        )}

        {/* "Sync now" action button */}
        {showSyncButton &&
          shown !== "error" &&
          shown !== "signed-out" &&
          shown !== "account-mismatch" && (
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing || shown === "offline"}
              className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${
                compact ? "size-8 justify-center p-0 [@media(pointer:coarse)]:size-11" : "min-h-8 [@media(pointer:coarse)]:min-h-11"
              }`}
              title={
                isSyncing ? "Syncing..." : shown === "offline" ? "Cannot sync while offline" : "Sync now with cloud"
              }
              aria-label="Sync now"
            >
              <svg
                className="size-3 shrink-0"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
        >
          <div ref={dialogRef} className="w-full max-w-sm rounded-lg border border-line bg-surface p-5 shadow-menu space-y-4 dark:border-0">
            <div className="space-y-1">
              <h3 id="first-link-heading" className="text-base font-medium text-foreground">
                Upload this device&apos;s progress to your account?
              </h3>
              <p id="first-link-desc" className="text-sm text-muted leading-relaxed">
                Connect your local progress and habits to your account so you can sync across devices.
              </p>
            </div>
            {uploadFailed && (
              <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-on-danger-soft">
                We couldn&apos;t upload your progress. Check your connection and try again.
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleDismissFirstLink}
                disabled={isUploading}
                className={buttonClass("quiet", "sm")}
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                aria-busy={isUploading}
                className={buttonClass("primary", "sm")}
              >
                {isUploading ? "Uploading..." : uploadFailed ? "Try again" : "Upload"}
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
