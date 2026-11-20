import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { getPortfolio } from "@/lib/portfolio";
import { getAiSettings } from "@/lib/ui-prefs";
import { getSession } from "@/lib/auth/session";
import { getPublicProfileState, publishPublicProfile, publicProfileLink } from "@/lib/public-profile";
import type { PublicProfileResult } from "./public-actions";
import { PublicProfileCard } from "./public-profile-card";
import { PageMain, Skeleton, buttonClass } from "../../ui";
import { PortfolioView } from "../../u/portfolio-view";
import { ProfileTabs } from "../profile-ui";

export const metadata: Metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <PageMain title="Portfolio" hideTitle>
      <ProfileTabs active="/profile/portfolio" />
      <Suspense fallback={<div className="space-y-3"><Skeleton className="h-24 w-full rounded-[24px]" /><Skeleton className="h-64 w-full rounded-[24px]" /></div>}>
        <Portfolio />
      </Suspense>
    </PageMain>
  );
}

async function Portfolio() {
  await connection();
  const [data, ai, publicProfile, signedIn] = await Promise.all([getPortfolio(), process.env.HABIT_HOSTED === "1" ? null : getAiSettings(), refreshedPublicState(), getSession().then(Boolean)]);
  return (
    <div className="space-y-8">
      <p className="text-sm">
        <Link href="/profile/settings" className="inline-flex h-10 items-center text-muted hover:text-foreground">
          Edit your name in Settings
        </Link>
      </p>
      <PortfolioView data={data} aiEnabled={process.env.HABIT_HOSTED === "1" || Boolean(ai?.enabled)} certificateHref={(id) => `/profile/certificates/${encodeURIComponent(id)}`} />
      <PublicProfileCard initial={publicProfile} signedIn={signedIn} />
      <section className="rounded-[28px] border border-line bg-surface p-6 dark:border-0">
        <h2 className="text-lg font-medium">Share</h2>
        <p className="mt-1 text-sm text-muted">
          The page holds your name, streaks, solved counts, course progress and certificate titles. It never holds notes, code, emails or keys.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href="/profile/portfolio/export"
            download
            className={buttonClass("primary", "sm", "h-11 px-6")}
          >
            Download my portfolio as a web page
          </a>
          <Link
            href="/u/me"
            className={buttonClass("outline", "sm", "h-11 px-6")}
          >
            Preview public page
          </Link>
        </div>
      </section>
    </div>
  );
}

/** Opening this page re-uploads the snapshot when the profile is already public (no background job). */
async function refreshedPublicState(): Promise<PublicProfileResult> {
  try {
    if (!(await getSession())) return { ok: true, enabled: false, id: null, link: null };
    let state = await getPublicProfileState();
    if (state.ok && state.enabled) state = await publishPublicProfile();
    return state.ok ? { ok: true, enabled: state.enabled, id: state.id, link: state.enabled && state.id ? publicProfileLink(state.id) : null } : state;
  } catch {
    return { ok: true, enabled: false, id: null, link: null };
  }
}
