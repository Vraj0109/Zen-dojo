import type { DiagramBlock, Section } from "./types";

/** One part of the architecture, shown as an expandable card (plan 0031). */
export interface ArchitectureBlock {
  /** Short name, for example "Ingesters". */
  name: string;
  /** What it does in this design, one or two sentences. */
  role: string;
  /** How it scales and the number that matters. */
  scale: string;
  /** What happens when it fails and what limits the damage. */
  failure: string;
}

/** One row of an interviewer's scorecard (plan 0031): what a strong answer and a weak answer look like. */
export interface EvaluationCriterion {
  area: string;
  strong: string;
  weak: string;
}

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
  /** Interactive architecture explorer: click a part to see its job, scale and failure behaviour (plan 0031). */
  architecture?: ArchitectureBlock[];
  /** Evaluation criteria: what an interviewer scores and how strong and weak answers differ (plan 0031). */
  criteria?: EvaluationCriterion[];
}
