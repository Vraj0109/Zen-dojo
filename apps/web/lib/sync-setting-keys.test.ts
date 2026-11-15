// Plan 0075 step 1: the UI setting keys that must sync, and the private ones that must not. A rename that adds a
// secret word (for example "appearance_key") would silently stop a setting from syncing; this test catches it.
import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MIGRATIONS } from "./db";
import { isSyncableSettingKey } from "./sync-triggers";
import { APPEARANCE_SETTING_KEY, ADHD_PACING_KEY, BUDDY_MODE_KEY, BUDDY_NAME_KEY, PROFILE_NAME_KEY } from "./ui-prefs";
import { SYNCED_PREFS_SETTING_KEY } from "./synced-prefs";

const MUST_SYNC = [
  APPEARANCE_SETTING_KEY,
  SYNCED_PREFS_SETTING_KEY,
  "simple_mode",
  BUDDY_MODE_KEY,
  BUDDY_NAME_KEY,
  ADHD_PACING_KEY,
  PROFILE_NAME_KEY,
  "favourite_courses",
  "interview_date",
  "plan_start_date",
  "plan_week_cursor",
  "plan_week_history",
  "plan_week_start",
  "plan_finished",
];

const MUST_NOT_SYNC = [
  "ai_enabled",
  "ai_model",
  "ai_ollama_url",
  "ai_provider",
  "ai_cloud_consent",
  "ai_lmstudio_url",
  "ai_lmstudio_model",
  "ai_fold_system",
  "extension_token",
  "content_feed_url",
  "tools_notice_dismissed",
  "api_secret_key",
  "db_password",
];

let c: Client;
beforeEach(async () => {
  c = createClient({ url: ":memory:" });
  for (const m of MIGRATIONS) await c.executeMultiple(m);
});
afterEach(() => c.close());

describe("setting keys that sync", () => {
  it("names the exact UI keys (a renamed constant fails here)", () => {
    expect(MUST_SYNC.slice(0, 2)).toEqual(["appearance_prefs", "ui_prefs_synced"]);
    expect([BUDDY_MODE_KEY, BUDDY_NAME_KEY, ADHD_PACING_KEY, PROFILE_NAME_KEY]).toEqual(["buddy_mode", "buddy_name", "adhd_pacing", "profile_name"]);
  });

  it("isSyncableSettingKey allows the UI keys and refuses the private ones", () => {
    for (const k of MUST_SYNC) expect(isSyncableSettingKey(k), k).toBe(true);
    for (const k of MUST_NOT_SYNC) expect(isSyncableSettingKey(k), k).toBe(false);
  });

  it("the SQL triggers queue the UI keys", async () => {
    for (const k of MUST_SYNC) await c.execute({ sql: "INSERT INTO settings (key, value) VALUES (?, '1')", args: [k] });
    const rs = await c.execute("SELECT row_key FROM sync_dirty WHERE tbl = 'settings' ORDER BY row_key");
    expect(rs.rows.map((r) => String(r[0]))).toEqual([...MUST_SYNC].sort());
  });

  it("the SQL triggers skip the secret-word keys", async () => {
    for (const k of ["api_secret_key", "db_password", "extension_token", "ai_provider"]) await c.execute({ sql: "INSERT INTO settings (key, value) VALUES (?, '1')", args: [k] });
    const rs = await c.execute("SELECT count(*) FROM sync_dirty WHERE tbl = 'settings'");
    expect(Number(rs.rows[0][0])).toBe(0);
  });
});
