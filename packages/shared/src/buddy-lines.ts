// Built-in one-liners for the Buddy companion (plan 0068). Pure and deterministic for a seed.
// Kind, never guilt-based, no emoji. Each line is at most 140 characters after the name is filled in.

import type { BuddyTone } from "./buddy";
import type { BuddyEventType } from "./buddy-mood";

export type BuddyLineEvent =
  | "idle-chatter"
  | "welcome"
  | "solved"
  | "ai-done"
  | "session-start"
  | "session-end"
  | "break-due"
  | "late-night"
  | "streak";

export const BUDDY_LINE_EVENTS: readonly BuddyLineEvent[] = [
  "idle-chatter",
  "welcome",
  "solved",
  "ai-done",
  "session-start",
  "session-end",
  "break-due",
  "late-night",
  "streak",
];

export const MAX_LINE_CHARS = 140;

// "{name}" is replaced by the buddy's name (or a default for the tone).
const LINES: Record<BuddyTone, Record<BuddyLineEvent, string[]>> = {
  calm: {
    "idle-chatter": [
      "Slow is smooth, and smooth becomes fast.",
      "One small step is still a step.",
      "Breathe in, breathe out. Then the next line.",
      "Understanding grows quietly. Give it room.",
      "Your shoulders can drop a little.",
      "A clear mind reads the problem twice.",
    ],
    welcome: [
      "Welcome back. Ready when you are.",
      "Good to see you. Start small, we have time.",
      "The dojo is quiet and waiting. No rush.",
      "Hello again. One gentle step is enough to begin.",
      "Welcome. Choose one thing and let the rest wait.",
      "You are here, and that is the hardest part done.",
    ],
    solved: [
      "Well done. Notice how that felt.",
      "Every case passes. Let it settle in.",
      "A quiet win. Take a breath before the next one.",
      "Clean work. Your patience paid off.",
      "That is steady progress. Be kind to yourself.",
      "Solved. The pattern is a little more yours now.",
    ],
    "ai-done": [
      "That is an answer to think over, not just copy.",
      "Read it slowly. Does it match your own idea?",
      "Take what helps and leave the rest.",
      "Try to explain it back in your own words.",
      "Good question. Now see if you can go on alone.",
      "A fresh view helps. Check it against the problem.",
    ],
    "session-start": [
      "Settle in. One focused block, nothing more.",
      "Let us begin gently. What is the one aim?",
      "Breathe, then start. I am here with you.",
      "A calm start makes the rest easier.",
      "One thing at a time. Begin when you are ready.",
      "Sit comfortably. We will go at your pace.",
    ],
    "session-end": [
      "Lovely focus. Rest your eyes a moment.",
      "That block is done. You showed up, and that counts.",
      "Well spent time. Stretch and let it sink in.",
      "Close the lid on it for now. Good work.",
      "Whatever happened, you practiced. That matters.",
      "A good pause now helps what you learned stick.",
    ],
    "break-due": [
      "A short break would be kind to your mind.",
      "Look away from the screen for a minute.",
      "Time for water and a stretch.",
      "Step back for five minutes. The problem will wait.",
      "Rest is part of the work. Take a pause.",
      "Unclench your jaw, roll your shoulders, breathe.",
    ],
    "late-night": [
      "It is late. A little sleep often solves more than effort.",
      "Rest is useful too. Tomorrow you will see it clearer.",
      "Consider closing for tonight. The work will keep.",
      "A tired mind misses easy things. Be gentle.",
      "Nothing here needs to be finished tonight.",
      "Late hours are quiet, but sleep helps memory.",
    ],
    streak: [
      "Day after day, you keep showing up. That is the practice.",
      "A steady rhythm is forming. Honor it.",
      "Consistency is quiet strength. Well done.",
      "Your habit is taking root.",
      "Another day on the path. Gratitude for that.",
      "Small days add up. Look how far you have walked.",
    ],
  },
  peer: {
    "idle-chatter": [
      "Brute force is totally valid, you know.",
      "Hey, still here with you. No pressure!",
      "Stuck? Draw it out on paper, it helps.",
      "You have got this. One step at a time!",
      "Fun fact: everyone gets stuck on this stuff.",
      "I believe in you. Also, snacks are allowed.",
    ],
    welcome: [
      "Hey, you are back! Great to see you.",
      "Yay, hi! Ready to poke at some problems?",
      "Welcome back! Pick something fun to start.",
      "Hi there! No sweat, we ease in.",
      "Look who is here! Let us do a small one.",
      "Hello! I saved you a seat.",
    ],
    solved: [
      "Boom! All tests pass. Nicely done!",
      "Yes! That one is yours now.",
      "You crushed it! Proud of you.",
      "Green across the board. Love to see it!",
      "Nailed it! Do a tiny victory dance.",
      "Solved! That felt good, right?",
    ],
    "ai-done": [
      "There is the answer. Does it make sense to you?",
      "Got something! Try it in your own words.",
      "Nice, now try the next bit on your own.",
      "Hope that helped! Ask again if it is fuzzy.",
      "Cool, mix it with your own idea and see.",
      "Read it through once. Any part still unclear?",
    ],
    "session-start": [
      "Let us co-work! What is your one goal?",
      "Okay, sprint time! Keep the goal small.",
      "Ready when you are. I will be right here.",
      "Here we go! One thing, then another.",
      "Co-working mode on. Let us do this together.",
      "Starting! Remember, brute force counts.",
    ],
    "session-end": [
      "Sprint done! Super proud of your focus.",
      "Nice block! Time for a quick stretch.",
      "That was a solid session. High five!",
      "You showed up and did the thing. Great job!",
      "Done! Grab some water, you earned it.",
      "Good work today. Let it marinate for a bit.",
    ],
    "break-due": [
      "Break time! Water, stretch, wiggle your toes.",
      "Psst, a little break would feel great now.",
      "Go for a short walk. I will hold your place!",
      "You have been at it a while. Take five!",
      "Eyes off the screen for a minute, okay?",
      "Pause and snack! The code will wait.",
    ],
    "late-night": [
      "It is getting late! Sleep helps you remember things.",
      "Night owl mode! Maybe wrap up soon?",
      "Your brain files things while you sleep. Just saying.",
      "Late one! Finish this bit, then rest up.",
      "Tomorrow-you will thank you for sleeping.",
      "Hey, bedtime is also a study technique.",
    ],
    streak: [
      "Look at that streak! You keep showing up.",
      "Another day in a row! That is awesome.",
      "Your streak is glowing. Keep it cozy!",
      "Day by day, you are building something real.",
      "Wow, so consistent! I am impressed.",
      "Streak going strong. No stress, just keep going.",
    ],
  },
  coach: {
    "idle-chatter": [
      "Keep moving. Small reps add up.",
      "Isolate the bottleneck, then fix it.",
      "Focus on the next single step.",
      "Skills compound. Keep stacking blocks.",
      "Read the constraints again. They hint at the answer.",
      "Progress beats perfection. Write something.",
    ],
    welcome: [
      "Back at it! Let us get to work.",
      "Good to see you. Pick a target and go.",
      "Welcome back to the dojo. Fresh start, clean slate.",
      "Ready? One quick win to warm up.",
      "Let us make today count. Start with one problem.",
      "You are here. That is the first rep.",
    ],
    solved: [
      "Target achieved! Outstanding execution.",
      "All cases pass. That is how it is done.",
      "Solid work. Lock the pattern in and move on.",
      "Clean solve! Now do it again faster.",
      "Another one down. Momentum is building.",
      "Win logged. Keep that energy going.",
    ],
    "ai-done": [
      "You have the hint. Now apply it yourself.",
      "Use that, then test it. Do not just read.",
      "Good. Now code it from scratch without peeking.",
      "Take the key idea and run with it.",
      "Understand the why, not only the what.",
      "Got your answer. Time to put it to work.",
    ],
    "session-start": [
      "Lock in! Define one outcome and go.",
      "Sprint starts now. Single goal, full focus.",
      "Clock is running. Make this block count.",
      "Let us go. One target, no distractions.",
      "Ready, set, focus. Name the outcome.",
      "Start strong. First step, right now.",
    ],
    "session-end": [
      "Sprint complete! You engaged and found the friction.",
      "Block done. Review what worked.",
      "Good effort. Rest, then come back sharper.",
      "That is a rep in the bank. Well done.",
      "You did the work. Note one thing you learned.",
      "Session closed. Recover and reload.",
    ],
    "break-due": [
      "Break time. Recovery is part of training.",
      "Step away for five. Come back sharper.",
      "Hydrate and stretch. Then back in.",
      "Rest now so the next block is strong.",
      "Take your break. Champions recover too.",
      "Pause the clock. Five minutes off.",
    ],
    "late-night": [
      "It is late. Sleep is training too.",
      "Wrap up and rest. Tomorrow we hit it fresh.",
      "A tired brain makes slow progress. Recover.",
      "Finish this step, then call it a night.",
      "Rest is how you get stronger. Close it out.",
      "Smart athletes sleep. Be one.",
    ],
    streak: [
      "Streak alive! Discipline is paying off.",
      "Day after day, you show up. That is the habit.",
      "Consistency wins. Keep the chain going.",
      "Strong rhythm. Keep the pressure on.",
      "Another day logged. Stay on it.",
      "That streak is earned. Keep building.",
    ],
  },
};

function defaultName(tone: BuddyTone): string {
  return tone === "calm" ? "Sensei" : tone === "coach" ? "Coach" : "Buddy";
}

/** Pick a line for a tone and event. Pure: the same seed gives the same line. Never empty, at most 140 characters. */
export function pickLine(tone: BuddyTone, event: BuddyLineEvent, seed: number, name?: string): string {
  const list = LINES[tone]?.[event] ?? LINES.calm["idle-chatter"];
  const s = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0;
  const line = list[s % list.length]!;
  const who = name?.trim() || defaultName(tone);
  const out = line.replaceAll("{name}", who);
  return out.length <= MAX_LINE_CHARS ? out : out.slice(0, MAX_LINE_CHARS - 1).trimEnd() + ".";
}

/** Which kind of line fits a Buddy event, or null when the event is silent (activity, tick, ai-start). */
export function eventToLine(type: BuddyEventType): BuddyLineEvent | null {
  switch (type) {
    case "solved":
      return "solved";
    case "ai-end":
      return "ai-done";
    case "session-start":
      return "session-start";
    case "session-end":
      return "session-end";
    case "break-due":
      return "break-due";
    default:
      return null;
  }
}
