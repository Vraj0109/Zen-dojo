// In-app practice problems that run like LeetCode: a starter function, example and hidden test cases, hints and a
// solution. All text is written for this app. Pure data and pure string helpers; running code is in apps/web/lib/judge.

/** The value types a problem's function can take and return. Tests are JSON. */
/**
 * "list" is a singly linked list of ints and "tree" a binary tree of ints. In tests both are JSON arrays: a list as
 * [1,2,3] (null for an empty list is []), a tree level by level as LeetCode writes it, [1,null,2,3] (null = no child).
 */
export type Ty = "list" | "tree" | "int" | "long" | "double" | "bool" | "string" | "int[]" | "long[]" | "bool[]" | "string[]" | "int[][]" | "string[][]";

export const JUDGE_LANGS = ["cpp", "java", "javascript"] as const;
export type JudgeLang = (typeof JUDGE_LANGS)[number];

export const JUDGE_LANG_LABEL: Record<JudgeLang, string> = { cpp: "C++", java: "Java", javascript: "JavaScript" };

export interface Case {
  /** One JSON value per parameter, in order */
  input: unknown[];
  /** The expected return value as JSON */
  output: unknown;
}

export interface ProblemSpec {
  /** "lc-1" for a roadmap LeetCode problem, "cses-<slug>" for a CSES problem */
  id: string;
  source: "leetcode" | "cses";
  title: string;
  /** Paragraphs, plain text. Backtick-free; `code` spans are written with plain quotes. */
  statement: string[];
  constraints: string[];
  /** The function you implement */
  fn: { name: string; params: { name: string; type: Ty }[]; returns: Ty };
  /** Shown with the statement; also run as the first tests */
  examples: (Case & { explanation?: string })[];
  /** More cases, run after the examples */
  tests: Case[];
  /** True when the order of the returned list does not matter (any order of equal elements passes) */
  unordered?: boolean;
  /** Smallest nudge first, biggest last */
  hints: string[];
  solution: { idea: string[]; complexity: string; cpp: string };
  /** Official page, for CSES */
  url?: string;
  /** Large inputs that check speed and memory. The expected answers come from the reference solution. Filled in by stress.ts. */
  stress?: StressCase[];
}

/** Whether the problem's function uses ListNode or TreeNode (so those classes are added around your code). */
export const usesNodes = (spec: ProblemSpec): { list: boolean; tree: boolean } => {
  const types = [...spec.fn.params.map((p) => p.type), spec.fn.returns];
  return { list: types.includes("list"), tree: types.includes("tree") };
};

/** One large input, built on demand (it may hold 100,000 numbers, so it is not stored in the source). */
export interface StressCase {
  label: string;
  make: () => unknown[];
  /** Milliseconds allowed in C++. Java gets 3 times as long and JavaScript 5 times. Default 1500. */
  limitMs?: number;
}

export const isArrayTy = (t: Ty) => t.endsWith("[]");
