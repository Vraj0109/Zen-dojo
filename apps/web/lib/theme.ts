// Appearance: light / dark / system, an accent colour, and a style (a whole-UI look). Stored in the browser
// (localStorage) and applied to <html> by a tiny inline script before first paint, so the page never flashes the wrong
// colours. No `server-only`: the layout, the settings picker and the tests all import this.
//
// The colours below are the ones in globals.css (a test keeps them equal), so the picker previews show exactly
// what you get.

export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** One colour each, the same in light and dark. */
export const ACCENTS = [
  { id: "green", label: "Green", color: "#2f7d5b" },
  { id: "blue", label: "Blue", color: "#2f6fe0" },
  { id: "violet", label: "Violet", color: "#7c4dde" },
  { id: "amber", label: "Amber", color: "#b8590a" },
  { id: "rose", label: "Rose", color: "#d6285a" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];
export const DEFAULT_ACCENT: AccentId = "green";

interface Palette {
  background: string;
  foreground: string;
  surface: string;
  line: string;
  muted: string;
}

/** Whole-UI looks. They change surfaces, text, corner roundness and (Paper, Terminal) the font. */
export const STYLES = [
  {
    id: "classic",
    label: "Classic",
    blurb: "Neutral greys, rounded cards",
    light: { background: "#f7f7f5", foreground: "#1a1a1a", surface: "#ffffff", line: "#e4e4e0", muted: "#6b6b66" },
    dark: { background: "#111211", foreground: "#ececea", surface: "#1a1b1a", line: "#2c2d2b", muted: "#9a9a94" },
    radius: "0.75rem",
  },
  {
    id: "paper",
    label: "Paper",
    blurb: "Warm paper, serif text, small corners",
    light: { background: "#f6f1e7", foreground: "#2b2418", surface: "#fffaf0", line: "#e3d9c4", muted: "#75684f" },
    dark: { background: "#1c1812", foreground: "#efe7d6", surface: "#26211a", line: "#3a3327", muted: "#b3a688" },
    radius: "0.375rem",
  },
  {
    id: "ocean",
    label: "Ocean",
    blurb: "Cool blue-grey, very round",
    light: { background: "#eef3f9", foreground: "#14213a", surface: "#ffffff", line: "#d5e0ee", muted: "#5a6b82" },
    dark: { background: "#0b1220", foreground: "#e4ecf8", surface: "#121b2e", line: "#22304a", muted: "#8fa3c2" },
    radius: "1rem",
  },
  {
    id: "terminal",
    label: "Terminal",
    blurb: "Green on black, monospace, square corners",
    light: { background: "#f2f5f2", foreground: "#0f1a0f", surface: "#ffffff", line: "#c9d4c9", muted: "#5b6b5b" },
    dark: { background: "#060906", foreground: "#c8f5c8", surface: "#0c120c", line: "#1d2b1d", muted: "#6fa06f" },
    radius: "0",
  },
  {
    id: "sage",
    label: "Sage",
    blurb: "Soft green-grey. Calm, low glare",
    light: { background: "#e9efe7", foreground: "#1c2a21", surface: "#f6f9f4", line: "#cbd8c8", muted: "#4a5d50" },
    dark: { background: "#17201b", foreground: "#dbe7de", surface: "#1e2923", line: "#2f3f35", muted: "#9db3a3" },
    radius: "0.625rem",
  },
  {
    id: "dusk",
    label: "Dusk",
    blurb: "Slate blue-grey. Cool, even light",
    light: { background: "#e8edf3", foreground: "#1b2533", surface: "#f5f8fb", line: "#cdd7e3", muted: "#4b5a70" },
    dark: { background: "#1b222c", foreground: "#d5dde8", surface: "#232c38", line: "#34404f", muted: "#9aa9bd" },
    radius: "0.625rem",
  },
  {
    id: "ember",
    label: "Ember",
    blurb: "Warm cream and brown. Less blue light",
    light: { background: "#f3e9d9", foreground: "#3a2c1e", surface: "#faf3e6", line: "#dccdb2", muted: "#6a5640" },
    dark: { background: "#1a1511", foreground: "#e8dcc8", surface: "#231d17", line: "#3a3026", muted: "#b09f86" },
    radius: "0.5rem",
  },
] as const satisfies readonly { id: string; label: string; blurb: string; light: Palette; dark: Palette; radius: string }[];
export type StyleId = (typeof STYLES)[number]["id"];
export const DEFAULT_STYLE: StyleId = "classic";

/** Reading fonts. "default" is the app font (Geist). Lexend and Atkinson Hyperlegible are made for easy reading. */
export const FONTS = [
  { id: "default", label: "Default", sample: "Geist" },
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

/** The colour scheme actually shown: System means whatever the OS prefers. */
export function resolveMode(mode: ThemeMode, systemDark: boolean): "light" | "dark" {
  if (mode === "system") return systemDark ? "dark" : "light";
  return mode;
}

/**
 * Runs in <head> before the page paints. Sets data-mode (the choice), data-theme (light or dark, resolved),
 * data-accent and data-style (only when not the default; the defaults live in :root). Follows the OS live while the
 * mode is System. Plain ES5; the tests run it against a fake document.
 */
export const THEME_INIT_SCRIPT = `(function(){
var d=document.documentElement,modes=${JSON.stringify(THEME_MODES)},accents=${JSON.stringify(ACCENTS.map((a) => a.id))},styles=${JSON.stringify(STYLES.map((s) => s.id))},fonts=${JSON.stringify(FONTS.map((f) => f.id))};
var mq=window.matchMedia("(prefers-color-scheme: dark)"),rm=window.matchMedia("(prefers-reduced-motion: reduce)");
function read(key){try{return localStorage.getItem(key)}catch(e){return null}}
function apply(){
var m=read(${JSON.stringify(THEME_KEY)}),a=read(${JSON.stringify(ACCENT_KEY)}),s=read(${JSON.stringify(STYLE_KEY)});
if(modes.indexOf(m)<0)m="system";
d.setAttribute("data-mode",m);
d.setAttribute("data-theme",m==="system"?(mq.matches?"dark":"light"):m);
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
var CV=["--accent","--on-accent","--background","--surface","--foreground","--line","--muted"];
function hex(v){return typeof v==="string"&&/^#[0-9a-fA-F]{6}$/.test(v)}
function lum(h){var c=[1,3,5].map(function(i){var x=parseInt(h.substr(i,2),16)/255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]}
function custom(){
if(!d.style)return;
for(var i=0;i<CV.length;i++)d.style.removeProperty(CV[i]);
var t=null;try{var raw=read("habit-custom-theme");t=raw?JSON.parse(raw):null}catch(e){}
if(t&&hex(t.accent)){d.style.setProperty("--accent",t.accent);d.style.setProperty("--on-accent",lum(t.accent)>0.179?"#111111":"#ffffff")}
var p=t&&t[d.getAttribute("data-theme")==="dark"?"dark":"light"];
if(p)["background","surface","foreground","line","muted"].forEach(function(k){if(hex(p[k]))d.style.setProperty("--"+k,p[k])});
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
  return {
    mode: parseMode(obj.mode),
    accent: parseAccent(obj.accent),
    style: parseStyle(obj.style),
    font: parseFont(obj.font),
    gamify: Boolean(obj.gamify),
    bionic: parseBionic(obj.bionic),
    motion: parseMotion(obj.motion),
  };
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

    if (mode === null && accent === null && style === null && font === null && gamify === null && bionic === null && motion === null) {
      return null;
    }

    return {
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
export function applyTheme({ mode, accent, style, font, gamify, bionic, motion }: Appearance): void {
  const root = document.documentElement;
  try {
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
  root.setAttribute("data-theme", resolveMode(mode, dark));
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
