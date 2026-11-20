"use client";

import { useSyncExternalStore } from "react";
import {
  ACCENTS,
  DEFAULT_ACCENT,
  FONTS,
  STYLES,
  THEME_EVENT,
  THEME_MODES,
  applyTheme,
  MOTION_KEY,
  parseAccent,
  parseBionic,
  parseFont,
  parseMode,
  parseMotion,
  parseStyle,
  type AccentId,
  type Appearance,
  type BionicSetting,
  type FontId,
  type MotionSetting,
  type StyleId,
  type ThemeMode,
} from "@/lib/theme";

const MODE_LABEL: Record<ThemeMode, string> = { system: "System", light: "Light", dark: "Dark" };

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    observer.disconnect();
  };
}

const attr = (name: string) => document.documentElement.getAttribute(name);
const readMode = () => parseMode(attr("data-mode"));
const readAccent = () => parseAccent(attr("data-accent"));
const readStyle = () => parseStyle(attr("data-style"));
const readFont = () => parseFont(attr("data-font"));
const readScheme = () => (attr("data-theme") === "dark" ? "dark" : "light");
const readGamify = () => attr("data-gamify") === "on";
const readBionic = () => parseBionic(attr("data-bionic"));
const readMotion = (): MotionSetting => {
  try {
    return parseMotion(localStorage.getItem(MOTION_KEY));
  } catch {
    return "auto";
  }
};

/** Appearance and reading settings with Expressive styling and Material 3 switches. */
export function ThemePicker() {
  const mode = useSyncExternalStore(subscribe, readMode, () => "system" as ThemeMode);
  const accent = useSyncExternalStore(subscribe, readAccent, () => "green" as AccentId);
  const style = useSyncExternalStore(subscribe, readStyle, () => "classic" as StyleId);
  const font = useSyncExternalStore(subscribe, readFont, () => "default" as FontId);
  const scheme = useSyncExternalStore(subscribe, readScheme, () => "light" as const);
  const gamify = useSyncExternalStore(subscribe, readGamify, () => false);
  const bionic = useSyncExternalStore(subscribe, readBionic, () => "off" as BionicSetting);
  const motion = useSyncExternalStore(subscribe, readMotion, () => "auto" as MotionSetting);
  const current: Appearance = { mode, accent, style, font, gamify, bionic, motion };

  const pill = (active: boolean) =>
    `h-10 rounded-full px-4 text-sm font-medium transition-colors ${
      active ? "bg-primary-soft text-on-primary-soft" : "text-muted hover:text-foreground"
    }`;

  return (
    <div className="space-y-6">
      {/* Light or dark */}
      <div>
        <p id="theme-mode-label" className="mb-2 text-sm font-medium">
          Light or dark
        </p>
        <div
          role="radiogroup"
          aria-labelledby="theme-mode-label"
          className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-surface-2 p-1"
        >
          {THEME_MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => applyTheme({ ...current, mode: m })}
              className={pill(mode === m)}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Swatches (min 104px auto-fill grid) */}
      <div>
        <p id="theme-style-label" className="mb-2 text-sm font-medium">
          Theme presets
        </p>
        <div
          role="radiogroup"
          aria-labelledby="theme-style-label"
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,104px),1fr))] gap-2.5"
        >
          {STYLES.map((s) => {
            const p = s[scheme];
            const selected = style === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => applyTheme({ ...current, style: s.id, customTheme: null })}
                className={`flex min-w-0 flex-col items-center gap-2 rounded-[24px] border-2 px-2 py-3 transition-colors ${
                  selected ? "border-primary bg-primary-soft" : "border-transparent bg-background hover:bg-surface-2"
                }`}
              >
                <span aria-hidden="true" className="flex size-14 shrink-0 overflow-hidden rounded-full border border-line">
                  <span className="flex-1 h-full" style={{ background: p.primary }} />
                  <span className="flex-1 h-full" style={{ background: p["primary-container"] }} />
                </span>
                <span className="text-center text-sm leading-tight font-medium text-foreground">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-muted">
          Presets use your current light or dark choice. Picking one turns off your own theme. Sage, Dusk and Ember provide soft, low-glare palettes meeting AA contrast.
        </p>
      </div>

      {/* Accent colour */}
      <div>
        <p id="theme-accent-label" className="mb-2 text-sm font-medium">
          Accent colour
        </p>
        <div role="radiogroup" aria-labelledby="theme-accent-label" className="flex flex-wrap gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={accent === a.id}
              onClick={() => applyTheme({ ...current, accent: a.id, customTheme: null })}
              className={`flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                accent === a.id ? "border-primary bg-primary-soft text-on-primary-soft" : "border-line-strong text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <span
                aria-hidden
                className="size-3.5 rounded-full"
                style={{
                  background:
                    a.id === DEFAULT_ACCENT
                      ? STYLES.find((s) => s.id === style)![scheme].primary
                      : scheme === "dark"
                        ? a.dark
                        : a.color,
                }}
              />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reading font */}
      <div>
        <p id="theme-font-label" className="mb-2 text-sm font-medium">
          Reading font
        </p>
        <div role="radiogroup" aria-labelledby="theme-font-label" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-2">
          {FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={font === f.id}
              onClick={() => applyTheme({ ...current, font: f.id })}
              className={`rounded-[20px] border p-3.5 text-left text-sm transition-colors ${
                font === f.id ? "border-primary bg-primary-soft text-on-primary-soft" : "border-line bg-surface hover:bg-surface-2"
              }`}
              style={{ fontFamily: FONT_CSS[f.id] }}
            >
              <span className="block font-medium">{f.label}</span>
              <span className="block text-xs opacity-80">{f.sample}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Focus reading */}
      <div>
        <p id="theme-bionic-label" className="mb-2 text-sm font-medium">
          Focus reading
        </p>
        <div
          role="radiogroup"
          aria-labelledby="theme-bionic-label"
          className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-surface-2 p-1"
        >
          {(["off", "subtle", "strong"] as const).map((level) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={bionic === level}
              onClick={() => applyTheme({ ...current, bionic: level })}
              className={pill(bionic === level)}
            >
              {level === "off" ? "Off" : level === "subtle" ? "Subtle" : "Strong"}
            </button>
          ))}
        </div>
      </div>

      {/* Play: game features and motion */}
      <div className="space-y-4 border-t border-line pt-5">
        <p className="text-base font-medium">Play</p>
        <M3Switch
          label="XP, levels and badges"
          on={gamify}
          onChange={(v) => applyTheme({ ...current, gamify: v })}
          text="Turn off for a quiet, numbers-free app. Off by default."
        />
      <div>
        <p id="theme-motion-label" className="mb-1 text-sm font-medium">
          Animations
        </p>
        <p className="mb-2 text-sm text-muted">Auto follows your system&apos;s reduce-motion setting.</p>
        <div
          role="radiogroup"
          aria-labelledby="theme-motion-label"
          className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-surface-2 p-1"
        >
          {(["auto", "on", "off"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={motion === m}
              onClick={() => applyTheme({ ...current, motion: m })}
              className={pill(motion === m)}
            >
              {m === "auto" ? "Auto" : m === "on" ? "On" : "Off"}
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

const FONT_CSS: Record<FontId, string> = {
  default: "var(--font-figtree), system-ui, sans-serif",
  lexend: "var(--font-lexend), system-ui, sans-serif",
  atkinson: "var(--font-atkinson), system-ui, sans-serif",
  serif: 'Georgia, "Times New Roman", serif',
};

function M3Switch({
  label,
  on,
  onChange,
  text,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
  text: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{label}</p>
        <p className="mt-0.5 text-sm text-muted">{text}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative flex h-8 w-[52px] shrink-0 items-center rounded-full border-2 px-[2px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          on ? "justify-end border-primary bg-primary" : "justify-start border-outline bg-surface-2"
        }`}
      >
        <span className={`rounded-full ${on ? "size-6 bg-on-primary" : "mx-1 size-4 bg-outline"}`} />
      </button>
    </div>
  );
}
