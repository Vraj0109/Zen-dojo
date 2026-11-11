import { BUDDY_LINE_EVENTS, type BuddyLineEvent, type BuddyTone, type ChatMessage } from "@habit/shared";

// Plan 0068: the prompt for the Buddy's optional AI one-liner. Pure. It carries only the event, the tone and the
// buddy's name: never code, notes, problem text or any other user data.

export const BUDDY_TONES: readonly BuddyTone[] = ["calm", "peer", "coach"];
export const MAX_BUDDY_NAME = 30;
export const MAX_AI_LINE_CHARS = 140;

const EVENT_TEXT: Record<BuddyLineEvent, string> = {
  "idle-chatter": "the student is working quietly and you want to give a small word of encouragement",
  welcome: "the student has just opened the study app and you welcome them",
  solved: "the student has just solved a practice problem and all tests passed",
  "ai-done": "an AI helper has just finished answering the student's question and you nudge them to think it over",
  "session-start": "the student is starting a focused study session",
  "session-end": "the student has just finished a focused study session",
  "break-due": "the student has been working for a while and a short break would help",
  "late-night": "it is late at night and a little rest would help",
  streak: "the student has kept up their study habit for several days in a row",
};

const TONE_TEXT: Record<BuddyTone, string> = {
  calm: "calm and grounding",
  peer: "friendly and relatable",
  coach: "direct and motivating",
};

export interface BuddyLineRequest {
  event: BuddyLineEvent;
  tone: BuddyTone;
  name: string;
}

/** Validate the request body. Returns null when anything is off. The name is stripped of control characters. */
export function parseBuddyRequest(raw: unknown): BuddyLineRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.event !== "string" || !(BUDDY_LINE_EVENTS as readonly string[]).includes(r.event)) return null;
  if (typeof r.tone !== "string" || !(BUDDY_TONES as readonly string[]).includes(r.tone)) return null;
  if (typeof r.name !== "string") return null;
  const name = r.name.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim();
  if (name.length > MAX_BUDDY_NAME) return null;
  return { event: r.event as BuddyLineEvent, tone: r.tone as BuddyTone, name: name || "Buddy" };
}

export function buildBuddyMessages(req: BuddyLineRequest): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        `You are ${req.name}, a friendly study companion with a ${TONE_TEXT[req.tone]} voice. ` +
        `Write one short sentence (under 120 characters) for this moment: ${EVENT_TEXT[req.event]}. ` +
        "No emoji, no quotes, no advice about health or medicine.",
    },
    { role: "user", content: "Say it." },
  ];
}

/** Clean the model's answer: one line, no wrapping quotes, at most 140 characters. Empty gives null. */
export function cleanBuddyLine(text: string): string | null {
  let t = text.replace(/\s+/g, " ").trim();
  t = t.replace(/^["'`“‘]+|["'`”’]+$/g, "").trim();
  if (!t) return null;
  if (t.length > MAX_AI_LINE_CHARS) t = t.slice(0, MAX_AI_LINE_CHARS - 1).trimEnd() + ".";
  return t;
}
