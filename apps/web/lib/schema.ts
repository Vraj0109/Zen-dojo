import { sqliteTable, text, integer, real, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";

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

/** Your confidence (0-5), ticked points and notes for a study concept (system design, LLD, core CS). */
export const conceptProgress = sqliteTable("concept_progress", {
  conceptId: text("concept_id").primaryKey(),
  confidence: integer("confidence").notNull().default(0),
  /** Indexes of the concept's points you've ticked */
  checked: text("checked", { mode: "json" }).$type<number[]>().notNull().default([]),
  notes: text("notes").notNull().default(""),
  /** Local date confidence first reached COVERED_CONFIDENCE (earns CONCEPT_XP once) */
  coveredOn: text("covered_on"),
  xp: integer("xp").notNull().default(0),
  /** Local date of the last change; drives review reminders */
  updatedOn: text("updated_on").notNull(),
});

/** One practice of a design or LLD problem, self-scored per framework step (1-5). */
export const practiceSessions = sqliteTable("practice_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: text("item_id").notNull(),
  /** Local date (YYYY-MM-DD); drives the streak and re-practice schedule */
  practicedOn: text("practiced_on").notNull(),
  minutes: integer("minutes"),
  scores: text("scores", { mode: "json" }).$type<Record<string, number>>().notNull().default({}),
  /** Average of the step scores */
  score: real("score").notNull(),
  notes: text("notes").notNull().default(""),
  /** Diagram or recording link */
  link: text("link"),
  xp: integer("xp").notNull(),
});

/** Minutes spent with the focus timer on a problem, concept, design or boss fight. */
export const focusSessions = sqliteTable("focus_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: text("item_id").notNull(),
  focusedOn: text("focused_on").notNull(),
  minutes: integer("minutes").notNull(),
});

/** A problem you needed a hint for, couldn't solve, or solved too slowly. Open until cleared by a cold solve. */
export const problemStruggles = sqliteTable("problem_struggles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  problemId: text("problem_id").notNull(),
  /** "hint" | "failed" | "slow" */
  kind: text("kind").notNull(),
  reason: text("reason").notNull().default(""),
  loggedOn: text("logged_on").notNull(),
  clearedOn: text("cleared_on"),
});

/** A timed 2-problem session. results: [{ problemId, result: "solved" | "hint" | "failed" }] */
export const bossFights = sqliteTable("boss_fights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  foughtOn: text("fought_on").notNull(),
  results: text("results", { mode: "json" }).$type<{ problemId: string; result: string }[]>().notNull(),
  minutes: integer("minutes"),
  notes: text("notes").notNull().default(""),
});

/** Read state for built-in reading-list entries (by id) and custom ones ("custom-<id>"). */
export const readingProgress = sqliteTable("reading_progress", {
  readingId: text("reading_id").primaryKey(),
  doneOn: text("done_on"),
  notes: text("notes").notNull().default(""),
});

/** Your own reading links attached to a concept or design. */
export const readingCustom = sqliteTable("reading_custom", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: text("item_id").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  addedOn: text("added_on").notNull(),
});

/** A diagram for a design or LLD problem: a link (Excalidraw, draw.io…) and/or an uploaded image (base64). */
export const diagrams = sqliteTable("diagrams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: text("item_id").notNull(),
  title: text("title").notNull().default(""),
  url: text("url"),
  mime: text("mime"),
  /** Base64 image bytes */
  image: text("image"),
  createdOn: text("created_on").notNull(),
});

/** Your cheat sheet for a DSA pattern: template code and how you recognize it. */
export const patternNotes = sqliteTable("pattern_notes", {
  patternId: text("pattern_id").primaryKey(),
  template: text("template").notNull().default(""),
  language: text("language").notNull().default(""),
  recognize: text("recognize").notNull().default(""),
  updatedOn: text("updated_on").notNull(),
});

/** A missed day covered by a streak freeze (local date). Counts for the streak, gives no XP. */
export const streakFreezes = sqliteTable("streak_freezes", {
  day: text("day").primaryKey(),
  createdOn: text("created_on").notNull(),
});

/** Your reflection for one plan week; `week` is that week's Monday. */
export const weeklyReviews = sqliteTable("weekly_reviews", {
  week: text("week").primaryKey(),
  wins: text("wins").notNull().default(""),
  struggles: text("struggles").notNull().default(""),
  nextFocus: text("next_focus").notNull().default(""),
  updatedOn: text("updated_on").notNull(),
});

/** Seconds spent on a LeetCode problem page per day, reported by the browser extension. */
export const siteTime = sqliteTable(
  "site_time",
  {
    day: text("day").notNull(),
    slug: text("slug").notNull(),
    seconds: integer("seconds").notNull(),
  },
  (t) => [primaryKey({ columns: [t.day, t.slug] })],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Task = typeof tasks.$inferSelect;
