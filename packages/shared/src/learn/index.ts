import { CORE_LESSONS } from "./core";
import { DESIGNS_A } from "./designs-a";
import { DESIGNS_B } from "./designs-b";
import { DSA_GUIDES_A } from "./dsa-a";
import { DSA_GUIDES_B } from "./dsa-b";
import { DSA_GUIDES_C } from "./dsa-c";
import { DSA_GUIDES_D } from "./dsa-d";
import { LLD_GUIDES, LLD_LESSONS } from "./lld";
import { SD_LESSONS } from "./sd";
import type { LldGuide, Lesson, PatternGuide, Walkthrough } from "./types";

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
