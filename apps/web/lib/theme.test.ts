import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACCENTS,
  ACCENT_KEY,
  DEFAULT_ACCENT,
  BIONIC_KEY,
  DEFAULT_STYLE,
  FONTS,
  FONT_KEY,
  GAMIFY_KEY,
  STYLES,
  STYLE_KEY,
  THEME_INIT_SCRIPT,
  THEME_KEY,
  parseAccent,
  parseFlag,
  parseFont,
  parseMode,
  parseStyle,
  resolveMode,
} from "./theme";

describe("theme parsing", () => {
  it("falls back to System and the default accent for anything unknown", () => {
    expect(parseMode("dark")).toBe("dark");
    expect(parseMode("light")).toBe("light");
    expect(parseMode("purple")).toBe("system");
    expect(parseMode(null)).toBe("system");
    expect(parseAccent("rose")).toBe("rose");
    expect(parseAccent("nope")).toBe(DEFAULT_ACCENT);
    expect(parseAccent(undefined)).toBe(DEFAULT_ACCENT);
  });

  it("resolves System with the OS preference and keeps an explicit choice", () => {
    expect(resolveMode("system", true)).toBe("dark");
    expect(resolveMode("system", false)).toBe("light");
    expect(resolveMode("light", true)).toBe("light");
    expect(resolveMode("dark", false)).toBe("dark");
  });
});

/** Runs the inline script against a fake <html>, storage and media query, like a browser would. */
function runInit(stored: Record<string, string>, osDark: boolean) {
  const attrs = new Map<string, string>();
  const listeners: Array<() => void> = [];
  const mq = { matches: osDark, addEventListener: (_: string, fn: () => void) => listeners.push(fn) };
  const root = {
    setAttribute: (k: string, v: string) => void attrs.set(k, v),
    getAttribute: (k: string) => attrs.get(k) ?? null,
    removeAttribute: (k: string) => void attrs.delete(k),
  };
  const fn = new Function("document", "window", "localStorage", THEME_INIT_SCRIPT);
  fn({ documentElement: root }, { matchMedia: () => mq }, { getItem: (k: string) => stored[k] ?? null });
  return { attrs, mq, listeners };
}

describe("theme init script", () => {
  it("uses the OS scheme when nothing is saved", () => {
    expect(runInit({}, true).attrs.get("data-theme")).toBe("dark");
    expect(runInit({}, false).attrs.get("data-theme")).toBe("light");
    expect(runInit({}, true).attrs.get("data-mode")).toBe("system");
  });

  it("applies a saved choice over the OS and sets the accent only when it is not the default", () => {
    const a = runInit({ [THEME_KEY]: "light", [ACCENT_KEY]: "blue" }, true);
    expect(a.attrs.get("data-theme")).toBe("light");
    expect(a.attrs.get("data-mode")).toBe("light");
    expect(a.attrs.get("data-accent")).toBe("blue");
    expect(runInit({ [ACCENT_KEY]: DEFAULT_ACCENT }, false).attrs.has("data-accent")).toBe(false);
    expect(runInit({ [ACCENT_KEY]: "hotpink" }, false).attrs.has("data-accent")).toBe(false);
  });

  it("follows the OS live only while the mode is System", () => {
    const sys = runInit({}, false);
    sys.mq.matches = true;
    sys.listeners.forEach((l) => l());
    expect(sys.attrs.get("data-theme")).toBe("dark");

    const fixed = runInit({ [THEME_KEY]: "light" }, false);
    fixed.mq.matches = true;
    fixed.listeners.forEach((l) => l());
    expect(fixed.attrs.get("data-theme")).toBe("light");
  });

  it("does not throw when storage is blocked", () => {
    const root = { setAttribute() {}, getAttribute: () => null, removeAttribute() {} };
    const fn = new Function("document", "window", "localStorage", THEME_INIT_SCRIPT);
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => fn({ documentElement: root }, { matchMedia: () => ({ matches: false, addEventListener() {} }) }, blocked)).not.toThrow();
  });

  it("applies a saved style only when it is not the default", () => {
    expect(parseStyle("paper")).toBe("paper");
    expect(parseStyle("nope")).toBe(DEFAULT_STYLE);
    expect(runInit({ [STYLE_KEY]: "terminal" }, false).attrs.get("data-style")).toBe("terminal");
    expect(runInit({ [STYLE_KEY]: DEFAULT_STYLE }, false).attrs.has("data-style")).toBe(false);
    expect(runInit({ [STYLE_KEY]: "bogus" }, false).attrs.has("data-style")).toBe(false);
  });
});

describe("theme CSS", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "app", "globals.css"), "utf8");

  /** The declaration block that follows `selector {`. */
  const rule = (selector: string) => {
    const start = css.indexOf(selector + " {");
    expect(start, selector).toBeGreaterThanOrEqual(0);
    return css.slice(start, css.indexOf("}", start));
  };
  const value = (block: string, name: string) => new RegExp("--" + name + ":\\s*([^;]+);").exec(block)?.[1].trim();

  it("no longer depends on the OS media query alone", () => {
    expect(css).not.toContain("prefers-color-scheme");
    expect(css).toContain(':root[data-theme="dark"]');
  });

  it("gives each accent one colour, with no separate dark value", () => {
    expect(css).not.toMatch(/data-theme="dark"\]\[data-accent/);
    for (const a of ACCENTS.filter((x) => x.id !== DEFAULT_ACCENT)) {
      expect(value(rule(':root[data-accent="' + a.id + '"]'), "accent"), a.id).toBe(a.color);
    }
    expect(value(rule(":root"), "accent")).toBe(ACCENTS.find((a) => a.id === DEFAULT_ACCENT)!.color);
  });

  it("does not touch the accent in dark mode", () => {
    const dark = rule(':root[data-theme="dark"]');
    expect(dark).not.toContain("--accent");
    expect(dark).not.toContain("--on-accent");
  });

  it("keeps the picker previews equal to the CSS for every style, light and dark", () => {
    for (const s of STYLES) {
      const light = s.id === DEFAULT_STYLE ? rule(":root") : rule(':root[data-style="' + s.id + '"]');
      const dark = s.id === DEFAULT_STYLE ? rule(':root[data-theme="dark"]') : rule(':root[data-theme="dark"][data-style="' + s.id + '"]');
      for (const name of ["background", "foreground", "surface", "line", "muted"] as const) {
        expect(value(light, name), s.id + " light " + name).toBe(s.light[name]);
        expect(value(dark, name), s.id + " dark " + name).toBe(s.dark[name]);
      }
    }
  });
});

describe("fonts and switches", () => {
  it("parse with a fallback; flags are off unless exactly on", () => {
    expect(parseFont("lexend")).toBe("lexend");
    expect(parseFont("comic")).toBe("default");
    expect(FONTS.length).toBeGreaterThanOrEqual(3);
    expect(parseFlag("on")).toBe(true);
    expect(parseFlag("off")).toBe(false);
    expect(parseFlag(null)).toBe(false);
    expect(parseFlag("true")).toBe(false);
  });

  it("the init script applies the font, and game features and focus reading only when on", () => {
    expect(runInit({ [FONT_KEY]: "atkinson" }, false).attrs.get("data-font")).toBe("atkinson");
    expect(runInit({ [FONT_KEY]: "default" }, false).attrs.has("data-font")).toBe(false);
    expect(runInit({}, false).attrs.has("data-gamify")).toBe(false); // off by default
    expect(runInit({}, false).attrs.has("data-bionic")).toBe(false);
    expect(runInit({ [GAMIFY_KEY]: "on" }, false).attrs.get("data-gamify")).toBe("on");
    expect(runInit({ [GAMIFY_KEY]: "off" }, false).attrs.has("data-gamify")).toBe(false);
    expect(runInit({ [BIONIC_KEY]: "on" }, false).attrs.get("data-bionic")).toBe("on");
  });

  it("the stylesheet hides game features unless data-gamify is on, and defines every font", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "app", "globals.css"), "utf8");
    expect(css).toContain(':root:not([data-gamify="on"]) .gamify-only { display: none !important; }');
    for (const f of FONTS.filter((x) => x.id !== "default")) expect(css, f.id).toContain('[data-font="' + f.id + '"]');
  });
});

// WCAG 2.x contrast ratio between two #rrggbb colours.
function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [16, 8, 0].map((shift) => {
    const c = ((n >> shift) & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("readability of every style (WCAG contrast)", () => {
  for (const s of STYLES) {
    for (const scheme of ["light", "dark"] as const) {
      it(s.id + " " + scheme, () => {
        const p = s[scheme];
        // Body text: the strictest level (AAA, 7:1) on both the page and card colours.
        expect(contrast(p.foreground, p.background)).toBeGreaterThanOrEqual(7);
        expect(contrast(p.foreground, p.surface)).toBeGreaterThanOrEqual(7);
        // Secondary text: at least AA (4.5:1).
        expect(contrast(p.muted, p.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.muted, p.surface)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("the soft focus styles keep body text between 10:1 and 15:1: strong but not harsh pure black on white", () => {
    for (const id of ["sage", "dusk", "ember"]) {
      const s = STYLES.find((x) => x.id === id)!;
      for (const scheme of ["light", "dark"] as const) {
        const c = contrast(s[scheme].foreground, s[scheme].background);
        expect(c, id + " " + scheme).toBeGreaterThanOrEqual(10);
        expect(c, id + " " + scheme).toBeLessThanOrEqual(15);
      }
    }
  });

  it("white text on every accent is at least 4.5:1, and every accent is at least 3:1 on both page backgrounds", () => {
    for (const a of ACCENTS) {
      expect(contrast("#ffffff", a.color), a.id + " text").toBeGreaterThanOrEqual(4.5);
      expect(contrast(a.color, "#111211"), a.id + " on dark").toBeGreaterThanOrEqual(3);
      expect(contrast(a.color, "#ffffff"), a.id + " on light").toBeGreaterThanOrEqual(3);
    }
  });
});
