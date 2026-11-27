// Pattern thinking map (plan 0091): the types of signal -> pattern -> variation and "how to read a problem" content.
// The content itself lives in the content database (docs "think-patterns", "think-signals", "clues", ...; plan 0117).

export type FeatureKey = "input" | "ask" | "shape" | "sorted" | "size" | "weights" | "updates" | "overlap";
export type Features = Partial<Record<FeatureKey, string[]>>;
export interface ThinkVariation {
  id: string;
  label: string;
  when: string;
  key: string;
  examples?: string[];
  features?: Features;
}

export interface ThinkPattern {
  id: string;
  label: string;
  when: string;
  key: string;
  watch: string[];
  template?: { lang: "python"; code: string; complexity: string };
  variations: ThinkVariation[];
  features: Features;
  tags: string[];
  appPattern?: string;
  covers?: string[];
}

export interface ThinkSignal {
  id: string;
  label: string;
  when: string;
  patterns: string[];
}

export interface ConstraintHint {
  n: string;
  budget: string;
  fits: string;
}

export interface ReadStep {
  id: string;
  title: string;
  body: string;
  ask: string[];
}

export type ClueKind = "constraint" | "wording" | "input" | "output";
export interface Clue {
  id: string;
  kind: ClueKind;
  phrase: string;
  points: string[]; // ThinkPattern ids, or "pattern/variation"
  why: string;
  falseFriend?: string;
}

export interface WorkedExample {
  id: string;
  title: string;
  problem?: string; // app problem id or "slug:<leetcode-slug>"
  statement: string;
  clues: string[];
  steps: string[];
  brute: string;
  pattern: string;
  variation?: string;
  trap: string;
}

export interface OptimizeMove {
  waste: string;
  fix: string;
  pattern: string;
}
