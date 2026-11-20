// Appearance: light / dark / system, an accent colour, and a style (a whole-UI look). Stored in the browser
// (localStorage) and applied to <html> by a tiny inline script before first paint, so the page never flashes the wrong
// colours. No `server-only`: the layout, the settings picker and the tests all import this.
//
// The colours below are the ones in globals.css (a test keeps them equal), so the picker previews show exactly
// what you get.

export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/**
 * Accent colours: `color` is the light primary (tone 40, also the swatch) and `dark` the dark primary (tone 80). The
 * CSS in globals.css sets a full tonal set for each (container, soft, on-*). The default ("green", the stored id since
 * before themes had their own colour) keeps the theme's own primary: green in Dojo, orange in Ember and so on; its
 * values are Dojo's green.
 */
export const ACCENTS = [
  { id: "green", label: "Theme colour", color: "#1e6b4a", dark: "#8fd8b0" },
  { id: "blue", label: "Blue", color: "#005eb4", dark: "#b2c5ff" },
  { id: "violet", label: "Violet", color: "#7348ad", dark: "#dbb8ff" },
  { id: "amber", label: "Amber", color: "#815500", dark: "#feba53" },
  { id: "rose", label: "Rose", color: "#ae2071", dark: "#ffafd3" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];
export const DEFAULT_ACCENT: AccentId = "green";

/** Every colour token a theme sets (DESIGN.md). The CSS variable is `--` + the name. */
export const THEME_TOKENS = [
  "background",
  "surface",
  "surface-2",
  "line",
  "line-strong",
  "outline",
  "foreground",
  "muted",
  "primary",
  "primary-hover",
  "primary-container",
  "on-primary-container",
  "primary-soft",
  "on-primary-soft",
  "on-primary",
  "reward",
  "reward-soft",
  "on-reward-soft",
  "success",
  "warning",
  "danger",
  "danger-soft",
  "on-danger-soft",
] as const;
export type ThemeToken = (typeof THEME_TOKENS)[number];
export type Palette = Record<ThemeToken, string>;

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function mixHex(color: string, bg: string, bgWeight: number): string {
  const [r1, g1, b1] = hexToRgb(color);
  const [r2, g2, b2] = hexToRgb(bg);
  return rgbToHex(r1 * (1 - bgWeight) + r2 * bgWeight, g1 * (1 - bgWeight) + g2 * bgWeight, b1 * (1 - bgWeight) + b2 * bgWeight);
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrast(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export function bestTextColor(bg: string): string {
  const whiteContrast = getContrast("#ffffff", bg);
  const blackContrast = getContrast("#000000", bg);
  return whiteContrast >= blackContrast ? "#ffffff" : "#000000";
}

/** Converts a hex color string to [hue (0-360), saturation (0-1), lightness (0-1)]. */
export function hexToHsl(hex: string): [number, number, number] {
  try {
    const [r255, g255, b255] = hexToRgb(hex);
    if (Number.isNaN(r255) || Number.isNaN(g255) || Number.isNaN(b255)) return [0, 0, 0];
    const r = r255 / 255;
    const g = g255 / 255;
    const b = b255 / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
          break;
        case g:
          h = ((b - r) / delta + 2) * 60;
          break;
        case b:
          h = ((r - g) / delta + 4) * 60;
          break;
      }
    }
    return [h, s, l];
  } catch {
    return [0, 0, 0];
  }
}

/**
 * Checks if the primary color's hue is within ~25 deg of the danger color's hue
 * and its saturation is above 40%.
 */
export function isNearDanger(primary: string, danger = "#BA1A1A"): boolean {
  if (!primary) return false;
  const [hP, sP] = hexToHsl(primary);
  const [hD] = hexToHsl(danger);
  const hueDiff = Math.abs(hP - hD);
  const shortestDiff = Math.min(hueDiff, 360 - hueDiff);
  return shortestDiff <= 25 && sP > 0.4;
}

/** Pure helper to derive missing Expressive tokens for a theme palette. */
export function derivePalette(palette: Record<string, string>): Palette {
  const primary = palette.primary;
  const background = palette.background;
  const danger = palette.danger;
  const rewardSoft = palette["reward-soft"] || palette.reward || "#e8a317";
  const foreground = palette.foreground || "#171d19";

  const primaryContainer = palette["primary-container"] || mixHex(primary, background, 0.75);
  const onPrimaryContainer = palette["on-primary-container"] || bestTextColor(primaryContainer);
  const primarySoft = palette["primary-soft"] || mixHex(primary, background, 0.85);
  const onPrimarySoft = palette["on-primary-soft"] || bestTextColor(primarySoft);
  const onRewardSoft = palette["on-reward-soft"] || bestTextColor(rewardSoft);
  const dangerSoft = palette["danger-soft"] || mixHex(danger, background, 0.85);
  const onDangerSoft = palette["on-danger-soft"] || bestTextColor(dangerSoft);
  const outline = palette.outline || mixHex(foreground, background, 0.45);

  return {
    ...palette,
    outline,
    "primary-container": primaryContainer,
    "on-primary-container": onPrimaryContainer,
    "primary-soft": primarySoft,
    "on-primary-soft": onPrimarySoft,
    "on-reward-soft": onRewardSoft,
    "danger-soft": dangerSoft,
    "on-danger-soft": onDangerSoft,
  } as Palette;
}

export function deriveTones<T extends { light: Record<string, string>; dark: Record<string, string> }>(
  target: T
): Omit<T, "light" | "dark"> & { light: Palette; dark: Palette };
export function deriveTones<T extends Record<string, string>>(target: T): Palette;
export function deriveTones(
  target: { light: Record<string, string>; dark: Record<string, string> } | Record<string, string>
): unknown {
  if (
    target &&
    "light" in target &&
    typeof target.light === "object" &&
    target.light !== null &&
    "dark" in target &&
    typeof target.dark === "object" &&
    target.dark !== null
  ) {
    return {
      ...target,
      light: derivePalette(target.light as Record<string, string>),
      dark: derivePalette(target.dark as Record<string, string>),
    };
  }
  return derivePalette(target as Record<string, string>);
}

/**
 * Themes (stored as `style`; the ids never change so saved choices keep working). `classic` is shown as Dojo, the
 * default. Each sets every token for light and dark; Terminal is dark only (its light palette is the dark one and the
 * init script forces dark).
 */
export const STYLES = [
  {
    id: "classic",
    label: "Dojo",
    blurb: "Neutral and green, the default",
    light: {
      background: "#f6fbf5",
      surface: "#ffffff",
      "surface-2": "#ebf0ea",
      line: "#dee5dd",
      "line-strong": "#c0c9c1",
      outline: "#707971",
      foreground: "#171d19",
      muted: "#404943",
      primary: "#1e6b4a",
      "on-primary": "#ffffff",
      "primary-hover": "#185a3e",
      "primary-container": "#b6f1cf",
      "on-primary-container": "#00210f",
      "primary-soft": "#d2e8d9",
      "on-primary-soft": "#0d1f15",
      reward: "#8b5000",
      "reward-soft": "#ffddb2",
      "on-reward-soft": "#2c1600",
      success: "#1e6b4a",
      warning: "#9a5b00",
      danger: "#ba1a1a",
      "danger-soft": "#ffdad6",
      "on-danger-soft": "#410002",
    },
    dark: {
      background: "#0f1512",
      surface: "#1b211e",
      "surface-2": "#252b28",
      line: "#2f3631",
      "line-strong": "#404943",
      outline: "#8a938b",
      foreground: "#dee4de",
      muted: "#bfc9c1",
      primary: "#8fd8b0",
      "on-primary": "#003822",
      "primary-hover": "#a6e3c2",
      "primary-container": "#0f5236",
      "on-primary-container": "#abf4cb",
      "primary-soft": "#334b3d",
      "on-primary-soft": "#d2e8d9",
      reward: "#ffb95c",
      "reward-soft": "#6a3c00",
      "on-reward-soft": "#ffddb2",
      success: "#8fd8b0",
      warning: "#ffb95c",
      danger: "#ffb4ab",
      "danger-soft": "#93000a",
      "on-danger-soft": "#ffdad6",
    },
    radius: "16px",
    darkOnly: false,
  },
  {
    id: "paper",
    label: "Paper",
    blurb: "Sand and sepia ink, for long reading",
    light: { background: "#fcf6ed", surface: "#fffcf7", "surface-2": "#f0eae1", line: "#eee0d2", "line-strong": "#d2c4b6", outline: "#817568", foreground: "#1f1b15", muted: "#4f4539", primary: "#7d5636", "primary-hover": "#6d4828", "primary-container": "#ffdcc2", "on-primary-container": "#2b1700", "primary-soft": "#f3dfcd", "on-primary-soft": "#251909", "on-primary": "#ffffff", reward: "#7a5900", "reward-soft": "#ffdea9", "on-reward-soft": "#251a00", success: "#206b3c", warning: "#925400", danger: "#ba1a1a", "danger-soft": "#ffdad6", "on-danger-soft": "#410002" },
    dark: { background: "#17130a", surface: "#231f19", "surface-2": "#2d2923", line: "#3d3328", "line-strong": "#4f4539", outline: "#9b8f81", foreground: "#e7e2d9", muted: "#d2c4b6", primary: "#e5c094", "primary-hover": "#f6d1a4", "primary-container": "#5c421c", "on-primary-container": "#ffddb5", "primary-soft": "#534435", "on-primary-soft": "#f3dfcd", "on-primary": "#432c04", reward: "#efbf65", "reward-soft": "#5d4200", "on-reward-soft": "#ffdea9", success: "#8cd7a0", warning: "#ffb871", danger: "#ffb4ab", "danger-soft": "#93000a", "on-danger-soft": "#ffdad6" },
    radius: "16px",
    darkOnly: false,
  },
  {
    id: "ocean",
    label: "Ocean",
    blurb: "Clear blue on cool grey",
    light: { background: "#f6f9ff", surface: "#ffffff", "surface-2": "#eaeef5", line: "#d9e3f1", "line-strong": "#bdc7d5", outline: "#6f7884", foreground: "#191c21", muted: "#3f4753", primary: "#005fae", "primary-hover": "#005195", "primary-container": "#d8e2ff", "on-primary-container": "#001c3a", "primary-soft": "#dbe3f1", "on-primary-soft": "#151c26", "on-primary": "#ffffff", reward: "#8b5000", "reward-soft": "#ffdcbe", "on-reward-soft": "#291800", success: "#206b3c", warning: "#925400", danger: "#ba1a1a", "danger-soft": "#ffdad6", "on-danger-soft": "#410002" },
    dark: { background: "#101419", surface: "#1d2025", "surface-2": "#272a30", line: "#2d3540", "line-strong": "#3f4753", outline: "#88929e", foreground: "#dfe3ea", muted: "#bdc7d5", primary: "#aec6ff", "primary-hover": "#c8d7ff", "primary-container": "#004785", "on-primary-container": "#d8e2ff", "primary-soft": "#404753", "on-primary-soft": "#dbe3f1", "on-primary": "#00315e", reward: "#ffb871", "reward-soft": "#6a3c00", "on-reward-soft": "#ffdcbe", success: "#8cd7a0", warning: "#ffb871", danger: "#ffb4ab", "danger-soft": "#93000a", "on-danger-soft": "#ffdad6" },
    radius: "16px",
    darkOnly: false,
  },
  {
    id: "terminal",
    label: "Terminal",
    blurb: "Phosphor green on black, monospace (dark only)",
    light: { background: "#081007", surface: "#161b15", "surface-2": "#1e231d", line: "#242f23", "line-strong": "#3e4a3c", outline: "#879485", foreground: "#dde4dc", muted: "#bdcaba", primary: "#5ce060", "primary-hover": "#6ff270", "primary-container": "#005310", "on-primary-container": "#7bfe7b", "primary-soft": "#334d30", "on-primary-soft": "#ccebc7", "on-primary": "#003907", reward: "#dfc745", "reward-soft": "#514700", "on-reward-soft": "#fde261", success: "#5ce060", warning: "#ffb871", danger: "#ffb4ab", "danger-soft": "#93000a", "on-danger-soft": "#ffdad6" },
    dark: { background: "#081007", surface: "#161b15", "surface-2": "#1e231d", line: "#242f23", "line-strong": "#3e4a3c", outline: "#879485", foreground: "#dde4dc", muted: "#bdcaba", primary: "#5ce060", "primary-hover": "#6ff270", "primary-container": "#005310", "on-primary-container": "#7bfe7b", "primary-soft": "#334d30", "on-primary-soft": "#ccebc7", "on-primary": "#003907", reward: "#dfc745", "reward-soft": "#514700", "on-reward-soft": "#fde261", success: "#5ce060", warning: "#ffb871", danger: "#ffb4ab", "danger-soft": "#93000a", "on-danger-soft": "#ffdad6" },
    radius: "10px",
    darkOnly: true,
  },
  {
    id: "sage",
    label: "Sage",
    blurb: "Moss and grey-green. Calm, low glare",
    light: { background: "#f5f7f0", surface: "#fafdf6", "surface-2": "#e9ece5", line: "#dfe5d6", "line-strong": "#c3c9ba", outline: "#74796c", foreground: "#2b2d27", muted: "#44483c", primary: "#526441", "primary-hover": "#445534", "primary-container": "#d5e9c1", "on-primary-container": "#141f00", "primary-soft": "#dfe5d2", "on-primary-soft": "#191d0f", "on-primary": "#fffffe", reward: "#885206", "reward-soft": "#ffdcbc", "on-reward-soft": "#291800", success: "#206b3c", warning: "#925400", danger: "#ba1a1a", "danger-soft": "#ffdad6", "on-danger-soft": "#410002" },
    dark: { background: "#12140d", surface: "#1e201b", "surface-2": "#282b25", line: "#32362b", "line-strong": "#44483c", outline: "#8d9385", foreground: "#d5d8d1", muted: "#c3c9ba", primary: "#b9cda6", "primary-hover": "#cadeb6", "primary-container": "#3b4c2b", "on-primary-container": "#d5e9c1", "primary-soft": "#444939", "on-primary-soft": "#dfe5d2", "on-primary": "#243516", reward: "#feb96f", "reward-soft": "#683d00", "on-reward-soft": "#ffdcbc", success: "#8cd7a0", warning: "#ffb871", danger: "#ffb4ab", "danger-soft": "#93000a", "on-danger-soft": "#ffdad6" },
    radius: "16px",
    darkOnly: false,
  },
  {
    id: "dusk",
    label: "Dusk",
    blurb: "Soft violet evening",
    light: { background: "#fbf8ff", surface: "#ffffff", "surface-2": "#efedf4", line: "#e6e0ef", "line-strong": "#cac4d3", outline: "#7a7582", foreground: "#29272c", muted: "#494551", primary: "#6750a4", "primary-hover": "#574194", "primary-container": "#e9ddff", "on-primary-container": "#150c57", "primary-soft": "#e4e0f3", "on-primary-soft": "#1c1a27", "on-primary": "#ffffff", reward: "#8b5000", "reward-soft": "#ffdcbe", "on-reward-soft": "#291800", success: "#206b3c", warning: "#925400", danger: "#ba1a1a", "danger-soft": "#ffdad6", "on-danger-soft": "#410002" },
    dark: { background: "#151218", surface: "#211f24", "surface-2": "#2b292f", line: "#37333e", "line-strong": "#494551", outline: "#948e9c", foreground: "#dcd9e0", muted: "#cac4d3", primary: "#d2bbff", "primary-hover": "#e0cfff", "primary-container": "#4d388a", "on-primary-container": "#e9ddff", "primary-soft": "#484554", "on-primary-soft": "#e4e0f3", "on-primary": "#322270", reward: "#ffb871", "reward-soft": "#6a3c00", "on-reward-soft": "#ffdcbe", success: "#8cd7a0", warning: "#ffb871", danger: "#ffb4ab", "danger-soft": "#93000a", "on-danger-soft": "#ffdad6" },
    radius: "16px",
    darkOnly: false,
  },
  {
    id: "ember",
    label: "Ember",
    blurb: "Warm orange and clay",
    light: { background: "#fff8f4", surface: "#ffffff", "surface-2": "#f5ece7", line: "#f0dfd5", "line-strong": "#d4c3ba", outline: "#83746b", foreground: "#2d2723", muted: "#51443c", primary: "#9d5600", "primary-hover": "#884a00", "primary-container": "#ffdcc1", "on-primary-container": "#2a1700", "primary-soft": "#f7decf", "on-primary-soft": "#28180c", "on-primary": "#ffffff", reward: "#735c00", "reward-soft": "#ffdf96", "on-reward-soft": "#231b00", success: "#206b3c", warning: "#925400", danger: "#ba1a1a", "danger-soft": "#ffdad6", "on-danger-soft": "#410002" },
    dark: { background: "#19120d", surface: "#241e1b", "surface-2": "#2f2925", line: "#3e322b", "line-strong": "#51443c", outline: "#9d8e85", foreground: "#e1d8d3", muted: "#d4c3ba", primary: "#ffb864", "primary-hover": "#ffce9b", "primary-container": "#663e00", "on-primary-container": "#ffddba", "primary-soft": "#564337", "on-primary-soft": "#f7decf", "on-primary": "#462a00", reward: "#e8c25d", "reward-soft": "#574500", "on-reward-soft": "#ffdf96", success: "#8cd7a0", warning: "#ffb871", danger: "#ffb4ab", "danger-soft": "#93000a", "on-danger-soft": "#ffdad6" },
    radius: "16px",
    darkOnly: false,
  },
] as const satisfies readonly { id: string; label: string; blurb: string; light: Palette; dark: Palette; radius: string; darkOnly: boolean }[];
export type StyleId = (typeof STYLES)[number]["id"];
export const DEFAULT_STYLE: StyleId = "classic";

/** Reading fonts. "default" is the app font (Google Sans). Lexend and Atkinson Hyperlegible are made for easy reading. */
export const FONTS = [
  { id: "default", label: "Google Sans (default)", sample: "Friendly and clear at small sizes" },
  { id: "lexend", label: "Lexend", sample: "Wide, even letter spacing" },
  { id: "atkinson", label: "Atkinson Hyperlegible", sample: "Letters that are hard to confuse" },
  { id: "serif", label: "Serif", sample: "Georgia, like a book" },
] as const;
export type FontId = (typeof FONTS)[number]["id"];
export const DEFAULT_FONT: FontId = "default";

export const FONT_KEY = "habit-font";
export const MOTION_KEY = "habit-motion";
export const GAMIFY_KEY = "habit-gamify";
export const BIONIC_KEY = "habit-bionic";
export const THEME_KEY = "habit-theme";
export const ACCENT_KEY = "habit-accent";
export const STYLE_KEY = "habit-style";
export const THEME_EVENT = "habit-theme-change";

export function parseMode(value: unknown): ThemeMode {
  return THEME_MODES.find((m) => m === value) ?? "system";
}

export function parseAccent(value: unknown): AccentId {
  return ACCENTS.find((a) => a.id === value)?.id ?? DEFAULT_ACCENT;
}

export function parseFont(value: unknown): FontId {
  return FONTS.find((f) => f.id === value)?.id ?? DEFAULT_FONT;
}

/** "on" only for the exact text "on"; anything else (including nothing saved) is off. */
export const parseFlag = (value: unknown): boolean => value === "on";

/** Animations: Auto follows the computer's "reduce motion" setting, On always animates, Off never does. */
export type MotionSetting = "auto" | "on" | "off";
export function parseMotion(value: unknown): MotionSetting {
  return value === "on" || value === "off" ? value : "auto";
}

/** Whether animations run, given the setting and the computer's "reduce motion" preference. */
export const motionEnabled = (setting: MotionSetting, osReduces: boolean): boolean => (setting === "auto" ? !osReduces : setting === "on");

/** Focus reading strength. "on" (saved by an earlier version) means Subtle. */
export type BionicSetting = "off" | "subtle" | "strong";
export function parseBionic(value: unknown): BionicSetting {
  if (value === "strong") return "strong";
  return value === "subtle" || value === "on" ? "subtle" : "off";
}

export function parseStyle(value: unknown): StyleId {
  return STYLES.find((s) => s.id === value)?.id ?? DEFAULT_STYLE;
}

/** The colour scheme actually shown: System means whatever the OS prefers; a dark-only theme is always dark. */
export function resolveMode(mode: ThemeMode, systemDark: boolean, style?: StyleId): "light" | "dark" {
  if (style && STYLES.find((s) => s.id === style)?.darkOnly) return "dark";
  if (mode === "system") return systemDark ? "dark" : "light";
  return mode;
}

/** The CSS custom properties the init script may set inline for a custom theme (cleared on every apply). */
export const CUSTOM_THEME_VARS = [...THEME_TOKENS.map((t) => "--" + t), "--accent", "--on-accent", "--r-sm", "--r-md", "--r-lg", "--r-xl", "--font-ui", "--font-heading", "--font-code"];

/** Custom theme fonts: built-in ids map to these CSS values; any other (safe) name is used as an installed font. */
export const CUSTOM_FONT_CSS: Record<string, string> = {
  googleSans: "var(--font-google-sans)",
  figtree: "var(--font-sans)",
  lexend: "var(--font-lexend)",
  atkinson: "var(--font-atkinson)",
  jetbrains: "var(--font-jetbrains-mono)",
  serif: "Georgia, serif",
  system: "system-ui",
};
/** Custom theme corners: --r-sm / --r-md / --r-lg / --r-xl. "default" leaves the theme's own. */
export const CUSTOM_CORNERS: Record<string, [string, string, string, string]> = {
  sharp: ["0px", "0px", "0px", "0px"],
  round: ["10px", "16px", "24px", "32px"],
};

/**
 * Runs in <head> before the page paints. Sets data-mode (the choice), data-theme (light or dark, resolved),
 * data-accent and data-style (only when not the default; the defaults live in :root). Follows the OS live while the
 * mode is System. Plain ES5; the tests run it against a fake document.
 */
export const THEME_INIT_SCRIPT = `(function(){
var d=document.documentElement,modes=${JSON.stringify(THEME_MODES)},accents=${JSON.stringify(ACCENTS.map((a) => a.id))},styles=${JSON.stringify(STYLES.map((s) => s.id))},fonts=${JSON.stringify(FONTS.map((f) => f.id))},darkOnly=${JSON.stringify(STYLES.filter((s) => s.darkOnly).map((s) => s.id))},tokens=${JSON.stringify(THEME_TOKENS)};
var mq=window.matchMedia("(prefers-color-scheme: dark)"),rm=window.matchMedia("(prefers-reduced-motion: reduce)");
function read(key){try{return localStorage.getItem(key)}catch(e){return null}}
function apply(){
var m=read(${JSON.stringify(THEME_KEY)}),a=read(${JSON.stringify(ACCENT_KEY)}),s=read(${JSON.stringify(STYLE_KEY)});
if(modes.indexOf(m)<0)m="system";
d.setAttribute("data-mode",m);
d.setAttribute("data-theme",darkOnly.indexOf(s)>=0?"dark":m==="system"?(mq.matches?"dark":"light"):m);
if(accents.indexOf(a)>0)d.setAttribute("data-accent",a);else d.removeAttribute("data-accent");
if(styles.indexOf(s)>0)d.setAttribute("data-style",s);else d.removeAttribute("data-style");
var f=read(${JSON.stringify(FONT_KEY)});
if(fonts.indexOf(f)>0)d.setAttribute("data-font",f);else d.removeAttribute("data-font");
if(read(${JSON.stringify(GAMIFY_KEY)})==="on")d.setAttribute("data-gamify","on");else d.removeAttribute("data-gamify");
var mo=read(${JSON.stringify(MOTION_KEY)});
if(mo==="off"||(mo!=="on"&&rm.matches))d.setAttribute("data-motion","off");else d.removeAttribute("data-motion");
var b=read(${JSON.stringify(BIONIC_KEY)});if(b==="on")b="subtle";
if(b==="subtle"||b==="strong")d.setAttribute("data-bionic",b);else d.removeAttribute("data-bionic");
custom();
}
var CV=${JSON.stringify(CUSTOM_THEME_VARS)};
function hex(v){return typeof v==="string"&&/^#[0-9a-fA-F]{6}$/.test(v)}
function lum(h){var c=[1,3,5].map(function(i){var x=parseInt(h.substr(i,2),16)/255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]}
function custom(){
if(!d.style)return;
for(var i=0;i<CV.length;i++)d.style.removeProperty(CV[i]);
var t=null;try{var raw=read("habit-custom-theme");t=raw?JSON.parse(raw):null}catch(e){}
var dk=d.getAttribute("data-theme")==="dark";
var p=t&&t[dk?"dark":"light"];if(!p||typeof p!=="object")p=null;
var dg=p&&hex(p.danger)?p.danger:null;
var pr=p&&hex(p.primary)?p.primary:t&&hex(t.accent)?t.accent:null;
if(pr&&pr!==dg){
  d.style.setProperty("--primary",pr);
  d.style.setProperty("--on-primary",lum(pr)>0.179?"#111111":"#ffffff");
  d.style.setProperty("--primary-hover","color-mix(in oklab, "+pr+" 92%, "+(dk?"white":"black")+")");
  d.style.setProperty("--primary-soft","color-mix(in oklab, "+pr+" 14%, var(--surface))");
  d.style.setProperty("--primary-container","color-mix(in oklab, "+pr+" 25%, var(--background))");
  d.style.setProperty("--on-primary-soft",dk?"#ffffff":"#000000");
  d.style.setProperty("--on-primary-container",dk?"#ffffff":"#000000");
}
if(p){
  tokens.forEach(function(k){if(k!=="primary"&&hex(p[k]))d.style.setProperty("--"+k,p[k])});
  if(hex(p["surface-2"])&&hex(p.line)&&!hex(p["line-strong"]))d.style.setProperty("--line-strong","color-mix(in oklab, "+p.line+" 80%, "+p.foreground+")");
  if(hex(p.reward)&&!hex(p["reward-soft"]))d.style.setProperty("--reward-soft","color-mix(in oklab, "+p.reward+" 16%, var(--surface))");
  if(!hex(p["on-reward-soft"]))d.style.setProperty("--on-reward-soft",hex(p["reward-soft"])&&lum(p["reward-soft"])>0.179?"#000000":"#ffffff");
  if(!hex(p["danger-soft"])&&hex(p.danger))d.style.setProperty("--danger-soft","color-mix(in oklab, "+p.danger+" 15%, var(--background))");
  if(!hex(p["on-danger-soft"]))d.style.setProperty("--on-danger-soft",dk?"#ffffff":"#000000");
  if(!hex(p.outline))d.style.setProperty("--outline","color-mix(in oklab, var(--foreground) 50%, var(--background))");
}
var FC=${JSON.stringify(CUSTOM_FONT_CSS)},fo=t&&t.fonts&&typeof t.fonts==="object"?t.fonts:{};
["ui","heading","code"].forEach(function(k){var v=fo[k],c=typeof v==="string"?(FC.hasOwnProperty(v)?FC[v]:/^[A-Za-z0-9][A-Za-z0-9 ._\\-]{0,60}$/.test(v)?String.fromCharCode(34)+v+String.fromCharCode(34):null):null;
if(c){d.setAttribute("data-"+k+"-font","on");d.style.setProperty("--font-"+k,c)}else d.removeAttribute("data-"+k+"-font")});
var RC=${JSON.stringify(CUSTOM_CORNERS)},co=t&&RC.hasOwnProperty(t.corners)?RC[t.corners]:null;
if(co){d.style.setProperty("--r-sm",co[0]);d.style.setProperty("--r-md",co[1]);d.style.setProperty("--r-lg",co[2]);if(co[3])d.style.setProperty("--r-xl",co[3])}
if(t&&t.density==="compact")d.setAttribute("data-density","compact");else d.removeAttribute("data-density");
var cf=null;try{var fr=read("habit-custom-font");cf=fr?JSON.parse(fr):null}catch(e){}
if(cf&&typeof cf.family==="string"&&/^[A-Za-z0-9][A-Za-z0-9 ._\\-]{0,60}$/.test(cf.family)){d.setAttribute("data-custom-font","on");d.style.setProperty("--font-custom",String.fromCharCode(34)+cf.family+String.fromCharCode(34))}else{d.removeAttribute("data-custom-font");d.style.removeProperty("--font-custom")}
window.__habitCustom=custom;
}
apply();
if(mq.addEventListener)mq.addEventListener("change",function(){if(d.getAttribute("data-mode")==="system")apply()});
if(rm.addEventListener)rm.addEventListener("change",apply);
})();`;

export interface Appearance {
  mode: ThemeMode;
  accent: AccentId;
  style: StyleId;
  font: FontId;
  /** Show XP, levels, streaks and badges */
  gamify: boolean;
  /** Bold the first letters of words in reading areas: off, subtle or strong */
  bionic: BionicSetting;
  motion: MotionSetting;
  /**
   * The custom colour theme (raw JSON from `habit-custom-theme`), travelling in the same record as `style` so the two
   * arrive together (plan 0075). `null` means "off"; left out means "unknown" (old records, the theme picker).
   */
  customTheme?: string | null;
}

/** localStorage key: when this device last changed its appearance (ms, this device's clock). Plan 0075. */
export const APPEARANCE_AT_KEY = "habit-appearance-at";
const CUSTOM_THEME_STORAGE_KEY = "habit-custom-theme";
const MAX_CUSTOM_THEME_CHARS = 4096;

/** A custom theme value is kept only when it is a JSON object of a sane size. */
export function parseCustomThemeValue(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "string" || value.length > MAX_CUSTOM_THEME_CHARS) return null;
  try {
    const v: unknown = JSON.parse(value);
    return v && typeof v === "object" && !Array.isArray(v) ? value : null;
  } catch {
    return null;
  }
}

/** True when two appearance values look the same. An unknown custom theme on either side is not compared. */
export function sameAppearance(a: Appearance, b: Appearance): boolean {
  const base =
    a.mode === b.mode &&
    a.accent === b.accent &&
    a.style === b.style &&
    a.font === b.font &&
    a.gamify === b.gamify &&
    a.bionic === b.bionic &&
    a.motion === b.motion;
  if (!base) return false;
  if (a.customTheme === undefined || b.customTheme === undefined) return true;
  return a.customTheme === b.customTheme;
}

export const DEFAULT_APPEARANCE: Appearance = {
  mode: "system",
  accent: DEFAULT_ACCENT,
  style: DEFAULT_STYLE,
  font: DEFAULT_FONT,
  gamify: false,
  bionic: "off",
  motion: "auto",
};

export function parseAppearance(raw: unknown): Appearance {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_APPEARANCE };
  const obj = raw as Record<string, unknown>;
  const out: Appearance = {
    mode: parseMode(obj.mode),
    accent: parseAccent(obj.accent),
    style: parseStyle(obj.style),
    font: parseFont(obj.font),
    gamify: Boolean(obj.gamify),
    bionic: parseBionic(obj.bionic),
    motion: parseMotion(obj.motion),
  };
  const custom = parseCustomThemeValue(obj.customTheme);
  if (custom !== undefined) out.customTheme = custom;
  return out;
}

export function readStoredAppearance(): Appearance | null {
  try {
    const mode = localStorage.getItem(THEME_KEY);
    const accent = localStorage.getItem(ACCENT_KEY);
    const style = localStorage.getItem(STYLE_KEY);
    const font = localStorage.getItem(FONT_KEY);
    const gamify = localStorage.getItem(GAMIFY_KEY);
    const bionic = localStorage.getItem(BIONIC_KEY);
    const motion = localStorage.getItem(MOTION_KEY);
    const custom = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);

    if (mode === null && accent === null && style === null && font === null && gamify === null && bionic === null && motion === null && custom === null) {
      return null;
    }

    return {
      customTheme: parseCustomThemeValue(custom) ?? null,
      mode: parseMode(mode),
      accent: parseAccent(accent),
      style: parseStyle(style),
      font: parseFont(font),
      gamify: gamify === "on",
      bionic: parseBionic(bionic),
      motion: parseMotion(motion),
    };
  } catch {
    return null;
  }
}

/** Browser only: saves the choice and applies it right away. */
export function applyTheme({ mode, accent, style, font, gamify, bionic, motion, customTheme }: Appearance): void {
  const root = document.documentElement;
  try {
    if (customTheme === null) localStorage.removeItem(CUSTOM_THEME_STORAGE_KEY);
    else if (typeof customTheme === "string") localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, customTheme);
    localStorage.setItem(THEME_KEY, mode);
    localStorage.setItem(ACCENT_KEY, accent);
    localStorage.setItem(STYLE_KEY, style);
    localStorage.setItem(FONT_KEY, font);
    localStorage.setItem(GAMIFY_KEY, gamify ? "on" : "off");
    localStorage.setItem(BIONIC_KEY, bionic);
    localStorage.setItem(MOTION_KEY, motion);
  } catch {
    // Storage can be blocked; the choice then lasts until reload.
  }
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-mode", mode);
  root.setAttribute("data-theme", resolveMode(mode, dark, style));
  if (accent === DEFAULT_ACCENT) root.removeAttribute("data-accent");
  else root.setAttribute("data-accent", accent);
  if (style === DEFAULT_STYLE) root.removeAttribute("data-style");
  else root.setAttribute("data-style", style);
  if (font === DEFAULT_FONT) root.removeAttribute("data-font");
  else root.setAttribute("data-font", font);
  if (gamify) root.setAttribute("data-gamify", "on");
  else root.removeAttribute("data-gamify");
  if (bionic === "off") root.removeAttribute("data-bionic");
  else root.setAttribute("data-bionic", bionic);
  const reduces = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (motionEnabled(motion, reduces)) root.removeAttribute("data-motion");
  else root.setAttribute("data-motion", "off");
  (window as unknown as { __habitCustom?: () => void }).__habitCustom?.();
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** The appearance record kept on the server: the prefs and when they were chosen (ms). */
export interface AppearanceRecord {
  prefs: Appearance;
  at: number;
}

/**
 * What a device does after reading the server record (plan 0075). Newest wins by `at`; a failed read changes
 * nothing; a device that has values but never stamped them (old install, first link) takes the server's.
 */
export function appearanceDecision(
  local: Appearance | null,
  localAt: number | null,
  server: AppearanceRecord | null | "error",
): "apply" | "push" | "none" {
  if (server === "error") return "none";
  if (!local) return server ? "apply" : "none";
  if (!server) return "push";
  if (sameAppearance(local, server.prefs)) return "none";
  if (localAt === null) return "apply";
  return localAt > server.at ? "push" : "apply";
}
