import { GENERATED_LESSONS } from "./generated/lessons";
import { DESIGNS_A } from "./designs-a";
import { DESIGNS_B } from "./designs-b";
import { DESIGN_DEPTH_A } from "./design-depth-a";
import { DESIGN_DEPTH_B } from "./design-depth-b";
import { DESIGN_DEPTH_C } from "./design-depth-c";
import { DESIGN_DEPTH_D } from "./design-depth-d";
import { DESIGN_EXTRA } from "./design-extra";
import { DSA_ARTICLES_A } from "./dsa-articles-a";
import { DSA_ARTICLES_B } from "./dsa-articles-b";
import { DSA_ARTICLES_C } from "./dsa-articles-c";
import { DSA_ARTICLES_D1 } from "./dsa-articles-d";
import { DSA_ARTICLES_D2 } from "./dsa-articles-d2";
import { DSA_ARTICLES_E1, DSA_ARTICLES_E } from "./dsa-articles-e";
import { DSA_ARTICLES_F } from "./dsa-articles-f";
import { DSA_ARTICLES_G } from "./dsa-articles-g";
import { DSA_GUIDES_A } from "./dsa-a";
import { DSA_GUIDES_B } from "./dsa-b";
import { DSA_GUIDES_C } from "./dsa-c";
import { DSA_GUIDES_D } from "./dsa-d";
import { LLD_GUIDES } from "./lld";
import { LLD_EXTRA } from "./lld-extra";
import { LLD_DEEP_A, LLD_PROJECTS_A } from "./lld-projects-a";
import { LLD_DEEP_B } from "./lld-deep-b";
import { LLD_DEEP_B_LOG } from "./lld-deep-b-log";
import { LLD_DEEP_B_URL } from "./lld-deep-b-url";
import { LLD_PROJECTS_B_LOG } from "./lld-projects-b-log";
import { LLD_PROJECTS_B_URL } from "./lld-projects-b-url";
import { LLD_PROJECTS_B } from "./lld-projects-b";
import { MEETING_DEEP } from "./lld-deep-e-meeting";
import { LLD_PROJECTS_E_MEETING } from "./lld-projects-e-meeting";
import { HOTEL_DEEP } from "./lld-deep-e-hotel";
import { LLD_PROJECTS_E_HOTEL } from "./lld-projects-e-hotel";
import { KV_DEEP } from "./lld-deep-d-kv";
import { LLD_PROJECTS_D_KV } from "./lld-projects-d-kv";
import { FILESYSTEM_DEEP } from "./lld-deep-d-filesystem";
import { LLD_PROJECTS_D_FILESYSTEM } from "./lld-projects-d-filesystem";
import { GAMES_DEEP } from "./lld-deep-d-games";
import { LLD_PROJECTS_D_GAMES } from "./lld-projects-d-games";
import { CAB_DEEP } from "./lld-deep-d-cab";
import { LLD_PROJECTS_D_CAB } from "./lld-projects-d-cab";
import { FOOD_DEEP } from "./lld-deep-d-food";
import { LLD_PROJECTS_D_FOOD } from "./lld-projects-d-food";
import { LIBRARY_DEEP } from "./lld-deep-c-library";
import { LLD_PROJECTS_C_LIBRARY } from "./lld-projects-c-library";
import { SPLITWISE_DEEP } from "./lld-deep-c-splitwise";
import { LLD_PROJECTS_C_SPLITWISE } from "./lld-projects-c-splitwise";
import { VENDING_ATM_DEEP } from "./lld-deep-c-vending";
import { LLD_PROJECTS_C_VENDING } from "./lld-projects-c-vending";
import { BOOKING_DEEP } from "./lld-deep-c-booking";
import { LLD_PROJECTS_C_BOOKING } from "./lld-projects-c-booking";
import type { WalkthroughDeep } from "./design-depth-types";
import type { LessonExtra, LldDeep, LldGuide, LldProject, Lesson, PatternArticle, PatternGuide, Section, Walkthrough, WalkthroughExtra } from "./types";

export type { DiagramBlock, LessonExtra, LldDeep, LldExtra, LldGuide, LldProject, Lesson, PatternArticle, PatternGuide, Section, Walkthrough, WalkthroughExtra } from "./types";

/** Concept lessons by concept id (system design, LLD, core CS). */
/** Lessons written as Markdown (content/, built into generated/lessons.ts) win over the older TypeScript ones with the same id. */
const GENERATED_BASE: Record<string, Lesson> = Object.fromEntries(Object.entries(GENERATED_LESSONS).map(([id, g]) => [id, g.lesson]));
export const LESSONS: Record<string, Lesson> = GENERATED_BASE;

/** Reference walkthroughs by system design exercise id. */
export const WALKTHROUGHS: Record<string, Walkthrough> = { ...DESIGNS_A, ...DESIGNS_B };

/** Reference answers by LLD problem id. */
export { LLD_GUIDES };

/** Full Java projects and their long explanations, by LLD problem id (plan 0013). */
export const LLD_PROJECTS: Record<string, LldProject> = { ...LLD_PROJECTS_A, ...LLD_PROJECTS_B, ...LLD_PROJECTS_B_URL, ...LLD_PROJECTS_B_LOG, ...LLD_PROJECTS_C_VENDING, ...LLD_PROJECTS_C_BOOKING, ...LLD_PROJECTS_C_SPLITWISE, ...LLD_PROJECTS_C_LIBRARY, ...LLD_PROJECTS_D_FOOD, ...LLD_PROJECTS_D_CAB, ...LLD_PROJECTS_D_GAMES, ...LLD_PROJECTS_D_FILESYSTEM, ...LLD_PROJECTS_D_KV, ...LLD_PROJECTS_E_HOTEL, ...LLD_PROJECTS_E_MEETING };
export const LLD_DEEP: Record<string, LldDeep> = { ...LLD_DEEP_A, ...LLD_DEEP_B, ...LLD_DEEP_B_URL, ...LLD_DEEP_B_LOG, ...VENDING_ATM_DEEP, ...BOOKING_DEEP, ...SPLITWISE_DEEP, ...LIBRARY_DEEP, ...FOOD_DEEP, ...CAB_DEEP, ...GAMES_DEEP, ...FILESYSTEM_DEEP, ...KV_DEEP, ...HOTEL_DEEP, ...MEETING_DEEP };
export const lldGuide = (id: string): LldGuide | undefined => LLD_GUIDES[id];

/** DSA pattern guides by pattern id (dsa.ts). Templates are C++. */
export const PATTERN_GUIDES: Record<string, PatternGuide> = { ...DSA_GUIDES_A, ...DSA_GUIDES_B, ...DSA_GUIDES_C, ...DSA_GUIDES_D };

/** Full articles by pattern id. Patterns without one still show the short guide above. */
export const PATTERN_ARTICLES: Record<string, PatternArticle> = { ...DSA_ARTICLES_A, ...DSA_ARTICLES_B, ...DSA_ARTICLES_C, ...DSA_ARTICLES_D1, ...DSA_ARTICLES_D2, ...DSA_ARTICLES_E, ...DSA_ARTICLES_F, ...DSA_ARTICLES_G };

/** Deeper sections and recap lines per concept id. */
const GENERATED_EXTRA: Record<string, LessonExtra> = Object.fromEntries(
  Object.entries(GENERATED_LESSONS).map(([id, g]) => [id, { recap: g.recap, deeper: g.deeper.map(({ point: _point, ...s }) => s) }]),
);
export const LESSON_EXTRA: Record<string, LessonExtra> = GENERATED_EXTRA;

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

/** Estimated minutes to read a concept's lesson (200 words/min for prose, code counted double). */
export function readingMinutes(id: string): number {
  const l = LESSONS[id];
  const x = LESSON_EXTRA[id];
  if (!l) return 0;
  const prose = [l.overview, ...l.explain, ...(x?.recap ?? []), ...(x?.deeper.map((s) => s.body) ?? []), ...l.questions, ...(l.pitfalls ?? [])];
  const code = x?.deeper.map((s) => s.code ?? "") ?? [];
  return Math.max(1, Math.round((prose.reduce((a, t) => a + words(t), 0) + code.reduce((a, t) => a + words(t), 0) * 2) / 200));
}

/** Diagrams, deeper sections and Java for system design walkthroughs, by design id (plan 0014). */
export const DESIGN_DEEP: Record<string, WalkthroughDeep> = { ...DESIGN_DEPTH_A, ...DESIGN_DEPTH_B, ...DESIGN_DEPTH_C, ...DESIGN_DEPTH_D };
export type { WalkthroughDeep } from "./design-depth-types";

/** Recap and follow-up Q&A per system design exercise id. */
export const WALKTHROUGH_EXTRA: Record<string, WalkthroughExtra> = DESIGN_EXTRA;

/** Recap, traced flow and edge cases per LLD problem id. */
export { LLD_EXTRA };
