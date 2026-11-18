// Appearance: light / dark / system, an accent colour, and a style (a whole-UI look). Stored in the browser
// (localStorage) and applied to <html> by a tiny inline script before first paint, so the page never flashes the wrong
// colours. No `server-only`: the layout, the settings picker and the tests all import this.
//
// The colours below are the ones in globals.css (a test keeps them equal), so the picker previews show exactly
// what you get.

export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/**
 * One colour each, the same in light and dark. The default ("green", the stored id since before themes had their own
 * colour) keeps the theme's own primary: green in Dojo, orange in Ember and so on. `color` is Dojo's green.
 */
export const ACCENTS = [
  { id: "green", label: "Theme colour", color: "#2f7d5b" },
  { id: "blue", label: "Blue", color: "#2f6fe0" },
  { id: "violet", label: "Violet", color: "#7c4dde" },
  { id: "amber", label: "Amber", color: "#b8590a" },
  { id: "rose", label: "Rose", color: "#d6285a" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];
export const DEFAULT_ACCENT: AccentId = "green";

/** Every colour token a theme sets (DESIGN.md). The CSS variable is `--` + the name. */
export const THEME_TOKENS = ["background", "surface", "surface-2", "line", "line-strong", "foreground", "muted", "primary", "primary-hover", "primary-soft", "on-primary", "reward", "reward-soft", "success", "warning", "danger"] as const;
export type ThemeToken = (typeof THEME_TOKENS)[number];
export type Palette = Record<ThemeToken, string>;

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
    light: { background: "#f7f7f5", surface: "#ffffff", "surface-2": "#efefeb", line: "#e4e4e0", "line-strong": "#d3d3ce", foreground: "#1a1a1a", muted: "#66665f", primary: "#2f7d5b", "primary-hover": "#256a4c", "primary-soft": "#e3f0e8", "on-primary": "#ffffff", reward: "#e8a317", "reward-soft": "#fdf1d6", success: "#2e7d4f", warning: "#9a6210", danger: "#b8322a" },
    dark: { background: "#111211", surface: "#1a1b1a", "surface-2": "#222322", line: "#2c2d2b", "line-strong": "#3b3d3a", foreground: "#ececea", muted: "#9a9a94", primary: "#5bb98a", "primary-hover": "#73c69c", "primary-soft": "#1d3328", "on-primary": "#0b1a12", reward: "#f2b63c", "reward-soft": "#33280f", success: "#5cb884", warning: "#e0a23a", danger: "#ef6f64" },
    radius: "0.625rem",
    darkOnly: false,
  },
  {
    id: "paper",
    label: "Paper",
    blurb: "Black on cream, like a book",
    light: { background: "#fbf8f1", surface: "#fffdf8", "surface-2": "#f2ede1", line: "#e6dfcf", "line-strong": "#d4cbb6", foreground: "#1f1a14", muted: "#6b6152", primary: "#1f1a14", "primary-hover": "#3a3227", "primary-soft": "#efe9dc", "on-primary": "#fbf8f1", reward: "#e8a317", "reward-soft": "#fdf1d6", success: "#2e7d4f", warning: "#9a6210", danger: "#b8322a" },
    dark: { background: "#1a1713", surface: "#221e19", "surface-2": "#2a251f", line: "#363028", "line-strong": "#463f35", foreground: "#efe7d6", muted: "#b0a48e", primary: "#efe7d6", "primary-hover": "#d9d0be", "primary-soft": "#332d24", "on-primary": "#1a1713", reward: "#f2b63c", "reward-soft": "#33280f", success: "#5cb884", warning: "#e0a23a", danger: "#ef6f64" },
    radius: "0.375rem",
    darkOnly: false,
  },
  {
    id: "ocean",
    label: "Ocean",
    blurb: "Cool blue, clear",
    light: { background: "#f4f7fa", surface: "#ffffff", "surface-2": "#e9eef4", line: "#dce3ec", "line-strong": "#c8d2df", foreground: "#14213a", muted: "#56657a", primary: "#2563b8", "primary-hover": "#1e529a", "primary-soft": "#e0eaf7", "on-primary": "#ffffff", reward: "#e8a317", "reward-soft": "#fdf1d6", success: "#2e7d4f", warning: "#9a6210", danger: "#b8322a" },
    dark: { background: "#0d131c", surface: "#141c27", "surface-2": "#1b2431", line: "#253041", "line-strong": "#34425a", foreground: "#e4ecf8", muted: "#93a3ba", primary: "#6ea2f0", "primary-hover": "#8ab5f4", "primary-soft": "#18283f", "on-primary": "#0a1424", reward: "#f2b63c", "reward-soft": "#33280f", success: "#5cb884", warning: "#e0a23a", danger: "#ef6f64" },
    radius: "0.75rem",
    darkOnly: false,
  },
  {
    id: "terminal",
    label: "Terminal",
    blurb: "Green on black, monospace, square corners (dark only)",
    light: { background: "#0e110e", surface: "#131813", "surface-2": "#192019", line: "#223022", "line-strong": "#2e402e", foreground: "#c8f5c8", muted: "#7fae7f", primary: "#4ade80", "primary-hover": "#6ee79a", "primary-soft": "#143220", "on-primary": "#052e12", reward: "#f2b63c", "reward-soft": "#2e2a0f", success: "#4ade80", warning: "#e0b23a", danger: "#f07a6e" },
    dark: { background: "#0e110e", surface: "#131813", "surface-2": "#192019", line: "#223022", "line-strong": "#2e402e", foreground: "#c8f5c8", muted: "#7fae7f", primary: "#4ade80", "primary-hover": "#6ee79a", "primary-soft": "#143220", "on-primary": "#052e12", reward: "#f2b63c", "reward-soft": "#2e2a0f", success: "#4ade80", warning: "#e0b23a", danger: "#f07a6e" },
    radius: "0",
    darkOnly: true,
  },
  {
    id: "sage",
    label: "Sage",
    blurb: "Soft green-grey. Calm, low glare",
    light: { background: "#e9efe7", surface: "#f6f9f4", "surface-2": "#dfe7dc", line: "#cbd8c8", "line-strong": "#b7c7b3", foreground: "#1c2a21", muted: "#4a5d50", primary: "#276b4d", "primary-hover": "#1f5a40", "primary-soft": "#d5e6da", "on-primary": "#ffffff", reward: "#e8a317", "reward-soft": "#fdf1d6", success: "#2a7348", warning: "#8e5a0e", danger: "#a82d25" },
    dark: { background: "#17201b", surface: "#1e2923", "surface-2": "#25312a", line: "#2f3f35", "line-strong": "#3e5045", foreground: "#dbe7de", muted: "#9db3a3", primary: "#6cc59a", "primary-hover": "#86d1ac", "primary-soft": "#21382b", "on-primary": "#0b1a12", reward: "#f2b63c", "reward-soft": "#33280f", success: "#66be8c", warning: "#e0a23a", danger: "#ef7a70" },
    radius: "0.625rem",
    darkOnly: false,
  },
  {
    id: "dusk",
    label: "Dusk",
    blurb: "Muted violet evening",
    light: { background: "#f7f5f9", surface: "#fdfcfe", "surface-2": "#eeeaf3", line: "#e2ddea", "line-strong": "#d0c9dc", foreground: "#2a2438", muted: "#645c74", primary: "#6b4fb8", "primary-hover": "#5a41a0", "primary-soft": "#ece6f7", "on-primary": "#ffffff", reward: "#e8a317", "reward-soft": "#fdf1d6", success: "#2e7d4f", warning: "#9a6210", danger: "#b8322a" },
    dark: { background: "#15131a", surface: "#1d1a24", "surface-2": "#25212e", line: "#302b3a", "line-strong": "#403a4d", foreground: "#e2ddeb", muted: "#a39cb2", primary: "#b49af0", "primary-hover": "#c5b0f4", "primary-soft": "#2a2240", "on-primary": "#170f2a", reward: "#f2b63c", "reward-soft": "#33280f", success: "#5cb884", warning: "#e0a23a", danger: "#ef6f64" },
    radius: "0.625rem",
    darkOnly: false,
  },
  {
    id: "ember",
    label: "Ember",
    blurb: "Warm paper and orange",
    light: { background: "#faf7f2", surface: "#fffdf9", "surface-2": "#f1ebe1", line: "#e6ded1", "line-strong": "#d6cbb9", foreground: "#3a2c1e", muted: "#6e5d4c", primary: "#c2481b", "primary-hover": "#a63c15", "primary-soft": "#f8e4d9", "on-primary": "#ffffff", reward: "#e8a317", "reward-soft": "#fdf1d6", success: "#2e7d4f", warning: "#9a6210", danger: "#b8322a" },
    dark: { background: "#171310", surface: "#201a16", "surface-2": "#29221c", line: "#352c25", "line-strong": "#463b32", foreground: "#e8dcc8", muted: "#a8998a", primary: "#f08a5d", "primary-hover": "#f4a27d", "primary-soft": "#3a2318", "on-primary": "#1f0d05", reward: "#f2b63c", "reward-soft": "#33280f", success: "#5cb884", warning: "#e0a23a", danger: "#ef6f64" },

    radius: "0.625rem",
    darkOnly: false,
  },
] as const satisfies readonly { id: string; label: string; blurb: string; light: Palette; dark: Palette; radius: string; darkOnly: boolean }[];
export type StyleId = (typeof STYLES)[number]["id"];
export const DEFAULT_STYLE: StyleId = "classic";

/** Reading fonts. "default" is the app font (Figtree). Lexend and Atkinson Hyperlegible are made for easy reading. */
export const FONTS = [
  { id: "default", label: "Figtree (default)", sample: "Friendly and clear at small sizes" },
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
export const CUSTOM_THEME_VARS = [...THEME_TOKENS.map((t) => "--" + t), "--accent", "--on-accent", "--r-sm", "--r-md", "--r-lg", "--font-ui", "--font-heading", "--font-code"];

/** Custom theme fonts: built-in ids map to these CSS values; any other (safe) name is used as an installed font. */
export const CUSTOM_FONT_CSS: Record<string, string> = {
  figtree: "var(--font-figtree)",
  lexend: "var(--font-lexend)",
  atkinson: "var(--font-atkinson)",
  jetbrains: "var(--font-jetbrains-mono)",
  serif: "Georgia, serif",
  system: "system-ui",
};
/** Custom theme corners: --r-sm / --r-md / --r-lg. "default" leaves the theme's own. */
export const CUSTOM_CORNERS: Record<string, [string, string, string]> = { sharp: ["0px", "0px", "0px"], round: ["8px", "14px", "20px"] };

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
var pr=p&&hex(p.primary)?p.primary:t&&hex(t.accent)?t.accent:null;
if(pr){d.style.setProperty("--primary",pr);d.style.setProperty("--on-primary",lum(pr)>0.179?"#111111":"#ffffff");d.style.setProperty("--primary-hover","color-mix(in oklab, "+pr+" 92%, "+(dk?"white":"black")+")");d.style.setProperty("--primary-soft","color-mix(in oklab, "+pr+" 14%, var(--surface))")}
if(p){tokens.forEach(function(k){if(k!=="primary"&&hex(p[k]))d.style.setProperty("--"+k,p[k])});
if(hex(p["surface-2"])&&hex(p.line)&&!hex(p["line-strong"]))d.style.setProperty("--line-strong","color-mix(in oklab, "+p.line+" 80%, "+p.foreground+")");
if(hex(p.reward)&&!hex(p["reward-soft"]))d.style.setProperty("--reward-soft","color-mix(in oklab, "+p.reward+" 16%, var(--surface))")}
var FC=${JSON.stringify(CUSTOM_FONT_CSS)},fo=t&&t.fonts&&typeof t.fonts==="object"?t.fonts:{};
["ui","heading","code"].forEach(function(k){var v=fo[k],c=typeof v==="string"?(FC.hasOwnProperty(v)?FC[v]:/^[A-Za-z0-9][A-Za-z0-9 ._\\-]{0,60}$/.test(v)?String.fromCharCode(34)+v+String.fromCharCode(34):null):null;
if(c){d.setAttribute("data-"+k+"-font","on");d.style.setProperty("--font-"+k,c)}else d.removeAttribute("data-"+k+"-font")});
var RC=${JSON.stringify(CUSTOM_CORNERS)},co=t&&RC.hasOwnProperty(t.corners)?RC[t.corners]:null;
if(co){d.style.setProperty("--r-sm",co[0]);d.style.setProperty("--r-md",co[1]);d.style.setProperty("--r-lg",co[2])}
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
