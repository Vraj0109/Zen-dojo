import { CORE_LESSONS } from "./core";
import { DESIGNS_A } from "./designs-a";
import { DESIGNS_B } from "./designs-b";
import { DEEP_CORE } from "./deep-core";
import { DEEP_LLD } from "./deep-lld";
import { DEEP_SD_A } from "./deep-sd-a";
import { DEEP_SD_B } from "./deep-sd-b";
import { DESIGN_EXTRA } from "./design-extra";
import { DSA_ARTICLES_A } from "./dsa-articles-a";
import { DSA_ARTICLES_B } from "./dsa-articles-b";
import { DSA_ARTICLES_C } from "./dsa-articles-c";
import { DSA_ARTICLES_D1 } from "./dsa-articles-d";
import { DSA_ARTICLES_D2 } from "./dsa-articles-d2";
import { DSA_GUIDES_A } from "./dsa-a";
import { DSA_GUIDES_B } from "./dsa-b";
import { DSA_GUIDES_C } from "./dsa-c";
import { DSA_GUIDES_D } from "./dsa-d";
import { LLD_GUIDES, LLD_LESSONS } from "./lld";
import { LLD_EXTRA } from "./lld-extra";
import { LLD_DEEP_A, LLD_PROJECTS_A } from "./lld-projects-a";
import { LLD_DEEP_B } from "./lld-deep-b";
import { LLD_DEEP_B_URL } from "./lld-deep-b-url";
import { LLD_PROJECTS_B_URL } from "./lld-projects-b-url";
import { LLD_PROJECTS_B } from "./lld-projects-b";
import { MORE_DB } from "./more-db";
import { MORE_LLD } from "./more-lld";
import { MORE_NET } from "./more-net";
import { MORE_OS } from "./more-os";
import { MORE_SD_A } from "./more-sd-a";
import { MORE_SD_B } from "./more-sd-b";
import { MORE_SD_C } from "./more-sd-c";
import { SD_LESSONS } from "./sd";
import { DEEP_SD_GAPS, SD_GAP_LESSONS } from "./sd-gaps";
import type { LessonExtra, LldDeep, LldGuide, LldProject, Lesson, PatternArticle, PatternGuide, Section, Walkthrough, WalkthroughExtra } from "./types";

export type { DiagramBlock, LessonExtra, LldDeep, LldExtra, LldGuide, LldProject, Lesson, PatternArticle, PatternGuide, Section, Walkthrough, WalkthroughExtra } from "./types";

/** Concept lessons by concept id (system design, LLD, core CS). */
export const LESSONS: Record<string, Lesson> = { ...SD_LESSONS, ...SD_GAP_LESSONS, ...LLD_LESSONS, ...CORE_LESSONS };

/** Reference walkthroughs by system design exercise id. */
export const WALKTHROUGHS: Record<string, Walkthrough> = { ...DESIGNS_A, ...DESIGNS_B };

/** Reference answers by LLD problem id. */
export { LLD_GUIDES };

/** Full Java projects and their long explanations, by LLD problem id (plan 0013). */
export const LLD_PROJECTS: Record<string, LldProject> = { ...LLD_PROJECTS_A, ...LLD_PROJECTS_B, ...LLD_PROJECTS_B_URL };
export const LLD_DEEP: Record<string, LldDeep> = { ...LLD_DEEP_A, ...LLD_DEEP_B, ...LLD_DEEP_B_URL };
export const lldGuide = (id: string): LldGuide | undefined => LLD_GUIDES[id];

/** DSA pattern guides by pattern id (dsa.ts). Templates are C++. */
export const PATTERN_GUIDES: Record<string, PatternGuide> = { ...DSA_GUIDES_A, ...DSA_GUIDES_B, ...DSA_GUIDES_C, ...DSA_GUIDES_D };

/** Full articles by pattern id. Patterns without one still show the short guide above. */
export const PATTERN_ARTICLES: Record<string, PatternArticle> = { ...DSA_ARTICLES_A, ...DSA_ARTICLES_B, ...DSA_ARTICLES_C, ...DSA_ARTICLES_D1, ...DSA_ARTICLES_D2 };

/** Deeper sections and recap lines per concept id. */
const BASE_EXTRA: Record<string, LessonExtra> = { ...DEEP_SD_A, ...DEEP_SD_B, ...DEEP_SD_GAPS, ...DEEP_LLD, ...DEEP_CORE };
const MORE: Record<string, Section[]> = { ...MORE_SD_A, ...MORE_SD_B, ...MORE_SD_C, ...MORE_LLD, ...MORE_OS, ...MORE_DB, ...MORE_NET };
export const LESSON_EXTRA: Record<string, LessonExtra> = Object.fromEntries(
  Object.entries(BASE_EXTRA).map(([id, x]) => [id, { ...x, deeper: [...x.deeper, ...(MORE[id] ?? [])] }]),
);

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

/** Recap and follow-up Q&A per system design exercise id. */
export const WALKTHROUGH_EXTRA: Record<string, WalkthroughExtra> = DESIGN_EXTRA;

/** Recap, traced flow and edge cases per LLD problem id. */
export { LLD_EXTRA };
