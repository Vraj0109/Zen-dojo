import { CORE_LESSONS } from "./core";
import { DESIGNS_A } from "./designs-a";
import { DESIGNS_B } from "./designs-b";
import { LLD_GUIDES, LLD_LESSONS } from "./lld";
import { SD_LESSONS } from "./sd";
import type { LldGuide, Lesson, Walkthrough } from "./types";

export type { LldGuide, Lesson, Walkthrough } from "./types";

/** Concept lessons by concept id (system design, LLD, core CS). */
export const LESSONS: Record<string, Lesson> = { ...SD_LESSONS, ...LLD_LESSONS, ...CORE_LESSONS };

/** Reference walkthroughs by system design exercise id. */
export const WALKTHROUGHS: Record<string, Walkthrough> = { ...DESIGNS_A, ...DESIGNS_B };

/** Reference answers by LLD problem id. */
export { LLD_GUIDES };
export const lldGuide = (id: string): LldGuide | undefined => LLD_GUIDES[id];
