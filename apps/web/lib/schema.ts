import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

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
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Task = typeof tasks.$inferSelect;
