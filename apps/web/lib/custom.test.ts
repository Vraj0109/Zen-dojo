import { describe, expect, it } from "vitest";
import {
  CUSTOM_FONT_KEY,
  CUSTOM_THEME_KEY,
  DEFAULT_DARK,
  DEFAULT_LIGHT,
  contrast,
  exportCustomTheme,
  importCustomTheme,
  isSafeFamily,
  textContrast,
  type CustomTheme,
  paletteWarnings,
  parseCustomFont,
  parseCustomTheme,
  parseProfile,
} from "./custom";
import { THEME_INIT_SCRIPT } from "./theme";

describe("custom theme", () => {
  it("keeps valid hex colours and drops everything else", () => {
    const t = parseCustomTheme(JSON.stringify({ accent: "#AABBCC", light: { ...DEFAULT_LIGHT, muted: "red" }, dark: DEFAULT_DARK }));
    expect(t.accent).toBe("#aabbcc");
    expect(t.light).toBeUndefined(); // one bad colour rejects the palette
    expect(t.dark).toEqual(DEFAULT_DARK);
    expect(parseCustomTheme("not json")).toEqual({});
    expect(parseCustomTheme(null)).toEqual({});
  });

  it("measures contrast like WCAG", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrast("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("accepts the built-in palettes and warns about unreadable text", () => {
    expect(paletteWarnings(DEFAULT_LIGHT)).toEqual([]);
    expect(paletteWarnings(DEFAULT_DARK)).toEqual([]);
    expect(paletteWarnings({ ...DEFAULT_LIGHT, foreground: "#f0f0f0" }).length).toBeGreaterThan(0);
  });
});

describe("custom theme editor: export and import", () => {
  const full: CustomTheme = {
    base: "ember",
    light: { ...DEFAULT_LIGHT, "surface-2": "#eeeeee", primary: "#c2481b", reward: "#e8a317", success: "#2e7d4f", warning: "#9a6210", danger: "#b8322a" },
    dark: { ...DEFAULT_DARK, "surface-2": "#222222", primary: "#f08a5d", reward: "#f2b63c", success: "#5cb884", warning: "#e0a23a", danger: "#ef6f64" },
    fonts: { ui: "atkinson", heading: "Fira Sans", code: "jetbrains" },
    corners: "round",
    density: "compact",
  };

  it("round-trips every value through export and import", () => {
    const text = exportCustomTheme(full);
    expect(JSON.parse(text).kind).toBe("zen-dojo-theme");
    expect(importCustomTheme(text)).toEqual(full);
    // What import saves is what the other device applies: parsing the saved value gives the same theme again.
    expect(parseCustomTheme(JSON.stringify(importCustomTheme(text)))).toEqual(full);
    expect(JSON.stringify(full).length).toBeLessThan(4096); // fits the synced appearance record
  });

  it("still loads old five-colour themes and drops bad new values", () => {
    const old = { accent: "#2f7d5b", light: DEFAULT_LIGHT, dark: DEFAULT_DARK };
    expect(importCustomTheme(JSON.stringify(old))).toEqual(old);
    const bad = parseCustomTheme(JSON.stringify({ ...full, fonts: { ui: "a;b" }, corners: "wobbly", density: 3, light: { ...full.light, danger: "red" } }));
    expect(bad.fonts).toBeUndefined();
    expect(bad.corners).toBeUndefined();
    expect(bad.density).toBeUndefined();
    expect(bad.light?.danger).toBeUndefined();
    expect(bad.light?.primary).toBe("#c2481b");
    expect(importCustomTheme("{}")).toBeNull();
    expect(importCustomTheme("nope")).toBeNull();
  });

  it("reports contrast under each text colour", () => {
    expect(textContrast(DEFAULT_LIGHT, "foreground")?.ok).toBe(true);
    expect(textContrast({ ...DEFAULT_LIGHT, warning: "#ffee00" }, "warning")?.ok).toBe(false);
    expect(textContrast(DEFAULT_LIGHT, "surface")).toBeNull();
  });
});

describe("custom font and profile", () => {
  it("only accepts safe font names (they end up inside a CSS value)", () => {
    expect(isSafeFamily("Inter")).toBe(true);
    expect(isSafeFamily("Fira Code 2")).toBe(true);
    expect(isSafeFamily('x"; background:url(//evil)')).toBe(false);
    expect(isSafeFamily("")).toBe(false);
    expect(parseCustomFont(JSON.stringify({ family: "Inter", source: "file" }))).toEqual({ family: "Inter", source: "file" });
    expect(parseCustomFont(JSON.stringify({ family: "a;b" }))).toBeNull();
  });

  it("accepts only small image data URLs as a picture", () => {
    expect(parseProfile(JSON.stringify({ name: "Sam", picture: "data:image/jpeg;base64,AAAA" }))).toEqual({ name: "Sam", picture: "data:image/jpeg;base64,AAAA" });
    expect(parseProfile(JSON.stringify({ name: "Sam", picture: "https://evil/x.png" })).picture).toBe("");
    expect(parseProfile(JSON.stringify({ name: "Sam", picture: "data:text/html;base64,AAAA" })).picture).toBe("");
  });
});

describe("init script applies custom colours and font", () => {
  function run(stored: Record<string, string>, dark: boolean) {
    const attrs = new Map<string, string>();
    const style = new Map<string, string>();
    const root = {
      setAttribute: (k: string, v: string) => void attrs.set(k, v),
      getAttribute: (k: string) => attrs.get(k) ?? null,
      removeAttribute: (k: string) => void attrs.delete(k),
      style: { setProperty: (k: string, v: string) => void style.set(k, v), removeProperty: (k: string) => void style.delete(k) },
    };
    const win: Record<string, unknown> = { matchMedia: () => ({ matches: dark, addEventListener() {} }) };
    new Function("document", "window", "localStorage", THEME_INIT_SCRIPT)({ documentElement: root }, win, { getItem: (k: string) => stored[k] ?? null });
    return { attrs, style };
  }

  it("sets the accent, picks readable text on it, and uses the palette of the current scheme", () => {
    const theme = JSON.stringify({ accent: "#ffff00", light: { ...DEFAULT_LIGHT, background: "#fafafa" }, dark: { ...DEFAULT_DARK, background: "#010203" } });
    const light = run({ [CUSTOM_THEME_KEY]: theme }, false);
    expect(light.style.get("--primary")).toBe("#ffff00");
    expect(light.style.get("--on-primary")).toBe("#111111"); // dark text on a light accent
    expect(light.style.get("--background")).toBe("#fafafa");
    expect(run({ [CUSTOM_THEME_KEY]: theme }, true).style.get("--background")).toBe("#010203");
    expect(run({ [CUSTOM_THEME_KEY]: JSON.stringify({ accent: "#102030" }) }, false).style.get("--on-primary")).toBe("#ffffff");
  });

  it("applies an old five-colour theme and the new Dojo keys when they are saved", () => {
    const old = run({ [CUSTOM_THEME_KEY]: JSON.stringify({ accent: "#2f7d5b", light: DEFAULT_LIGHT, dark: DEFAULT_DARK }) }, false);
    expect(old.style.get("--muted")).toBe(DEFAULT_LIGHT.muted);
    expect(old.style.get("--primary")).toBe("#2f7d5b");
    expect(old.style.has("--surface-2")).toBe(false); // left to the theme
    const next = run({ [CUSTOM_THEME_KEY]: JSON.stringify({ light: { ...DEFAULT_LIGHT, "surface-2": "#eeeeee", danger: "#aa0000", reward: "bad" } }) }, false);
    expect(next.style.get("--surface-2")).toBe("#eeeeee");
    expect(next.style.get("--danger")).toBe("#aa0000");
    expect(next.style.has("--reward")).toBe(false);
  });

  it("ignores invalid colours and sets nothing without a saved theme", () => {
    expect(run({}, false).style.size).toBe(0);
    expect(run({ [CUSTOM_THEME_KEY]: JSON.stringify({ accent: "red; x:y" }) }, false).style.size).toBe(0);
  });

  it("applies per-mode primary, fonts, corners and density from the theme editor", () => {
    const theme = JSON.stringify({
      accent: "#000000",
      light: { ...DEFAULT_LIGHT, primary: "#ffff00", "surface-2": "#eeeeee", reward: "#cc8800" },
      dark: DEFAULT_DARK,
      fonts: { ui: "lexend", heading: "Fira Sans", code: 'x"}a{' },
      corners: "sharp",
      density: "compact",
    });
    const light = run({ [CUSTOM_THEME_KEY]: theme }, false);
    expect(light.style.get("--primary")).toBe("#ffff00");
    expect(light.style.get("--on-primary")).toBe("#111111");
    expect(light.style.get("--line-strong")).toContain("color-mix");
    expect(light.style.get("--reward-soft")).toContain("#cc8800");
    expect(light.style.get("--font-ui")).toBe("var(--font-lexend)");
    expect(light.style.get("--font-heading")).toBe('"Fira Sans"');
    expect(light.attrs.has("data-code-font")).toBe(false);
    expect(light.style.get("--r-md")).toBe("0px");
    expect(light.attrs.get("data-density")).toBe("compact");
    expect(run({ [CUSTOM_THEME_KEY]: theme }, true).style.get("--primary")).toBe("#000000"); // dark has no primary: the accent
  });

  it("sets a safe custom font and refuses an unsafe one", () => {
    const ok = run({ [CUSTOM_FONT_KEY]: JSON.stringify({ family: "Fira Code", source: "local" }) }, false);
    expect(ok.attrs.get("data-custom-font")).toBe("on");
    expect(ok.style.get("--font-custom")).toBe('"Fira Code"');
    const bad = run({ [CUSTOM_FONT_KEY]: JSON.stringify({ family: 'a"}body{x:y', source: "local" }) }, false);
    expect(bad.attrs.has("data-custom-font")).toBe(false);
    expect(bad.style.has("--font-custom")).toBe(false);
  });
});
