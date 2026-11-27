// Study areas beyond DSA: concept checklists (rate your confidence, tick what you know) and practice
// exercises (designs / LLD problems) with a scored practice log. Types and scheduling rules only: the areas, concepts
// and exercises live in the content database (plan 0117); read them through apps/web/lib/content-repo/lookups.ts.

import { addDays, daysBetween } from "./dates";

/** Study areas in nav order. */
export const STUDY_AREA_IDS = ["sd", "lld", "core"] as const;
export type StudyAreaId = (typeof STUDY_AREA_IDS)[number];

export interface Concept {
  id: string;
  title: string;
  /** What to know: each point is a checklist item. */
  points: string[];
}

export interface ConceptSection {
  id: string;
  title: string;
  /** Roadmap weeks, e.g. "3-4" */
  weeks?: string;
  concepts: Concept[];
}

export interface Exercise {
  id: string;
  title: string;
  /** What the design/problem exercises */
  focus: string;
  /** e.g. "Amazon" for the retail-flavoured designs */
  tag?: string;
}

export interface FrameworkStep {
  id: string;
  title: string;
  minutes: number;
  hint: string;
}

export interface StudyArea {
  id: StudyAreaId;
  title: string;
  /** Nav label */
  short: string;
  intro: string;
  sections: ConceptSection[];
  exercises?: {
    title: string;
    intro: string;
    /** XP for logging one practice session */
    xp: number;
    /** Steps you score yourself on (1-5) after each practice */
    steps: FrameworkStep[];
    items: Exercise[];
  };
}

/** XP the first time a concept reaches confidence 4+. */
export const CONCEPT_XP = 5;
export const CONFIDENCE_LABELS = ["Not started", "Heard of it", "Shaky", "Okay", "Solid", "Can teach it"] as const;
/** Confidence at which a concept counts as covered. */
export const COVERED_CONFIDENCE = 4;
/** Concepts rated below "covered" come back for review after this many days. */
export const CONCEPT_REVIEW_DAYS = 7;

// ---------------------------------------------------------------- Scheduling

/** Days until a design/problem should be practiced again, from your last overall score (1-5). */
export function practiceInterval(score: number): number {
  if (score >= 4) return 30;
  if (score >= 3) return 14;
  return 7;
}

export type PracticeState =
  | { state: "new" }
  | { state: "practiced"; lastOn: string; score: number; nextOn: string; due: boolean };

export function practiceState(last: { on: string; score: number } | undefined, today: string): PracticeState {
  if (!last) return { state: "new" };
  const nextOn = addDays(last.on, practiceInterval(last.score));
  return { state: "practiced", lastOn: last.on, score: last.score, nextOn, due: nextOn <= today };
}

/** A concept you've rated but not yet covered comes back for review a week after you last touched it. */
export function conceptReviewDue(confidence: number, updatedOn: string | undefined, today: string): boolean {
  return confidence > 0 && confidence < COVERED_CONFIDENCE && !!updatedOn && daysBetween(updatedOn, today) >= CONCEPT_REVIEW_DAYS;
}

/** Average of the per-step scores (1-5) that were filled in, rounded to one decimal; null if none. */
export function averageScore(scores: Record<string, number>): number | null {
  const vals = Object.values(scores).filter((v) => Number.isInteger(v) && v >= 1 && v <= 5);
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
}
