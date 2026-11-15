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
// Plan 0075: the custom colour theme moved into the appearance record (lib/ui-prefs.ts), so it arrives with its
// style. Haptics and the pane layout are per device again (a phone switch or layout means nothing on a desktop).
export const SYNCED_PREF_KEYS: readonly string[] = [
  "habit-judge-lang", // preferred language in the editor
  "zen-dojo.solution-lang", // preferred language for reference solutions
  BUDDY_PREFS_STORAGE_KEY, // buddy: avatar (built-in only), size, frequency
];

/** Keys whose readers only look on mount, so a pulled change needs one reload. The others re-read on the next render. */
export const RELOAD_PREF_KEYS: readonly string[] = [BUDDY_PREFS_STORAGE_KEY];

/** Fired after pulled values were written to localStorage. */
export const PREFS_APPLIED_EVENT = "habit-prefs-applied";

/** localStorage: per key, the value and stamp this device last synced. */
export const KNOWN_PREFS_KEY = "zd-prefs-known";

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
  /** Per key, when it last changed on the device that changed it. Old blobs have none: read as `updatedAt`. */
  stamps?: Record<string, number>;
}

/** What this device last synced for one key. */
export type KnownPrefs = Record<string, { v: string; s: number }>;

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
  const rawStamps = o.stamps;
  if (!rawStamps || typeof rawStamps !== "object" || Array.isArray(rawStamps)) return { updatedAt: o.updatedAt, values };
  const stamps: Record<string, number> = {};
  for (const k of Object.keys(values)) {
    const s = (rawStamps as Record<string, unknown>)[k];
    stamps[k] = typeof s === "number" && Number.isFinite(s) && s >= 0 ? s : o.updatedAt;
  }
  return { updatedAt: o.updatedAt, values, stamps };
}

/** Builds the JSON to store; null when it is not acceptable (so the caller ignores it). */
export function serializeSyncedPrefs(updatedAt: number, values: Record<string, string>, stamps?: Record<string, number>): string | null {
  const clean = parseSyncedPrefs(JSON.stringify(stamps ? { updatedAt, values, stamps } : { updatedAt, values }));
  if (!clean) return null;
  const json = JSON.stringify(clean);
  return json.length <= MAX_SYNCED_PREFS_BYTES ? json : null;
}

/** The stamp of one key in a blob (old blobs: the blob's own time). */
export const stampOf = (p: SyncedPrefs, key: string): number => p.stamps?.[key] ?? p.updatedAt;

/**
 * Server side: merges an incoming blob into the stored one per key, so a device that sends only the keys it changed
 * (or has few keys set) never deletes the others' keys.
 */
export function mergeSyncedPrefs(stored: SyncedPrefs | null, incoming: SyncedPrefs): SyncedPrefs {
  const values: Record<string, string> = { ...(stored?.values ?? {}) };
  const stamps: Record<string, number> = {};
  if (stored) for (const k of Object.keys(stored.values)) stamps[k] = stampOf(stored, k);
  for (const [k, v] of Object.entries(incoming.values)) {
    values[k] = v;
    stamps[k] = stampOf(incoming, k);
  }
  return { updatedAt: Math.max(stored?.updatedAt ?? 0, incoming.updatedAt), values, stamps };
}

export function parseKnown(raw: string | null): KnownPrefs {
  const o = parseObj(raw);
  const out: KnownPrefs = {};
  if (!o) return out;
  for (const [k, e] of Object.entries(o)) {
    if (!SYNCED_PREF_KEYS.includes(k) || !e || typeof e !== "object") continue;
    const { v, s } = e as { v?: unknown; s?: unknown };
    if (typeof v === "string" && typeof s === "number" && Number.isFinite(s)) out[k] = { v, s };
  }
  return out;
}

/**
 * Which pulled values to apply. A key is taken when its stamp differs from the one this device last synced (not
 * "is larger": the stamps come from other devices' clocks, so skew cannot block a change), unless this device changed
 * the key since its last sync; then the local change wins and goes up on the next push.
 */
export function planPull(server: SyncedPrefs, known: KnownPrefs, current: Record<string, string>): { apply: Record<string, string>; known: KnownPrefs } {
  const apply: Record<string, string> = {};
  const next: KnownPrefs = { ...known };
  for (const [k, v] of Object.entries(server.values)) {
    const s = stampOf(server, k);
    const mine = known[k];
    if (mine && mine.s === s) continue;
    const localDirty = mine ? current[k] !== undefined && current[k] !== mine.v : false;
    if (localDirty) continue;
    apply[k] = v;
    next[k] = { v, s };
  }
  return { apply, known: next };
}

/** Keys whose local value differs from what this device last synced: these go up on the next push. */
export function dirtyValues(snapshot: Record<string, string>, known: KnownPrefs): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(snapshot)) if (known[k]?.v !== v) out[k] = v;
  return out;
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
