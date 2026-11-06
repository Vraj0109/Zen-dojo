import type { Metadata } from "next";
import { Suspense } from "react";
import { PageMain } from "../ui";

export const metadata: Metadata = { title: "Backup & settings" };

export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <PageMain title="Backup & settings">
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">Backup &amp; restore</h2>
        <Suspense>
          <Status searchParams={searchParams} />
        </Suspense>

        <section className="rounded-xl border border-line bg-surface p-4">
          <h3 className="font-semibold">Download a backup</h3>
          <p className="mt-1 mb-3 text-sm text-muted">
            One JSON file with everything: tasks, solves, notes, saved LeetCode submissions, study progress and practice logs. Keep it
            somewhere safe, or use it to move to another computer. The extension pairing key isn&apos;t included.
          </p>
          <a href="/api/backup" download className="inline-block rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">
            Download backup
          </a>
        </section>

        <section className="rounded-xl border border-line bg-surface p-4">
          <h3 className="font-semibold">Restore from a backup</h3>
          <p className="mt-1 mb-3 text-sm text-muted">
            <strong className="text-foreground">Replaces all your current data</strong> with the file&apos;s contents. A copy of your current data
            is saved to <code>data/backups/</code> first, so you can undo by restoring that file. All or nothing: if anything is wrong with the
            file, nothing changes.
          </p>
          <form action="/api/backup/restore" method="post" encType="multipart/form-data" className="space-y-3">
            <input
              type="file"
              name="file"
              accept="application/json,.json"
              required
              aria-label="Backup file"
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-background file:px-3 file:py-1.5 file:text-foreground"
            />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="confirm" value="yes" required className="mt-0.5 size-4" />
              <span>Yes, replace everything with this backup.</span>
            </label>
            <button className="rounded-lg border border-line px-4 py-2 font-medium hover:bg-background">Restore</button>
          </form>
        </section>
      </div>
    </PageMain>
  );
}

async function Status({ searchParams }: { searchParams: PageProps<"/settings">["searchParams"] }) {
  const p = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const error = one(p.error);
  const restored = one(p.restored);
  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-cat-mock bg-surface p-4 text-sm">
        {error.slice(0, 300)}
      </p>
    );
  }
  if (restored) {
    const copy = one(p.copy);
    return (
      <p role="status" className="rounded-xl border border-accent bg-surface p-4 text-sm">
        ✓ Restored {Number(restored) || 0} rows.{copy && <> Your previous data was saved to <code className="break-all">{copy.slice(0, 400)}</code>.</>}
      </p>
    );
  }
  return null;
}
