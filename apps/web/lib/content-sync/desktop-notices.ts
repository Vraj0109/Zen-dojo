import "server-only";
import { followedUnitsDesktop, noticesFrom, refreshNotice, type ChangeEntry, type EntityKind, type Notice, type UnitId } from "@habit/shared";
import type { ContentDb } from "../content-db/client";
import { loadCourse, loadLesson, loadProblem } from "../content-db/load";

// Turns the changes a desktop sync applied into update notices (plan 0119 step 4). Only changes the admin marked
// "Tell learners" and only units this person has started: a solved problem follows its pattern, a concept with any
// progress follows its course. Then the units set to Follow are added and the units set to Mute are removed (mute wins).

export type StartedInput = {
  /** problem_solves.problem_id values (any order, duplicates fine). */
  solvedProblemIds: string[];
  /** concept_progress.concept_id values. */
  conceptIds: string[];
};

/** The units a person has started, read from the content copy (problem pattern, lesson course). */
export async function startedUnits(content: ContentDb, input: StartedInput): Promise<Set<UnitId>> {
  const units = new Set<UnitId>();
  for (const id of new Set(input.solvedProblemIds)) {
    const p = await loadProblem(content, id);
    if (p) units.add(p.row.pattern ? `problems:${p.row.pattern}` : "problems:other");
  }
  for (const id of new Set(input.conceptIds)) {
    const l = await loadLesson(content, id);
    if (l) units.add(`course:${l.row.courseId}`);
  }
  return units;
}

async function titleOf(content: ContentDb, entity: EntityKind, id: string): Promise<{ title: string; unitTitle: string }> {
  if (entity === "problem") {
    const p = await loadProblem(content, id);
    return { title: p?.row.title ?? id, unitTitle: p?.row.pattern ? `Problems: ${p.row.pattern}` : "Problems" };
  }
  if (entity === "lesson") {
    const l = await loadLesson(content, id);
    const c = l ? await loadCourse(content, l.row.courseId) : null;
    return { title: l?.row.title ?? id, unitTitle: c?.row.title ?? l?.row.courseId ?? "Course" };
  }
  if (entity === "course") {
    const c = await loadCourse(content, id);
    return { title: c?.row.title ?? id, unitTitle: c?.row.title ?? id };
  }
  return { title: id, unitTitle: "Reference" };
}

/** Notices for one sync: the "Content was refreshed" notice after a full resync, else one per followed change. */
export async function desktopNotices(
  content: ContentDb,
  sync: { entries?: ChangeEntry[]; refreshed: boolean },
  started: Set<UnitId>,
  now: number,
  prefs: { follow: UnitId[]; mute: UnitId[] } = { follow: [], mute: [] },
): Promise<Notice[]> {
  if (sync.refreshed) return [refreshNotice(now)];
  const entries = sync.entries ?? [];
  if (!entries.some((e) => e.notify)) return [];
  const followed = followedUnitsDesktop({ startedUnits: started, follow: prefs.follow, mute: prefs.mute });
  const titles = new Map<string, { title: string; unitTitle: string }>();
  for (const e of entries) {
    if (!e.notify) continue;
    const key = `${e.entity}:${e.id}`;
    if (!titles.has(key)) titles.set(key, await titleOf(content, e.entity, e.id));
  }
  return noticesFrom(entries, followed, (entity, id) => titles.get(`${entity}:${id}`) ?? { title: id, unitTitle: "" }, now);
}
