// Plan 0060: prompts for the local AI helper. Pure functions. The hint and review prompts are Socratic and never include the
// reference solution; only buildSolutionPrompt does, and only when the user presses "Explain the solution".

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

export function buildHintPrompt(p: PromptProblem, hintIndex: number): ChatMessage[] {
  const hints = p.hints ?? [];
  const i = Math.min(Math.max(0, Math.floor(hintIndex) || 0), Math.max(0, hints.length - 1));
  const hint = hints[i] ?? "";
  return [
    {
      role: "system",
      content:
        "You are a patient coding coach helping someone prepare for interviews. Explain the given hint in simpler words and ask one guiding question. " +
        `Do not write the full solution or full code. ${STYLE}`,
    },
    {
      role: "user",
      content: `${statementText(p)}\n\nHint ${i + 1} of ${hints.length}: ${clip(hint, 1000)}\n\nExplain this hint to me without giving away the answer.`,
    },
  ];
}

export function buildReviewPrompt(p: PromptProblem, code: string, language?: string): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are a code reviewer for interview practice. Point out bugs, missed edge cases and complexity problems in the learner's code. " +
        `Guide with questions and small nudges. Do not rewrite the whole solution. ${STYLE}`,
    },
    {
      role: "user",
      content: `${statementText(p)}\n\nMy code${language ? ` (${language})` : ""}:\n\`\`\`\n${clip(code, MAX_CODE_CHARS)}\n\`\`\`\n\nReview it.`,
    },
  ];
}

export function buildSolutionPrompt(p: PromptProblem, solution: SolutionInfo): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You explain a known correct solution step by step so a learner understands why it works. ${STYLE}`,
    },
    {
      role: "user",
      content:
        `${statementText(p)}\n\nReference idea:\n${clip(solution.idea.join("\n"), 1500)}\nComplexity: ${clip(solution.complexity, 200)}\n\n` +
        `Reference code:\n\`\`\`\n${clip(solution.cpp, MAX_CODE_CHARS)}\n\`\`\`\n\nExplain why this solution works.`,
    },
  ];
}
