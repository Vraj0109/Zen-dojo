// Buddy companion mood state machine. Pure: the caller supplies the clock and the bookkeeping values.

export type BuddyMood = "idle" | "thinking" | "sleeping" | "excited";
export type BuddyEventType =
  | "solved"
  | "ai-start"
  | "ai-end"
  | "session-start"
  | "session-end"
  | "activity"
  | "tick"
  | "break-due";

/** No activity for this long and the buddy falls asleep. */
export const SLEEP_AFTER_MS = 5 * 60_000;
/** How long the excited pose lasts. */
export const EXCITED_FOR_MS = 6_000;

export interface BuddyMoodContext {
  now: number;
  lastActivity: number;
  /** Time (ms) until which the buddy should stay excited; in the past or 0 when not excited. */
  excitedUntil: number;
  aiBusy: boolean;
}

export function nextMood(current: BuddyMood, event: BuddyEventType, ctx: BuddyMoodContext): BuddyMood {
  switch (event) {
    case "ai-start":
      return "thinking";
    case "ai-end":
      return ctx.excitedUntil > ctx.now ? "excited" : "idle";
    case "solved":
    case "session-end":
      return "excited";
    case "activity":
    case "session-start":
    case "break-due":
      // Any of these wakes a sleeping buddy; thinking and excited play out on their own.
      return current === "sleeping" ? "idle" : current;
    case "tick": {
      if (current === "thinking" || ctx.aiBusy) return "thinking";
      if (current === "excited") return ctx.now >= ctx.excitedUntil ? "idle" : "excited";
      if (ctx.now - ctx.lastActivity >= SLEEP_AFTER_MS) return "sleeping";
      return current;
    }
  }
}
