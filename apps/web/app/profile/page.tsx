import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { TOTAL_WEEKS, type Category, type HeatCell } from "@habit/shared";
import { BALANCE_DAYS, getStats } from "@/lib/stats";
import { getPlanPosition, getPlanStart } from "@/lib/tasks";
import { PageMain, ProgressBar, Stat } from "../ui";
import { ProfileTabs } from "./profile-ui";
import { ProfileStatsSkeleton } from "@/app/components/profile-skeleton";
import { SignInCard } from "@/app/components/sign-in-card";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <PageMain title="Profile">
      <Suspense fallback={null}>
        <SignInCard next="/profile" />
      </Suspense>
      <ProfileTabs active="/profile" />
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
  const [s, planStart, position] = await Promise.all([getStats(), getPlanStart(), getPlanPosition()]);
  const { totals } = s;
  const { level } = totals;
  const earned = s.badges.filter((b) => b.earned).length;
  const weekNo = position.finished ? TOTAL_WEEKS + 1 : position.cursor;
  const toNext = level.xpForNext - level.xpIntoLevel;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="gamify-only col-span-2 rounded-md border border-line bg-surface p-4 lg:col-span-1">
          <p className="text-xs font-medium text-muted">Level</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {level.level} <span className="text-sm font-medium text-muted">{level.tier}</span>
          </p>
          <div className="mt-2">
            <ProgressBar value={level.xpIntoLevel} max={level.xpForNext} label="Progress to next level" tone="reward" />
          </div>
          <p className="mt-1 text-xs text-muted">
            {totals.totalXp} XP · {toNext} to level {level.level + 1}
          </p>
        </div>
        <Stat label="Plan" value={weekNo < 1 ? "Not started" : weekNo > TOTAL_WEEKS ? "Finished" : `Week ${weekNo} of ${TOTAL_WEEKS}`} hint={`started ${fmt(planStart, { month: "short", day: "numeric" })}`} href="/roadmap" />
        <Stat label="Streak" value={`${totals.streak} day${totals.streak === 1 ? "" : "s"}`} hint={`best ${totals.bestStreak}`} className="gamify-only" />
        <Stat label="Active days" value={String(totals.activeDays)} hint={`${totals.hours} h logged`} />
        <Stat label="Badges" value={`${earned} of ${s.badges.length}`} hint="earned" href="/profile/badges" className="gamify-only" />
      </section>

      <Heatmap weeks={s.heatmap.slice(-ACTIVITY_WEEKS)} today={s.today} />
      <div className="gamify-only">
        <Balance rows={s.balance} recentXp={s.recentXp} />
      </div>
    </div>
  );
}

/** The activity grid shows the last 12 weeks (the stats keep 16). */
const ACTIVITY_WEEKS = 12;
const HEAT = ["bg-surface-2", "bg-primary/30", "bg-primary/55", "bg-primary/80", "bg-primary"] as const;

function Heatmap({ weeks, today }: { weeks: HeatCell[][]; today: string }) {
  const total = weeks.flat().reduce((a, c) => a + c.xp, 0);
  const active = weeks.flat().filter((c) => c.xp > 0).length;
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Activity, last 12 weeks</h2>
        <p className="text-sm text-muted">
          <span className="gamify-only">{total} XP on </span>
          {active} day{active === 1 ? "" : "s"}
        </p>
      </div>
      <div className="overflow-x-auto rounded-md border border-line bg-surface p-5">
        <div className="flex gap-[3px]" role="img" aria-label={`Activity heatmap: ${total} XP over ${active} active days in the last 12 weeks`}>
          <div className="mr-1 flex flex-col gap-[3px] pt-5 text-[10px] leading-none text-muted" aria-hidden>
            {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => (
              <span key={i} className="flex h-4 items-center sm:h-5">
                {d}
              </span>
            ))}
          </div>
          {weeks.map((col, w) => {
            const month = fmt(col[0].date, { month: "short" });
            const showMonth = w === 0 || month !== fmt(weeks[w - 1][0].date, { month: "short" });
            return (
              <div key={col[0].date} className="flex flex-col gap-[3px]">
                <span className="h-4 text-[10px] leading-4 text-muted" aria-hidden>
                  {showMonth ? month : ""}
                </span>
                {col.map((c) => (
                  <span
                    key={c.date}
                    title={c.future ? undefined : `${fmt(c.date)}: ${c.xp} XP`}
                    className={`size-4 rounded-[3px] sm:size-5 ${c.future ? "bg-transparent" : HEAT[c.level]} ${c.date === today ? "ring-2 ring-foreground ring-offset-1 ring-offset-surface" : ""}`}
                  />
                ))}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1 text-[11px] text-muted" aria-hidden>
          Less
          {HEAT.map((cls) => (
            <span key={cls} className={`size-3 rounded-[3px] ${cls}`} />
          ))}
          More
        </div>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted">Show as a table</summary>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-1 font-medium">Week of</th>
              <th className="gamify-only py-1 text-right font-medium">XP</th>
              <th className="py-1 text-right font-medium">Active days</th>
            </tr>
          </thead>
          <tbody>
            {[...weeks].reverse().map((col) => (
              <tr key={col[0].date} className="border-t border-line">
                <td className="py-1">{fmt(col[0].date, { month: "short", day: "numeric" })}</td>
                <td className="gamify-only py-1 text-right">{col.reduce((a, c) => a + c.xp, 0)}</td>
                <td className="py-1 text-right">{col.filter((c) => c.xp > 0).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

const CAT_COLOR: Record<Category, string> = {
  dsa: "bg-cat-dsa",
  sd: "bg-cat-sd",
  beh_lld: "bg-cat-beh",
  mock_app: "bg-cat-mock",
  other: "bg-cat-other",
};

function Balance({ rows, recentXp }: { rows: Awaited<ReturnType<typeof getStats>>["balance"]; recentXp: number }) {
  const pct = (v: number) => Math.round(v * 100);
  return (
    <section>
      <h2 className="text-lg font-semibold">Balance, last {BALANCE_DAYS} days</h2>
      <p className="mb-3 text-sm text-muted">
        Share of your XP per area vs the roadmap&apos;s split (40% DSA, 35% system design, 15% behavioral + LLD, 10% mocks). The line marks the target.
      </p>
      {recentXp === 0 ? (
        <p className="rounded-md border border-line bg-surface p-5 text-sm text-muted">No XP in the last {BALANCE_DAYS} days yet.</p>
      ) : (
        <ul className="space-y-3 rounded-md border border-line bg-surface p-5">
          <li aria-hidden className="flex h-3 overflow-hidden rounded-full bg-surface-2">
            {rows.map((r) => (
              <span key={r.category} className={CAT_COLOR[r.category]} style={{ width: `${pct(r.share)}%` }} title={`${r.label}: ${pct(r.share)}%`} />
            ))}
          </li>
          {rows.map((r) => {
            const diff = pct(r.share) - pct(r.target);
            const note = r.target === 0 ? "" : Math.abs(diff) <= 5 ? "on target" : diff > 0 ? `${diff} pts over` : `${-diff} pts under`;
            return (
              <li key={r.category}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{r.label}</span>
                  <span className="text-muted">
                    {pct(r.share)}%{r.target > 0 && ` of ${pct(r.target)}%`} · {r.xp} XP{note && ` · ${note}`}
                  </span>
                </div>
                <div
                  className="relative h-1.5 rounded-full bg-surface-2"
                  title={`${r.label}: ${pct(r.share)}% of recent XP${r.target > 0 ? `, target ${pct(r.target)}%` : ""}`}
                >
                  <div className={`h-full rounded-full ${CAT_COLOR[r.category]}`} style={{ width: `${Math.max(pct(r.share), r.xp > 0 ? 2 : 0)}%` }} />
                  {r.target > 0 && (
                    <span className="absolute -top-1 h-4 w-0.5 rounded bg-foreground" style={{ left: `calc(${pct(r.target)}% - 1px)` }} aria-hidden />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
