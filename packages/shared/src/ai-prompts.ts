// Plans 0060 and 0067: prompts for the AI chat. Pure functions. The reference solution is added only when revealSolution is true.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PromptProblem {
  title: string;
  statement: string[];
  constraints?: string[];
  hints?: string[];
}

export interface SolutionInfo {
  idea: string[];
  complexity: string;
  cpp: string;
}

export const MAX_CODE_CHARS = 6000;
export const MAX_STATEMENT_CHARS = 4000;

/** Cut text to at most `max` characters, marking the cut. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 20))}\n[...cut for length]`;
}

function statementText(p: PromptProblem): string {
  const parts = [`Problem: ${p.title}`, ...p.statement];
  if (p.constraints?.length) parts.push("Constraints:", ...p.constraints.map((c) => `- ${c}`));
  return clip(parts.join("\n"), MAX_STATEMENT_CHARS);
}

const STYLE = "Be brief and plain. Use short paragraphs. Put code in fenced code blocks. If you are not sure, say so.";

// Plan 0067: the chat. The server builds the system message and problem context; the browser only sends the visible conversation.

export type ChatIntent = "question" | "hint" | "review" | "solution" | "free" | "explain" | "quiz" | "example" | "interview";
export const CHAT_INTENTS: readonly ChatIntent[] = ["question", "hint", "review", "solution", "free", "explain", "quiz", "example", "interview"];
export const isChatIntent = (v: unknown): v is ChatIntent => typeof v === "string" && (CHAT_INTENTS as readonly string[]).includes(v);

export const MAX_CHAT_MESSAGES = 20;
export const MAX_CHAT_MESSAGE_CHARS = 4000;
export const MAX_CHAT_TOTAL_CHARS = 16000;

export interface VisibleMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Keep the newest messages: clip each to 4,000 characters, keep at most 20 and at most 16,000 characters in total.
 * Old messages are dropped from the front; the newest message is always kept.
 */
export function trimChatHistory(history: VisibleMessage[]): VisibleMessage[] {
  const kept: VisibleMessage[] = [];
  let total = 0;
  for (let i = history.length - 1; i >= 0 && kept.length < MAX_CHAT_MESSAGES; i--) {
    const content = clip(history[i].content, MAX_CHAT_MESSAGE_CHARS);
    if (kept.length > 0 && total + content.length > MAX_CHAT_TOTAL_CHARS) break;
    total += content.length;
    kept.unshift({ role: history[i].role, content });
  }
  return kept;
}

export interface ChatInput {
  problem: PromptProblem;
  /** The reference solution. Only used when `revealSolution` is true; otherwise it is ignored even if given. */
  solution?: SolutionInfo;
  revealSolution?: boolean;
  /** The learner's saved code. Only used for intent "review" or when `includeCode` is true. */
  code?: string;
  includeCode?: boolean;
  language?: string;
  intent: ChatIntent;
  hintIndex?: number;
  history: VisibleMessage[];
}

const NO_SOLUTION =
  "Guide with questions and small nudges. Do not give the full solution or full code unless the learner has asked for the solution.";

/** The final messages for the model: one system message (role, problem, optional hint, code, solution) then the trimmed conversation. */
export function buildChatMessages(input: ChatInput): ChatMessage[] {
  const { problem: p, intent } = input;
  const reveal = input.revealSolution === true && input.solution !== undefined;
  const code = intent === "review" || input.includeCode === true ? (input.code?.trim() ?? "") : "";
  const parts = [
    "You are a patient coding coach helping someone prepare for interviews. Answer the learner's latest message using the conversation so far.",
    reveal
      ? "The learner has asked for the solution, so you may explain the reference solution below step by step and why it works."
      : NO_SOLUTION,
    STYLE,
    "",
    statementText(p),
  ];
  if (intent === "hint") {
    const hints = p.hints ?? [];
    const i = Math.min(Math.max(0, Math.floor(input.hintIndex ?? 0) || 0), Math.max(0, hints.length - 1));
    if (hints[i]) parts.push("", `Hint ${i + 1} of ${hints.length}: ${clip(hints[i], 1000)}`);
  }
  if (code) parts.push("", `Learner's code${input.language ? ` (${input.language})` : ""}:`, "```", clip(code, MAX_CODE_CHARS), "```");
  if (reveal && input.solution) {
    parts.push(
      "",
      `Reference idea:\n${clip(input.solution.idea.join("\n"), 1500)}`,
      `Complexity: ${clip(input.solution.complexity, 200)}`,
      "Reference code:",
      "```",
      clip(input.solution.cpp, MAX_CODE_CHARS),
      "```",
    );
  }
  return [{ role: "system", content: parts.join("\n") }, ...trimChatHistory(input.history)];
}

/** The visible text a starter chip posts as the first user message. */
export function starterMessage(intent: ChatIntent, o: { hintIndex?: number; hintText?: string } = {}): string {
  switch (intent) {
    case "question":
      return "Explain the question to me.";
    case "hint": {
      const n = Math.max(0, Math.floor(o.hintIndex ?? 0) || 0) + 1;
      return o.hintText ? `Explain hint ${n}: "${clip(o.hintText, 500)}"` : `Explain hint ${n}.`;
    }
    case "review":
      return "Review my code.";
    case "solution":
      return "Explain the solution.";
    case "explain":
      return "Explain this lesson to me in simple words.";
    case "quiz":
      return "Quiz me on this lesson, one question at a time.";
    case "example":
      return "Give me a concrete example that shows how this works.";
    case "interview":
      return "Ask me an interview question about this and tell me how I did.";
    default:
      return "";
  }
}

export const MAX_LESSON_CHARS = 6000;

export interface LessonChatInput {
  title: string;
  area?: string;
  /** The lesson text the learner is reading (built on the server). */
  material: string;
  history: VisibleMessage[];
}

/** Messages for a chat about a course lesson. The lesson text is not secret, so there is no solution gate here. */
export function buildLessonChatMessages(input: LessonChatInput): ChatMessage[] {
  const system = [
    "You are a patient tutor helping someone prepare for software engineering interviews. Answer the learner's latest message using the conversation so far and the lesson below.",
    "Stay close to the lesson. If asked for a quiz, ask one question at a time, wait for the answer, then say what was right and what was missing. If you are not sure, say so.",
    STYLE,
    "",
    `Lesson: ${input.title}${input.area ? ` (${input.area})` : ""}`,
    clip(input.material, MAX_LESSON_CHARS),
  ].join("\n");
  return [{ role: "system", content: system }, ...trimChatHistory(input.history)];
}
