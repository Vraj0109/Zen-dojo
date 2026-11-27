// House writing rules for content in the database (plan 0118, AGENTS.md "Writing for the user").
// Single source of truth for writing guidelines used in admin AI prompts and editor help.

import type { AiTarget } from "./admin-ai";

export const WRITING_STYLE_RULES = [
  "Plain, specific language: short sentences, active voice, no hype or buzzwords.",
  "Clear and accessible: write directly to the learner with focused explanations.",
  "No placeholders: never include TODO, FIXME, lorem ipsum, or ellipsis placeholders.",
] as const;

export const ORIGINALITY_RULES = [
  "Original content: written specifically for this app; never copy text or solutions from books, LeetCode, GeeksforGeeks, or other sites.",
  "No conversational chatter: never include 'As an AI', 'Sure! Here is...', 'In this article', or greeting/closing remarks.",
] as const;

export const HINT_RULES = [
  "Provide 3 or 4 progressive hints, leading from the smallest nudge to the optimal approach.",
  "Smallest nudge first: hint 1 must never reveal the full approach, algorithm, or data structure.",
  "Never include code: describe concepts, observations, invariants, and trade-offs in plain words.",
  "Each hint should be self-contained and answerable without skipping ahead.",
] as const;

export const WALKTHROUGH_RULES = [
  "Follow the interview path: clarify first, then examples to say out loud, brute force, key observation, optimal approach, code walkthrough, test it out loud, and common mistakes.",
  "State time and space complexities explicitly using standard Big-O notation.",
  "Explain why brute force is suboptimal before introducing the key insight that enables the optimal approach.",
  "Trace test cases step-by-step with concrete variable states.",
] as const;

export const CODE_RULES = [
  "Idiomatic and clean: follow standard conventions for the target language.",
  "Comment only where helpful: explain non-obvious invariants or tricky logic; do not restate what the syntax already says.",
  "Match complexity: implementation must achieve the stated time and space complexity bounds.",
  "No forbidden APIs: never use process execution (exec, ProcessBuilder, subprocess), network/socket APIs, or file system manipulation.",
  "Exact signatures: adhere strictly to the judge class and method signatures.",
] as const;

export const TEST_CASE_RULES = [
  "Match function or design signature: correct parameter count and types for every case.",
  "Thorough edge case coverage: cover empty/minimal inputs, single elements, negative numbers, duplicates, and large constraints.",
  "Valid JSON values: test inputs and expected outputs must be valid JSON representations.",
] as const;

export const DIAGRAM_RULES = [
  "Use valid Mermaid syntax inside a fenced mermaid block.",
  "Class diagrams must begin with `classDiagram`; sequence diagrams must begin with `sequenceDiagram`.",
  "Keep diagrams focused and readable: do not overwhelm with excessive nodes or complex styling.",
] as const;

export const DOC_RULES = [
  "Reading links: direct HTTPS URLs only; no URL shorteners (bit.ly, buff.ly, amzn.to), no affiliate tags, no tracking parameters.",
  "All referenced concept or exercise IDs must point to real, existing items.",
] as const;

export const GENERAL_HOUSE_RULES = [
  ...WRITING_STYLE_RULES,
  ...ORIGINALITY_RULES,
] as const;

/**
 * Returns the relevant house writing rules for a given AI prompt target.
 */
export function rulesForTarget(target: AiTarget): string[] {
  switch (target) {
    case "hints":
      return [...GENERAL_HOUSE_RULES, ...HINT_RULES];
    case "code-block":
      return [...GENERAL_HOUSE_RULES, ...CODE_RULES];
    case "test-cases":
      return [...GENERAL_HOUSE_RULES, ...TEST_CASE_RULES];
    case "diagram-block":
      return [...GENERAL_HOUSE_RULES, ...DIAGRAM_RULES];
    case "solution-page":
      return [...GENERAL_HOUSE_RULES, ...WALKTHROUGH_RULES, ...CODE_RULES];
    case "doc":
      return [...GENERAL_HOUSE_RULES, ...DOC_RULES];
    case "problem-statement":
    case "problem-constraints":
    case "text-block":
    case "section":
    case "lesson-page":
    case "course-summary":
    default:
      return [...GENERAL_HOUSE_RULES];
  }
}
