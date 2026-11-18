import { connection } from "next/server";
import { StreakChip, XpChip } from "../ui";
import { progressNow, reviewSplit } from "../today/data";

/** Streak and XP chips under the logo. Streams in; renders nothing if the data cannot be read. */
export async function SidebarProgress() {
  await connection();
  const p = await progressNow().catch(() => null);
  if (!p) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StreakChip days={p.streak} />
      <XpChip xp={p.totalXp} />
    </div>
  );
}

/** The streak chip alone, for the phone header. */
export async function HeaderStreak() {
  await connection();
  const p = await progressNow().catch(() => null);
  return p ? <StreakChip days={p.streak} /> : null;
}

/** Reviews due today, beside Review in the sidebar (warning colour). Nothing when none are due. */
export async function ReviewCount() {
  await connection();
  const split = await reviewSplit().catch(() => null);
  const n = split?.dueToday.length ?? 0;
  if (n === 0) return null;
  return (
    <span className="ml-auto text-xs font-semibold text-warning tabular-nums">
      <span aria-hidden>{n}</span>
      <span className="sr-only">, {n} due</span>
    </span>
  );
}
