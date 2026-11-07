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

export const lesson = (overview: string, explain: string[], questions: string[], pitfalls?: string[]): Lesson => ({ overview, explain, questions, pitfalls });
