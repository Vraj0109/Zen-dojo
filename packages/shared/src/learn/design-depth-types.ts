import type { DiagramBlock, Section } from "./types";

/**
 * Extra depth for a system design walkthrough (plan 0014): diagrams, sections that explain the reasoning and the failure
 * modes with numbers, and runnable Java for the component the design is about. Data in learn/design-depth-*.ts, merged
 * as DESIGN_DEEP in learn/index.ts, keyed by design id (sdd-...).
 */
export interface WalkthroughDeep {
  /** At least three: components, write path, read or failure path. Mermaid source. */
  diagrams: DiagramBlock[];
  /** 800+ words in all, including a section on failure modes. */
  sections: Section[];
  /** Java 17, standard library only, with a main method. Compiled and run by apps/web/lib/design-code.test.ts. */
  code?: { name: string; code: string }[];
}
