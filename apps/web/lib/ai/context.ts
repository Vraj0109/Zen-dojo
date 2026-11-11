import "server-only";
import { eq } from "drizzle-orm";
import {
  JUDGE_PROBLEMS,
  buildChatMessages,
  buildLessonChatMessages,
  buildBuddyChatMessages,
  buildPortfolioSummaryMessages,
  isChatIntent,
  type ChatIntent,
  type ChatMessage,
  type VisibleMessage,
} from "@habit/shared";
import { getDb } from "@/lib/db";
import { problemNotes } from "@/lib/schema";
import { lessonSource } from "@/lib/ai/lesson";

/** A validated body of POST /api/ai/chat (plan 0067). */
export interface ChatRequest {
  /** A judged problem... */
  problemId?: string;
  /** ...or a course lesson (concept, system design or LLD problem). Exactly one of the two. */
  lessonId?: string;
  /** ...or a chat with the Buddy as a character (the imported pet's name and description). Exactly one of the three. */
  buddy?: { name: string; description: string; tone: "calm" | "peer" | "coach" };
  /** ...or a written summary of the owner's portfolio (the server reads its own numbers). */
  portfolioSummary?: boolean;
  messages: VisibleMessage[];
  intent: ChatIntent;
  hintIndex: number;
  revealSolution: boolean;
  includeCode: boolean;
}

/** Hard cap on how many messages we even look at; the real limits (20 / 4,000 / 16,000) are applied by `trimChatHistory`. */
const MAX_INPUT_MESSAGES = 200;

/** Check the shape of the request body. Returns null when it is not acceptable (the route answers 400 bad_request). */
export function parseChatRequest(raw: unknown): ChatRequest | null {
  if (typeof raw !== "object" || raw === null) return null;
  const b = raw as Record<string, unknown>;
  const hasProblem = typeof b.problemId === "string" && b.problemId.length > 0;
  const hasLesson = typeof b.lessonId === "string" && b.lessonId.length > 0;
  const hasBuddy = typeof b.buddy === "object" && b.buddy !== null;
  const hasSummary = b.portfolioSummary === true;
  if ([hasProblem, hasLesson, hasBuddy, hasSummary].filter(Boolean).length !== 1) return null; // exactly one mode
  let buddy: ChatRequest["buddy"];
  if (hasBuddy) {
    const p = b.buddy as { name?: unknown; description?: unknown; tone?: unknown };
    if (typeof p.name !== "string" || !p.name.trim()) return null;
    if (p.description !== undefined && typeof p.description !== "string") return null;
    const tone = p.tone === "calm" || p.tone === "coach" ? p.tone : "peer";
    buddy = { name: p.name, description: typeof p.description === "string" ? p.description : "", tone };
  }
  if (!Array.isArray(b.messages) || b.messages.length === 0) return null;
  const messages: VisibleMessage[] = [];
  for (const m of b.messages.slice(-MAX_INPUT_MESSAGES)) {
    if (typeof m !== "object" || m === null) return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    messages.push({ role, content });
  }
  if (messages[messages.length - 1].role !== "user" || !messages[messages.length - 1].content.trim()) return null;
  if (b.intent !== undefined && !isChatIntent(b.intent)) return null;
  if (b.hintIndex !== undefined && typeof b.hintIndex !== "number") return null;
  for (const k of ["revealSolution", "includeCode"] as const) if (b[k] !== undefined && typeof b[k] !== "boolean") return null;
  return {
    problemId: hasProblem ? (b.problemId as string) : undefined,
    lessonId: hasLesson ? (b.lessonId as string) : undefined,
    buddy,
    portfolioSummary: hasSummary || undefined,
    messages,
    intent: (b.intent as ChatIntent | undefined) ?? "free",
    hintIndex: typeof b.hintIndex === "number" && Number.isFinite(b.hintIndex) ? b.hintIndex : 0,
    revealSolution: b.revealSolution === true,
    includeCode: b.includeCode === true,
  };
}

export type ChatBuild = { ok: true; messages: ChatMessage[] } | { ok: false; error: "unknown_problem" | "no_code" };

/**
 * Build the full message list for the model on the server. The reference solution is read only when `revealSolution` is true,
 * so it never reaches the prompt (or a provider) otherwise. Saved code is read for `review` or `includeCode`.
 */
export async function buildChat(req: ChatRequest): Promise<ChatBuild> {
  if (req.portfolioSummary) {
    const { getPortfolio } = await import("@/lib/portfolio");
    return { ok: true, messages: buildPortfolioSummaryMessages(await getPortfolio(), req.messages) };
  }
  if (req.buddy) {
    return { ok: true, messages: buildBuddyChatMessages({ ...req.buddy, history: req.messages }) };
  }
  if (req.lessonId) {
    const src = lessonSource(req.lessonId);
    if (!src) return { ok: false, error: "unknown_problem" };
    return { ok: true, messages: buildLessonChatMessages({ title: src.title, area: src.area, material: src.material, history: req.messages }) };
  }
  const problemId = req.problemId ?? "";
  const spec = JUDGE_PROBLEMS[problemId];
  if (!spec) return { ok: false, error: "unknown_problem" };
  let code: string | undefined;
  let language: string | undefined;
  if (req.intent === "review" || req.includeCode) {
    const db = await getDb();
    const note = await db.query.problemNotes.findFirst({ where: eq(problemNotes.problemId, problemId) });
    code = note?.code?.trim() || undefined;
    language = note?.language || undefined;
    if (!code && req.intent === "review") return { ok: false, error: "no_code" };
  }
  const messages = buildChatMessages({
    problem: { title: spec.title, statement: spec.statement, constraints: spec.constraints, hints: spec.hints },
    solution: req.revealSolution ? spec.solution : undefined,
    revealSolution: req.revealSolution,
    code,
    includeCode: req.includeCode,
    language,
    intent: req.intent,
    hintIndex: req.hintIndex,
    history: req.messages,
  });
  return { ok: true, messages };
}
