// Content model (plans 0112-0119, docs/architecture/content-in-db.md). Pure types shared by the content DB,
// the read path, offline sync, the admin editor and the AI prompt builders. No I/O here.
//
// THIS FILE IS THE CONTRACT between parallel implementers. Change it only through the lead (Claude Code); if a field is
// missing, write it down in your notes file instead of editing this file.

/** Bumped only when the shapes below change in a way old clients cannot read. */
export const CONTENT_SCHEMA_VERSION = 1;

/** Languages a code block can hold. The judge runs cpp, java, javascript, python; the rest are display only. */
export const CODE_LANGS = ["cpp", "java", "javascript", "python", "sql", "go", "text"] as const;
export type CodeLang = (typeof CODE_LANGS)[number];

export type EntityKind = "course" | "lesson" | "problem" | "doc";

/** Page layout kinds. Each has a template in templates.ts. */
export const TEMPLATE_IDS = ["concept", "design", "lld", "pattern", "article", "problem"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type BlockType = "markdown" | "code" | "diagram" | "image";
export type CodeVariant = "brute" | "semi" | "optimal" | "custom";

// ---- templates -------------------------------------------------------------------------------------------------

export interface SlotDef {
  /** Stable key stored in page_sections.slot. Repeated per-index slots use a prefix, e.g. "point" → "point:0". */
  key: string;
  /** Heading shown to readers and used as `## heading` in the page Markdown format. */
  heading: string;
  /** One line: what this part of the page is for (used in AI prompts and editor help). */
  purpose: string;
  required: boolean;
  /** "one": exactly one section, no title. "many": 0..n titled sections (### title). "indexed": one per index (point:N). */
  sections: "one" | "many" | "indexed";
  allowedBlocks: BlockType[];
  /** Writing rules for this slot, shown in AI prompts and as editor help. */
  rules: string[];
}

export interface TemplateDef {
  id: TemplateId;
  title: string;
  slots: SlotDef[];
}

// ---- rows (one per table row) ----------------------------------------------------------------------------------

export interface CourseRow {
  id: string;
  area: string;
  title: string;
  summaryMd: string;
  ord: number;
  /** Non-text fields kept as JSON (frameworks, exercises lists...). */
  data: Record<string, unknown>;
}

export interface LessonRow {
  id: string;
  courseId: string;
  ord: number;
  title: string;
  template: TemplateId;
  /** Non-text fields only (concept id, checklist point texts, difficulty, tags). */
  meta: Record<string, unknown>;
}

export interface ProblemRow {
  id: string;
  source: string;
  title: string;
  difficulty: "easy" | "medium" | "hard" | null;
  pattern: string | null;
  url: string | null;
  kind: "function" | "design";
  constraints: string[];
  inputFormatMd: string | null;
  outputFormatMd: string | null;
  /** ProblemSpec.fn as stored (name, params, returns). */
  fn: { name: string; params: { name: string; type: string }[]; returns: string };
  /** ProblemSpec.design when kind = "design". */
  design: unknown | null;
  unordered: boolean;
  complexity: string | null;
  /** Any other ProblemSpec fields that must round-trip (description, sampleCases...). */
  extra: Record<string, unknown>;
}

export interface TestCaseRow {
  ord: number;
  role: "example" | "test";
  input: unknown[];
  output: unknown;
  explanationMd: string | null;
}

export interface HintRow {
  ord: number;
  bodyMd: string;
}

export interface BlockRow {
  id: string;
  ord: number;
  type: BlockType;
  /** Markdown text, Mermaid source (diagram) or alt text (image). Empty for code. */
  body: string;
  caption: string | null;
  variant: CodeVariant | null;
  label: string | null;
  timeComplexity: string | null;
  spaceComplexity: string | null;
  assetId: string | null;
  /** Code per language, only for type "code". Key order = tab order. */
  code: Partial<Record<CodeLang, string>>;
}

export interface SectionRow {
  id: string;
  slot: string;
  ord: number;
  title: string | null;
  blocks: BlockRow[];
}

export interface AssetRow {
  id: string;
  mime: "image/png" | "image/jpeg" | "image/webp";
  /** Base64 when serialized (snapshots, API); bytes in the DB. */
  base64: string;
  width: number | null;
  height: number | null;
}

export interface DocRow {
  kind: string;
  id: string;
  body: unknown;
}

// ---- assembled entities ----------------------------------------------------------------------------------------

/** A page = ordered sections in template slots. */
export interface ContentPage {
  template: TemplateId;
  sections: SectionRow[];
}

export interface ContentProblem {
  row: ProblemRow;
  cases: TestCaseRow[];
  hints: HintRow[];
  /** Slot "statement" sections. */
  statement: ContentPage;
  /** Slot "solution" sections. */
  solution: ContentPage;
}

export interface ContentLesson {
  row: LessonRow;
  page: ContentPage;
}

export interface ContentCourse {
  row: CourseRow;
}

export interface ContentDoc {
  row: DocRow;
}

export type ContentEntity =
  | { kind: "problem"; value: ContentProblem }
  | { kind: "lesson"; value: ContentLesson }
  | { kind: "course"; value: ContentCourse }
  | { kind: "doc"; value: ContentDoc };

/** Stable id of an entity across tables: "problem:lc-1", "lesson:sd-caching", "doc:reading:x". */
export function entityKey(e: ContentEntity): string {
  switch (e.kind) {
    case "problem":
      return `problem:${e.value.row.id}`;
    case "lesson":
      return `lesson:${e.value.row.id}`;
    case "course":
      return `course:${e.value.row.id}`;
    case "doc":
      return `doc:${e.value.row.kind}:${e.value.row.id}`;
  }
}

// ---- changes, units, parts (plan 0115) ---------------------------------------------------------------------------

/** Download/follow unit: "course:<id>", "problems:<pattern id>", "problems:other", "docs". */
export type UnitId = string;

/** "meta" | "cases" | "hints" | "section:<id>" | "section-order:<slot>" | "asset:<id>" | "all" */
export type PartId = string;

export interface ChangeEntry {
  version: number;
  entity: EntityKind;
  id: string;
  op: "upsert" | "delete";
  /** The entity's rev after this change. */
  rev: string;
  parts: PartId[];
  units: UnitId[];
  note: string | null;
  notify: boolean;
  /** Epoch ms when the change was saved (changes.at). Optional for older callers. */
  at?: number;
  /** Only the listed parts (see plan 0115 step 3). Absent for deletes. */
  data?: Record<PartId, unknown>;
}

/** A full serialized copy (snapshots, fixtures, offline units). */
export interface ContentSnapshot {
  schema: number;
  version: number;
  entities: ContentEntity[];
  assets: AssetRow[];
}

// ---- notices (plan 0119) -----------------------------------------------------------------------------------------

export interface Notice {
  /** The change version. */
  id: number;
  unit: UnitId;
  unitTitle: string;
  entity: EntityKind;
  entityId: string;
  title: string;
  sectionId: string | null;
  note: string;
  at: number;
}
