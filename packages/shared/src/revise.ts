// Quick revise: the last-days plan, numbers worth memorizing, and the quiz deck.
// Types and helpers only; the plan, numbers and deck live in the content database (plan 0117, apps/web/lib/revise.ts).

import { daysBetween } from "./dates";
import type { StudyAreaId } from "./study";

/** Days from today until the interview (0 = today, negative = past). */
export function daysUntil(today: string, interview: string): number {
  return daysBetween(today, interview);
}

export interface PlanPhase {
  id: string;
  title: string;
  /** Applies when days left is within [from, to] */
  from: number;
  to: number;
  items: string[];
}

/** The phase for a number of days left, or null if the interview is further out or past. */
export function currentPhase(daysLeft: number, plan: PlanPhase[]): PlanPhase | null {
  return plan.find((p) => daysLeft >= p.from && daysLeft <= p.to) ?? null;
}

export interface QuizCard {
  /** Stable index into the quiz deck */
  n: number;
  area: StudyAreaId;
  /** Concept or exercise id to link to */
  itemId: string;
  itemTitle: string;
  question: string;
  /** A written answer (design follow-ups) */
  answer?: string;
  /** Key points to compare with (concept recap) */
  points: string[];
}

/** Pick a card from `cards`, avoiding `previous` when there's a choice. `random` in [0, 1). */
export function pickCard(cards: QuizCard[], random: number, previous?: number): QuizCard | null {
  if (cards.length === 0) return null;
  const pool = cards.length > 1 && previous !== undefined ? cards.filter((c) => c.n !== previous) : cards;
  return pool[Math.min(pool.length - 1, Math.floor(random * pool.length))];
}

/** Deterministic number in [0, 1) from a string (FNV-1a), so the quiz shuffles per day without Math.random. */
export function seededRandom(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}
