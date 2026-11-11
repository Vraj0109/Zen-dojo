import "server-only";
import { eq } from "drizzle-orm";
import { JUDGE_PROBLEMS, buildHintPrompt, buildReviewPrompt, buildSolutionPrompt, type ChatMessage } from "@habit/shared";
import { getDb } from "@/lib/db";
import { problemNotes } from "@/lib/schema";

export type AiAction = "hint" | "review" | "solution";
export const isAiAction = (v: unknown): v is AiAction => v === "hint" || v === "review" || v === "solution";

/** Build the messages for one button press from the problem and the user's saved code. Null when the problem is unknown. */
export async function buildMessages(problemId: string, action: AiAction, hintIndex = 0): Promise<ChatMessage[] | null> {
  const spec = JUDGE_PROBLEMS[problemId];
  if (!spec) return null;
  const p = { title: spec.title, statement: spec.statement, constraints: spec.constraints, hints: spec.hints };
  if (action === "hint") return buildHintPrompt(p, hintIndex);
  if (action === "solution") return buildSolutionPrompt(p, spec.solution);
  const db = await getDb();
  const note = await db.query.problemNotes.findFirst({ where: eq(problemNotes.problemId, problemId) });
  const code = note?.code?.trim() ?? "";
  if (!code) return [];
  return buildReviewPrompt(p, code, note?.language || undefined);
}
