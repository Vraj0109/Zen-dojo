import { describe, expect, it } from "vitest";
import {
  CUSTOM_FONT_KEY,
  CUSTOM_THEME_KEY,
  DEFAULT_DARK,
  DEFAULT_LIGHT,
  contrast,
  isSafeFamily,
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
    expect(light.style.get("--accent")).toBe("#ffff00");
    expect(light.style.get("--on-accent")).toBe("#111111"); // dark text on a light accent
    expect(light.style.get("--background")).toBe("#fafafa");
    expect(run({ [CUSTOM_THEME_KEY]: theme }, true).style.get("--background")).toBe("#010203");
    expect(run({ [CUSTOM_THEME_KEY]: JSON.stringify({ accent: "#102030" }) }, false).style.get("--on-accent")).toBe("#ffffff");
  });

  it("ignores invalid colours and sets nothing without a saved theme", () => {
    expect(run({}, false).style.size).toBe(0);
    expect(run({ [CUSTOM_THEME_KEY]: JSON.stringify({ accent: "red; x:y" }) }, false).style.size).toBe(0);
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
