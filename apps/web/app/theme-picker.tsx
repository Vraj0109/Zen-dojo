"use client";

import { useSyncExternalStore } from "react";
import {
  ACCENTS,
  FONTS,
  STYLES,
  THEME_EVENT,
  THEME_MODES,
  applyTheme,
  parseAccent,
  parseBionic,
  parseFont,
  parseMode,
  parseStyle,
  type AccentId,
  type Appearance,
  type BionicSetting,
  type FontId,
  type StyleId,
  type ThemeMode,
} from "@/lib/theme";

const MODE_LABEL: Record<ThemeMode, string> = { system: "System", light: "Light", dark: "Dark" };

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  // The OS scheme can change while on System; the inline script then updates data-theme, which the previews follow.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    observer.disconnect();
  };
}

// The <html> attributes (set by the inline script before paint) are the source of truth. On the server, and during
// hydration, the defaults are used and React then re-renders with the real values.
const attr = (name: string) => document.documentElement.getAttribute(name);
const readMode = () => parseMode(attr("data-mode"));
const readAccent = () => parseAccent(attr("data-accent"));
const readStyle = () => parseStyle(attr("data-style"));
const readFont = () => parseFont(attr("data-font"));
const readScheme = () => (attr("data-theme") === "dark" ? "dark" : "light");
const readGamify = () => attr("data-gamify") === "on";
const readBionic = () => parseBionic(attr("data-bionic"));

/** Appearance and reading settings. Needs JavaScript; saved in this browser or app window, not in backups. */
export function ThemePicker() {
  const mode = useSyncExternalStore(subscribe, readMode, () => "system" as ThemeMode);
  const accent = useSyncExternalStore(subscribe, readAccent, () => "green" as AccentId);
  const style = useSyncExternalStore(subscribe, readStyle, () => "classic" as StyleId);
  const font = useSyncExternalStore(subscribe, readFont, () => "default" as FontId);
  const scheme = useSyncExternalStore(subscribe, readScheme, () => "light" as const);
  const gamify = useSyncExternalStore(subscribe, readGamify, () => false);
  const bionic = useSyncExternalStore(subscribe, readBionic, () => "off" as BionicSetting);
  const current: Appearance = { mode, accent, style, font, gamify, bionic };
  const accentColor = ACCENTS.find((a) => a.id === accent)!.color;

  const pill = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm font-medium ${active ? "border-accent bg-accent text-on-accent" : "border-line hover:bg-background"}`;

  return (
    <div className="space-y-6">
      <div>
        <p id="theme-mode-label" className="mb-2 text-sm font-medium">
          Light or dark
        </p>
        <div role="radiogroup" aria-labelledby="theme-mode-label" className="flex flex-wrap gap-2">
          {THEME_MODES.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => applyTheme({ ...current, mode: m })} className={pill(mode === m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p id="theme-style-label" className="mb-2 text-sm font-medium">
          Style
        </p>
        <div role="radiogroup" aria-labelledby="theme-style-label" className="grid gap-3 sm:grid-cols-2">
          {STYLES.map((s) => {
            const p = s[scheme];
            const selected = style === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => applyTheme({ ...current, style: s.id })}
                className={`overflow-hidden border-2 text-left ${selected ? "border-accent" : "border-line"}`}
                style={{ background: p.background, borderRadius: s.radius, color: p.foreground }}
              >
                <span className="block p-3">
                  <span className="block p-3" style={{ background: p.surface, border: `1px solid ${p.line}`, borderRadius: s.radius }}>
                    <span className="block text-sm font-semibold">{s.label}</span>
                    <span className="mt-0.5 block text-xs" style={{ color: p.muted }}>
                      {s.blurb}
                    </span>
                    <span className="mt-2 inline-block px-2.5 py-1 text-xs font-medium text-white" style={{ background: accentColor, borderRadius: s.radius }}>
                      Button
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-muted">
          Previews use your current light or dark choice and accent. Sage, Dusk and Ember are soft, low-glare palettes: text is at least 10:1 against the
          background (the web standard asks for 4.5:1, or 7:1 for the strictest level).
        </p>
      </div>

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
              onClick={() => applyTheme({ ...current, accent: a.id })}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${accent === a.id ? "border-foreground" : "border-line hover:bg-background"}`}
            >
              <span aria-hidden className="size-3.5 rounded-full" style={{ background: a.color }} />
              {a.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">The accent is the same colour in light and dark.</p>
      </div>

      <div>
        <p id="theme-font-label" className="mb-2 text-sm font-medium">
          Reading font
        </p>
        <div role="radiogroup" aria-labelledby="theme-font-label" className="grid gap-2 sm:grid-cols-2">
          {FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={font === f.id}
              onClick={() => applyTheme({ ...current, font: f.id })}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${font === f.id ? "border-accent bg-background" : "border-line hover:bg-background"}`}
              style={{ fontFamily: FONT_CSS[f.id] }}
            >
              <span className="block font-medium">{f.label}</span>
              <span className="block text-xs text-muted">{f.sample}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p id="theme-bionic-label" className="mb-2 text-sm font-medium">
          Focus reading
        </p>
        <div role="radiogroup" aria-labelledby="theme-bionic-label" className="flex flex-wrap gap-2">
          {(["off", "subtle", "strong"] as const).map((level) => (
            <button key={level} type="button" role="radio" aria-checked={bionic === level} onClick={() => applyTheme({ ...current, bionic: level })} className={pill(bionic === level)}>
              {level === "off" ? "Off" : level === "subtle" ? "Subtle" : "Strong"}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          Bolds the start of words in lessons, articles and problem statements. Subtle leaves short words alone and uses a semi-bold; Strong bolds about
          half of every word. Headings, code and buttons are never changed. Studies have not found that it speeds up reading for everyone, so keep it only
          if it feels good.
        </p>
      </div>

      <Toggle
        label="Game features"
        on={gamify}
        onChange={(v) => applyTheme({ ...current, gamify: v })}
        text="XP, levels, streaks and streak freezes, badges, and the XP numbers on tasks and problems. Off by default. Your progress is still tracked underneath, so turning this on shows everything you have earned."
      />
    </div>
  );
}

const FONT_CSS: Record<FontId, string> = {
  default: "var(--font-geist-sans), system-ui, sans-serif",
  lexend: "var(--font-lexend), system-ui, sans-serif",
  atkinson: "var(--font-atkinson), system-ui, sans-serif",
  serif: 'Georgia, "Times New Roman", serif',
};

function Toggle({ label, on, onChange, text }: { label: string; on: boolean; onChange: (v: boolean) => void; text: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {label}: {on ? "on" : "off"}
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={label}
          onClick={() => onChange(!on)}
          className={`relative h-6 w-11 shrink-0 rounded-full border ${on ? "border-accent bg-accent" : "border-line bg-background"}`}
        >
          <span className={`absolute top-0.5 size-4.5 rounded-full shadow transition-all ${on ? "left-[1.4rem] bg-white" : "left-0.5 bg-muted"}`} />
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">{text}</p>
    </div>
  );
}
