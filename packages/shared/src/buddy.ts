// ADHD accountability buddy, compassionate pacing, and cognitive micro-steps.
// Designed to lower activation energy, eliminate shame spirals, and provide supportive body doubling.

export type BuddyTone = "calm" | "peer" | "coach";
export type BuddyMode = "off" | BuddyTone;
export type AdhdPacing = "standard" | "gentle";

export interface BuddySettings {
  mode: BuddyMode;
  name?: string;
  pacing: AdhdPacing;
}

export const DEFAULT_BUDDY_SETTINGS: BuddySettings = {
  mode: "off",
  name: "Buddy",
  pacing: "gentle",
};

export const BUDDY_TONE_LABELS: Record<BuddyTone, string> = {
  calm: "Sensei (Calm & Grounding)",
  peer: "Study Buddy (Friendly & Relatable)",
  coach: "Coach (Direct & Motivating)",
};

/**
 * Generates an opening sprint check-in prompt.
 * Asks for a single, low-friction intention for the upcoming work block.
 */
export function getStartCheckIn(tone: BuddyTone = "calm", buddyName?: string): string {
  const name = buddyName?.trim() || (tone === "calm" ? "Sensei" : tone === "coach" ? "Coach" : "Buddy");
  switch (tone) {
    case "calm":
      return `${name}: Take a slow breath. What is the one small step you want to explore during this block?`;
    case "peer":
      return `${name}: Hey! Ready to co-work? What's your 1 main goal for this sprint? Keep it simple!`;
    case "coach":
      return `${name}: Let's lock in! What is the single outcome we are getting done in this sprint? Define it and go.`;
  }
}

/**
 * Mid-session micro-nudge to check in gently without breaking flow.
 */
export function getMidSessionNudge(tone: BuddyTone = "calm", buddyName?: string): string {
  const name = buddyName?.trim() || (tone === "calm" ? "Sensei" : tone === "coach" ? "Coach" : "Buddy");
  switch (tone) {
    case "calm":
      return `${name}: Notice your shoulders and unclench your jaw. If you're stuck, step back and re-read the example.`;
    case "peer":
      return `${name}: Halfway through! Still on track with that 1 goal? Remember, brute force is totally valid!`;
    case "coach":
      return `${name}: Good intensity. If you hit a wall, isolate the bottleneck. Keep moving forward!`;
  }
}

/**
 * End-of-sprint celebration and reflection prompt.
 * Acknowledges effort regardless of whether all test cases passed.
 */
export function getPostSessionCelebration(tone: BuddyTone = "calm", achievedGoal = true, buddyName?: string): string {
  const name = buddyName?.trim() || (tone === "calm" ? "Sensei" : tone === "coach" ? "Coach" : "Buddy");
  if (achievedGoal) {
    switch (tone) {
      case "calm":
        return `${name}: Wonderful focus. You showed up, took the time, and honored your goal. Rest your eyes a moment.`;
      case "peer":
        return `${name}: Boom! You crushed that sprint goal! Super proud of your focus. Time for a quick stretch!`;
      case "coach":
        return `${name}: Target achieved! Outstanding execution. That's how skills compound—one block at a time.`;
    }
  }

  switch (tone) {
    case "calm":
      return `${name}: Every minute spent wrestling with a problem strengthens your intuition. Great effort today.`;
    case "peer":
      return `${name}: Tough problem, but you showed up and put in the time! That takes grit. Step away and let it marinate.`;
    case "coach":
      return `${name}: Sprint complete! You engaged with the problem and found where the friction is. That is valuable progress.`;
  }
}

/**
 * Compassionate re-entry greeting when returning after days or weeks away.
 * Strictly non-punitive: no guilt trips, no mentions of broken streaks.
 */
export function getCompassionateReEntry(daysAway: number, tone: BuddyTone = "calm", buddyName?: string): string {
  const name = buddyName?.trim() || (tone === "calm" ? "Sensei" : tone === "coach" ? "Coach" : "Buddy");
  if (daysAway <= 1) {
    switch (tone) {
      case "calm":
        return `${name}: Welcome back. Ready when you are.`;
      case "peer":
        return `${name}: Hey there! Great to see you again today.`;
      case "coach":
        return `${name}: Back at it! Let's get to work.`;
    }
  }

  switch (tone) {
    case "calm":
      return `${name}: Welcome back. Pauses are a natural part of learning, not a setback. Let's do one gentle warm-up today—no pressure.`;
    case "peer":
      return `${name}: Welcome back! So glad you're here. Life gets busy, no sweat at all! Let's pick something fun and ease back in.`;
    case "coach":
      return `${name}: Welcome back to the dojo! Rest is necessary recovery. We wipe the slate clean and start fresh with a quick win.`;
  }
}

export interface MicroStep {
  id: number;
  title: string;
  prompt: string;
  placeholder: string;
}

export const PROBLEM_MICRO_STEPS: MicroStep[] = [
  {
    id: 1,
    title: "1. Restate in plain words",
    prompt: "Explain what the problem is asking in 1-2 simple sentences without jargon or code.",
    placeholder: "e.g., Given a list of numbers, find two entries that add up to target...",
  },
  {
    id: 2,
    title: "2. Inputs & bounds",
    prompt: "What are the edge cases and extremes? Empty inputs? Negatives? Duplicates? Constraints on N?",
    placeholder: "e.g., Array can have 2 to 10^4 numbers. Exactly one solution exists. N up to 10^5 means O(N^2) will TLE...",
  },
  {
    id: 3,
    title: "3. Brute force idea",
    prompt: "What is the simplest, most obvious way to solve this, even if it is slow? Don't optimize yet.",
    placeholder: "e.g., Check every pair (i, j) with nested loops and return indices when sum == target...",
  },
  {
    id: 4,
    title: "4. The bottleneck",
    prompt: "Why is brute force slow? What repeated work is happening that we can eliminate or remember?",
    placeholder: "e.g., We repeatedly search for target - nums[i] in the rest of the array. If we lookup with a hash map, it takes O(1)...",
  },
  {
    id: 5,
    title: "5. Select pattern & code",
    prompt: "Which data structure or pattern resolves the bottleneck? (e.g. hash map, two pointers, sliding window)",
    placeholder: "e.g., Hash map storing value -> index. Single pass: O(N) time, O(N) space...",
  },
];

export interface PacingConfig {
  workMinutes: number;
  breakMinutes: number;
  style: "countup" | "countdown";
  softNudge: boolean;
}

export function getPacingConfig(pacing: AdhdPacing): PacingConfig {
  return pacing === "gentle"
    ? { workMinutes: 20, breakMinutes: 5, style: "countup", softNudge: true }
    : { workMinutes: 25, breakMinutes: 5, style: "countdown", softNudge: false };
}
