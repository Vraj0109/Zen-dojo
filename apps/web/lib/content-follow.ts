import "server-only";
import { eq } from "drizzle-orm";
import type { UnitId } from "@habit/shared";
import { getDb } from "./db";
import { settings } from "./schema";

// Follow / Mute per content unit on desktop (plan 0119 step 6). Stored in the user DB settings table as JSON arrays of
// unit ids. A unit is followed when set to Follow; a started unit is followed unless muted (see desktop-notices.ts).
// Mute wins over Follow. Setting a unit to "default" removes it from both lists.

export const FOLLOW_SETTING_KEY = "content.follow";
export const MUTE_SETTING_KEY = "content.mute";

export type FollowState = "follow" | "mute" | "default";
export type FollowMute = { follow: UnitId[]; mute: UnitId[] };

type UserDb = Awaited<ReturnType<typeof getDb>>;

const UNIT_RE = /^(course:[^:/\s]+|problems:[^:/\s]+|docs)$/;

export function isUnitId(value: unknown): value is UnitId {
  return typeof value === "string" && UNIT_RE.test(value);
}

/** Parses a stored list. Anything malformed gives an empty list; entries that are not unit ids are dropped. */
export function parseUnitList(raw: string | null | undefined): UnitId[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter(isUnitId))];
  } catch {
    return [];
  }
}

/** The pure rule: moves one unit to the given state in both lists. Lists stay disjoint and sorted. */
export function applyFollowState(current: FollowMute, unit: UnitId, state: FollowState): FollowMute {
  const follow = current.follow.filter((u) => u !== unit);
  const mute = current.mute.filter((u) => u !== unit);
  if (state === "follow") follow.push(unit);
  if (state === "mute") mute.push(unit);
  return { follow: follow.sort(), mute: mute.sort() };
}

/** The Follow and Mute lists of this person. Empty lists when nothing is stored. */
export async function getFollowMute(db?: UserDb): Promise<FollowMute> {
  const d = db ?? (await getDb());
  const rows = await d
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(eq(settings.key, FOLLOW_SETTING_KEY));
  const muteRows = await d
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(eq(settings.key, MUTE_SETTING_KEY));
  return {
    follow: parseUnitList(rows[0]?.value),
    mute: parseUnitList(muteRows[0]?.value),
  };
}

/** Sets one unit to Follow, Mute or Default (neither). Throws when the unit id is not a content unit. */
export async function setUnitFollow(unit: string, state: FollowState, db?: UserDb): Promise<FollowMute> {
  if (!isUnitId(unit)) throw new Error(`Not a content unit: ${unit}`);
  const d = db ?? (await getDb());
  const next = applyFollowState(await getFollowMute(d), unit, state);
  const followValue = JSON.stringify(next.follow);
  const muteValue = JSON.stringify(next.mute);
  await d
    .insert(settings)
    .values({ key: FOLLOW_SETTING_KEY, value: followValue })
    .onConflictDoUpdate({ target: settings.key, set: { value: followValue } });
  await d
    .insert(settings)
    .values({ key: MUTE_SETTING_KEY, value: muteValue })
    .onConflictDoUpdate({ target: settings.key, set: { value: muteValue } });
  return next;
}
