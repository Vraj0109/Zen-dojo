import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Day the task belongs to; for weekly tasks, the Monday of that week. */
    date: text("date").notNull(),
    scope: text("scope", { enum: ["day", "week"] }).notNull(),
    /** Template key for generated tasks; null for custom tasks. */
    templateKey: text("template_key"),
    title: text("title").notNull(),
    category: text("category").notNull(),
    xp: integer("xp").notNull(),
    minutes: integer("minutes"),
    status: text("status", { enum: ["todo", "done"] }).notNull().default("todo"),
    /** Local date (YYYY-MM-DD) the task was completed; drives the streak. */
    doneOn: text("done_on"),
  },
  (t) => [uniqueIndex("tasks_generated_unique").on(t.date, t.scope, t.templateKey)],
);

/** One row per solve or re-solve of a DSA problem. */
export const problemSolves = sqliteTable("problem_solves", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  problemId: text("problem_id").notNull(),
  kind: text("kind", { enum: ["solve", "resolve"] }).notNull(),
  /** Local date (YYYY-MM-DD); drives the streak and re-solve schedule. */
  solvedOn: text("solved_on").notNull(),
  xp: integer("xp").notNull(),
  source: text("source", { enum: ["manual", "leetcode"] }).notNull().default("manual"),
});

/** LeetCode accepted submissions already processed, so each is imported once (and undo sticks). */
export const leetcodeSubmissions = sqliteTable("leetcode_submissions", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  solvedOn: text("solved_on").notNull(),
  syncedAt: text("synced_at").notNull(),
});

/** Your notes and saved solution for a problem (roadmap "lc-…"/"c-…" or other LeetCode "lcx-…"). */
export const problemNotes = sqliteTable("problem_notes", {
  problemId: text("problem_id").primaryKey(),
  notes: text("notes").notNull().default(""),
  code: text("code").notNull().default(""),
  language: text("language").notNull().default(""),
  /** ISO timestamp */
  updatedAt: text("updated_at").notNull(),
});

/** Details of LeetCode problems solved outside the roadmap list. */
export const leetcodeProblems = sqliteTable("leetcode_problems", {
  slug: text("slug").primaryKey(),
  number: integer("number"),
  title: text("title").notNull(),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).notNull(),
});

/** Your own accepted LeetCode submissions with code, captured by the browser extension. */
export const leetcodeUserSubmissions = sqliteTable("leetcode_user_submissions", {
  /** LeetCode submission id */
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  /** Display name, e.g. "Java", "Python3" */
  lang: text("lang").notNull(),
  runtime: text("runtime"),
  runtimePct: real("runtime_pct"),
  memory: text("memory"),
  memoryPct: real("memory_pct"),
  code: text("code").notNull(),
  /** Notes you wrote on the submission in LeetCode */
  notes: text("notes").notNull().default(""),
  /** Unix seconds */
  submittedAt: integer("submitted_at").notNull(),
  /** ISO timestamp */
  importedAt: text("imported_at").notNull(),
});

/** LeetCode topic tags of a problem, e.g. ["Array", "Hash Table"]. */
export const leetcodeTopics = sqliteTable("leetcode_topics", {
  slug: text("slug").primaryKey(),
  /** JSON array of tag names */
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Task = typeof tasks.$inferSelect;
