// Problem draft model, validation, and block/section operations (plan 0116 step 1).
// Pure logic for the admin content editor. No I/O here.

import type {
  BlockRow,
  BlockType,
  CodeLang,
  CodeVariant,
  ContentPage,
  ContentProblem,
  SectionRow,
  TemplateDef,
} from "./types";
import { canonicalJson } from "./rev";

/**
 * A problem draft in the editor: identical to ContentProblem except it may contain
 * newly created blocks with temporary ids ("new-<n>") before they are persisted.
 */
export type ProblemDraft = ContentProblem;

export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const IDENT_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const SIGNATURE_TYPES = [
  "list",
  "tree",
  "int",
  "long",
  "double",
  "bool",
  "string",
  "int[]",
  "long[]",
  "bool[]",
  "string[]",
  "int[][]",
  "string[][]",
] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const MAX_LIMITS = {
  title: 120,
  source: 80,
  pattern: 60,
  constraints: 4000,
  fnName: 60,
  paramName: 60,
  hints: 20,
  hintLength: 1000,
  blockLabel: 60,
  totalBytes: 2 * 1024 * 1024, // 2 MB
} as const;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function hasInvalidJsonValues(v: unknown): boolean {
  if (v === undefined || typeof v === "function" || typeof v === "symbol") return true;
  if (typeof v === "number" && !Number.isFinite(v)) return true;
  if (Array.isArray(v)) return v.some(hasInvalidJsonValues);
  if (v && typeof v === "object") {
    return Object.values(v).some(hasInvalidJsonValues);
  }
  return false;
}

function getAllPageBlocks(page: ContentPage | undefined): BlockRow[] {
  if (!page || !Array.isArray(page.sections)) return [];
  const blocks: BlockRow[] = [];
  for (const s of page.sections) {
    if (Array.isArray(s.blocks)) {
      blocks.push(...s.blocks);
    }
  }
  return blocks;
}

/**
 * Validates a problem draft against all editor constraints.
 * Returns { ok: true, errors: [] } or { ok: false, errors: string[] }.
 */
export function validateProblemDraft(draft: ProblemDraft): ValidationResult {
  const errors: string[] = [];

  // 1. Slug (id)
  if (!draft.row?.id || !SLUG_REGEX.test(draft.row.id)) {
    errors.push("Id slug must be lowercase letters, digits and hyphens, starting with a letter or digit (up to 40 characters).");
  }

  // 2. Title
  const title = draft.row?.title?.trim() ?? "";
  if (!title || draft.row.title.length > MAX_LIMITS.title) {
    errors.push(`Title is required (up to ${MAX_LIMITS.title} characters).`);
  }

  // 3. Difficulty
  const difficulty = draft.row?.difficulty;
  if (!difficulty || !DIFFICULTIES.includes(difficulty as (typeof DIFFICULTIES)[number])) {
    errors.push("Difficulty must be easy, medium or hard.");
  }

  // 4. Source & Pattern
  if (draft.row?.source && draft.row.source.length > MAX_LIMITS.source) {
    errors.push(`Source is up to ${MAX_LIMITS.source} characters.`);
  }
  if (draft.row?.pattern && draft.row.pattern.length > MAX_LIMITS.pattern) {
    errors.push(`Pattern is up to ${MAX_LIMITS.pattern} characters.`);
  }

  // 5. Constraints
  if (Array.isArray(draft.row?.constraints)) {
    const totalConstraints = draft.row.constraints.join("\n");
    if (totalConstraints.length > MAX_LIMITS.constraints) {
      errors.push(`Constraints are up to ${MAX_LIMITS.constraints} characters.`);
    }
  }

  // 6. Function signature & parameters
  const kind = draft.row?.kind ?? "function";
  let paramCount = 0;

  if (kind !== "design") {
    const fn = draft.row?.fn;
    if (!fn || !IDENT_REGEX.test(fn.name) || fn.name.length > MAX_LIMITS.fnName) {
      errors.push(`Function name must be an identifier such as twoSum (up to ${MAX_LIMITS.fnName} characters).`);
    }

    if (!fn || !SIGNATURE_TYPES.includes(fn.returns as (typeof SIGNATURE_TYPES)[number])) {
      errors.push(`Return type must be one of: ${SIGNATURE_TYPES.join(", ")}.`);
    }

    if (!fn || !Array.isArray(fn.params)) {
      errors.push("Function parameters must be an array.");
    } else {
      paramCount = fn.params.length;
      for (const p of fn.params) {
        if (!p.name || !IDENT_REGEX.test(p.name) || p.name.length > MAX_LIMITS.paramName) {
          errors.push(`Parameter name "${p.name || ""}" must be an identifier (up to ${MAX_LIMITS.paramName} characters).`);
        }
        if (!p.type || !SIGNATURE_TYPES.includes(p.type as (typeof SIGNATURE_TYPES)[number])) {
          errors.push(`Parameter "${p.name}" type must be one of: ${SIGNATURE_TYPES.join(", ")}.`);
        }
      }
    }
  } else {
    // For design problems, parameters default to fn.params.length if given, or 2 (ops, args)
    paramCount = draft.row?.fn?.params?.length ?? 2;
  }

  // 7. Test cases
  if (!Array.isArray(draft.cases) || draft.cases.length === 0) {
    errors.push("At least one test case is required.");
  } else {
    const exampleCount = draft.cases.filter((c) => c.role === "example").length;
    if (exampleCount === 0) {
      errors.push("At least one example test case is required.");
    }

    draft.cases.forEach((c, idx) => {
      const caseNum = idx + 1;
      if (!Array.isArray(c.input)) {
        errors.push(`Test case ${caseNum} input must be an array.`);
      } else if (c.input.length !== paramCount) {
        errors.push(`Test case ${caseNum} input length (${c.input.length}) must match parameter count (${paramCount}).`);
      } else if (hasInvalidJsonValues(c.input)) {
        errors.push(`Test case ${caseNum} input contains invalid JSON values (NaN, Infinity, or functions).`);
      }

      if (c.output === undefined || hasInvalidJsonValues(c.output)) {
        errors.push(`Test case ${caseNum} output must be a valid JSON value.`);
      }
    });
  }

  // 8. Hints
  if (!Array.isArray(draft.hints)) {
    errors.push("Hints must be an array.");
  } else {
    if (draft.hints.length > MAX_LIMITS.hints) {
      errors.push(`Hints: up to ${MAX_LIMITS.hints} hints allowed.`);
    }
    draft.hints.forEach((h, idx) => {
      if (typeof h.bodyMd !== "string" || h.bodyMd.length > MAX_LIMITS.hintLength) {
        errors.push(`Hint ${idx + 1} exceeds ${MAX_LIMITS.hintLength} characters.`);
      }
    });
  }

  // 9. Blocks
  const solutionBlocks = getAllPageBlocks(draft.solution);
  const allBlocks = [...getAllPageBlocks(draft.statement), ...solutionBlocks];

  // At least one code block with variant "optimal" and C++ code
  const hasOptimalCpp = solutionBlocks.some(
    (b) => b.type === "code" && b.variant === "optimal" && typeof b.code?.cpp === "string" && b.code.cpp.trim().length > 0
  );
  if (!hasOptimalCpp) {
    errors.push('At least one code block with variant "optimal" and C++ code is required in the solution.');
  }

  for (const b of allBlocks) {
    if (b.type === "code") {
      const langs = Object.keys(b.code ?? {}).filter((k) => {
        const val = b.code?.[k as CodeLang];
        return typeof val === "string" && val.length > 0;
      });

      if (langs.length === 0) {
        errors.push(`Code block "${b.id || "unnamed"}" must have at least one language.`);
      }

      if (b.variant === "custom" && (!b.label || !b.label.trim())) {
        errors.push(`Code block "${b.id || "unnamed"}" with variant "custom" requires a label.`);
      }
    }

    if (b.label && b.label.length > MAX_LIMITS.blockLabel) {
      errors.push(`Block label "${b.label}" must be up to ${MAX_LIMITS.blockLabel} characters.`);
    }
  }

  // 10. Total size under 2 MB
  try {
    const jsonStr = canonicalJson(draft);
    const sizeBytes = new TextEncoder().encode(jsonStr).length;
    if (sizeBytes > MAX_LIMITS.totalBytes) {
      errors.push("Total problem draft size must be under 2 MB.");
    }
  } catch {
    errors.push("Problem draft could not be serialized to JSON.");
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validates any ContentPage against its TemplateDef.
 * Checks required slots, allowed block types, and section title requirements.
 */
export function validatePageAgainstTemplate(template: TemplateDef, page: ContentPage): ValidationResult {
  const errors: string[] = [];

  for (const slotDef of template.slots) {
    const matchingSections = (page.sections ?? []).filter((s) =>
      slotDef.sections === "indexed" ? s.slot === slotDef.key || s.slot.startsWith(slotDef.key + ":") : s.slot === slotDef.key
    );

    if (slotDef.required && matchingSections.length === 0) {
      errors.push(`Required slot "${slotDef.heading}" (${slotDef.key}) is missing.`);
    }

    if (slotDef.sections === "one" && matchingSections.length > 1) {
      errors.push(`Slot "${slotDef.heading}" allows only one section, but found ${matchingSections.length}.`);
    }

    if (slotDef.sections === "many") {
      for (const s of matchingSections) {
        if (!s.title || !s.title.trim()) {
          errors.push(`Section in repeating slot "${slotDef.heading}" requires a title.`);
        }
      }
    }

    for (const s of matchingSections) {
      for (const b of s.blocks ?? []) {
        if (!slotDef.allowedBlocks.includes(b.type)) {
          errors.push(
            `Block type "${b.type}" is not allowed in slot "${slotDef.heading}". Allowed types: ${slotDef.allowedBlocks.join(", ")}.`
          );
        }
      }
    }
  }

  for (const s of page.sections ?? []) {
    const recognized = template.slots.some((slotDef) =>
      slotDef.sections === "indexed" ? s.slot === slotDef.key || s.slot.startsWith(slotDef.key + ":") : s.slot === slotDef.key
    );
    if (!recognized) {
      errors.push(`Unknown slot "${s.slot}" for template "${template.id}".`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function generateNewBlockId(sections: SectionRow[]): string {
  let maxNum = 0;
  for (const s of sections) {
    for (const b of s.blocks ?? []) {
      const match = /^new-(\d+)$/.exec(b.id);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
  }
  return `new-${maxNum + 1}`;
}

function clonePage(page: ContentPage): ContentPage {
  return {
    ...page,
    sections: (page.sections ?? []).map((s) => ({
      ...s,
      blocks: (s.blocks ?? []).map((b) => ({
        ...b,
        code: { ...(b.code ?? {}) },
      })),
    })),
  };
}

/**
 * Adds a new block to a section at atIndex (or appends if omitted).
 */
export function addBlock(page: ContentPage, sectionId: string, type: BlockType, atIndex?: number): ContentPage {
  const cloned = clonePage(page);
  const sec = cloned.sections.find((s) => s.id === sectionId);
  if (!sec) return cloned;

  const newBlock: BlockRow = {
    id: generateNewBlockId(cloned.sections),
    ord: 0,
    type,
    body: type === "diagram" ? "flowchart LR\n  A --> B" : "",
    caption: null,
    variant: type === "code" ? "optimal" : null,
    label: null,
    timeComplexity: null,
    spaceComplexity: null,
    assetId: null,
    code: type === "code" ? { cpp: "" } : {},
  };

  if (atIndex === undefined || atIndex >= sec.blocks.length) {
    sec.blocks.push(newBlock);
  } else if (atIndex <= 0) {
    sec.blocks.unshift(newBlock);
  } else {
    sec.blocks.splice(atIndex, 0, newBlock);
  }

  sec.blocks.forEach((b, idx) => {
    b.ord = idx;
  });
  return cloned;
}

/**
 * Removes a block by id from whatever section contains it.
 */
export function removeBlock(page: ContentPage, blockId: string): ContentPage {
  const cloned = clonePage(page);
  for (const s of cloned.sections) {
    const idx = s.blocks.findIndex((b) => b.id === blockId);
    if (idx !== -1) {
      s.blocks.splice(idx, 1);
      s.blocks.forEach((b, i) => {
        b.ord = i;
      });
      break;
    }
  }
  return cloned;
}

/**
 * Moves a block by delta within its slot. Moves across section boundaries inside the slot if necessary.
 */
export function moveBlock(page: ContentPage, blockId: string, delta: number): ContentPage {
  if (delta === 0) return clonePage(page);

  const cloned = clonePage(page);
  let targetSecIdx = -1;
  let targetBlockIdx = -1;

  for (let i = 0; i < cloned.sections.length; i++) {
    const bIdx = cloned.sections[i].blocks.findIndex((b) => b.id === blockId);
    if (bIdx !== -1) {
      targetSecIdx = i;
      targetBlockIdx = bIdx;
      break;
    }
  }

  if (targetSecIdx === -1) return cloned;

  let currentSec = cloned.sections[targetSecIdx];
  const targetSlot = currentSec.slot;

  // Sections that belong to the same slot
  const slotSecIndices: number[] = [];
  for (let i = 0; i < cloned.sections.length; i++) {
    if (cloned.sections[i].slot === targetSlot) {
      slotSecIndices.push(i);
    }
  }

  let posInSlotSecs = slotSecIndices.indexOf(targetSecIdx);

  if (delta < 0) {
    const steps = Math.abs(delta);
    for (let step = 0; step < steps; step++) {
      if (targetBlockIdx > 0) {
        // Swap with previous block in the same section
        const temp = currentSec.blocks[targetBlockIdx];
        currentSec.blocks[targetBlockIdx] = currentSec.blocks[targetBlockIdx - 1];
        currentSec.blocks[targetBlockIdx - 1] = temp;
        targetBlockIdx--;
      } else {
        // At the start of the section; move to previous section in the slot if possible
        if (posInSlotSecs > 0) {
          const prevSecIdx = slotSecIndices[posInSlotSecs - 1];
          const prevSec = cloned.sections[prevSecIdx];
          const [moved] = currentSec.blocks.splice(targetBlockIdx, 1);
          prevSec.blocks.push(moved);
          currentSec = prevSec;
          posInSlotSecs--;
          targetBlockIdx = prevSec.blocks.length - 1;
        } else {
          // Already at the top of the first section in this slot
          break;
        }
      }
    }
  } else {
    for (let step = 0; step < delta; step++) {
      if (targetBlockIdx < currentSec.blocks.length - 1) {
        // Swap with next block in the same section
        const temp = currentSec.blocks[targetBlockIdx];
        currentSec.blocks[targetBlockIdx] = currentSec.blocks[targetBlockIdx + 1];
        currentSec.blocks[targetBlockIdx + 1] = temp;
        targetBlockIdx++;
      } else {
        // At the end of the section; move to next section in the slot if possible
        if (posInSlotSecs < slotSecIndices.length - 1) {
          const nextSecIdx = slotSecIndices[posInSlotSecs + 1];
          const nextSec = cloned.sections[nextSecIdx];
          const [moved] = currentSec.blocks.splice(targetBlockIdx, 1);
          nextSec.blocks.unshift(moved);
          currentSec = nextSec;
          posInSlotSecs++;
          targetBlockIdx = 0;
        } else {
          // Already at the bottom of the last section in this slot
          break;
        }
      }
    }
  }

  for (const s of cloned.sections) {
    s.blocks.forEach((b, idx) => {
      b.ord = idx;
    });
  }

  return cloned;
}

/**
 * Duplicates a block right after the original, assigning a new id ("new-<n>").
 */
export function duplicateBlock(page: ContentPage, blockId: string): ContentPage {
  const cloned = clonePage(page);
  for (const s of cloned.sections) {
    const idx = s.blocks.findIndex((b) => b.id === blockId);
    if (idx !== -1) {
      const orig = s.blocks[idx];
      const newBlock: BlockRow = {
        ...orig,
        id: generateNewBlockId(cloned.sections),
        ord: idx + 1,
        code: { ...(orig.code ?? {}) },
      };
      s.blocks.splice(idx + 1, 0, newBlock);
      s.blocks.forEach((b, i) => {
        b.ord = i;
      });
      break;
    }
  }
  return cloned;
}

/**
 * Adds a new section to a slot.
 */
export function addSection(page: ContentPage, slot: string, atIndex?: number, title?: string | null): ContentPage {
  const cloned = clonePage(page);
  const secNum = cloned.sections.length + 1;
  const newSection: SectionRow = {
    id: `sec-${slot}-${secNum}`,
    slot,
    ord: 0,
    title: title ?? null,
    blocks: [],
  };

  if (atIndex !== undefined && atIndex >= 0 && atIndex <= cloned.sections.length) {
    cloned.sections.splice(atIndex, 0, newSection);
  } else {
    // Append after the last section of the same slot, or at the end
    let lastSlotIdx = -1;
    for (let i = cloned.sections.length - 1; i >= 0; i--) {
      if (cloned.sections[i].slot === slot) {
        lastSlotIdx = i;
        break;
      }
    }
    if (lastSlotIdx !== -1) {
      cloned.sections.splice(lastSlotIdx + 1, 0, newSection);
    } else {
      cloned.sections.push(newSection);
    }
  }

  cloned.sections.forEach((s, idx) => {
    s.ord = idx;
  });
  return cloned;
}

/**
 * Removes a section by id.
 */
export function removeSection(page: ContentPage, sectionId: string): ContentPage {
  const cloned = clonePage(page);
  cloned.sections = cloned.sections.filter((s) => s.id !== sectionId);
  cloned.sections.forEach((s, idx) => {
    s.ord = idx;
  });
  return cloned;
}

/**
 * Moves a section by delta within its slot.
 */
export function moveSection(page: ContentPage, sectionId: string, delta: number): ContentPage {
  if (delta === 0) return clonePage(page);

  const cloned = clonePage(page);
  const targetIdx = cloned.sections.findIndex((s) => s.id === sectionId);
  if (targetIdx === -1) return cloned;

  const sec = cloned.sections[targetIdx];
  const slotIndices: number[] = [];
  for (let i = 0; i < cloned.sections.length; i++) {
    if (cloned.sections[i].slot === sec.slot) {
      slotIndices.push(i);
    }
  }

  const posInSlot = slotIndices.indexOf(targetIdx);
  let newPosInSlot = posInSlot + delta;
  if (newPosInSlot < 0) newPosInSlot = 0;
  if (newPosInSlot >= slotIndices.length) newPosInSlot = slotIndices.length - 1;
  if (newPosInSlot === posInSlot) return cloned;

  const targetSlotGlobalIdx = slotIndices[newPosInSlot];
  const [removed] = cloned.sections.splice(targetIdx, 1);
  cloned.sections.splice(targetSlotGlobalIdx, 0, removed);

  cloned.sections.forEach((s, idx) => {
    s.ord = idx;
  });
  return cloned;
}

/**
 * Adds or updates a language in a code block.
 */
export function addLanguage(block: BlockRow, lang: CodeLang, code: string = ""): BlockRow {
  if (block.type !== "code") return { ...block };
  return {
    ...block,
    code: {
      ...(block.code ?? {}),
      [lang]: code,
    },
  };
}

/**
 * Removes a language from a code block.
 */
export function removeLanguage(block: BlockRow, lang: CodeLang): BlockRow {
  if (block.type !== "code") return { ...block };
  const nextCode = { ...(block.code ?? {}) };
  delete nextCode[lang];
  return {
    ...block,
    code: nextCode,
  };
}
