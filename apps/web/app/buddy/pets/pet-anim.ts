import type { BuddyMood } from "@habit/shared";

// Pure mapping from the Buddy's state to a row of a Petdex sheet. Same names as PET_ROWS in pet-package.ts.
export type PetAnimRow = "idle" | "running-right" | "running-left" | "waving" | "jumping" | "failed" | "waiting" | "running" | "review";

export function rowForMood(
  mood: BuddyMood,
  extra?: { speaking?: boolean; dragging?: "left" | "right" | null },
): PetAnimRow {
  if (extra?.dragging === "left") return "running-left";
  if (extra?.dragging === "right") return "running-right";
  if (extra?.speaking) return "waving";
  switch (mood) {
    case "thinking":
      return "review";
    case "sleeping":
      return "waiting";
    case "excited":
      return "jumping";
    default:
      return "idle";
  }
}

const DELAY: Record<PetAnimRow, number> = {
  idle: 180,
  waiting: 180,
  "running-right": 90,
  "running-left": 90,
  running: 90,
  jumping: 110,
  waving: 130,
  review: 160,
  failed: 140,
};

export function frameDelayMs(row: PetAnimRow): number {
  return DELAY[row];
}
