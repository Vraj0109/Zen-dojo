import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { settings } from "./schema";
import { type Appearance, parseAppearance } from "./theme";
import type { BuddyMode, BuddySettings, AdhdPacing } from "@habit/shared";

// Interface preferences kept in the settings table.

const SIMPLE_KEY = "simple_mode";
export const APPEARANCE_SETTING_KEY = "appearance_prefs";
export const BUDDY_MODE_KEY = "buddy_mode";
export const BUDDY_NAME_KEY = "buddy_name";
export const ADHD_PACING_KEY = "adhd_pacing";

/** Simple mode hides power tools (boss fight, cheat sheets, diagrams, reading list, stuck history). On unless switched off. */
export async function getSimpleMode(): Promise<boolean> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(settings.key, SIMPLE_KEY) });
  return row?.value !== "off";
}

export async function setSimpleMode(on: boolean): Promise<void> {
  const db = await getDb();
  const value = on ? "on" : "off";
  await db.insert(settings).values({ key: SIMPLE_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function getAppearanceSetting(): Promise<Appearance | null> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(settings.key, APPEARANCE_SETTING_KEY) });
  if (!row?.value) return null;
  try {
    return parseAppearance(JSON.parse(row.value));
  } catch {
    return null;
  }
}

export async function setAppearanceSetting(prefs: Appearance): Promise<void> {
  const db = await getDb();
  const value = JSON.stringify(parseAppearance(prefs));
  await db
    .insert(settings)
    .values({ key: APPEARANCE_SETTING_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function getBuddySettings(): Promise<BuddySettings> {
  const db = await getDb();
  const [modeRow, nameRow, pacingRow] = await Promise.all([
    db.query.settings.findFirst({ where: eq(settings.key, BUDDY_MODE_KEY) }),
    db.query.settings.findFirst({ where: eq(settings.key, BUDDY_NAME_KEY) }),
    db.query.settings.findFirst({ where: eq(settings.key, ADHD_PACING_KEY) }),
  ]);

  const rawMode = modeRow?.value;
  const mode: BuddyMode = rawMode === "calm" || rawMode === "peer" || rawMode === "coach" ? rawMode : "off";
  const name = nameRow?.value?.trim() || "Buddy";
  const rawPacing = pacingRow?.value;
  const pacing: AdhdPacing = rawPacing === "standard" ? "standard" : "gentle";

  return { mode, name, pacing };
}

export async function setBuddySettings(prefs: Partial<BuddySettings>): Promise<void> {
  const db = await getDb();
  if (prefs.mode !== undefined) {
    const value = prefs.mode === "calm" || prefs.mode === "peer" || prefs.mode === "coach" ? prefs.mode : "off";
    await db.insert(settings).values({ key: BUDDY_MODE_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  if (prefs.name !== undefined) {
    const value = prefs.name.slice(0, 50);
    await db.insert(settings).values({ key: BUDDY_NAME_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  if (prefs.pacing !== undefined) {
    const value = prefs.pacing === "standard" ? "standard" : "gentle";
    await db.insert(settings).values({ key: ADHD_PACING_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}

// Plan 0060: local AI settings. Device-specific, so they are on the sync denylist (sync-triggers.ts).
export const AI_ENABLED_KEY = "ai_enabled";
export const AI_MODEL_KEY = "ai_model";
export const AI_URL_KEY = "ai_ollama_url";

export interface AiSettings {
  enabled: boolean;
  model: string;
  url: string;
}

const AI_DEFAULT_URL = "http://127.0.0.1:11434";
const AI_MODEL_RE = /^[a-zA-Z0-9._:/-]{1,100}$/;

async function putSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

/** Off by default. The URL is returned as saved; the Ollama client refuses anything that is not loopback. */
export async function getAiSettings(): Promise<AiSettings> {
  const db = await getDb();
  const [e, m, u] = await Promise.all([
    db.query.settings.findFirst({ where: eq(settings.key, AI_ENABLED_KEY) }),
    db.query.settings.findFirst({ where: eq(settings.key, AI_MODEL_KEY) }),
    db.query.settings.findFirst({ where: eq(settings.key, AI_URL_KEY) }),
  ]);
  return { enabled: e?.value === "1", model: m?.value && AI_MODEL_RE.test(m.value) ? m.value : "", url: u?.value || AI_DEFAULT_URL };
}

export async function setAiSettings(prefs: Partial<AiSettings>): Promise<void> {
  if (prefs.enabled !== undefined) await putSetting(AI_ENABLED_KEY, prefs.enabled ? "1" : "0");
  if (prefs.model !== undefined && (prefs.model === "" || AI_MODEL_RE.test(prefs.model))) await putSetting(AI_MODEL_KEY, prefs.model);
  if (prefs.url !== undefined) await putSetting(AI_URL_KEY, prefs.url.slice(0, 200));
}
