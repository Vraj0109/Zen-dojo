// Learning content shapes. Written for this app as interview-depth study notes.

/** A concept lesson. `explain` has one entry per checklist point of the concept, in the same order. */
export interface Lesson {
  overview: string;
  explain: string[];
  /** Questions an interviewer might ask; answer them out loud */
  questions: string[];
  /** Common mistakes and gotchas */
  pitfalls?: string[];
}

/** Reference walkthrough for a system design, following the 45-minute framework. */
export interface Walkthrough {
  requirements: string[];
  estimates: string[];
  api: string[];
  data: string[];
  /** High-level design: components and the main read/write paths */
  design: string[];
  deepDives: { title: string; body: string }[];
  tradeoffs: string[];
}

/** Reference answer for an LLD problem. */
export interface LldGuide {
  requirements: string[];
  entities: string[];
  patterns: string[];
  /** Java sketch of the core classes */
  code: string;
  extensions: string[];
}

/** A deeper section: a worked example, a comparison, a mechanism step by step. `code` is shown as a block. */
export interface Section {
  title: string;
  body: string;
  code?: string;
  /** Language of `code` (C++, Java, SQL...). Optional: guessed from the code when missing. */
  lang?: string;
  /** Mermaid source of a diagram shown before the code (plan 0012). */
  diagram?: string;
  diagramCaption?: string;
}

/** A diagram that is not part of a section (system design walkthroughs, LLD answers). */
export interface DiagramBlock {
  title: string;
  source: string;
  caption?: string;
}

/** Extra depth for a concept lesson, kept apart from the base lesson (learn/deep-*.ts). */
export interface LessonExtra {
  /** 3-6 lines worth remembering the night before; shown on Quick revise */
  recap: string[];
  deeper: Section[];
}

/** Extra depth for a design walkthrough (learn/design-extra.ts). */
export interface WalkthroughExtra {
  /** Key numbers and decisions to remember */
  recap: string[];
  /** Follow-up questions interviewers ask, each with a short answer */
  followUps: { q: string; a: string }[];
}

/** A complete, compilable Java project for an LLD problem (learn/lld-projects-*.ts, plan 0013). Standard library only. */
export interface LldProject {
  /** Source files, one top-level type each, in the default package. Must include Main.java. */
  files: { name: string; code: string }[];
  /** Optional self-checking tests: a class with a main method (no JUnit). Run by the compile test. */
  tests?: { name: string; code: string }[];
  /** Lines that Main must print (each must appear in stdout). */
  expectedOutput: string[];
}

/** The long explanation around an LLD project: walkthrough, diagrams, concurrency. */
export interface LldDeep {
  /** 6-10 sections, 1,200+ words in total. */
  walkthrough: Section[];
  classDiagram: string;
  sequenceDiagram: string;
  stateDiagram?: string;
  concurrency: string[];
}

/** Extra depth for an LLD reference answer (learn/lld-extra.ts). */
export interface LldExtra {
  recap: string[];
  /** One main use case traced through the classes, step by step */
  flow: string[];
  /** Edge cases and tests worth naming */
  edgeCases: string[];
}

/**
 * A full DSA pattern article (learn/dsa-articles-*.ts). It replaces the short guide on the pattern page.
 * Sections follow a fixed outline, checked by pattern-articles.test.ts: The intuition, Why it works, A worked example,
 * Implementation, Variants, Complexity, Pitfalls and edge cases, Practice order (extra "Implementation: ..." and
 * "Variants: ..." sections may follow their parent). Code is C++17 and self-contained.
 */
export interface PatternArticle {
  /** 2-4 sentences: what the pattern solves and when you reach for it. */
  intro: string;
  sections: Section[];
}

/** A DSA pattern guide (learn/dsa-*.ts). Templates are C++. */
export interface PatternGuide {
  idea: string;
  /** Signals in the problem statement or constraints */
  signals: string[];
  steps: string[];
  template: string;
  complexity: string;
  /** Twists on the pattern, often naming a problem from the list */
  variations: string[];
  pitfalls: string[];
  /** 2-4 lines for Quick revise */
  recap: string[];
}

export const lesson =(overview: string, explain: string[], questions: string[], pitfalls?: string[]): Lesson => ({ overview, explain, questions, pitfalls });
