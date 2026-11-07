import type { getExtensionStatus } from "@/lib/leetcode/extension";
import type { getLeetCodeStatus } from "@/lib/leetcode/sync";
import { connectLeetCodeAction, disconnectLeetCodeAction, regenerateExtensionKeyAction, syncLeetCodeAction } from "../actions";
import { SubmitButton } from "../submit-button";

// LeetCode connections, shown in Profile → Settings.

export function ago(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

export function LeetCodeCard({ username, last }: Awaited<ReturnType<typeof getLeetCodeStatus>>) {
  const input = "min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2";
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h4 className="font-semibold">LeetCode auto-sync</h4>
      {!username ? (
        <>
          <p className="mt-1 mb-3 text-sm text-muted">
            Enter your LeetCode username and accepted submissions are ticked here automatically (problems outside the list count too).
            Only your public profile is read; no login needed.
          </p>
          <form action={connectLeetCodeAction} className="flex flex-col gap-2 sm:flex-row">
            <input name="username" required maxLength={40} placeholder="LeetCode username" aria-label="LeetCode username" className={input} />
            <SubmitButton className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">Connect</SubmitButton>
          </form>
        </>
      ) : (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            Syncing{" "}
            <a href={`https://leetcode.com/u/${username}/`} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
              @{username}
            </a>
            <span className="text-muted"> · checks every 15 min while the app is open</span>
          </p>
          <div className="flex gap-2">
            <form action={syncLeetCodeAction}>
              <SubmitButton className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent">Sync now</SubmitButton>
            </form>
            <form action={disconnectLeetCodeAction}>
              <SubmitButton className="rounded-lg border border-line px-3 py-1.5 text-sm">Disconnect</SubmitButton>
            </form>
          </div>
        </div>
      )}
      {last && (
        <p role="status" className={`mt-2 text-sm ${last.ok ? "text-muted" : "text-cat-mock"}`}>
          {last.ok
            ? `Last sync ${ago(last.at)}: ${last.added} new solve${last.added === 1 ? "" : "s"}${last.resolved ? `, ${last.resolved} re-solve${last.resolved === 1 ? "" : "s"}` : ""}.`
            : `Sync failed ${ago(last.at)}: ${last.error}`}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        LeetCode only shares your 20 most recent accepted submissions, so open the app at least once on busy days.
      </p>
    </section>
  );
}

export function ExtensionCard({ token, last }: Awaited<ReturnType<typeof getExtensionStatus>>) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h4 className="font-semibold">Browser extension</h4>
      <p className="mt-1 text-sm text-muted">
        Imports your own accepted LeetCode submissions (code, language, runtime, memory, time, notes) while you&apos;re logged in on
        leetcode.com, including your full history. Install it from <code className="text-foreground">apps/extension</code> (see README),
        then paste this pairing key into it.
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium">Show pairing key</summary>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={token}
            aria-label="Pairing key"
            className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2 font-mono text-sm"
          />
          <form action={regenerateExtensionKeyAction}>
            <SubmitButton className="rounded-lg border border-line px-3 py-2 text-sm" title="The extension must be paired again">
              New key
            </SubmitButton>
          </form>
        </div>
        <p className="mt-1 text-xs text-muted">Treat it like a password: anything with this key can add solves to this app.</p>
      </details>
      {last && (
        <p role="status" className="mt-2 text-sm text-muted">
          Last import {ago(last.at)}: {last.stored} submission{last.stored === 1 ? "" : "s"}, {last.added} new solve{last.added === 1 ? "" : "s"}
          {last.resolved ? `, ${last.resolved} re-solve${last.resolved === 1 ? "" : "s"}` : ""}.
        </p>
      )}
    </section>
  );
}

