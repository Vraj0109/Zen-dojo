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
import { PageMain } from "../../ui";
import { PortfolioView } from "../../u/portfolio-view";
import { ProfileTabs } from "../profile-ui";

export const metadata: Metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <PageMain title="Portfolio" full>
      <ProfileTabs active="/profile" />
      <Suspense fallback={<p className="text-sm text-muted">Loading your portfolio...</p>}>
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
        <Link href="/profile" className="text-muted hover:text-foreground">
          Back to profile
        </Link>
        <span className="text-muted"> · </span>
        <Link href="/profile/settings" className="text-muted hover:text-foreground">
          Edit your name
        </Link>
      </p>
      <PortfolioView data={data} aiEnabled={process.env.HABIT_HOSTED === "1" || Boolean(ai?.enabled)} certificateHref={(id) => `/profile/certificates/${encodeURIComponent(id)}`} />
      <PublicProfileCard initial={publicProfile} signedIn={signedIn} />
      <section className="rounded-xl border border-line bg-surface p-4">
        <h3 className="text-lg font-semibold">Share</h3>
        <p className="mt-1 text-sm text-muted">
          The page holds your name, streaks, solved counts, course progress and certificate titles. It never holds notes, code, emails or keys.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a href="/profile/portfolio/export" download className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent">
            Download my portfolio as a web page
          </a>
          <Link href="/u/me" className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-background">
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
