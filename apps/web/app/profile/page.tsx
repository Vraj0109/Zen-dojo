import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { isNotNull } from "drizzle-orm";
import { ALL_CONCEPTS, addDays, type Category, type HeatCell } from "@habit/shared";
import { getDb } from "@/lib/db";
import { conceptProgress } from "@/lib/schema";
import { BALANCE_DAYS, getStats } from "@/lib/stats";
import { getDsaView } from "@/lib/dsa";
import { PageMain, Scallop, buttonClass } from "../ui";
import { getSession } from "@/lib/auth/session";
import { getProfileName } from "@/lib/ui-prefs";
import { PROFILE_PAGE_CLASS } from "./shared";
import { ProfileStatsSkeleton } from "@/app/components/profile-skeleton";
import { SignInCard } from "@/app/components/sign-in-card";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <PageMain title="Profile" hideTitle className={PROFILE_PAGE_CLASS}>
      <Suspense fallback={null}>
        <SignInCard next="/profile" />
      </Suspense>
      <Suspense fallback={<ProfileStatsSkeleton />}>
        <Stats />
      </Suspense>
      <p className="mt-8 text-sm text-muted">
        Stuck on setup?{" "}
        <Link href="/help" className="font-medium text-primary hover:underline">
          Help and FAQ
        </Link>{" "}
        covers installing problems, running code, AI, sync and certificates.
      </p>
    </PageMain>
  );
}

const fmt = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", opts);
};

async function Stats() {
  await connection();
  const [s, dsa, session, profileName, coveredRows] = await Promise.all([
    getStats(),
    getDsaView(),
    getSession().catch(() => null),
    getProfileName().catch(() => ""),
    getDb().then((db) => db.select({ id: conceptProgress.conceptId }).from(conceptProgress).where(isNotNull(conceptProgress.coveredOn))),
  ]);
  const conceptsCovered = coveredRows.filter((c) => ALL_CONCEPTS[c.id]).length;
  const displayName = session?.name || profileName;
  const initial = displayName.trim().charAt(0).toUpperCase();
  const { totals } = s;
  const { level } = totals;
  const earnedBadges = s.badges.filter((b) => b.earned);
  const toNext = level.xpForNext - level.xpIntoLevel;
  const levelPct = Math.round((level.xpIntoLevel / Math.max(level.xpForNext, 1)) * 100);

  // Show 52 weeks. getStats() may return fewer; older weeks are padded and marked as outside the record.
  const targetWeeks = 52;
  const recordedWeeks = s.heatmap.length;
  let allWeeks = s.heatmap;
  if (allWeeks.length < targetWeeks && allWeeks.length > 0) {
    const firstDate = allWeeks[0][0].date;
    const paddingWeeks: HeatCell[][] = [];
    const needed = targetWeeks - allWeeks.length;
    for (let w = needed; w >= 1; w--) {
      const col: HeatCell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(firstDate, -w * 7 + d);
        col.push({ date, xp: 0, level: 0, future: false, padded: true } as HeatCell);
      }
      paddingWeeks.push(col);
    }
    allWeeks = [...paddingWeeks, ...allWeeks];
  }

  const activeDayCount = s.heatmap.flat().filter((c) => c.xp > 0 && !c.future).length;
  const span = recordedWeeks >= 52 ? "in the last year" : `in the last ${recordedWeeks} weeks`;

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <section className="flex flex-wrap items-center gap-4 rounded-[32px] border border-line bg-surface p-[18px] dark:border-0 sm:gap-5 sm:px-7 sm:py-6">
        {session?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote GitHub avatar, no image loader configured
          <img src={session.avatarUrl} alt="" width={72} height={72} referrerPolicy="no-referrer" className="size-14 shrink-0 rounded-full sm:size-18" />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-reward-soft text-2xl font-semibold text-on-reward-soft sm:size-18 sm:text-[28px]"
          >
            {initial || (
              <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            )}
          </div>
        )}
        <div className="min-w-0 flex-[1_1_200px]">
          <h2 className="text-[22px] font-semibold tracking-tight sm:text-[28px]">
            <span className="gamify-only">Level {level.level} · {level.tier}</span>
            <span className="[[data-gamify=on]_&]:hidden">{displayName || "Your progress"}</span>
          </h2>
          <div className="gamify-only">
            <p className="mt-1 mb-2.5 text-sm text-muted">
              {totals.totalXp.toLocaleString("en-US")} XP · {toNext.toLocaleString("en-US")} to level {level.level + 1}
            </p>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-primary-soft"
              role="progressbar"
              aria-label={`Progress to level ${level.level + 1}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={levelPct}
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(4, levelPct))}%` }} />
            </div>
          </div>
        </div>
        <Link href="/profile/settings" className={buttonClass("outline", "sm", "h-11 px-5 max-sm:hidden")}>
          Settings
        </Link>
      </section>

      {/* 4 Stat tiles in tones */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] gap-3">
        {/* Streak */}
        <section className="flex flex-col gap-0.5 rounded-[28px] bg-reward-soft px-5 py-[18px] text-on-reward-soft">
          <p className="text-[32px] leading-tight font-semibold tracking-tight">{totals.streak}</p>
          <p className="text-sm">day streak</p>
        </section>

        {/* Problems solved */}
        <section className="flex flex-col gap-0.5 rounded-[28px] bg-cat-dsa px-5 py-[18px] text-on-cat-dsa">
          <p className="text-[32px] leading-tight font-semibold tracking-tight">{dsa.totals.solved}</p>
          <p className="text-sm">problems solved</p>
        </section>

        {/* Concepts covered */}
        <section className="flex flex-col gap-0.5 rounded-[28px] bg-cat-sd px-5 py-[18px] text-on-cat-sd">
          <p className="text-[32px] leading-tight font-semibold tracking-tight">{conceptsCovered}</p>
          <p className="text-sm">concepts covered</p>
        </section>

        {/* Focus time */}
        <section className="flex flex-col gap-0.5 rounded-[28px] bg-cat-lld px-5 py-[18px] text-on-cat-lld">
          <p className="text-[32px] leading-tight font-semibold tracking-tight">{totals.hours} h</p>
          <p className="text-sm">focus time</p>
        </section>
      </div>

      {/* 52-week activity grid (17 on phone) */}
      <section className="flex min-w-0 flex-col gap-3.5 rounded-[28px] border border-line bg-surface p-4 dark:border-0 sm:px-6 sm:py-[22px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-lg font-medium tracking-tight">
            {activeDayCount} active {activeDayCount === 1 ? "day" : "days"} {span}
          </h2>
          <span className="text-sm text-muted">
            Best streak {totals.bestStreak} {totals.bestStreak === 1 ? "day" : "days"}
          </span>
        </div>

        <HeatmapGrid weeks={allWeeks} today={s.today} />

        <div className="flex items-center justify-end gap-1.5 text-xs text-muted" aria-hidden="true">
          <span>Less</span>
          {HEAT_CLASSES.map((cls) => (
            <span key={cls} className={`size-3 rounded-[3px] ${cls}`} />
          ))}
          <span>More</span>
        </div>
      </section>

      {/* Split: Balance this month + Badges preview */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3">
        {/* Balance */}
        <section className="flex min-w-0 flex-col gap-3.5 rounded-[28px] border border-line bg-surface p-4 dark:border-0 sm:px-6 sm:py-[22px]">
          <h2 className="text-lg font-medium tracking-tight">Balance this month</h2>
          <Balance rows={s.balance} recentXp={s.recentXp} />
        </section>

        {/* Badges */}
        <section className="gamify-only flex min-w-0 flex-col gap-3.5 rounded-[28px] border border-line bg-surface p-4 dark:border-0 sm:px-6 sm:py-[22px]">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-medium tracking-tight">
              Badges · {earnedBadges.length} of {s.badges.length}
            </h2>
            <Link href="/profile/badges" className="inline-flex h-10 items-center text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,76px),1fr))] gap-3">
            {[...earnedBadges, ...s.badges.filter((b) => !b.earned)].slice(0, 8).map((b) => (
              <li key={b.id} className="flex flex-col items-center gap-1.5 text-center">
                <Scallop size={64} fill={b.earned ? "var(--reward-soft)" : "var(--surface-2)"}>
                  <span className={`text-lg font-semibold ${b.earned ? "text-reward" : "text-muted"}`}>{badgeMark(b)}</span>
                </Scallop>
                <span className="text-xs text-muted">
                  {b.title}
                  <span className="sr-only">{b.earned ? " (earned)" : " (not yet)"}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

const HEAT_CLASSES = ["bg-surface-2", "bg-primary/30", "bg-primary/55", "bg-primary/80", "bg-primary"] as const;

/** First letter of a badge title, or its target when it is a count ("50 solves" shows 50). */
function badgeMark(b: { title: string; target: number }): string {
  return b.target > 1 && b.target < 1000 ? String(b.target) : b.title.charAt(0).toUpperCase();
}

/**
 * The activity grid: one column per week, scaled to the card's width. Below 560px of page width only the last 17
 * weeks show (container query), so cells stay a readable size on a phone.
 */
function HeatmapGrid({ weeks, today }: { weeks: HeatCell[][]; today: string }) {
  return (
    <div className="flex w-full gap-[3px] sm:gap-1" role="img" aria-label="Activity grid, one square per day">
      {weeks.map((col, w) => (
        <div
          key={col[0].date}
          className={`flex min-w-0 flex-1 flex-col gap-[3px] sm:gap-1 ${w < weeks.length - 17 ? "@max-[560px]:hidden" : ""}`}
        >
          {col.map((c) => {
            const padded = (c as HeatCell & { padded?: boolean }).padded;
            return (
              <span
                key={c.date}
                title={c.future || padded ? undefined : `${fmt(c.date)}: ${c.xp} XP`}
                className={`aspect-square w-full rounded-[3px] sm:rounded-[4px] ${c.future ? "bg-transparent" : HEAT_CLASSES[c.level]} ${
                  c.date === today ? "ring-2 ring-primary ring-offset-1 ring-offset-surface" : ""
                }`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

const CAT_COLORS: Record<Category, string> = {
  dsa: "bg-cat-dsa",
  sd: "bg-cat-sd",
  beh_lld: "bg-cat-lld",
  mock_app: "bg-cat-mock",
  other: "bg-cat-core",
};

function Balance({ rows, recentXp }: { rows: Awaited<ReturnType<typeof getStats>>["balance"]; recentXp: number }) {
  const pct = (v: number) => Math.round(v * 100);

  if (recentXp === 0) {
    return <p className="text-sm text-muted">No XP logged in the last {BALANCE_DAYS} days yet.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.category} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate">{r.label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full ${CAT_COLORS[r.category] ?? "bg-primary"}`}
              style={{ width: `${Math.min(100, Math.max(pct(r.share), 2))}%` }}
            />
          </div>
          <span className="w-11 shrink-0 text-right font-medium tabular-nums">{pct(r.share)}%</span>
        </div>
      ))}
    </div>
  );
}
