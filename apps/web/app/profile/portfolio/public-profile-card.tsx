"use client";

import { useState, useTransition } from "react";
import { refreshPublicProfile, setPublicProfile, type PublicProfileResult } from "./public-actions";

/** Opt-in switch for the public profile, "Update public profile" and "Copy public link". */
export function PublicProfileCard({ initial, signedIn }: { initial: PublicProfileResult; signedIn: boolean }) {
  const [state, setState] = useState<PublicProfileResult>(initial);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const enabled = state.ok && state.enabled;
  const link = state.ok && state.id ? (state.link ?? `/u/${state.id}`) : null;

  function run(fn: () => Promise<PublicProfileResult>, done: string) {
    setNote(null);
    start(async () => {
      const next = await fn();
      if (next.ok) {
        setState(next);
        setNote(done);
      } else setNote(next.error);
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.startsWith("/") ? `${window.location.origin}${link}` : link);
      setNote("Link copied.");
    } catch {
      setNote("Could not copy. Select the link and copy it.");
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h3 className="text-lg font-semibold">Public profile</h3>
      <p className="mt-1 text-sm text-muted">
        Off by default. When on, anyone with the link sees the snapshot above: your name, level, streaks, solved counts, course progress, activity heatmap and
        badges. No email, notes, code or keys. Turning it off deletes the stored copy and the link stops working.
      </p>
      {!signedIn ? (
        <p className="mt-3 text-sm text-muted">Sign in to your Zen Dojo account (Settings) to publish a public profile.</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4"
              checked={enabled}
              disabled={pending}
              onChange={(e) =>
                run(() => setPublicProfile(e.target.checked), e.target.checked ? "Your profile is public." : "Your profile is private. The stored copy was deleted.")
              }
            />
            Make my profile public
          </label>
          {enabled && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(refreshPublicProfile, "Public profile updated.")}
                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background disabled:opacity-50"
              >
                Update public profile
              </button>
              <button type="button" onClick={copy} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent">
                Copy public link
              </button>
            </>
          )}
        </div>
      )}
      {enabled && link && <p className="mt-3 break-all rounded border border-line px-2 py-1 text-xs text-muted">{link}</p>}
      {note && (
        <p className="mt-2 text-sm text-muted" role="status">
          {note}
        </p>
      )}
    </section>
  );
}
