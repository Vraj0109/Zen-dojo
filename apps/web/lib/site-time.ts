import "server-only";
import { and, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { siteTime } from "./schema";

// Time on LeetCode problem pages, reported by the browser extension (only the problem's slug and a number of seconds;
// never page content). It is shown next to the focus-timer minutes and in the weekly review. It does not earn XP and
// is not added to "hours studied", so it can't double-count a focus session you also timed.

export const SITE_TIME_LIMITS = { entries: 200, secondsPerEntry: 6 * 3600, secondsPerDay: 24 * 3600, bodyBytes: 100_000 };

export interface SiteTimeEntry {
  /** Local date YYYY-MM-DD */
  day: string;
  slug: string;
  seconds: number;
}

/** Validate one entry from the extension; null if unusable. */
export function parseSiteTime(raw: unknown): SiteTimeEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const day = String(r.day ?? "");
  const slug = String(r.slug ?? "");
  const seconds = typeof r.seconds === "number" ? Math.round(r.seconds) : NaN;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(new Date(day).getTime())) return null;
  if (!/^[a-z0-9-]{1,150}$/.test(slug)) return null;
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > SITE_TIME_LIMITS.secondsPerEntry) return null;
  return { day, slug, seconds };
}

/** Add reported seconds to each (day, problem). A day's total for one problem is capped at 24 hours. */
export async function addSiteTime(raw: unknown[]): Promise<{ stored: number; skipped: number }> {
  const batch = raw.slice(0, SITE_TIME_LIMITS.entries);
  const entries = batch.map(parseSiteTime).filter((e): e is SiteTimeEntry => e !== null);
  const db = await getDb();
  for (const e of entries) {
    await db
      .insert(siteTime)
      .values(e)
      .onConflictDoUpdate({
        target: [siteTime.day, siteTime.slug],
        set: { seconds: sql`min(${siteTime.seconds} + excluded.seconds, ${SITE_TIME_LIMITS.secondsPerDay})` },
      });
  }
  return { stored: entries.length, skipped: raw.length - entries.length };
}

/** Whole minutes (rounded) spent on one problem page, over all days. */
export async function siteMinutesForSlug(slug: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${siteTime.seconds}), 0)` })
    .from(siteTime)
    .where(sql`${siteTime.slug} = ${slug}`);
  return Math.round(Number(row?.total ?? 0) / 60);
}

/** Seconds per problem between two dates (inclusive), biggest first. */
export async function siteTimeInRange(from: string, to: string): Promise<{ slug: string; seconds: number }[]> {
  const db = await getDb();
  const rows = await db
    .select({ slug: siteTime.slug, seconds: sql<number>`sum(${siteTime.seconds})` })
    .from(siteTime)
    .where(and(gte(siteTime.day, from), lte(siteTime.day, to)))
    .groupBy(siteTime.slug);
  return rows.map((r) => ({ slug: r.slug, seconds: Number(r.seconds) })).sort((a, b) => b.seconds - a.seconds);
}
