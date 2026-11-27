"use server";

// "Write with AI" server actions (plan 0118 steps 3 and 4). The prompt is built from the UNSAVED draft the editor
// sends, so edits that are not saved yet are included. Nothing here saves anything. Both actions are admin-only.

import {
  ALL_CONCEPTS,
  clip,
  pageTemplate,
  pageToMarkdown,
  slotKey,
  TEMPLATES,
  type AdminPromptContext,
  type AiMode,
  type AiTarget,
  type BlockRow,
  type CodeLang,
  type ContentLesson,
  type ContentPage,
  type ProblemDraft,
  type ProblemRow,
  type SlotDef,
  type TemplateDef,
  type TemplateId,
} from "@habit/shared";
// The barrel does not export the parser (content-model/index.ts is lead-owned). Same relative-path precedent as
// lib/content-repo/stress.ts.
import { buildAdminPrompt, parseAiAnswer } from "@habit/shared";
import { AdminDeniedError, requireAdminAction } from "@/lib/auth/admin";
import { getCourse } from "@/lib/content-repo/courses";

export type AiEntity = "problem" | "lesson" | "doc";

/**
 * What the editor sends. `draft` is the unsaved entity: a ProblemDraft, a ContentLesson, or the parsed doc body.
 * `field` addresses a part of it: problems use "statement", "solution", "constraints", "cases" or "hints"; lessons
 * use "page". A page field can be followed by "/section:<id>" or "/block:<id>".
 */
export interface AiRequest {
  target: AiTarget;
  mode: AiMode;
  entity: AiEntity;
  id: string;
  field?: string;
  /** Doc kind, for entity "doc". */
  kind?: string;
  /** Code language of the tab the admin is on. Defaults to the block's first language, then cpp. */
  lang?: string;
  draft: unknown;
}

export type AiPromptResult = { ok: true; prompt: string; chars: number } | { ok: false; errors: string[] };
export type AiCheckResult = { ok: true; value: unknown } | { ok: false; errors: string[] };

const DENIED = { ok: false as const, errors: ["Not allowed."] };

interface Resolved {
  target: AiTarget;
  mode: AiMode;
  /** Context for the prompt. */
  context: AdminPromptContext;
  /** Context for the parser (the parser reads the lesson template and the code language from it). */
  parseContext: AdminPromptContext;
  /** The current value as the prompt shows it. */
  current: unknown;
  slot?: SlotDef;
}

type Lookup = { ok: true; value: Resolved } | { ok: false; errors: string[] };

function splitField(field?: string): { base: string; part?: "section" | "block"; partId?: string } {
  const [base = "", sub] = (field ?? "").split("/");
  const m = sub?.match(/^(section|block):(.+)$/);
  if (!m) return { base };
  return { base, part: m[1] as "section" | "block", partId: m[2] };
}

function checklistFor(lessonId: string): string[] | undefined {
  const concept = ALL_CONCEPTS[lessonId];
  return concept ? [...concept.points] : undefined;
}

function blockTarget(block: BlockRow): AiTarget {
  if (block.type === "code") return "code-block";
  if (block.type === "diagram") return "diagram-block";
  return "text-block";
}

/** Resolves a field that points at a page, a section in it, or a block in it. */
function resolvePageField(
  req: AiRequest,
  page: ContentPage,
  template: TemplateDef,
  base: AdminPromptContext,
  parseBase: AdminPromptContext,
  part: ReturnType<typeof splitField>,
): Lookup {
  if (part.part === "section") {
    const sec = (page.sections ?? []).find((s) => s.id === part.partId);
    if (!sec) return { ok: false, errors: ["That section is no longer in the draft."] };
    return {
      ok: true,
      value: {
        target: "section",
        mode: req.mode,
        context: base,
        parseContext: parseBase,
        slot: template.slots.find((s) => s.key === slotKey(sec.slot)),
        current: pageToMarkdown(template, { template: template.id, sections: [sec] }),
      },
    };
  }
  if (part.part === "block") {
    const block = (page.sections ?? []).flatMap((s) => s.blocks).find((b) => b.id === part.partId);
    if (!block) return { ok: false, errors: ["That block is no longer in the draft."] };
    const target = blockTarget(block);
    if (target !== "code-block") {
      return {
        ok: true,
        value: { target, mode: req.mode, context: base, parseContext: parseBase, current: block.body || undefined },
      };
    }
    // Code blocks: the language is the one the admin is on, or the one the AI mode adds.
    const first = Object.keys(block.code ?? {})[0];
    const lang = (req.mode.startsWith("add-language:")
      ? req.mode.slice("add-language:".length)
      : req.lang || first || "cpp") as CodeLang;
    const others: Partial<Record<CodeLang, string>> = { ...block.code };
    delete others[lang];
    const ctx: AdminPromptContext = {
      ...base,
      lang,
      otherLanguages: req.mode.startsWith("add-language:") ? { ...block.code } : others,
    };
    return {
      ok: true,
      value: {
        target,
        mode: req.mode,
        context: ctx,
        parseContext: { ...parseBase, lang },
        current: block.code?.[lang] || undefined,
      },
    };
  }
  // The whole page.
  const target: AiTarget = req.target;
  return {
    ok: true,
    value: {
      target,
      mode: req.mode,
      context: base,
      parseContext: parseBase,
      current: pageToMarkdown(template, page),
    },
  };
}

function resolveProblem(req: AiRequest): Lookup {
  const draft = req.draft as ProblemDraft | undefined;
  if (!draft?.row) return { ok: false, errors: ["The draft is missing."] };
  const row: ProblemRow = draft.row;
  const problem = {
    row,
    cases: draft.cases ?? [],
    hints: draft.hints ?? [],
    statement: draft.statement,
    solution: draft.solution,
  };
  const base: AdminPromptContext = { problem };
  // The parser picks the template for section targets from the lesson context; problem sections use the problem template.
  const problemParse: AdminPromptContext = { ...base, lesson: { id: row.id, title: row.title, template: "problem" } };
  const part = splitField(req.field);

  switch (part.base) {
    case "constraints":
      return {
        ok: true,
        value: {
          target: "problem-constraints",
          mode: req.mode,
          context: base,
          parseContext: base,
          current: (row.constraints ?? []).join("\n") || undefined,
        },
      };
    case "cases":
      return {
        ok: true,
        value: {
          target: "test-cases",
          mode: req.mode,
          context: base,
          parseContext: base,
          current: problem.cases.length ? JSON.stringify(problem.cases, null, 2) : undefined,
        },
      };
    case "hints":
      return {
        ok: true,
        value: {
          target: "hints",
          mode: req.mode,
          context: base,
          parseContext: base,
          current: problem.hints.length ? problem.hints.map((h, i) => `${i + 1}. ${h.bodyMd}`).join("\n") : undefined,
        },
      };
    case "statement":
    case "solution": {
      const page = (part.base === "statement" ? draft.statement : draft.solution) ?? { template: "problem" as TemplateId, sections: [] };
      return resolvePageField(req, page, pageTemplate("problem"), base, problemParse, part);
    }
    default:
      return { ok: false, errors: ["Unknown field."] };
  }
}

async function resolveLesson(req: AiRequest): Promise<Lookup> {
  const draft = req.draft as ContentLesson | undefined;
  if (!draft?.row) return { ok: false, errors: ["The draft is missing."] };
  const template = TEMPLATES[draft.row.template] ?? pageTemplate("concept");
  const page: ContentPage = draft.page ?? { template: draft.row.template, sections: [] };
  const course = await getCourse(draft.row.courseId).catch(() => null);
  const lesson = {
    id: draft.row.id,
    title: draft.row.title,
    template: draft.row.template,
    checklist: checklistFor(draft.row.id),
  };
  const base: AdminPromptContext = {
    course: course ? { id: course.row.id, title: course.row.title, summaryMd: course.row.summaryMd } : undefined,
    lesson,
    pageMarkdown: clip(pageToMarkdown(template, page), 12000),
  };
  return resolvePageField(req, page, template, base, base, splitField(req.field));
}

function resolveDoc(req: AiRequest): Lookup {
  return {
    ok: true,
    value: {
      target: "doc",
      mode: req.mode,
      context: { doc: { id: req.id, kind: req.kind ?? "doc" } },
      parseContext: {},
      current: req.draft === undefined ? undefined : JSON.stringify(req.draft, null, 2),
    },
  };
}

async function resolve(req: AiRequest): Promise<Lookup> {
  if (req.entity === "problem") return resolveProblem(req);
  if (req.entity === "lesson") return resolveLesson(req);
  if (req.entity === "doc") return resolveDoc(req);
  return { ok: false, errors: ["Unknown entity."] };
}

/** Builds the copyable prompt for one field from the unsaved draft. Admin only. */
export async function buildAiPromptAction(input: AiRequest): Promise<AiPromptResult> {
  try {
    await requireAdminAction();
    const found = await resolve(input);
    if (!found.ok) return found;
    const r = found.value;
    const prompt = buildAdminPrompt({ target: r.target, mode: r.mode, context: r.context, current: r.current, slot: r.slot });
    return { ok: true, prompt, chars: prompt.length };
  } catch (e) {
    if (e instanceof AdminDeniedError) return DENIED;
    throw e;
  }
}

/**
 * Checks a pasted answer with the editor's parser. Returns the parsed value the editor applies, or readable errors.
 * Nothing is saved. Admin only.
 */
export async function checkAiAnswerAction(input: AiRequest & { answer: string }): Promise<AiCheckResult> {
  try {
    await requireAdminAction();
    const found = await resolve(input);
    if (!found.ok) return found;
    const r = found.value;
    const parsed = parseAiAnswer(r.target, r.mode, input.answer, r.parseContext);
    if (!parsed.ok) return { ok: false, errors: parsed.errors };
    return { ok: true, value: parsed.value };
  } catch (e) {
    if (e instanceof AdminDeniedError) return DENIED;
    throw e;
  }
}
