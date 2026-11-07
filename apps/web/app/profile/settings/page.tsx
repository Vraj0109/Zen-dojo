import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatLong } from "@habit/shared";
import { getExtensionStatus } from "@/lib/leetcode/extension";
import { getLeetCodeStatus } from "@/lib/leetcode/sync";
import { getPlanStart } from "@/lib/tasks";
import { getSimpleMode } from "@/lib/ui-prefs";
import { setPlanStartAction, setSimpleModeAction } from "../../actions";
import { SubmitButton } from "../../submit-button";
import { PageMain } from "../../ui";
import { ExtensionCard, LeetCodeCard } from "../connections";
import { ProfileTabs } from "../profile-ui";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage({ searchParams }: PageProps<"/profile/settings">) {
  return (
    <PageMain title="Settings">
      <ProfileTabs active="/profile/settings" />
      <div className="grid gap-8 xl:grid-cols-2">
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Interface</h3>
          <Suspense fallback={<p className="text-muted">Loading…</p>}>
            <InterfaceSettings />
          </Suspense>

          <h3 className="text-lg font-semibold">Plan</h3>
          <Suspense fallback={<p className="text-muted">Loading…</p>}>
            <PlanSettings />
          </Suspense>

          <h3 id="leetcode" className="scroll-mt-32 pt-2 text-lg font-semibold lg:scroll-mt-4">
            LeetCode
          </h3>
          <Suspense fallback={<p className="text-muted">Loading…</p>}>
            <Connections />
          </Suspense>
        </div>

        <div className="space-y-6">
          <h3 id="backup" className="text-lg font-semibold">
            Backup &amp; restore
          </h3>
          <Suspense>
            <Status searchParams={searchParams} />
          </Suspense>

          <section className="rounded-xl border border-line bg-surface p-4">
            <h4 className="font-semibold">Download a backup</h4>
            <p className="mt-1 mb-3 text-sm text-muted">
              One JSON file with everything: tasks, solves, notes, saved LeetCode submissions, study progress and practice logs. Keep it
              somewhere safe, or use it to move to another computer. The extension pairing key isn&apos;t included.
            </p>
            <a href="/api/backup" download className="inline-block rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">
              Download backup
            </a>
          </section>

          <section className="rounded-xl border border-line bg-surface p-4">
            <h4 className="font-semibold">Restore from a backup</h4>
            <p className="mt-1 mb-3 text-sm text-muted">
              <strong className="text-foreground">Replaces all your current data</strong> with the file&apos;s contents. A copy of your current
              data is saved to a <code>backups</code> folder next to your database first, so you can undo by restoring that file. All or nothing: if anything is wrong
              with the file, nothing changes.
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
      </div>
    </PageMain>
  );
}

async function InterfaceSettings() {
  await connection();
  const simple = await getSimpleMode();
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h4 className="font-semibold">Simple mode: {simple ? "on" : "off"}</h4>
      <p className="mt-1 mb-3 text-sm text-muted">
        Hides the power tools so each page shows what to do next: the boss fight, pattern cheat sheets, your diagrams, the reading list and
        the stuck-list history. Nothing is deleted and the pages stay reachable by their address.
      </p>
      <form action={setSimpleModeAction}>
        <input type="hidden" name="simple" value={simple ? "0" : "1"} />
        <SubmitButton className="rounded-lg border border-line px-4 py-2 font-medium hover:bg-background">
          {simple ? "Turn Simple mode off" : "Turn Simple mode on"}
        </SubmitButton>
      </form>
    </section>
  );
}

async function PlanSettings() {
  await connection();
  const planStart = await getPlanStart();
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h4 className="font-semibold">Plan start</h4>
      <p className="mt-1 mb-3 text-sm text-muted">
        Week 1 started on {formatLong(planStart)}. Weeks run Monday to Sunday, so any date snaps to its Monday. Changing it regenerates
        unfinished tasks for the new week; finished tasks and XP are kept.
      </p>
      <form action={setPlanStartAction} className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          name="planStart"
          defaultValue={planStart}
          aria-label="Plan start date"
          className="rounded-lg border border-line bg-background px-3 py-2"
        />
        <SubmitButton className="rounded-lg border border-line px-4 py-2 font-medium hover:bg-background">Save</SubmitButton>
      </form>
    </section>
  );
}

async function Connections() {
  await connection();
  const [leetcode, extension] = await Promise.all([getLeetCodeStatus(), getExtensionStatus()]);
  return (
    <>
      <LeetCodeCard {...leetcode} />
      <ExtensionCard {...extension} />
    </>
  );
}

async function Status({ searchParams }: { searchParams: PageProps<"/profile/settings">["searchParams"] }) {
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
        Restored {Number(restored) || 0} rows.{copy && <> Your previous data was saved to <code className="break-all">{copy.slice(0, 400)}</code>.</>}
      </p>
    );
  }
  return null;
}
