import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { DeviceList, SignOutButton } from "@/app/components/account-menu";

export const metadata: Metadata = { title: "Account" };

async function AccountBody() {
  await connection();
  const session = await getSession();

  if (!session) {
    return (
      <div className="max-w-md space-y-4 rounded-xl border border-line bg-surface p-6">
        <p className="text-sm">You are not signed in. The app works fully this way. Sign in to sync your progress across devices.</p>
        <a
          href={`/auth/start?next=${encodeURIComponent("/profile/account")}`}
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent"
        >
          Continue with GitHub
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4">
        <div className="flex min-w-0 items-center gap-3">
          {session.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote GitHub avatar, no image loader configured
            <img src={session.avatarUrl} alt="" width={48} height={48} referrerPolicy="no-referrer" className="size-12 rounded-full border border-line" />
          ) : (
            <span className="inline-flex size-12 items-center justify-center rounded-full border border-line text-muted" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{session.name}</div>
            <div className="truncate text-xs text-muted">Signed in with GitHub{session.admin ? ", admin" : ""}</div>
          </div>
        </div>
        <SignOutButton />
      </section>

      <section className="space-y-1 text-sm">
        <h2 className="text-base font-semibold">Sync</h2>
        <p className="text-muted">
          Your progress syncs to your account in the background while you are signed in. The pill in the sidebar shows the current
          state. Signed out, everything stays on this device only.
        </p>
      </section>

      <DeviceList />

      {session.admin ? (
        <p className="text-sm">
          <Link href="/admin" className="text-accent hover:underline">Open the admin portal</Link>
        </p>
      ) : null}
    </div>
  );
}

export default function AccountPage() {
  return (
    <main className="w-full px-4 py-6 lg:px-8">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Account</h1>
      <Suspense fallback={<div className="h-40 max-w-2xl rounded-xl border border-line bg-surface" />}>
        <AccountBody />
      </Suspense>
    </main>
  );
}
