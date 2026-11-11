// Reference solutions in C++, Java and Python (plan 0063). C++ lives on the spec; Java and Python are plain files in
// packages/shared/content/solutions/ compiled into generated/solutions.ts. Import this from SERVER code only (the
// generated file is large): the problem page passes the chosen strings to the client.
import { SOLUTIONS } from "./generated/solutions";
import type { ProblemSpec } from "./types";

export type SolutionLang = "cpp" | "java" | "python";
export const SOLUTION_LANGS: readonly SolutionLang[] = ["cpp", "java", "python"];
export const SOLUTION_LANG_LABEL: Record<SolutionLang, string> = { cpp: "C++", java: "Java", python: "Python" };

/** The reference solution in one language, or null when there is none (yet). */
export function solutionCode(spec: ProblemSpec, lang: SolutionLang): string | null {
  if (lang === "cpp") return spec.solution?.cpp || null;
  return SOLUTIONS[spec.id]?.[lang] || null;
}

/** The languages that have a reference solution for this problem, C++ first. */
export function solutionLangs(spec: ProblemSpec): SolutionLang[] {
  return SOLUTION_LANGS.filter((l) => solutionCode(spec, l) !== null);
}
