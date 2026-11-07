import { CORE_LESSONS } from "./core";
import { DESIGNS_A } from "./designs-a";
import { DESIGNS_B } from "./designs-b";
import { DEEP_CORE } from "./deep-core";
import { DEEP_LLD } from "./deep-lld";
import { DEEP_SD_A } from "./deep-sd-a";
import { DEEP_SD_B } from "./deep-sd-b";
import { DESIGN_EXTRA } from "./design-extra";
import { DSA_GUIDES_A } from "./dsa-a";
import { DSA_GUIDES_B } from "./dsa-b";
import { DSA_GUIDES_C } from "./dsa-c";
import { DSA_GUIDES_D } from "./dsa-d";
import { LLD_GUIDES, LLD_LESSONS } from "./lld";
import { LLD_EXTRA } from "./lld-extra";
import { SD_LESSONS } from "./sd";
import type { LessonExtra, LldGuide, Lesson, PatternGuide, Walkthrough, WalkthroughExtra } from "./types";

export type { LessonExtra, LldExtra, LldGuide, Lesson, PatternGuide, Section, Walkthrough, WalkthroughExtra } from "./types";

/** Concept lessons by concept id (system design, LLD, core CS). */
export const LESSONS: Record<string, Lesson> = { ...SD_LESSONS, ...LLD_LESSONS, ...CORE_LESSONS };

/** Reference walkthroughs by system design exercise id. */
export const WALKTHROUGHS: Record<string, Walkthrough> = { ...DESIGNS_A, ...DESIGNS_B };

/** Reference answers by LLD problem id. */
export { LLD_GUIDES };
export const lldGuide = (id: string): LldGuide | undefined => LLD_GUIDES[id];

/** DSA pattern guides by pattern id (dsa.ts). Templates are C++. */
export const PATTERN_GUIDES: Record<string, PatternGuide> = { ...DSA_GUIDES_A, ...DSA_GUIDES_B, ...DSA_GUIDES_C, ...DSA_GUIDES_D };

/** Deeper sections and recap lines per concept id. */
export const LESSON_EXTRA: Record<string, LessonExtra> = { ...DEEP_SD_A, ...DEEP_SD_B, ...DEEP_LLD, ...DEEP_CORE };

/** Recap and follow-up Q&A per system design exercise id. */
export const WALKTHROUGH_EXTRA: Record<string, WalkthroughExtra> = DESIGN_EXTRA;

/** Recap, traced flow and edge cases per LLD problem id. */
export { LLD_EXTRA };
