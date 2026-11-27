// Update notices for learners (plan 0119 step 2). Pure: the device decides what to show.

import type { ChangeEntry, EntityKind, Notice, UnitId } from "./types";

/**
 * Notices for the changes an admin marked "Tell learners" that touch a followed unit. Several changes to one entity
 * become one notice (notes joined with "; ", latest version as the id). Newest first.
 * `titles` gives the entity's title and the title of the unit to show. `at` is the time to store (ChangeEntry has no
 * time, so the caller passes one; default 0).
 */
export function noticesFrom(
  entries: ChangeEntry[],
  followedUnits: ReadonlySet<UnitId>,
  titles: (entity: EntityKind, id: string) => { title: string; unitTitle: string },
  at = 0,
): Notice[] {
  const groups = new Map<string, ChangeEntry[]>();
  for (const e of entries) {
    if (!e.notify || !e.units.some((u) => followedUnits.has(u))) continue;
    const key = `${e.entity}:${e.id}`;
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }

  const out: Notice[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => a.version - b.version);
    const latest = sorted[sorted.length - 1];
    let unit: UnitId | undefined;
    for (let i = sorted.length - 1; i >= 0 && unit === undefined; i--) {
      unit = sorted[i].units.find((u) => followedUnits.has(u));
    }
    if (unit === undefined) continue;
    const sectionPart = sorted.flatMap((c) => c.parts).find((p) => p.startsWith("section:"));
    const t = titles(latest.entity, latest.id);
    out.push({
      id: latest.version,
      unit,
      unitTitle: t.unitTitle,
      entity: latest.entity,
      entityId: latest.id,
      title: t.title,
      sectionId: sectionPart ? sectionPart.slice("section:".length) : null,
      note: sorted.map((c) => c.note).filter((n): n is string => !!n).join("; "),
      at,
    });
  }
  return out.sort((a, b) => b.id - a.id);
}

/**
 * The "Content was refreshed" notice (plan 0119): the copy was downloaded again in full after a full resync (plan 0115
 * rule 6). It is not tied to one change or course, so unit is "all". `id` is 0: a change version does not exist for it,
 * and the device gives the stored notice its own id.
 */
export function refreshNotice(at = 0): Notice {
  return {
    id: 0,
    unit: "all",
    unitTitle: "All content",
    entity: "course",
    entityId: "",
    title: "Content was refreshed",
    sectionId: null,
    note: "The whole content was downloaded again.",
    at,
  };
}

/** One line for a system notification or a banner, in plain English. */
export function summaryLine(notices: Notice[]): string {
  if (notices.length === 0) return "No new updates";
  if (notices.length === 1) {
    const n = notices[0];
    const text = n.note || `${n.title} was updated`;
    return `1 update: ${n.unitTitle}: ${text}`;
  }
  return `${notices.length} updates in courses you follow`;
}

/**
 * Units whose updates the desktop app reports: units the user has started plus the ones set to Follow, minus the ones
 * set to Mute (mute wins).
 */
export function followedUnitsDesktop(input: {
  startedUnits: Iterable<UnitId>;
  follow: Iterable<UnitId>;
  mute: Iterable<UnitId>;
}): Set<UnitId> {
  const out = new Set<UnitId>([...input.startedUnits, ...input.follow]);
  for (const u of input.mute) out.delete(u);
  return out;
}
