// AI prompt builders for admin content editing (plan 0118 step 1). Pure functions.
// Generates ready-to-copy prompts with surrounding context, house rules, and exact answer formats.

import type { CodeLang, HintRow, ProblemRow, SlotDef, TemplateId, TestCaseRow, ContentPage } from "./types";
import { rulesForTarget } from "./house-rules";
import { templateFor } from "../judge/templates";
import type { JudgeLang, ProblemSpec } from "../judge/types";
import { TEMPLATES, pageTemplate, validatePageAgainstTemplate } from "./templates";
import { MAX_LIMITS } from "./draft";
import { markdownToPage } from "./page-markdown";

export type AiTarget =
  | "problem-statement"
  | "problem-constraints"
  | "test-cases"
  | "hints"
  | "solution-page"
  | "code-block"
  | "text-block"
  | "diagram-block"
  | "section"
  | "lesson-page"
  | "course-summary"
  | "doc";

export type BaseAiMode = "write" | "improve" | "fix-format" | "shorter";

export type AiMode =
  | BaseAiMode
  | "more-edge-cases"
  | `add-language:${CodeLang}`
  | "write-brute"
  | "write-semi"
  | "write-optimal"
  | "explain-complexity"
  | "draw-from-text"
  | string;

export const MAX_PROMPT_CHARS = 24000;

function isEmpty(val: unknown): boolean {
  if (val === undefined || val === null) return true;
  if (typeof val === "string") return val.trim().length === 0;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === "object") return Object.keys(val as Record<string, unknown>).length === 0;
  return false;
}

/**
 * Returns available AI modes that make sense for a given target and current content state.
 * Specifically, `improve`, `fix-format`, and `shorter` are hidden when the current field is empty.
 */
export function modesFor(target: AiTarget, current?: unknown): AiMode[] {
  const empty = isEmpty(current);

  if (empty) {
    switch (target) {
      case "test-cases":
        return ["write", "more-edge-cases"];
      case "code-block":
        return ["write-optimal", "write-brute", "write-semi"];
      case "diagram-block":
        return ["write", "draw-from-text"];
      default:
        return ["write"];
    }
  }

  // Non-empty field modes
  const base: AiMode[] = ["improve", "fix-format", "shorter"];

  switch (target) {
    case "test-cases":
      return ["more-edge-cases", ...base];
    case "code-block":
      return [
        "improve",
        "explain-complexity",
        "write-optimal",
        "write-brute",
        "write-semi",
        "add-language:cpp",
        "add-language:java",
        "add-language:python",
        "add-language:javascript",
        "fix-format",
      ];
    case "diagram-block":
      return ["improve", "draw-from-text", "fix-format", "shorter"];
    default:
      return base;
  }
}

export interface AdminPromptProblemContext {
  row: ProblemRow;
  cases?: TestCaseRow[];
  hints?: HintRow[];
  statement?: ContentPage;
  solution?: ContentPage;
}

export interface AdminPromptContext {
  problem?: AdminPromptProblemContext;
  course?: {
    id: string;
    title: string;
    summaryMd?: string;
  };
  lesson?: {
    id: string;
    title: string;
    template?: TemplateId;
    checklist?: string[];
  };
  slot?: SlotDef;
  lang?: CodeLang;
  otherLanguages?: Partial<Record<CodeLang, string>>;
  surroundingText?: string;
  pageMarkdown?: string;
  doc?: {
    id: string;
    kind: string;
  };
  extra?: Record<string, unknown>;
}

export interface BuildAdminPromptOptions {
  target: AiTarget;
  mode: AiMode;
  context?: AdminPromptContext;
  current?: unknown;
  slot?: SlotDef;
}

/**
 * Builds the one-sentence task description.
 */
function buildTask(target: AiTarget, mode: AiMode, ctx?: AdminPromptContext): string {
  const lang = ctx?.lang;
  if (mode.startsWith("add-language:")) {
    const targetLang = mode.slice("add-language:".length);
    return `Port the existing reference solution into idiomatic ${targetLang.toUpperCase()} matching the judge method signature.`;
  }

  switch (mode) {
    case "write-optimal":
      return `Write the optimal reference solution in ${lang ? lang.toUpperCase() : "code"} for this problem, achieving the best possible time and space complexity.`;
    case "write-brute":
      return `Write the brute-force baseline solution in ${lang ? lang.toUpperCase() : "code"} for this problem.`;
    case "write-semi":
      return `Write a sub-optimal or intermediate solution in ${lang ? lang.toUpperCase() : "code"} for this problem.`;
    case "explain-complexity":
      return "Explain the time and space complexity in Big-O notation, proving why the algorithm meets the bounds.";
    case "more-edge-cases":
      return "Generate additional challenging edge cases, boundary values, and tricky tests for this problem.";
    case "draw-from-text":
      return "Create a clear Mermaid diagram illustrating the architecture, flow, or state transitions described in the section.";
    case "improve":
      return `Improve the quality, clarity, and depth of this ${target.replace("-", " ")}, addressing any gaps while preserving core intent.`;
    case "fix-format":
      return `Fix formatting, syntax, and structural issues in this ${target.replace("-", " ")} according to house rules.`;
    case "shorter":
      return `Make this ${target.replace("-", " ")} more concise and direct without sacrificing critical technical details.`;
    case "write":
    default:
      switch (target) {
        case "hints":
          return "Write 3 to 4 progressive hints for this problem, starting with small nudges and leading to the optimal approach.";
        case "problem-statement":
          return "Write a clear, complete, and unambiguous problem statement with input/output descriptions.";
        case "problem-constraints":
          return "Specify standard, mathematically precise input constraints for this problem.";
        case "test-cases":
          return "Write a comprehensive set of test cases matching the problem signature.";
        case "diagram-block":
          return "Create a Mermaid diagram explaining this concept or architecture.";
        case "code-block":
          return `Write an idiomatic solution in ${lang ? lang.toUpperCase() : "the target language"}.`;
        default:
          return `Write high-quality content for this ${target.replace("-", " ")}.`;
      }
  }
}

/**
 * Formats "Where this goes".
 */
function buildWhereThisGoes(target: AiTarget, ctx?: AdminPromptContext, slot?: SlotDef): string {
  const parts: string[] = [];
  if (ctx?.course) {
    parts.push(`Course: ${ctx.course.title} (${ctx.course.id})`);
  }
  if (ctx?.lesson) {
    parts.push(`Lesson: ${ctx.lesson.title} (${ctx.lesson.id})`);
  }
  if (slot) {
    parts.push(`Slot: ${slot.heading} (${slot.key})`);
    if (slot.purpose) {
      parts.push(`Purpose: ${slot.purpose}`);
    }
  } else if (ctx?.problem) {
    parts.push(`Problem: ${ctx.problem.row.title} (${ctx.problem.row.id})`);
    parts.push(`Field: ${target}`);
  } else if (ctx?.doc) {
    parts.push(`Doc: ${ctx.doc.kind} (${ctx.doc.id})`);
  } else {
    parts.push(`Target field: ${target}`);
  }
  return parts.join("\n");
}

/**
 * Formats problem and lesson context.
 */
function buildContext(target: AiTarget, ctx?: AdminPromptContext): string {
  if (!ctx) return "No additional context provided.";
  const parts: string[] = [];

  if (ctx.problem) {
    const p = ctx.problem;
    const r = p.row;
    parts.push(`### Problem: ${r.title} (${r.id})`);
    parts.push(`Difficulty: ${r.difficulty ?? "medium"}`);
    if (r.pattern) parts.push(`Pattern: ${r.pattern}`);
    if (r.complexity) parts.push(`Target Complexity: ${r.complexity}`);

    // Signature
    if (r.kind === "design" && r.design) {
      parts.push(`Design Spec: ${JSON.stringify(r.design, null, 2)}`);
    } else if (r.fn) {
      const params = (r.fn.params ?? []).map((param) => `${param.name}: ${param.type}`).join(", ");
      parts.push(`Signature: ${r.fn.name}(${params}) -> ${r.fn.returns}`);
    }

    if (r.constraints && r.constraints.length > 0) {
      parts.push(`Constraints:\n${r.constraints.map((c) => `- ${c}`).join("\n")}`);
    }

    // Statement
    if (p.statement?.sections?.length) {
      const statementTexts = p.statement.sections
        .flatMap((s) => s.blocks.map((b) => b.body).filter(Boolean))
        .join("\n\n");
      if (statementTexts) parts.push(`Statement:\n${statementTexts}`);
    }

    // Examples
    if (p.cases && p.cases.length > 0) {
      const examples = p.cases.filter((c) => c.role === "example");
      if (examples.length > 0) {
        parts.push(
          `Examples:\n${examples
            .map(
              (e, i) =>
                `Example ${i + 1}:\nInput: ${JSON.stringify(e.input)}\nOutput: ${JSON.stringify(e.output)}${
                  e.explanationMd ? `\nExplanation: ${e.explanationMd}` : ""
                }`,
            )
            .join("\n\n")}`,
        );
      }

      // Test cases (first 10)
      const tests = p.cases.filter((c) => c.role === "test");
      if (tests.length > 0) {
        const first10 = tests.slice(0, 10);
        const countNotice =
          tests.length > 10 ? `Showing first 10 of ${tests.length} test cases` : `${tests.length} test cases`;
        parts.push(
          `Tests (${countNotice}):\n${first10
            .map((t) => `input: ${JSON.stringify(t.input)} -> output: ${JSON.stringify(t.output)}`)
            .join("\n")}`,
        );
      }
    }

    // Existing hints
    if (p.hints && p.hints.length > 0) {
      parts.push(`Current hints:\n${p.hints.map((h, i) => `${i + 1}. ${h.bodyMd}`).join("\n")}`);
    }

    // Judge starter template if code block target
    if (target === "code-block" && ctx.lang) {
      const judgeLang = ctx.lang as JudgeLang;
      if (["cpp", "java", "javascript", "python"].includes(judgeLang)) {
        try {
          const spec: ProblemSpec = {
            id: r.id,
            source: (r.source as any) || "leetcode",
            title: r.title,
            statement: [r.title],
            constraints: r.constraints ?? [],
            kind: r.kind,
            design: r.design as any,
            fn: r.fn as any,
            examples: (p.cases ?? [])
              .filter((c) => c.role === "example")
              .map((c) => ({ input: c.input, output: c.output, explanation: c.explanationMd ?? undefined })),
            hints: (p.hints ?? []).map((h) => h.bodyMd),
            tests: (p.cases ?? []).filter((c) => c.role === "test").map((c) => ({ input: c.input, output: c.output })),
            solution: { idea: [], complexity: r.complexity ?? "O(n)", cpp: "" },
          };
          const template = templateFor(spec, judgeLang);
          parts.push(`Judge Template (${judgeLang}):\n\`\`\`${judgeLang}\n${template}\n\`\`\``);
        } catch {
          // ignore template error if spec incomplete
        }
      }
    }

    // Other language implementations for add-language
    if (ctx.otherLanguages && Object.keys(ctx.otherLanguages).length > 0) {
      parts.push("Existing implementations in other languages:");
      for (const [lang, code] of Object.entries(ctx.otherLanguages)) {
        if (code) {
          parts.push(`\`\`\`${lang}\n${code}\n\`\`\``);
        }
      }
    }
  }

  if (ctx.lesson) {
    parts.push(`Lesson: ${ctx.lesson.title} (${ctx.lesson.id})`);
    if (ctx.lesson.template) parts.push(`Template: ${ctx.lesson.template}`);
    if (ctx.lesson.checklist && ctx.lesson.checklist.length > 0) {
      parts.push(`Checklist points:\n${ctx.lesson.checklist.map((p, i) => `${i + 1}. ${p}`).join("\n")}`);
    }
    if (ctx.pageMarkdown) {
      parts.push(`Lesson Page Markdown:\n${ctx.pageMarkdown}`);
    }
  }

  if (ctx.surroundingText) {
    parts.push(`Surrounding Context:\n${ctx.surroundingText}`);
  }

  return parts.join("\n\n");
}

/**
 * Formats "Current content".
 */
function buildCurrent(current?: unknown): string {
  if (isEmpty(current)) return "empty";
  if (typeof current === "string") return current;
  return JSON.stringify(current, null, 2);
}

/**
 * Formats "Rules" (house rules + slot-specific rules).
 */
function buildRules(target: AiTarget, slot?: SlotDef): string {
  const house = rulesForTarget(target);
  const slotRules = slot?.rules ?? [];

  const lines = [...house.map((r) => `- ${r}`)];
  if (slotRules.length > 0) {
    lines.push("\nSlot rules:");
    lines.push(...slotRules.map((r) => `- ${r}`));
  }
  return lines.join("\n");
}

/**
 * Formats "Answer format" (exact specification, example, and strict reply instruction).
 */
function buildAnswerFormat(target: AiTarget, ctx?: AdminPromptContext): string {
  const lang = ctx?.lang ?? "cpp";
  let formatDesc = "";
  let example = "";

  switch (target) {
    case "hints":
      formatDesc = "Numbered Markdown list of 3 or 4 progressive hints.";
      example = "1. Notice the relationship between the target sum and each element.\n2. Can you store elements seen so far for O(1) lookup?\n3. Use a hash map mapping value to index.";
      break;
    case "test-cases":
      formatDesc = 'JSON array of objects with `input` (array of arguments) and `output` matching the signature.';
      example = '[\n  { "input": [[2, 7, 11, 15], 9], "output": [0, 1] },\n  { "input": [[3, 2, 4], 6], "output": [1, 2] }\n]';
      break;
    case "code-block":
      formatDesc = `One fenced code block in ${lang} with the complete, compiling solution.`;
      example = `\`\`\`${lang}\nclass Solution {\n    // Implementation here\n};\n\`\`\``;
      break;
    case "diagram-block":
      formatDesc = "One fenced Mermaid block with valid Mermaid syntax.";
      example = "```mermaid\nflowchart TD\n    A[Client] --> B[Load Balancer]\n    B --> C[Server]\n```";
      break;
    case "text-block":
      formatDesc = "Markdown text without top-level `#` headings (start headings at `##` or `###`).";
      example = "Here is the explanation of the invariant and why it holds throughout the traversal.";
      break;
    case "problem-statement":
      formatDesc = "Markdown paragraphs describing the problem clearly.";
      example = "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.";
      break;
    case "problem-constraints":
      formatDesc = "One constraint per line.";
      example = "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nOnly one valid answer exists.";
      break;
    case "section":
    case "solution-page":
    case "lesson-page":
      formatDesc = "Page Markdown format for the slots involved.";
      example = "## Overview\n\nIntroductory explanation.\n\n## Deep dive\n\nDetailed breakdown.";
      break;
    case "course-summary":
      formatDesc = "Markdown summary of the course.";
      example = "Comprehensive roadmap covering fundamental data structures, algorithms, and system design.";
      break;
    case "doc":
    default:
      formatDesc = "Valid JSON matching the document shape.";
      example = '{\n  "title": "Example",\n  "content": "..."\n}';
      break;
  }

  return `${formatDesc}\n\nExample:\n${example}\n\nReply with only one fenced block in this format, nothing before or after it.`;
}

/**
 * Builds a complete admin AI prompt adhering to the 6-part structure, clipped under 24,000 characters.
 */
export function buildAdminPrompt(options: BuildAdminPromptOptions): string {
  const { target, mode, context, current } = options;
  const slot = options.slot ?? context?.slot;

  const task = buildTask(target, mode, context);
  const where = buildWhereThisGoes(target, context, slot);
  let ctxStr = buildContext(target, context);
  const currentStr = buildCurrent(current);
  const rulesStr = buildRules(target, slot);
  const formatStr = buildAnswerFormat(target, context);

  function assemble(cText: string): string {
    return [
      `## Task\n${task}`,
      `## Where this goes\n${where}`,
      `## Context\n${cText}`,
      `## Current content\n${currentStr}`,
      `## Rules\n${rulesStr}`,
      `## Answer format\n${formatStr}`,
    ].join("\n\n");
  }

  let prompt = assemble(ctxStr);

  if (prompt.length > MAX_PROMPT_CHARS) {
    // Need to clip context to ensure total prompt stays under MAX_PROMPT_CHARS
    const baseLengthWithoutContext = assemble("").length;
    const maxContextLength = Math.max(0, MAX_PROMPT_CHARS - baseLengthWithoutContext - 100);

    const cutNotice = "\n\n[...context cut for length under 24,000 characters]";
    ctxStr = ctxStr.slice(0, Math.max(0, maxContextLength - cutNotice.length)) + cutNotice;
    prompt = assemble(ctxStr);

    // If still oversized (e.g. current content itself is very large), clip prompt with warning
    if (prompt.length > MAX_PROMPT_CHARS) {
      prompt = prompt.slice(0, MAX_PROMPT_CHARS - 40) + "\n[...cut for length under 24,000 characters]";
    }
  }

  return prompt;
}

export type ParseAiAnswerResult<T = unknown> =
  | { ok: true; value: T; errors?: never }
  | { ok: false; errors: string[]; value?: never };

function hasInvalidJsonValues(v: unknown): boolean {
  if (v === undefined || typeof v === "function" || typeof v === "symbol") return true;
  if (typeof v === "number" && !Number.isFinite(v)) return true;
  if (Array.isArray(v)) return v.some(hasInvalidJsonValues);
  if (v && typeof v === "object") {
    return Object.values(v as Record<string, unknown>).some(hasInvalidJsonValues);
  }
  return false;
}

/**
 * Extracts content from the first fenced block in text if present, otherwise returns the whole text.
 */
function extractFencedOrAll(text: string): { content: string; lang?: string; isFenced: boolean } {
  const match = text.match(/```([a-zA-Z0-9_-]*)\s*\n([\s\S]*?)\n?```/);
  if (match) {
    return {
      lang: match[1].trim(),
      content: match[2].trim(),
      isFenced: true,
    };
  }
  return {
    content: text.trim(),
    isFenced: false,
  };
}

/**
 * Parses and validates an AI answer for an admin editing field (plan 0118 step 2).
 * Handles clean answers, answers with chatter around one fence, and Windows line endings.
 */
export function parseAiAnswer(
  target: AiTarget,
  mode: AiMode,
  text: string,
  context?: AdminPromptContext,
): ParseAiAnswerResult {
  const normalized = (text ?? "").replace(/\r\n/g, "\n");

  switch (target) {
    case "hints": {
      // Find outer fence if wrapped in chatter (using greedy match to capture full content inside outer fence)
      let hintText = normalized.trim();
      const outerFence = hintText.match(/^```(?:markdown|md|text)?\s*\n([\s\S]*)\n```$/i) ??
        hintText.match(/```(?:markdown|md|text)?\s*\n([\s\S]*)\n```/i);
      if (outerFence) {
        hintText = outerFence[1].trim();
      }

      // Check if there is a code block inside hints (house rules: never reveal code in hints)
      if (/```/.test(hintText)) {
        return { ok: false, errors: ["Hints must not contain code or fenced code blocks."] };
      }

      const rawLines = hintText.split("\n");
      const items: string[] = [];
      let currentItem = "";

      for (const line of rawLines) {
        const itemMatch = line.match(/^\s*(?:\d+[\.)]|\*|-)\s+(.*)$/);
        if (itemMatch) {
          if (currentItem.trim()) {
            items.push(currentItem.trim());
          }
          currentItem = itemMatch[1];
        } else if (currentItem) {
          if (line.trim()) {
            currentItem += " " + line.trim();
          }
        } else if (line.trim()) {
          currentItem = line.trim();
        }
      }
      if (currentItem.trim()) {
        items.push(currentItem.trim());
      }

      if (items.length === 0) {
        return { ok: false, errors: ["No hints found in the answer."] };
      }

      const errors: string[] = [];
      if (items.length > MAX_LIMITS.hints) {
        errors.push(`Hints: up to ${MAX_LIMITS.hints} hints allowed.`);
      }

      items.forEach((item, idx) => {
        if (item.length > MAX_LIMITS.hintLength) {
          errors.push(`Hint ${idx + 1} exceeds ${MAX_LIMITS.hintLength} characters.`);
        }
      });

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      return {
        ok: true,
        value: items.map((bodyMd, ord) => ({ ord, bodyMd })),
      };
    }

    case "diagram-block": {
      // Mermaid diagrams must be inside a ```mermaid fence
      const match = normalized.match(/```mermaid\s*\n([\s\S]*?)\n?```/i);
      if (!match) {
        return { ok: false, errors: ["Mermaid diagram must be inside a ```mermaid fence."] };
      }
      const content = match[1].trim();
      if (!content) {
        return { ok: false, errors: ["Diagram code cannot be empty."] };
      }
      return { ok: true, value: content };
    }

    case "test-cases": {
      const fenceMatch = normalized.match(/```(?:json)?\s*\n([\s\S]*?)\n?```/i);
      const jsonText = fenceMatch ? fenceMatch[1].trim() : normalized.trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch (err: any) {
        return { ok: false, errors: [`Invalid JSON: ${err.message}`] };
      }

      if (!Array.isArray(parsed)) {
        return { ok: false, errors: ["Test cases must be a JSON array."] };
      }

      if (parsed.length === 0) {
        return { ok: false, errors: ["At least one test case is required."] };
      }

      const fnParams = context?.problem?.row?.fn?.params;
      const expectedCount = Array.isArray(fnParams) ? fnParams.length : undefined;

      const errors: string[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const c = parsed[i];
        const caseNum = i + 1;
        if (!c || typeof c !== "object") {
          errors.push(`Case ${caseNum} must be an object with input and output.`);
          continue;
        }
        if (!Array.isArray(c.input)) {
          errors.push(`Case ${caseNum} input must be an array.`);
        } else if (expectedCount !== undefined && c.input.length !== expectedCount) {
          errors.push(
            `Case ${caseNum} has ${c.input.length} input${c.input.length === 1 ? "" : "s"} but the function takes ${expectedCount}`,
          );
        } else if (hasInvalidJsonValues(c.input)) {
          errors.push(`Case ${caseNum} input contains invalid JSON values (NaN, Infinity, or functions).`);
        }

        if (c.output === undefined || hasInvalidJsonValues(c.output)) {
          errors.push(`Case ${caseNum} output must be a valid JSON value.`);
        }
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      return {
        ok: true,
        value: parsed.map((c: any, idx: number) => ({
          ord: idx,
          role: c.role ?? "test",
          input: c.input,
          output: c.output,
          explanationMd: c.explanationMd ?? null,
        })),
      };
    }

    case "lesson-page":
    case "solution-page":
    case "section": {
      const fenceMatch = normalized.match(/```(?:markdown|md)?\s*\n([\s\S]*?)\n?```/i);
      let pageMd = fenceMatch ? fenceMatch[1].trim() : normalized.trim();

      const template =
        target === "solution-page"
          ? TEMPLATES.problem
          : context?.lesson?.template
            ? TEMPLATES[context.lesson.template]
            : TEMPLATES.concept;

      if (target === "section" && context?.slot && !pageMd.startsWith("## ")) {
        pageMd = `## ${context.slot.heading}\n\n${pageMd}`;
      }

      const res = markdownToPage(template, pageMd);
      if (res.errors && res.errors.length > 0) {
        return {
          ok: false,
          errors: res.errors.map((e) => `Line ${e.line}: ${e.message}`),
        };
      }

      if (!res.page) {
        return { ok: false, errors: ["Failed to parse page markdown."] };
      }

      if (target === "lesson-page") {
        const templateErrors = validatePageAgainstTemplate(template, res.page).filter(
          (err) => !err.includes("is missing"),
        );
        if (templateErrors.length > 0) {
          return { ok: false, errors: templateErrors };
        }
      }

      return {
        ok: true,
        value: target === "section" ? res.page.sections[0] ?? null : res.page,
      };
    }

    case "code-block": {
      const { content } = extractFencedOrAll(normalized);
      if (!content) {
        return { ok: false, errors: ["Code block cannot be empty."] };
      }
      return { ok: true, value: content };
    }

    case "text-block": {
      const { content } = extractFencedOrAll(normalized);
      if (!content) {
        return { ok: false, errors: ["Text block cannot be empty."] };
      }
      if (/^#\s+/m.test(content)) {
        return { ok: false, errors: ["Text block must not contain top-level '# ' headings; start at '##' or '###'."] };
      }
      return { ok: true, value: content };
    }

    case "problem-statement": {
      const { content } = extractFencedOrAll(normalized);
      if (!content) {
        return { ok: false, errors: ["Problem statement cannot be empty."] };
      }
      return { ok: true, value: content };
    }

    case "problem-constraints": {
      const { content } = extractFencedOrAll(normalized);
      const lines = content
        .split("\n")
        .map((l) => l.trim().replace(/^[-*]\s*/, ""))
        .filter(Boolean);

      if (lines.length === 0) {
        return { ok: false, errors: ["At least one constraint is required."] };
      }

      const totalLen = lines.join("\n").length;
      if (totalLen > MAX_LIMITS.constraints) {
        return { ok: false, errors: [`Constraints exceed maximum length of ${MAX_LIMITS.constraints} characters.`] };
      }

      return { ok: true, value: lines };
    }

    case "course-summary": {
      const { content } = extractFencedOrAll(normalized);
      if (!content) {
        return { ok: false, errors: ["Course summary cannot be empty."] };
      }
      return { ok: true, value: content };
    }

    case "doc":
    default: {
      const { content } = extractFencedOrAll(normalized);
      try {
        const parsed = JSON.parse(content);
        return { ok: true, value: parsed };
      } catch (err: any) {
        return { ok: false, errors: [`Invalid JSON: ${err.message}`] };
      }
    }
  }
}

