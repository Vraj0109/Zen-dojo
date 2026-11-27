// Drizzle definitions for the content database. Must match migrations.ts (the SQL there is what runs).
import { sqliteTable, text, integer, blob, primaryKey, index } from "drizzle-orm/sqlite-core";

export const contentMeta = sqliteTable("content_meta", {
  k: text("k").primaryKey(),
  v: text("v").notNull(),
});

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  area: text("area").notNull(),
  title: text("title").notNull(),
  summaryMd: text("summary_md").notNull().default(""),
  ord: integer("ord").notNull().default(0),
  dataJson: text("data_json").notNull().default("{}"),
  rev: text("rev").notNull(),
  updatedAt: integer("updated_at").notNull(),
  deleted: integer("deleted").notNull().default(0),
});

export const lessons = sqliteTable(
  "lessons",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull(),
    ord: integer("ord").notNull().default(0),
    title: text("title").notNull(),
    template: text("template").notNull(),
    metaJson: text("meta_json").notNull().default("{}"),
    rev: text("rev").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deleted: integer("deleted").notNull().default(0),
  },
  (t) => [index("lessons_course").on(t.courseId, t.ord)],
);

export const pageSections = sqliteTable(
  "page_sections",
  {
    id: text("id").primaryKey(),
    ownerKind: text("owner_kind").notNull(),
    ownerId: text("owner_id").notNull(),
    slot: text("slot").notNull(),
    ord: integer("ord").notNull(),
    title: text("title"),
  },
  (t) => [index("page_sections_owner").on(t.ownerKind, t.ownerId, t.slot, t.ord)],
);

export const blocks = sqliteTable(
  "blocks",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id").notNull(),
    ord: integer("ord").notNull(),
    type: text("type").notNull(),
    body: text("body").notNull().default(""),
    caption: text("caption"),
    variant: text("variant"),
    label: text("label"),
    timeComplexity: text("time_complexity"),
    spaceComplexity: text("space_complexity"),
    assetId: text("asset_id"),
  },
  (t) => [index("blocks_section").on(t.sectionId, t.ord)],
);

/** One row per language of a code block. `ord` keeps the tab order. */
export const blockCode = sqliteTable(
  "block_code",
  {
    blockId: text("block_id").notNull(),
    lang: text("lang").notNull(),
    ord: integer("ord").notNull().default(0),
    code: text("code").notNull(),
  },
  (t) => [primaryKey({ columns: [t.blockId, t.lang] })],
);

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  mime: text("mime").notNull(),
  bytes: blob("bytes", { mode: "buffer" }).notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: integer("created_at").notNull(),
  createdBy: text("created_by").notNull(),
});

export const problems = sqliteTable(
  "problems",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    title: text("title").notNull(),
    difficulty: text("difficulty"),
    pattern: text("pattern"),
    url: text("url"),
    kind: text("kind").notNull(),
    constraintsJson: text("constraints_json").notNull().default("[]"),
    inputFormatMd: text("input_format_md"),
    outputFormatMd: text("output_format_md"),
    fnJson: text("fn_json").notNull(),
    designJson: text("design_json"),
    unordered: integer("unordered").notNull().default(0),
    complexity: text("complexity"),
    extraJson: text("extra_json").notNull().default("{}"),
    rev: text("rev").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deleted: integer("deleted").notNull().default(0),
  },
  (t) => [index("problems_pattern").on(t.pattern)],
);

export const testCases = sqliteTable(
  "test_cases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    problemId: text("problem_id").notNull(),
    ord: integer("ord").notNull(),
    role: text("role").notNull(),
    inputJson: text("input_json").notNull(),
    outputJson: text("output_json").notNull(),
    explanationMd: text("explanation_md"),
  },
  (t) => [index("test_cases_problem").on(t.problemId, t.ord)],
);

export const hints = sqliteTable(
  "hints",
  {
    problemId: text("problem_id").notNull(),
    ord: integer("ord").notNull(),
    bodyMd: text("body_md").notNull(),
  },
  (t) => [primaryKey({ columns: [t.problemId, t.ord] })],
);

export const docs = sqliteTable(
  "docs",
  {
    kind: text("kind").notNull(),
    id: text("id").notNull(),
    bodyJson: text("body_json").notNull(),
    rev: text("rev").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deleted: integer("deleted").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.kind, t.id] })],
);

export const changes = sqliteTable(
  "changes",
  {
    version: integer("version").primaryKey({ autoIncrement: true }),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    op: text("op").notNull(),
    at: integer("at").notNull(),
    actor: text("actor").notNull(),
    partsJson: text("parts_json").notNull().default('["all"]'),
    unitsJson: text("units_json").notNull().default("[]"),
    rev: text("rev"),
    note: text("note"),
    notify: integer("notify").notNull().default(0),
  },
  (t) => [index("changes_entity").on(t.entity, t.entityId)],
);

export const adminAudit = sqliteTable(
  "admin_audit",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    at: integer("at").notNull(),
    actorId: text("actor_id").notNull(),
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    requestId: text("request_id"),
  },
  (t) => [index("admin_audit_entity").on(t.entity, t.entityId, t.at)],
);
