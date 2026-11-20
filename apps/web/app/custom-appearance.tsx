"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  CUSTOM_EVENT,
  CUSTOM_FONT_KEY,
  CUSTOM_THEME_KEY,
  DEFAULT_DARK,
  DEFAULT_LIGHT,
  EDITABLE_TOKENS,
  EMPTY_PROFILE,
  FONT_CHOICES,
  PROFILE_KEY,
  exportCustomTheme,
  importCustomTheme,
  isSafeFamily,
  luminance,
  parseCustomFont,
  parseCustomTheme,
  parseProfile,
  textContrast,
  type CustomTheme,
  type EditableToken,
  type FontSlot,
  type Palette,
  type Profile,
} from "@/lib/custom";
import { deleteFontFile, registerFont, saveFontFile } from "@/lib/font-store";
import { STYLES, isNearDanger, type Palette as ThemePalette } from "@/lib/theme";
import { Button, INPUT_CLASS, buttonClass } from "./ui";
import { SlidingPill } from "./sliding-pill";

// ---- storage (this browser or app window only) -------------------------------------------------------------------

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

function subscribe(onChange: () => void) {
  window.addEventListener(CUSTOM_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CUSTOM_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Saves a value, tells the page to re-apply it, and wakes every component that shows it. */
function save(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the change lasts until reload.
  }
  (window as unknown as { __habitCustom?: () => void }).__habitCustom?.();
  window.dispatchEvent(new Event(CUSTOM_EVENT));
}

// useSyncExternalStore needs a stable snapshot: the raw string, parsed afterwards.
const useRaw = (key: string) => useSyncExternalStore(subscribe, () => read(key), () => null);

export const useProfile = (): Profile => {
  const raw = useRaw(PROFILE_KEY);
  return raw === null ? EMPTY_PROFILE : parseProfile(raw);
};

// ---- the custom theme editor (plan 0083 step 29) -------------------------------------------------------------------

const TOKEN_LABELS: Record<EditableToken, string> = {
  background: "Page background",
  surface: "Cards",
  "surface-2": "Sidebar, table headers, hover",
  line: "Borders",
  foreground: "Text",
  muted: "Secondary text",
  primary: "Primary (buttons, links)",
  reward: "Reward (XP, streak)",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
};

const FONT_LABELS: Record<(typeof FONT_CHOICES)[number], string> = {
  figtree: "Figtree",
  lexend: "Lexend",
  atkinson: "Atkinson Hyperlegible",
  jetbrains: "JetBrains Mono",
  serif: "Serif (Georgia)",
  system: "System font",
};
const FONT_SLOTS: { slot: FontSlot; label: string; fallback: string }[] = [
  { slot: "ui", label: "UI font", fallback: "figtree" },
  { slot: "heading", label: "Heading font", fallback: "figtree" },
  { slot: "code", label: "Code font", fallback: "jetbrains" },
];

/** A built-in palette with only the keys the editor edits. */
function editable(p: ThemePalette): Palette {
  return Object.fromEntries(EDITABLE_TOKENS.map((k) => [k, p[k]])) as unknown as Palette;
}

/** A saved palette with every editable key, missing ones taken from the theme it started from. */
function complete(p: Palette | undefined, base: ThemePalette, accent: string | undefined): Required<Palette> {
  const full = { ...editable(base), ...(accent ? { primary: accent } : {}), ...(p ?? {}) };
  return full as Required<Palette>;
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <SlidingPill role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-full border border-line bg-surface-2 p-1">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-10 rounded-full px-4 text-sm font-medium transition-colors ${
            value === v ? "bg-primary-soft text-on-primary-soft" : "text-muted hover:text-foreground"
          }`}
        >
          {text}
        </button>
      ))}
    </SlidingPill>
  );
}

function TokenSwatch({ token, palette, onChange }: { token: EditableToken; palette: Required<Palette>; onChange: (v: string) => void }) {
  const id = `ct-${token}`;
  const c = textContrast(palette, token);
  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[16px] bg-background px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <label
          htmlFor={id}
          className="size-8 shrink-0 cursor-pointer rounded-[10px] border border-line-strong"
          style={{ background: palette[token] }}
          title={`Click to pick ${TOKEN_LABELS[token]}`}
        />
        <div className="min-w-0">
          <label htmlFor={id} className="block cursor-pointer text-[15px]">
            {TOKEN_LABELS[token]}
          </label>
          {c && (
            <p className={`text-xs ${c.ok ? "text-muted" : "text-warning font-medium"}`}>
              {c.ratio.toFixed(1)}:1 on {c.on === "background" ? "the page" : "cards"}
              {c.ok ? "" : " (below 4.5:1, hard to read)"}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <code className="text-xs font-mono text-muted">{palette[token]}</code>
        <input
          id={id}
          type="color"
          value={palette[token]}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${TOKEN_LABELS[token]} colour`}
          className="h-10 w-11 cursor-pointer rounded-[10px] border border-line bg-transparent p-0.5"
        />
      </div>
    </div>
  );
}

/** A small page drawn with the palette being edited, so you see it without switching modes. */
function Preview({ palette, mode }: { palette: Required<Palette>; mode: "light" | "dark" }) {
  const vars = Object.fromEntries(EDITABLE_TOKENS.map((k) => [`--${k}`, palette[k]])) as React.CSSProperties;
  const on = textContrast(palette, "primary");
  // Text on a filled button: whichever of the palette's text or card colour reads better on it.
  const onFill = (fill: string) => {
    const l = luminance(fill);
    const a = luminance(palette.foreground);
    const b = luminance(palette.surface);
    const ratio = (x: number, y: number) => (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    return ratio(l, a) >= ratio(l, b) ? palette.foreground : palette.surface;
  };

  return (
    <div className="space-y-3">
      <div
        style={{
          ...vars,
          ["--primary-soft" as string]: `color-mix(in oklab, ${palette.primary} 16%, ${palette.surface})`,
          ["--reward-soft" as string]: `color-mix(in oklab, ${palette.reward} 16%, ${palette.surface})`,
          ["--line-strong" as string]: `color-mix(in oklab, ${palette.line} 80%, ${palette.foreground})`,
        }}
        className="flex flex-col gap-2.5 rounded-[24px] border border-line bg-background p-4 text-foreground"
        aria-label={`Preview, ${mode} mode`}
      >
        <p className="text-xs font-semibold tracking-wider text-muted">Preview · {mode === "light" ? "Light" : "Dark"} mode</p>
        <div className="flex flex-col gap-2 rounded-[20px] border border-line bg-surface p-4">
          <p className="text-base font-medium">Two Sum II</p>
          <p className="text-sm opacity-75">Two pointers · 20 min</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span
              className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-colors"
              style={{
                background: palette.primary,
                color: onFill(palette.primary),
              }}
            >
              Start
            </span>
            <span
              className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-colors"
              style={{
                background: `color-mix(in oklab, ${palette.primary} 16%, ${palette.surface})`,
                color: palette.foreground,
              }}
            >
              Later
            </span>
          </div>
        </div>
        <span
          className="inline-flex h-10 items-center self-start rounded-full px-5 text-sm font-medium"
          style={{ background: palette.danger, color: onFill(palette.danger) }}
        >
          Delete this note
        </span>
        {on && !on.ok && (
          <p className="text-xs text-warning">The primary colour is hard to read as link text on cards.</p>
        )}
      </div>
    </div>
  );
}

function FontSelect({ slot, label, fallback, value, onChange }: { slot: FontSlot; label: string; fallback: string; value: string | undefined; onChange: (v: string | undefined) => void }) {
  const builtIn = value === undefined || (FONT_CHOICES as readonly string[]).includes(value);
  const [name, setName] = useState(builtIn ? "" : value);
  const [other, setOther] = useState(!builtIn);
  const id = `ct-font-${slot}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={other ? "other" : (value ?? fallback)}
        onChange={(e) => {
          if (e.target.value === "other") return setOther(true);
          setOther(false);
          onChange(e.target.value === fallback ? undefined : e.target.value);
        }}
        className={INPUT_CLASS}
      >
        {FONT_CHOICES.map((f) => (
          <option key={f} value={f}>
            {FONT_LABELS[f]}
            {f === fallback ? " (default)" : ""}
          </option>
        ))}
        <option value="other">A font installed on this computer</option>
      </select>
      {other && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => onChange(isSafeFamily(name.trim()) ? name.trim() : undefined)}
          placeholder="Font name, e.g. Inter"
          aria-label={`${label}: installed font name`}
          className={INPUT_CLASS}
        />
      )}
    </div>
  );
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CustomColours() {
  const raw = useRaw(CUSTOM_THEME_KEY);
  const theme = parseCustomTheme(raw);
  const on = raw !== null && (theme.accent || theme.light || theme.dark) !== undefined;
  const baseStyle = STYLES.find((s) => s.id === theme.base) ?? STYLES[0];
  const light = complete(theme.light ?? DEFAULT_LIGHT, baseStyle.light, theme.light?.primary ? undefined : theme.accent);
  const dark = complete(theme.dark ?? DEFAULT_DARK, baseStyle.dark, theme.dark?.primary ? undefined : theme.accent);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const write = (t: CustomTheme) => save(CUSTOM_THEME_KEY, JSON.stringify(t));
  // Every edit saves the full palettes, so the theme looks the same wherever it is imported or synced.
  const full = (patch: Partial<CustomTheme>): CustomTheme => ({ ...theme, accent: undefined, light, dark, ...patch });
  const startFrom = (id: string) => {
    const s = STYLES.find((x) => x.id === id) ?? STYLES[0];
    write({ ...theme, accent: undefined, base: s.id, light: editable(s.light), dark: editable(s.dark) });
  };
  const palette = mode === "light" ? light : dark;
  const setToken = (k: EditableToken, v: string) => write(full(mode === "light" ? { light: { ...light, [k]: v } } : { dark: { ...dark, [k]: v } }));

  const importText = (text: string) => {
    const t = importCustomTheme(text);
    if (!t) return setMessage("That is not a theme file. Export one from this page and try again.");
    write(t);
    setPaste("");
    setMessage("Theme imported.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Your own theme: {on ? "on" : "off"}</p>
          <p className="text-sm text-muted">
            Start from any theme and change its colours for light and dark, the fonts, corners and spacing. A warning shows when text would be hard to
            read; it never stops you.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Your own theme"
          onClick={() => (on ? save(CUSTOM_THEME_KEY, null) : startFrom(STYLES[0].id))}
          className={`relative flex h-8 w-[52px] shrink-0 items-center rounded-full border-2 px-[2px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            on ? "justify-end border-primary bg-primary" : "justify-start border-outline bg-surface-2"
          }`}
        >
          <span className={`rounded-full ${on ? "size-6 bg-on-primary" : "mx-1 size-4 bg-outline"}`} />
        </button>
      </div>

      {on && (
        <div className="grid items-start gap-5 @min-[880px]:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <label htmlFor="ct-base" className="block text-sm font-medium">
                  Start from
                </label>
                <select id="ct-base" value={baseStyle.id} onChange={(e) => startFrom(e.target.value)} className={`${INPUT_CLASS} w-48 max-w-full`}>
                  {STYLES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <Segmented label="Mode to edit" value={mode} options={[["light", "Light"], ["dark", "Dark"]]} onChange={setMode} />
            </div>
            <p className="text-sm text-muted">Picking a theme above replaces your colours with that theme&apos;s. The page shows the mode your device is in.</p>

            <fieldset className="min-w-0 space-y-2">
              <legend className="mb-2 text-sm font-medium">{mode === "light" ? "Light" : "Dark"} mode colours</legend>
              {EDITABLE_TOKENS.map((k) => (
                <TokenSwatch key={k} token={k} palette={palette} onChange={(v) => setToken(k, v)} />
              ))}
              {isNearDanger(palette.primary, palette.danger) && (
                <p role="status" className="rounded-[16px] bg-danger-soft px-3.5 py-3 text-sm leading-5 text-on-danger-soft">
                  Primary is close to the danger colour, so buttons may look like errors. Pick a colour further from red.
                </p>
              )}
            </fieldset>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))] gap-3">
              {FONT_SLOTS.map((f) => (
                <FontSelect
                  key={f.slot + (theme.fonts?.[f.slot] ?? "")}
                  {...f}
                  value={theme.fonts?.[f.slot]}
                  onChange={(v) => {
                    const fonts = { ...theme.fonts, [f.slot]: v };
                    if (v === undefined) delete fonts[f.slot];
                    write(full({ fonts: Object.keys(fonts).length ? fonts : undefined }));
                  }}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Corners</p>
                <Segmented
                  label="Corners"
                  value={theme.corners ?? "default"}
                  options={[["round", "Round"], ["default", "Soft"], ["sharp", "Sharp"]]}
                  onChange={(v) => write(full({ corners: v === "default" ? undefined : v }))}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Density</p>
                <Segmented
                  label="Density"
                  value={theme.density ?? "comfortable"}
                  options={[["comfortable", "Comfortable"], ["compact", "Compact"]]}
                  onChange={(v) => write(full({ density: v === "comfortable" ? undefined : v }))}
                />
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-4 @min-[880px]:sticky @min-[880px]:top-6">
            <Preview palette={palette} mode={mode} />
            <div className="space-y-2 rounded-[24px] border border-line bg-background p-4">
              <p className="text-sm font-medium">Share or move this theme</p>
              <p className="text-sm text-muted">Your theme syncs with your appearance when you are signed in. Export it to keep a copy or give it to someone.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => download("zen-dojo-theme.json", exportCustomTheme(theme))}>
                  Export JSON
                </Button>
                <Button variant="secondary" size="sm" onClick={() => file.current?.click()}>
                  Import a file
                </Button>
                <input
                  ref={file}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size < 64 * 1024) importText(await f.text());
                    else if (f) setMessage("That file is too big to be a theme.");
                    e.target.value = "";
                  }}
                />
              </div>
              <label htmlFor="ct-paste" className="block text-sm text-muted">
                Or paste theme JSON
              </label>
              <textarea id="ct-paste" value={paste} onChange={(e) => setPaste(e.target.value)} rows={3} className={`${INPUT_CLASS} h-auto rounded-[16px] py-2 font-mono text-xs`} />
              <Button variant="secondary" size="sm" disabled={!paste.trim()} onClick={() => importText(paste)}>
                Import pasted theme
              </Button>
              {message && (
                <p role="status" className="text-sm text-muted">
                  {message}
                </p>
              )}
            </div>
            <Button variant="quiet" size="sm" onClick={() => startFrom(baseStyle.id)}>
              Start again from {baseStyle.label}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomFontPicker() {
  const font = parseCustomFont(useRaw(CUSTOM_FONT_KEY));
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const useInstalled = () => {
    const family = name.trim();
    if (!isSafeFamily(family)) return setError("Use only letters, numbers, spaces, dots, hyphens and underscores.");
    setError("");
    deleteFontFile().catch(() => undefined);
    save(CUSTOM_FONT_KEY, JSON.stringify({ family, source: "local" }));
  };

  const upload = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return setError("That font file is over 8 MB.");
    const base = f.name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9 ._-]/g, " ").trim().slice(0, 40) || "My font";
    const family = /^[A-Za-z0-9]/.test(base) ? base : `Font ${base}`;
    try {
      const data = await f.arrayBuffer();
      await registerFont(family, data); // throws when the file is not a font
      await saveFontFile(data);
      setError("");
      save(CUSTOM_FONT_KEY, JSON.stringify({ family, source: "file" }));
    } catch {
      setError("That file could not be read as a font. Try a .woff2, .woff, .ttf or .otf file.");
    }
    if (file.current) file.current.value = "";
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Your own font{font ? `: ${font.family}` : ""}</p>
      <p className="text-sm text-muted">
        Use a font installed on this computer by typing its name, or upload a font file (.woff2, .woff, .ttf, .otf). Uploaded fonts stay in this
        browser or app window only. Check the font&apos;s licence before using it.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Installed font name, e.g. Inter"
          aria-label="Installed font name"
          className={`${INPUT_CLASS} h-10 min-w-0 flex-1 basis-56 px-4`}
        />
        <button type="button" onClick={useInstalled} className={buttonClass("outline", "sm")}>
          Use this font
        </button>
        <button type="button" onClick={() => file.current?.click()} className={buttonClass("outline", "sm")}>
          Upload a font file
        </button>
        <input ref={file} type="file" accept=".woff2,.woff,.ttf,.otf,font/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
        {font && (
          <button
            type="button"
            onClick={() => {
              deleteFontFile().catch(() => undefined);
              save(CUSTOM_FONT_KEY, null);
            }}
            className={buttonClass("quiet", "sm")}
          >
            Back to the built-in font
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Shrinks a picked image to a 256 px square (centre crop) so it is small enough to keep. */
async function toAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.88);
}

export function ProfileEditor() {
  const profile = useProfile();
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const write = (p: Profile) => save(PROFILE_KEY, JSON.stringify(p));

  const pick = async (f: File | undefined) => {
    if (!f) return;
    try {
      write({ ...profile, picture: await toAvatar(f) });
      setError("");
    } catch {
      setError("That file could not be read as an image.");
    }
    if (file.current) file.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar className="size-16 text-xl" />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => file.current?.click()} className={buttonClass("outline", "sm")}>
            {profile.picture ? "Change picture" : "Add a picture"}
          </button>
          {profile.picture && (
            <button type="button" onClick={() => write({ ...profile, picture: "" })} className={buttonClass("quiet", "sm")}>
              Remove
            </button>
          )}
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>
      </div>
      <label className="block text-sm">
        <span className="font-medium">Display name</span>
        <input
          defaultValue={profile.name}
          key={profile.name}
          maxLength={40}
          onBlur={(e) => write({ ...profile, name: e.target.value.trim() })}
          placeholder="Your name"
          className={`${INPUT_CLASS} mt-1 h-10 max-w-xs px-4`}
        />
      </label>
      <p className="text-sm text-muted">The picture is cropped to a square and kept only in this browser or app window. It is not part of a backup.</p>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** The profile picture, or the first letter of the name, or a person icon. */
export function Avatar({ className = "size-7 text-xs" }: { className?: string }) {
  const p = useProfile();
  if (p.picture)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a small data: URL kept in this browser
      <img src={p.picture} alt="" className={`${className} shrink-0 rounded-full object-cover`} />
    );
  return (
    <span aria-hidden className={`${className} grid shrink-0 place-items-center rounded-full bg-primary font-semibold text-on-primary`}>
      {p.name ? p.name[0].toUpperCase() : (
        <svg viewBox="0 0 24 24" className="size-[55%]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
        </svg>
      )}
    </span>
  );
}
