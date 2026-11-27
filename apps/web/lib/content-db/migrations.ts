// Schema of the content database (plans 0112, 0113, 0115). Separate from the user database in lib/db.ts: it has its
// own migration list and its own version counter. Append only: never edit a shipped entry, add a new one.

/**
 * Migrations in order. Local files record how many have run in `PRAGMA user_version`; remote (Turso) databases
 * keep the same number in `zd_schema_version` (see client.ts). Nothing has shipped yet, so the first entry carries the
 * `changes` columns that plan 0115 step 1 needs.
 */
export const CONTENT_MIGRATIONS: string[] = [
  `
CREATE TABLE content_meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
INSERT INTO content_meta (k, v) VALUES ('content_version', '0'), ('schema_version', '1');

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL,
  title TEXT NOT NULL,
  summary_md TEXT NOT NULL DEFAULT '',
  ord INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL DEFAULT '{}',
  rev TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  template TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  rev TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX lessons_course ON lessons (course_id, ord);

CREATE TABLE page_sections (
  id TEXT PRIMARY KEY,
  owner_kind TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  slot TEXT NOT NULL,
  ord INTEGER NOT NULL,
  title TEXT
);
CREATE INDEX page_sections_owner ON page_sections (owner_kind, owner_id, slot, ord);

CREATE TABLE blocks (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  ord INTEGER NOT NULL,
  type TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  caption TEXT,
  variant TEXT,
  label TEXT,
  time_complexity TEXT,
  space_complexity TEXT,
  asset_id TEXT
);
CREATE INDEX blocks_section ON blocks (section_id, ord);

CREATE TABLE block_code (
  block_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0,
  code TEXT NOT NULL,
  PRIMARY KEY (block_id, lang)
);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  bytes BLOB NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL
);

CREATE TABLE problems (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  difficulty TEXT,
  pattern TEXT,
  url TEXT,
  kind TEXT NOT NULL,
  constraints_json TEXT NOT NULL DEFAULT '[]',
  input_format_md TEXT,
  output_format_md TEXT,
  fn_json TEXT NOT NULL,
  design_json TEXT,
  unordered INTEGER NOT NULL DEFAULT 0,
  complexity TEXT,
  extra_json TEXT NOT NULL DEFAULT '{}',
  rev TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX problems_pattern ON problems (pattern);

CREATE TABLE test_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  problem_id TEXT NOT NULL,
  ord INTEGER NOT NULL,
  role TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_json TEXT NOT NULL,
  explanation_md TEXT
);
CREATE INDEX test_cases_problem ON test_cases (problem_id, ord);

CREATE TABLE hints (
  problem_id TEXT NOT NULL,
  ord INTEGER NOT NULL,
  body_md TEXT NOT NULL,
  PRIMARY KEY (problem_id, ord)
);

CREATE TABLE docs (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  body_json TEXT NOT NULL,
  rev TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, id)
);

CREATE TABLE changes (
  version INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  op TEXT NOT NULL,
  at INTEGER NOT NULL,
  actor TEXT NOT NULL,
  parts_json TEXT NOT NULL DEFAULT '["all"]',
  units_json TEXT NOT NULL DEFAULT '[]',
  rev TEXT,
  note TEXT,
  notify INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX changes_entity ON changes (entity, entity_id);

CREATE TABLE admin_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  request_id TEXT
);
CREATE INDEX admin_audit_entity ON admin_audit (entity, entity_id, at);
`,
  // Plan 0115 versioning rule 6: the content epoch starts at 1 and only a full resync (content:resync, content:import)
  // raises it. Its own migration, so databases that already ran the first one get it too.
  `
INSERT OR IGNORE INTO content_meta (k, v) VALUES ('content_epoch', '1');
`,
];
