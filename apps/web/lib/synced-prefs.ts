// Browser-only preferences that follow the person across devices through the `ui_prefs_synced` setting.
// Pure logic (no I/O of its own): storage is passed in so it can be tested with a fake.
//
// This is an ALLOWLIST. A key that is not listed here never syncs, so a new preference stays on its device
// until someone adds it on purpose. Never add: AI settings, the browser API key store, the timer, the buddy
// session, per-device dismissals and notices, project code drafts, custom font files or anything that points
// at files kept in IndexedDB.

export const SYNCED_PREFS_SETTING_KEY = "ui_prefs_synced";
export const SYNCED_AT_KEY = "zd-prefs-synced-at";
export const RELOAD_FLAG_KEY = "zd-prefs-reloaded";
export const MAX_SYNCED_PREFS_BYTES = 16 * 1024;
const MAX_VALUE_CHARS = 8 * 1024;

export const BUDDY_PREFS_STORAGE_KEY = "habit-buddy-prefs";

/** localStorage keys that sync. The buddy key syncs only its plain fields (see BUDDY_SYNCED_FIELDS). */
export const SYNCED_PREF_KEYS: readonly string[] = [
  "habit-custom-theme", // custom colour theme
  "habit-pane-layout", // problem page pane layout
  "habit-judge-lang", // preferred language in the editor
  "zen-dojo.solution-lang", // preferred language for reference solutions
  "zd_haptics", // haptics switch
  BUDDY_PREFS_STORAGE_KEY, // buddy: avatar (built-in only), size, frequency
];

/** Buddy fields that sync. Not the pet, imported image, AI lines consent or screen position. */
const BUDDY_AVATARS = ["fox", "robot", "cat", "blob"];
const BUDDY_SIZES = ["s", "m", "l"];
const BUDDY_FREQS = ["off", "rare", "normal"];

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SyncedPrefs {
  updatedAt: number;
  values: Record<string, string>;
}

function parseObj(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The part of the buddy preferences that may sync, as stable JSON. Null when there is nothing to sync. */
export function buddySyncedPart(raw: string | null): string | null {
  const o = parseObj(raw);
  if (!o) return null;
  const out: Record<string, string> = {};
  if (typeof o.avatar === "string" && BUDDY_AVATARS.includes(o.avatar)) out.avatar = o.avatar;
  if (typeof o.frequency === "string" && BUDDY_FREQS.includes(o.frequency)) out.frequency = o.frequency;
  if (typeof o.size === "string" && BUDDY_SIZES.includes(o.size)) out.size = o.size;
  return Object.keys(out).length ? JSON.stringify(out) : null;
}

/** The values to push: only allowlisted keys that are set. */
export function buildSnapshot(storage: StorageLike): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of SYNCED_PREF_KEYS) {
    let raw: string | null = null;
    try {
      raw = storage.getItem(key);
    } catch {
      raw = null;
    }
    if (raw === null) continue;
    const value = key === BUDDY_PREFS_STORAGE_KEY ? buddySyncedPart(raw) : raw;
    if (value === null || value.length > MAX_VALUE_CHARS) continue;
    out[key] = value;
  }
  return out;
}

export function sameValues(a: Record<string, string> | null, b: Record<string, string> | null): boolean {
  const x = a ?? {};
  const y = b ?? {};
  const kx = Object.keys(x);
  if (kx.length !== Object.keys(y).length) return false;
  return kx.every((k) => x[k] === y[k]);
}

/** Reads the stored JSON. Anything malformed, oversized or off the allowlist is dropped; null when unusable. */
export function parseSyncedPrefs(json: string | null | undefined): SyncedPrefs | null {
  if (typeof json !== "string" || json.length === 0 || json.length > MAX_SYNCED_PREFS_BYTES) return null;
  const o = parseObj(json);
  if (!o || typeof o.updatedAt !== "number" || !Number.isFinite(o.updatedAt) || o.updatedAt < 0) return null;
  const rawValues = o.values;
  if (!rawValues || typeof rawValues !== "object" || Array.isArray(rawValues)) return null;
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawValues as Record<string, unknown>)) {
    if (!SYNCED_PREF_KEYS.includes(k) || typeof v !== "string" || v.length > MAX_VALUE_CHARS) continue;
    const clean = k === BUDDY_PREFS_STORAGE_KEY ? buddySyncedPart(v) : v;
    if (clean !== null) values[k] = clean;
  }
  return { updatedAt: o.updatedAt, values };
}

/** Builds the JSON to store; null when it is not acceptable (so the caller ignores it). */
export function serializeSyncedPrefs(updatedAt: number, values: Record<string, string>): string | null {
  const clean = parseSyncedPrefs(JSON.stringify({ updatedAt, values }));
  if (!clean) return null;
  const json = JSON.stringify(clean);
  return json.length <= MAX_SYNCED_PREFS_BYTES ? json : null;
}

/** Newest wins: pull only when the server copy is newer than the one this device last saw. */
export function shouldPull(server: SyncedPrefs | null, localAt: number): boolean {
  return server !== null && server.updatedAt > localAt;
}

/** Writes pulled values into storage. Returns true when anything changed. Buddy values merge into local ones. */
export function applyValues(storage: StorageLike, values: Record<string, string>): boolean {
  let changed = false;
  for (const key of SYNCED_PREF_KEYS) {
    const incoming = values[key];
    if (typeof incoming !== "string") continue;
    let current: string | null = null;
    try {
      current = storage.getItem(key);
    } catch {
      current = null;
    }
    let next = incoming;
    if (key === BUDDY_PREFS_STORAGE_KEY) {
      const local = parseObj(current) ?? {};
      const inc = parseObj(incoming) ?? {};
      const merged: Record<string, unknown> = { ...local, ...inc };
      // A built-in avatar from another device replaces a pet or custom image here, which is what the person chose.
      next = JSON.stringify(merged);
      if (buddySyncedPart(current) === buddySyncedPart(next)) continue;
    } else if (current === next) {
      continue;
    }
    try {
      storage.setItem(key, next);
      changed = true;
    } catch {
      // full or blocked
    }
  }
  return changed;
}

/** Reload at most once per session after pulled values changed something, so two devices cannot loop. */
export function reloadDecision(changed: boolean, flagSet: boolean): { reload: boolean; flag: boolean } {
  if (!changed) return { reload: false, flag: false };
  if (flagSet) return { reload: false, flag: true };
  return { reload: true, flag: true };
}
