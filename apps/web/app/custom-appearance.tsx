"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  CUSTOM_EVENT,
  CUSTOM_FONT_KEY,
  CUSTOM_THEME_KEY,
  DEFAULT_DARK,
  DEFAULT_LIGHT,
  EMPTY_PROFILE,
  PROFILE_KEY,
  accentWarnings,
  isSafeFamily,
  paletteWarnings,
  parseCustomFont,
  parseCustomTheme,
  parseProfile,
  type CustomTheme,
  type Palette,
  type Profile,
} from "@/lib/custom";
import { deleteFontFile, registerFont, saveFontFile } from "@/lib/font-store";

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

// ---- the settings block --------------------------------------------------------------------------------------------

const PALETTE_LABELS: [keyof Palette, string][] = [
  ["background", "Page background"],
  ["surface", "Cards"],
  ["foreground", "Text"],
  ["muted", "Secondary text"],
  ["line", "Borders"],
];

function Swatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <code className="text-xs text-muted">{value}</code>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="h-8 w-10 rounded border border-line bg-transparent p-0.5" />
      </span>
    </label>
  );
}

function PaletteEditor({ title, palette, accent, onChange }: { title: string; palette: Palette; accent: string; onChange: (p: Palette) => void }) {
  const warnings = [...paletteWarnings(palette), ...accentWarnings(accent, palette)];
  return (
    <fieldset className="rounded-lg border border-line p-3">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <div className="space-y-2">
        {PALETTE_LABELS.map(([k, label]) => (
          <Swatch key={k} label={label} value={palette[k]} onChange={(v) => onChange({ ...palette, [k]: v })} />
        ))}
      </div>
      {warnings.length > 0 && (
        <ul role="status" className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-diff-medium">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

export function CustomColours() {
  const raw = useRaw(CUSTOM_THEME_KEY);
  const theme = parseCustomTheme(raw);
  const on = raw !== null && (theme.accent || theme.light || theme.dark) !== undefined;
  const accent = theme.accent ?? "#2f7d5b";
  const light = theme.light ?? DEFAULT_LIGHT;
  const dark = theme.dark ?? DEFAULT_DARK;
  const write = (t: CustomTheme) => save(CUSTOM_THEME_KEY, JSON.stringify(t));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Your own colours: {on ? "on" : "off"}</p>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Your own colours"
          onClick={() => (on ? save(CUSTOM_THEME_KEY, null) : write({ accent, light, dark }))}
          className={`relative h-6 w-11 shrink-0 rounded-full border ${on ? "border-accent bg-accent" : "border-line bg-background"}`}
        >
          <span className={`absolute top-0.5 size-4.5 rounded-full shadow transition-all ${on ? "left-[1.4rem] bg-white" : "left-0.5 bg-muted"}`} />
        </button>
      </div>
      <p className="text-xs text-muted">
        Pick any accent and your own light and dark palettes. They replace the built-in accent and style while this is on. A warning appears when
        text would be hard to read.
      </p>
      {on && (
        <div className="space-y-3">
          <Swatch label="Accent (buttons, highlights)" value={accent} onChange={(v) => write({ ...theme, accent: v, light, dark })} />
          <div className="grid gap-3 md:grid-cols-2">
            <PaletteEditor title="Light mode" palette={light} accent={accent} onChange={(p) => write({ ...theme, accent, light: p, dark })} />
            <PaletteEditor title="Dark mode" palette={dark} accent={accent} onChange={(p) => write({ ...theme, accent, light, dark: p })} />
          </div>
          <button type="button" onClick={() => write({ accent: "#2f7d5b", light: DEFAULT_LIGHT, dark: DEFAULT_DARK })} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background">
            Start again from the default colours
          </button>
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
      <p className="text-xs text-muted">
        Use a font installed on this computer by typing its name, or upload a font file (.woff2, .woff, .ttf, .otf). Uploaded fonts stay in this
        browser or app window only. Check the font&apos;s licence before using it.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Installed font name, e.g. Inter"
          aria-label="Installed font name"
          className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-1.5 text-sm"
        />
        <button type="button" onClick={useInstalled} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background">
          Use this font
        </button>
        <button type="button" onClick={() => file.current?.click()} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background">
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
            className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background"
          >
            Back to the built-in font
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-diff-hard">
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
          <button type="button" onClick={() => file.current?.click()} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background">
            {profile.picture ? "Change picture" : "Add a picture"}
          </button>
          {profile.picture && (
            <button type="button" onClick={() => write({ ...profile, picture: "" })} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background">
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
          className="mt-1 block w-full max-w-xs rounded-lg border border-line bg-background px-3 py-1.5"
        />
      </label>
      <p className="text-xs text-muted">The picture is cropped to a square and kept only in this browser or app window. It is not part of a backup.</p>
      {error && (
        <p role="alert" className="text-xs text-diff-hard">
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
    <span aria-hidden className={`${className} grid shrink-0 place-items-center rounded-full bg-accent font-semibold text-on-accent`}>
      {p.name ? p.name[0].toUpperCase() : (
        <svg viewBox="0 0 24 24" className="size-[55%]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
        </svg>
      )}
    </span>
  );
}
