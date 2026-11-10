"use client";

import { useEffect, useState, useTransition } from "react";
import {
  flushSyncQueue,
  getSyncStatus,
  subscribeSyncStatus,
  type SyncStatus as SyncStatusState,
} from "@/lib/sync-manager";

export interface SyncStatusProps {
  className?: string;
  showSyncButton?: boolean;
  compact?: boolean;
}

export function SyncStatus({
  className = "",
  showSyncButton = true,
  compact = false,
}: SyncStatusProps) {
  const [status, setStatus] = useState<SyncStatusState>(() => getSyncStatus());
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = subscribeSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const handleSyncNow = () => {
    if (status === "syncing" || isPending) return;
    startTransition(async () => {
      try {
        await flushSyncQueue();
      } catch {
        // error state is handled by syncManager status
      }
    });
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

  const isSyncing = status === "syncing" || isPending;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-foreground shadow-xs transition-colors ${className}`}
    >
      {/* State indicator icon and text */}
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

      {status === "offline" && (
        <div className="flex items-center gap-1.5 text-muted" title="Working offline. Changes are saved locally.">
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
      {showSyncButton && status !== "error" && (
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
  );
}

export const SyncStatusPill = SyncStatus;
export default SyncStatus;
