// Per-device Buddy preferences. Kept in localStorage (not synced); every access is guarded.

export type AvatarId = "fox" | "robot" | "cat" | "blob" | "custom";

export interface BuddyPrefs {
  avatar: AvatarId;
  /** Data URL of the imported image (shown through <img> only). */
  customSrc?: string;
  /** 48 / 64 / 88 px */
  size: "s" | "m" | "l";
  /** Never / about every 12 min / about every 5 min. */
  frequency: "off" | "rare" | "normal";
  aiLines: boolean;
  /** Pixels from the top-left of the viewport; undefined = default bottom-left. */
  pos?: { x: number; y: number };
}

export const BUDDY_PREFS_KEY = "habit-buddy-prefs";
const PREFS_EVENT = "buddy:prefs";

export const DEFAULT_BUDDY_PREFS: BuddyPrefs = {
  avatar: "fox",
  size: "m",
  frequency: "normal",
  aiLines: false,
};

export const BUDDY_SIZE_PX: Record<BuddyPrefs["size"], number> = { s: 48, m: 64, l: 88 };

const AVATARS: AvatarId[] = ["fox", "robot", "cat", "blob", "custom"];
const SIZES: BuddyPrefs["size"][] = ["s", "m", "l"];
const FREQS: BuddyPrefs["frequency"][] = ["off", "rare", "normal"];

/** Turn anything stored into a valid BuddyPrefs; unknown or bad fields fall back to defaults. */
export function sanitizeBuddyPrefs(raw: unknown): BuddyPrefs {
  const out: BuddyPrefs = { ...DEFAULT_BUDDY_PREFS };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  if (typeof r.avatar === "string" && AVATARS.includes(r.avatar as AvatarId)) out.avatar = r.avatar as AvatarId;
  if (typeof r.customSrc === "string" && r.customSrc.startsWith("data:image/")) out.customSrc = r.customSrc;
  if (typeof r.size === "string" && SIZES.includes(r.size as BuddyPrefs["size"])) out.size = r.size as BuddyPrefs["size"];
  if (typeof r.frequency === "string" && FREQS.includes(r.frequency as BuddyPrefs["frequency"])) {
    out.frequency = r.frequency as BuddyPrefs["frequency"];
  }
  if (typeof r.aiLines === "boolean") out.aiLines = r.aiLines;
  const p = r.pos as { x?: unknown; y?: unknown } | undefined;
  if (p && typeof p.x === "number" && typeof p.y === "number" && Number.isFinite(p.x) && Number.isFinite(p.y)) {
    out.pos = { x: p.x, y: p.y };
  }
  // A custom avatar without an image cannot be shown.
  if (out.avatar === "custom" && !out.customSrc) out.avatar = DEFAULT_BUDDY_PREFS.avatar;
  return out;
}

export function readBuddyPrefs(): BuddyPrefs {
  try {
    const raw = localStorage.getItem(BUDDY_PREFS_KEY);
    return raw ? sanitizeBuddyPrefs(JSON.parse(raw)) : { ...DEFAULT_BUDDY_PREFS };
  } catch {
    return { ...DEFAULT_BUDDY_PREFS };
  }
}

function store(prefs: BuddyPrefs): void {
  try {
    localStorage.setItem(BUDDY_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // blocked or full: the change still applies for this page through the event below
  }
  try {
    window.dispatchEvent(new CustomEvent(PREFS_EVENT, { detail: prefs }));
  } catch {
    // no window (server)
  }
}

/** Merge a patch into the stored prefs, save, and notify listeners. A key set to undefined is removed. */
export function writeBuddyPrefs(patch: Partial<BuddyPrefs>): BuddyPrefs {
  const merged: Record<string, unknown> = { ...readBuddyPrefs(), ...patch };
  for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
  const next = sanitizeBuddyPrefs(merged);
  store(next);
  return next;
}

export function resetBuddyPosition(): void {
  writeBuddyPrefs({ pos: undefined });
}

export function onBuddyPrefs(handler: (p: BuddyPrefs) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    const d = (e as CustomEvent<BuddyPrefs>).detail;
    handler(d ? sanitizeBuddyPrefs(d) : readBuddyPrefs());
  };
  window.addEventListener(PREFS_EVENT, listener);
  return () => window.removeEventListener(PREFS_EVENT, listener);
}
