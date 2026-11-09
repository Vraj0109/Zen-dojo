import "server-only";
import { eq } from "drizzle-orm";
import { ALL_CONCEPTS, ALL_EXERCISES, COVERED_CONFIDENCE, STUDY_AREAS, type StudyAreaId } from "@habit/shared";
import { getDb } from "./db";
import { getDsaView } from "./dsa";
import { getReadingList } from "./reading";
import { conceptProgress, practiceSessions, settings } from "./schema";
import { getStudyView } from "./study";
import { getPackProgress, listPacks } from "./packs";
import { getPack } from "./packs";
import { packItems } from "@habit/shared";

// The Learn hub: every course as a card with how much is done, what to do next, and what is due. A course is one entry in
// COURSES. To add a new section to the app, add a definition here (and a way to read its progress below); the hub, the
// favourites and the "continue" card pick it up with no other change.

export interface CourseDef {
  id: string;
  title: string;
  blurb: string;
  href: string;
  /** What the progress bar counts, in words ("topics and designs") */
  unit: string;
}

export const COURSES: CourseDef[] = [
  { id: "sd", title: "System design", blurb: "Concepts, trade-offs and 27 worked designs: caching, queues, sharding, rate limiters, feeds.", href: "/study/sd", unit: "topics and designs" },
  { id: "lld", title: "Low-level design", blurb: "OOP, SOLID, patterns and classic problems built as real Java projects with diagrams.", href: "/study/lld", unit: "topics and problems" },
  { id: "core", title: "Core CS", blurb: "Operating systems, databases, networking and Java concurrency.", href: "/study/core", unit: "topics" },
  { id: "dsa", title: "DSA patterns", blurb: "The patterns behind most interview problems, with articles, practice lists and a Run button.", href: "/dsa", unit: "patterns" },
  { id: "reading", title: "Reading list", blurb: "Books, papers and posts matched to the topics above.", href: "/study/reading", unit: "readings" },
];

export interface NextStep {
  title: string;
  href: string;
  /** Why it is next */
  reason: string;
}

export interface CourseView extends CourseDef {
  done: number;
  total: number;
  left: number;
  percent: number;
  due: number;
  next: NextStep | null;
  favourite: boolean;
}

const FAV_KEY = "favourite_courses";

export async function getFavouriteCourses(): Promise<string[]> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(settings.key, FAV_KEY) });
  try {
    const list = JSON.parse(row?.value ?? "[]");
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string" && (COURSES.some((c) => c.id === x) || /^pack:[a-z0-9-]+$/.test(x))) : [];
  } catch {
    return [];
  }
}

/** Star or un-star a course. Unknown ids are ignored. */
export async function toggleFavouriteCourse(id: string): Promise<void> {
  if (!COURSES.some((c) => c.id === id) && !/^pack:[a-z0-9-]+$/.test(id)) return;
  const current = await getFavouriteCourses();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  const db = await getDb();
  const value = JSON.stringify(next);
  await db.insert(settings).values({ key: FAV_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

const percentOf = (done: number, total: number) => (total === 0 ? 0 : Math.round((done / total) * 100));

async function areaCourse(def: CourseDef): Promise<Omit<CourseView, "favourite">> {
  const view = await getStudyView(def.id);
  if (!view) return { ...def, done: 0, total: 0, left: 0, percent: 0, due: 0, next: null };
  const concepts = view.sections.flatMap((s) => s.concepts);
  const coveredConcepts = concepts.filter((c) => c.confidence >= COVERED_CONFIDENCE).length;
  const practiced = view.exercises.filter((e) => e.sessions > 0).length;
  const total = concepts.length + view.exercises.length;
  const done = coveredConcepts + practiced;
  const due = view.due.concepts.length + view.due.exercises.length;

  let next: NextStep | null = null;
  const dueConcept = view.due.concepts[0];
  const dueExercise = view.due.exercises[0];
  const nextConcept = concepts.find((c) => c.confidence < COVERED_CONFIDENCE);
  const nextExercise = view.exercises.find((e) => e.sessions === 0);
  if (dueConcept) next = { title: dueConcept.title, href: `${def.href}/${dueConcept.id}`, reason: "due for review" };
  else if (dueExercise) next = { title: dueExercise.title, href: `${def.href}/${dueExercise.id}`, reason: "due for another practice" };
  else if (nextConcept) next = { title: nextConcept.title, href: `${def.href}/${nextConcept.id}`, reason: nextConcept.confidence === 0 ? "not started" : "keep going" };
  else if (nextExercise) next = { title: nextExercise.title, href: `${def.href}/${nextExercise.id}`, reason: "not practised yet" };
  return { ...def, done, total, left: total - done, percent: percentOf(done, total), due, next };
}

async function dsaCourse(def: CourseDef): Promise<Omit<CourseView, "favourite">> {
  const view = await getDsaView();
  const patterns = view.groups.flatMap((g) => g.patterns);
  const done = view.totals.patternsCovered;
  const total = view.totals.patterns;
  const nextPattern = patterns.find((p) => !p.covered);
  return {
    ...def,
    done,
    total,
    left: total - done,
    percent: percentOf(done, total),
    due: view.due.length,
    next: nextPattern ? { title: nextPattern.name, href: `/dsa/pattern/${nextPattern.id}`, reason: `${nextPattern.solved} of ${nextPattern.target} solved` } : null,
  };
}

async function readingCourse(def: CourseDef): Promise<Omit<CourseView, "favourite">> {
  const list = await getReadingList();
  const done = list.filter((r) => r.done).length;
  const first = list.find((r) => !r.done);
  return {
    ...def,
    done,
    total: list.length,
    left: list.length - done,
    percent: percentOf(done, list.length),
    due: 0,
    next: first ? { title: first.title, href: def.href, reason: "not read yet" } : null,
  };
}

/** Imported content packs, each shown as a course of its own. */
async function packCourses(): Promise<Omit<CourseView, "favourite">[]> {
  const out: Omit<CourseView, "favourite">[] = [];
  for (const s of await listPacks()) {
    const pack = await getPack(s.id);
    if (!pack || pack.target) continue; // a pack with a target adds to a study area instead of being a course
    const items = packItems(pack);
    const done = await getPackProgress(s.id);
    const first = items.find((i) => !done.has(i.id));
    const total = items.length;
    out.push({
      id: `pack:${s.id}`,
      title: s.title,
      blurb: s.description || "Imported content.",
      href: `/study/packs/${s.id}`,
      unit: "lessons and problems",
      done: s.done,
      total,
      left: total - s.done,
      percent: percentOf(s.done, total),
      due: 0,
      next: first ? { title: first.title, href: `/study/packs/${s.id}/${first.id}`, reason: first.type === "problem" ? "problem to solve" : "lesson to read" } : null,
    });
  }
  return out;
}

export async function getCourses(): Promise<CourseView[]> {
  const favs = new Set(await getFavouriteCourses());
  const built = await Promise.all(
    COURSES.map((def) => {
      if (def.id === "dsa") return dsaCourse(def);
      if (def.id === "reading") return readingCourse(def);
      return areaCourse(def);
    }),
  );
  const imported = await packCourses();
  return [...built, ...imported].map((c) => ({ ...c, favourite: favs.has(c.id) }));
}

export interface ContinueStep {
  title: string;
  course: string;
  href: string;
  /** YYYY-MM-DD of the last activity */
  on: string;
}

/** The study item you touched most recently (a concept you rated or a design you practised), to continue from. */
export async function getContinue(): Promise<ContinueStep | null> {
  const db = await getDb();
  const [concepts, sessions] = await Promise.all([db.select().from(conceptProgress), db.select().from(practiceSessions)]);
  let best: { id: string; on: string } | null = null;
  const consider = (id: string, on: string) => {
    if (!best || on > best.on) best = { id, on };
  };
  for (const c of concepts) if (ALL_CONCEPTS[c.conceptId]) consider(c.conceptId, c.updatedOn);
  for (const s of sessions) if (ALL_EXERCISES[s.itemId]) consider(s.itemId, s.practicedOn);
  if (!best) return null;
  const found: { id: string; on: string } = best;
  const item = ALL_CONCEPTS[found.id] ?? ALL_EXERCISES[found.id];
  const areaId: StudyAreaId = item.area;
  const area = STUDY_AREAS.find((a) => a.id === areaId);
  return { title: item.title, course: area?.title ?? "Study", href: `/study/${areaId}/${found.id}`, on: found.on };
}
