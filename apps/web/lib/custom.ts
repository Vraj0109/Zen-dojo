// Your own colours, fonts and profile picture. Saved in this browser or app window (like the other appearance choices).
// The colours are applied by the inline script in lib/theme.ts (so there is no flash on load); this file is the
// validation and contrast maths the settings page uses.

export const CUSTOM_THEME_KEY = "habit-custom-theme";
export const CUSTOM_FONT_KEY = "habit-custom-font";
export const PROFILE_KEY = "habit-profile";
export const CUSTOM_EVENT = "habit-custom-change";

export interface Palette {
  background: string;
  surface: string;
  foreground: string;
  line: string;
  muted: string;
}
export interface CustomTheme {
  /** One accent for light and dark */
  accent?: string;
  light?: Palette;
  dark?: Palette;
}

export const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

const PALETTE_KEYS = ["background", "surface", "foreground", "line", "muted"] as const;

function cleanPalette(p: unknown): Palette | undefined {
  if (!p || typeof p !== "object") return undefined;
  const o = p as Record<string, unknown>;
  if (!PALETTE_KEYS.every((k) => isHex(o[k]))) return undefined;
  return Object.fromEntries(PALETTE_KEYS.map((k) => [k, (o[k] as string).toLowerCase()])) as unknown as Palette;
}

/** Reads what was saved. Anything that is not a valid hex colour is dropped. */
export function parseCustomTheme(raw: string | null | undefined): CustomTheme {
  if (!raw) return {};
  try {
    const t = JSON.parse(raw) as Record<string, unknown>;
    const out: CustomTheme = {};
    if (isHex(t.accent)) out.accent = t.accent.toLowerCase();
    const light = cleanPalette(t.light);
    const dark = cleanPalette(t.dark);
    if (light) out.light = light;
    if (dark) out.dark = dark;
    return out;
  } catch {
    return {};
  }
}

/** WCAG relative luminance of #rrggbb. */
export function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => {
    const x = parseInt(hex.slice(i, i + 2), 16) / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Starting palettes for the editor: the built-in Classic colours. */
export const DEFAULT_LIGHT: Palette = { background: "#f7f7f5", surface: "#ffffff", foreground: "#1a1a1a", line: "#e4e4e0", muted: "#6b6b66" };
export const DEFAULT_DARK: Palette = { background: "#111211", surface: "#1a1b1a", foreground: "#ececea", line: "#2c2d2b", muted: "#9a9a94" };

/** Plain-language problems with a palette (text you cannot read). Empty when it is fine. */
export function paletteWarnings(p: Palette): string[] {
  const out: string[] = [];
  if (contrast(p.foreground, p.background) < 4.5) out.push("Text is hard to read on the background.");
  if (contrast(p.foreground, p.surface) < 4.5) out.push("Text is hard to read on cards.");
  if (contrast(p.muted, p.surface) < 3) out.push("Secondary text is hard to read on cards.");
  return out;
}

export function accentWarnings(accent: string, p: Palette): string[] {
  return contrast(accent, p.surface) < 3 ? ["The accent colour is hard to see against cards."] : [];
}

// ---- fonts
export interface CustomFont {
  /** CSS font-family name */
  family: string;
  /** "local": a font already installed on this computer. "file": an uploaded font file kept in this browser. */
  source: "local" | "file";
}
export function parseCustomFont(raw: string | null | undefined): CustomFont | null {
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as Partial<CustomFont>;
    if (typeof f.family !== "string" || !isSafeFamily(f.family)) return null;
    return { family: f.family, source: f.source === "file" ? "file" : "local" };
  } catch {
    return null;
  }
}
/** A font name is letters, digits, spaces, hyphens and dots only (it ends up inside a CSS value). */
export const isSafeFamily = (s: string) => /^[A-Za-z0-9][A-Za-z0-9 .\-_]{0,60}$/.test(s);

// ---- profile
export interface Profile {
  name: string;
  /** A small PNG/JPEG as a data: URL (resized in the browser), or "" for none */
  picture: string;
}
export const EMPTY_PROFILE: Profile = { name: "", picture: "" };
export function parseProfile(raw: string | null | undefined): Profile {
  if (!raw) return EMPTY_PROFILE;
  try {
    const p = JSON.parse(raw) as Partial<Profile>;
    const picture = typeof p.picture === "string" && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.picture) && p.picture.length < 400_000 ? p.picture : "";
    return { name: typeof p.name === "string" ? p.name.slice(0, 40) : "", picture };
  } catch {
    return EMPTY_PROFILE;
  }
}
