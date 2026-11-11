import "server-only";
import { eq } from "drizzle-orm";
import {
  JUDGE_PROBLEMS,
  buildChatMessages,
  buildLessonChatMessages,
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
  if (hasProblem === hasLesson) return null; // exactly one of problemId / lessonId
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
