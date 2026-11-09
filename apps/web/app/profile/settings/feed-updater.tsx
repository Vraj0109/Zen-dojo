"use client";

import { useState, useTransition } from "react";
import {
  checkFeedUpdatesAction,
  installFeedPackAction,
  resetPatchAction,
  restorePatchAction,
  saveFeedUrlAction,
} from "./feed-actions";
import type { FeedComparisonItem, LessonPatchInfo } from "@/lib/packs";

export function FeedUpdater({
  initialFeedUrl,
  patches,
}: {
  initialFeedUrl: string;
  patches: LessonPatchInfo[];
}) {
  const [feedUrl, setFeedUrl] = useState(initialFeedUrl);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [items, setItems] = useState<FeedComparisonItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSaveUrl = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.append("url", feedUrl);
      const res = await saveFeedUrlAction(fd);
      setSaveStatus(res.message);
      setTimeout(() => setSaveStatus(null), 3000);
    });
  };

  const handleCheckUpdates = () => {
    setError(null);
    setActionMessage(null);
    startTransition(async () => {
      const res = await checkFeedUpdatesAction(feedUrl || undefined);
      if (res.ok) {
        setItems(res.items);
      } else {
        setError(res.error);
        setItems(null);
      }
    });
  };

  const handleInstall = (item: FeedComparisonItem) => {
    setActionMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await installFeedPackAction({ url: item.url, sha256: item.sha256 });
      if (res.ok) {
        setActionMessage(res.message);
        // Refresh the check list
        const refreshed = await checkFeedUpdatesAction(feedUrl || undefined);
        if (refreshed.ok) setItems(refreshed.items);
      } else {
        setError(res.message);
      }
    });
  };

  const field = "w-full rounded-lg border border-line bg-background px-3 py-1.5 text-sm";

  return (
    <div className="space-y-4">
      <form onSubmit={handleSaveUrl} className="space-y-2">
        <label className="block text-sm">
          <span className="font-medium">Content feed address</span>
          <span className="ml-1 text-xs text-muted">(a web address serving a zendojo-feed JSON file)</span>
          <div className="mt-1 flex gap-2">
            <input
              type="url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://example.com/zendojo-feed.json"
              className={field}
            />
            <button
              type="submit"
              disabled={isPending}
              className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </label>
        {saveStatus && (
          <p role="status" className="text-xs text-muted">
            {saveStatus}
          </p>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleCheckUpdates}
          disabled={isPending || !feedUrl.trim()}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-on-accent disabled:opacity-50"
        >
          {isPending ? "Checking…" : "Check for updates"}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-diff-hard p-3 text-sm">
          <p className="font-medium text-foreground">{error}</p>
        </div>
      )}

      {actionMessage && (
        <div role="status" className="rounded-lg border border-diff-easy p-3 text-sm">
          <p className="font-medium text-foreground">{actionMessage}</p>
        </div>
      )}

      {items !== null && (
        <div className="space-y-3 pt-2">
          <h5 className="text-sm font-semibold">Feed packs ({items.length})</h5>
          {items.length === 0 ? (
            <p className="text-xs text-muted">No packs listed in this feed.</p>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="flex flex-col justify-between gap-2 rounded-lg border border-line bg-background p-3 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{it.title}</span>
                      <span className="rounded bg-surface px-1.5 py-0.5 text-xs text-muted">v{it.version}</span>
                      {it.status === "available" && (
                        <span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                          Available
                        </span>
                      )}
                      {it.status === "update-available" && (
                        <span className="rounded bg-accent/25 px-2 py-0.5 text-xs font-medium text-accent">
                          Update (was v{it.installedRevision})
                        </span>
                      )}
                      {it.status === "up-to-date" && (
                        <span className="rounded bg-surface px-2 py-0.5 text-xs text-muted">
                          Installed
                        </span>
                      )}
                    </div>
                    {it.description && <p className="text-xs text-muted">{it.description}</p>}
                  </div>
                  <div className="shrink-0">
                    {it.status === "available" && (
                      <button
                        type="button"
                        onClick={() => handleInstall(it)}
                        disabled={isPending}
                        className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-on-accent hover:opacity-90 disabled:opacity-50"
                      >
                        Install
                      </button>
                    )}
                    {it.status === "update-available" && (
                      <button
                        type="button"
                        onClick={() => handleInstall(it)}
                        disabled={isPending}
                        className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-on-accent hover:opacity-90 disabled:opacity-50"
                      >
                        Update
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {patches.length > 0 && (
        <div className="mt-6 space-y-3 border-t border-line pt-4">
          <h4 className="font-semibold">Lesson patches</h4>
          <p className="text-sm text-muted">
            These built-in lessons have been updated by installed content packs. You can reset any patch to restore the original lesson.
          </p>
          <div className="space-y-2">
            {patches.map((p) => (
              <div key={p.concept} className="flex flex-col justify-between gap-2 rounded-lg border border-line bg-background p-3 sm:flex-row sm:items-center">
                <div className="space-y-0.5">
                  <span className="font-medium">{p.concept}</span>
                  <span className="ml-2 text-xs text-muted">from {p.packTitle}</span>
                  {p.isReset ? (
                    <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-xs text-muted">Reset to built-in</span>
                  ) : (
                    <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-xs text-accent">Active override</span>
                  )}
                </div>
                <div>
                  {p.isReset ? (
                    <form action={restorePatchAction}>
                      <input type="hidden" name="concept" value={p.concept} />
                      <button
                        type="submit"
                        className="rounded-lg border border-line px-3 py-1 text-xs font-medium hover:bg-surface"
                      >
                        Restore patch
                      </button>
                    </form>
                  ) : (
                    <form action={resetPatchAction}>
                      <input type="hidden" name="concept" value={p.concept} />
                      <button
                        type="submit"
                        className="rounded-lg border border-line px-3 py-1 text-xs font-medium hover:bg-surface"
                      >
                        Back to the built-in lesson
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
