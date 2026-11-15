import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { settings } from "./schema";
import { type Appearance, type AppearanceRecord, parseAppearance, sameAppearance } from "./theme";
import { SYNCED_PREFS_SETTING_KEY, mergeSyncedPrefs, parseSyncedPrefs, serializeSyncedPrefs } from "./synced-prefs";
import { cleanPortfolioName, type BuddyMode, type BuddySettings, type AdhdPacing } from "@habit/shared";

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

/**
 * Reads `appearance_prefs`. New shape (plan 0075): `{"v":1,"at":<ms>,"prefs":{...}}`. Old shape: the plain prefs
 * object, read with `at: 0` so any stamped change beats it.
 */
export function parseAppearanceRecord(raw: string | null | undefined): AppearanceRecord | null {
  if (!raw) return null;
  try {
    const o: unknown = JSON.parse(raw);
    if (!o || typeof o !== "object" || Array.isArray(o)) return null;
    const obj = o as Record<string, unknown>;
    if (obj.v === 1 && obj.prefs && typeof obj.prefs === "object") {
      const at = typeof obj.at === "number" && Number.isFinite(obj.at) && obj.at >= 0 ? obj.at : 0;
      return { prefs: parseAppearance(obj.prefs), at };
    }
    return { prefs: parseAppearance(obj), at: 0 };
  } catch {
    return null;
  }
}

export async function getAppearanceRecord(): Promise<AppearanceRecord | null> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(settings.key, APPEARANCE_SETTING_KEY) });
  return parseAppearanceRecord(row?.value);
}

export async function getAppearanceSetting(): Promise<Appearance | null> {
  return (await getAppearanceRecord())?.prefs ?? null;
}

/**
 * Saves the appearance with the time it was chosen. Skips the write (returns false) when the prefs are the same as
 * the stored ones, so applying a pulled theme never re-stamps the row (the settings trigger fires on every UPDATE),
 * and when the stored record is newer.
 */
export async function setAppearanceSetting(prefs: Appearance, at: number = Date.now()): Promise<boolean> {
  const db = await getDb();
  const clean = parseAppearance(prefs);
  const when = Number.isFinite(at) && at >= 0 ? Math.floor(at) : Date.now();
  const current = await getAppearanceRecord();
  if (current) {
    // An unknown custom theme keeps the stored one.
    if (clean.customTheme === undefined && current.prefs.customTheme !== undefined) clean.customTheme = current.prefs.customTheme;
    if (sameAppearance(clean, current.prefs) && clean.customTheme === current.prefs.customTheme) return false;
    if (current.at > when) return false;
  }
  const value = JSON.stringify({ v: 1, at: when, prefs: clean });
  await db
    .insert(settings)
    .values({ key: APPEARANCE_SETTING_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
  return true;
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

// Plan 0069: the name shown on the portfolio and certificates (may sync).
export const PROFILE_NAME_KEY = "profile_name";

export async function getProfileName(): Promise<string> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(settings.key, PROFILE_NAME_KEY) });
  return cleanPortfolioName(row?.value);
}

export async function setProfileName(name: string): Promise<void> {
  const db = await getDb();
  const value = name.trim() ? cleanPortfolioName(name) : "";
  await db.insert(settings).values({ key: PROFILE_NAME_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

// Plan 0060: local AI settings. Device-specific, so they are on the sync denylist (sync-triggers.ts).
export const AI_ENABLED_KEY = "ai_enabled";
export const AI_MODEL_KEY = "ai_model";
export const AI_URL_KEY = "ai_ollama_url";

// Plan 0067: who answers, and which cloud tools the user has accepted. Also on the sync denylist.
export const AI_PROVIDER_KEY = "ai_provider";
export const AI_CONSENT_KEY = "ai_cloud_consent";

// Plan 0078: LM Studio (or any OpenAI-compatible server on this computer). Also on the sync denylist.
export const AI_LMSTUDIO_URL_KEY = "ai_lmstudio_url";
export const AI_LMSTUDIO_MODEL_KEY = "ai_lmstudio_model";
export const AI_FOLD_SYSTEM_KEY = "ai_fold_system";
export const AI_LMSTUDIO_DEFAULT_URL = "http://127.0.0.1:1234";
/** LM Studio ids can contain `@`, `+` and `_`, so they get their own, wider pattern. */
export const LOCAL_MODEL_ID_RE = /^[A-Za-z0-9._:/@+-]{1,120}$/;

export const AI_PROVIDER_IDS = ["ollama", "lmstudio", "claude", "agy", "gemini", "codex"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];
export const isAiProviderId = (v: unknown): v is AiProviderId => typeof v === "string" && (AI_PROVIDER_IDS as readonly string[]).includes(v);

export interface AiSettings {
  enabled: boolean;
  model: string;
  url: string;
  provider: AiProviderId;
  consent: AiProviderId[];
  lmstudioUrl: string;
  lmstudioModel: string;
  /** Put the app's instructions in the first user message (for models trained without a system prompt). */
  foldSystem: boolean;
}

function parseConsent(raw: string | undefined): AiProviderId[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return [...new Set(v.filter(isAiProviderId))];
  } catch {
    return [];
  }
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
  const [e, m, u, p, c, lu, lm, f] = await Promise.all([
    db.query.settings.findFirst({ where: eq(settings.key, AI_ENABLED_KEY) }),
    db.query.settings.findFirst({ where: eq(settings.key, AI_MODEL_KEY) }),
    db.query.settings.findFirst({ where: eq(settings.key, AI_URL_KEY) }),
    db.query.settings.findFirst({ where: eq(settings.key, AI_PROVIDER_KEY) }),
    db.query.settings.findFirst({ where: eq(settings.key, AI_CONSENT_KEY) }),
    db.query.settings.findFirst({ where: eq(settings.key, AI_LMSTUDIO_URL_KEY) }),
    db.query.settings.findFirst({ where: eq(settings.key, AI_LMSTUDIO_MODEL_KEY) }),
    db.query.settings.findFirst({ where: eq(settings.key, AI_FOLD_SYSTEM_KEY) }),
  ]);
  return {
    enabled: e?.value === "1",
    model: m?.value && AI_MODEL_RE.test(m.value) ? m.value : "",
    url: u?.value || AI_DEFAULT_URL,
    provider: isAiProviderId(p?.value) ? p.value : "ollama",
    consent: parseConsent(c?.value),
    lmstudioUrl: lu?.value || AI_LMSTUDIO_DEFAULT_URL,
    lmstudioModel: lm?.value && LOCAL_MODEL_ID_RE.test(lm.value) ? lm.value : "",
    foldSystem: f?.value === "1",
  };
}

export async function setAiSettings(prefs: Partial<AiSettings>): Promise<void> {
  if (prefs.enabled !== undefined) await putSetting(AI_ENABLED_KEY, prefs.enabled ? "1" : "0");
  if (prefs.model !== undefined && (prefs.model === "" || AI_MODEL_RE.test(prefs.model))) await putSetting(AI_MODEL_KEY, prefs.model);
  if (prefs.url !== undefined) await putSetting(AI_URL_KEY, prefs.url.slice(0, 200));
  if (prefs.provider !== undefined && isAiProviderId(prefs.provider)) await putSetting(AI_PROVIDER_KEY, prefs.provider);
  if (prefs.consent !== undefined) await putSetting(AI_CONSENT_KEY, JSON.stringify([...new Set(prefs.consent.filter(isAiProviderId))]));
  if (prefs.lmstudioUrl !== undefined) await putSetting(AI_LMSTUDIO_URL_KEY, prefs.lmstudioUrl.slice(0, 200));
  if (prefs.lmstudioModel !== undefined && (prefs.lmstudioModel === "" || LOCAL_MODEL_ID_RE.test(prefs.lmstudioModel))) await putSetting(AI_LMSTUDIO_MODEL_KEY, prefs.lmstudioModel);
  if (prefs.foldSystem !== undefined) await putSetting(AI_FOLD_SYSTEM_KEY, prefs.foldSystem ? "1" : "0");
}

/** Browser-only preferences kept in step across devices (see lib/synced-prefs.ts). Stored as validated JSON. */
export async function getSyncedPrefsSetting(): Promise<string | null> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(settings.key, SYNCED_PREFS_SETTING_KEY) });
  return parseSyncedPrefs(row?.value) ? (row?.value ?? null) : null;
}

export async function setSyncedPrefsSetting(json: string): Promise<void> {
  const parsed = parseSyncedPrefs(json);
  if (!parsed) return;
  const db = await getDb();
  // Plan 0075: merge per key, so a partial push never deletes other devices' keys.
  const row = await db.query.settings.findFirst({ where: eq(settings.key, SYNCED_PREFS_SETTING_KEY) });
  const stored = parseSyncedPrefs(row?.value);
  const merged = mergeSyncedPrefs(stored, parsed);
  const value = serializeSyncedPrefs(merged.updatedAt, merged.values, merged.stamps);
  if (!value || value === row?.value) return;
  await db.insert(settings).values({ key: SYNCED_PREFS_SETTING_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}
