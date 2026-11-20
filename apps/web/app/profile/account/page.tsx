import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { DeviceList, SignOutButton, SyncPanel } from "@/app/components/account-menu";
import { DeleteCloudData, DeleteLocalData } from "./delete-data";
import { ProfileTabs } from "../profile-ui";
import { PageMain, buttonClass } from "../../ui";

export const metadata: Metadata = { title: "Account" };

async function AccountBody() {
  await connection();
  const session = await getSession();

  if (!session) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="space-y-4 rounded-[28px] border border-line bg-surface p-6 dark:border-0">
          <p className="text-sm">You are not signed in. The app works fully this way. Sign in to sync your progress across devices.</p>
          <SyncPanel signedIn={false} />
          <a
            href={`/auth/start?next=${encodeURIComponent("/profile/account")}`}
            className={buttonClass("primary", "sm", "h-11 px-6")}
          >
            Continue with GitHub
          </a>
        </div>

        <DeleteCloudData signedIn={false} />
        <DeleteLocalData />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-line bg-surface p-6 dark:border-0">
        <div className="flex min-w-0 items-center gap-3">
          {session.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote GitHub avatar, no image loader configured
            <img src={session.avatarUrl} alt="" width={48} height={48} referrerPolicy="no-referrer" className="size-12 rounded-full" />
          ) : (
            <span className="inline-flex size-12 items-center justify-center rounded-full border border-line text-muted" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{session.name}</div>
            <div className="truncate text-sm text-muted">Signed in with GitHub{session.admin ? ", admin" : ""}</div>
          </div>
        </div>
        <SignOutButton />
      </section>

      <SyncPanel signedIn />

      <DeviceList />

      {session.admin ? (
        <p className="text-sm">
          <Link href="/admin" className="inline-flex h-10 items-center text-primary hover:underline">Open the admin portal</Link>
        </p>
      ) : null}

      <DeleteCloudData signedIn accountName={session.name} />
      <DeleteLocalData />
    </div>
  );
}

export default function AccountPage() {
  return (
    <PageMain title="Account" hideTitle>
      <ProfileTabs active="/profile/account" />
      <Suspense fallback={<div className="h-40 max-w-2xl rounded-[28px] border border-line bg-surface dark:border-0" />}>
        <AccountBody />
      </Suspense>
    </PageMain>
  );
}
