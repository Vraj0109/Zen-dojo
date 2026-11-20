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
  MOTION_KEY,
  motionEnabled,
  parseMotion,
  THEME_TOKENS,
  isNearDanger,
} from "./theme";
import { parseCustomTheme } from "./custom";

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
function runInit(stored: Record<string, string>, osDark: boolean, reducedMotion = false) {
  const attrs = new Map<string, string>();
  const listeners: Array<() => void> = [];
  const mq = { matches: osDark, addEventListener: (_: string, fn: () => void) => listeners.push(fn) };
  const rm = { matches: reducedMotion, addEventListener: () => {} };
  const root = {
    setAttribute: (k: string, v: string) => void attrs.set(k, v),
    getAttribute: (k: string) => attrs.get(k) ?? null,
    removeAttribute: (k: string) => void attrs.delete(k),
  };
  const fn = new Function("document", "window", "localStorage", THEME_INIT_SCRIPT);
  fn({ documentElement: root }, { matchMedia: (q: string) => (q.includes("reduced-motion") ? rm : mq) }, { getItem: (k: string) => stored[k] ?? null });
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

describe("animations", () => {
  it("parse with a fallback to Auto", () => {
    expect(parseMotion("on")).toBe("on");
    expect(parseMotion("off")).toBe("off");
    expect(parseMotion("fast")).toBe("auto");
    expect(parseMotion(null)).toBe("auto");
  });

  it("Auto follows the computer, On and Off do not", () => {
    expect(motionEnabled("auto", false)).toBe(true);
    expect(motionEnabled("auto", true)).toBe(false);
    expect(motionEnabled("on", true)).toBe(true);
    expect(motionEnabled("off", false)).toBe(false);
  });

  it("the init script turns animations off for Off, and for Auto when the computer asks for reduced motion", () => {
    expect(runInit({}, false).attrs.has("data-motion")).toBe(false);
    expect(runInit({}, false, true).attrs.get("data-motion")).toBe("off");
    expect(runInit({ [MOTION_KEY]: "on" }, false, true).attrs.has("data-motion")).toBe(false);
    expect(runInit({ [MOTION_KEY]: "off" }, false, false).attrs.get("data-motion")).toBe("off");
  });

  it("the stylesheet switches every animation and transition off under data-motion=off", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "app", "globals.css"), "utf8");
    expect(css).toMatch(/:root\[data-motion="off"\][^{]*\{[^}]*animation: none !important/);
    expect(css).toMatch(/transition: none !important/);
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
  const value = (block: string, name: string) => new RegExp("(?:^|[\\s;{])--" + name + ":\\s*([^;]+);").exec(block)?.[1].trim();

  it("no longer depends on the OS media query alone", () => {
    expect(css).not.toContain("prefers-color-scheme");
    expect(css).toContain(':root[data-theme="dark"]');
  });

  it("gives each accent a full tonal set in light and dark that matches ACCENTS and reads well", () => {
    for (const a of ACCENTS.filter((x) => x.id !== DEFAULT_ACCENT)) {
      const blocks = [
        ["light", rule(':root[data-accent="' + a.id + '"][data-accent][data-accent]'), a.color],
        ["dark", rule(':root[data-theme="dark"][data-accent="' + a.id + '"][data-accent]'), a.dark],
      ] as const;
      for (const [scheme, block, primary] of blocks) {
        const v = (n: string) => value(block, n)!;
        expect(v("primary"), a.id + " " + scheme).toBe(primary);
        for (const n of ["on-primary", "primary-hover", "primary-container", "on-primary-container", "primary-soft", "on-primary-soft"]) {
          expect(v(n), `${a.id} ${scheme} ${n}`).toMatch(/^#[0-9a-f]{6}$/);
        }
        expect(contrast(v("on-primary"), v("primary")), `${a.id} ${scheme} on-primary`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(v("on-primary-container"), v("primary-container")), `${a.id} ${scheme} container`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(v("on-primary-soft"), v("primary-soft")), `${a.id} ${scheme} soft`).toBeGreaterThanOrEqual(4.5);
      }
    }
    const dojo = ACCENTS.find((a) => a.id === DEFAULT_ACCENT)!;
    expect(value(rule(":root"), "primary")).toBe(dojo.color);
    expect(value(rule(':root[data-theme="dark"]'), "primary")).toBe(dojo.dark);
    expect(value(rule(":root"), "accent")).toBe("var(--primary)");
  });

  it("gives Terminal sharper (not square) corners and the other themes the Expressive radii", () => {
    const t = rule(':root[data-style="terminal"]');
    expect([value(t, "r-sm"), value(t, "r-md"), value(t, "r-lg")]).toEqual(["6px", "10px", "14px"]);
    for (const s of STYLES.filter((x) => x.id !== "terminal" && x.id !== DEFAULT_STYLE)) {
      expect(value(rule(':root[data-style="' + s.id + '"]'), "r-md"), s.id).toBeUndefined();
    }
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
      for (const name of THEME_TOKENS) {
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
    expect(runInit({ [BIONIC_KEY]: "on" }, false).attrs.get("data-bionic")).toBe("subtle"); // an older saved value
    expect(runInit({ [BIONIC_KEY]: "subtle" }, false).attrs.get("data-bionic")).toBe("subtle");
    expect(runInit({ [BIONIC_KEY]: "strong" }, false).attrs.get("data-bionic")).toBe("strong");
    expect(runInit({ [BIONIC_KEY]: "off" }, false).attrs.has("data-bionic")).toBe(false);
    expect(runInit({ [BIONIC_KEY]: "loud" }, false).attrs.has("data-bionic")).toBe(false);
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

  it("every accent reads as text on its page (4.5:1) and never looks like danger", () => {
    for (const a of ACCENTS) {
      expect(contrast(a.color, "#ffffff"), a.id + " on light").toBeGreaterThanOrEqual(4.5);
      expect(contrast(a.dark, "#111211"), a.id + " on dark").toBeGreaterThanOrEqual(4.5);
      expect(isNearDanger(a.color), a.id + " light").toBe(false);
      expect(isNearDanger(a.dark), a.id + " dark").toBe(false);
    }
  });

  it("every text pair of every theme is 4.5:1 or more, light and dark", () => {
    const pairs = [
      ["foreground", "surface-2"],
      ["muted", "surface-2"],
      ["on-primary", "primary"],
      ["on-primary-container", "primary-container"],
      ["on-primary-soft", "primary-soft"],
      ["on-reward-soft", "reward-soft"],
      ["on-danger-soft", "danger-soft"],
    ] as const;
    for (const s of STYLES) {
      for (const scheme of ["light", "dark"] as const) {
        const p = s[scheme];
        for (const [fg, bg] of pairs) expect(contrast(p[fg], p[bg]), `${s.id} ${scheme} ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("no theme's primary looks like danger, and every theme has its own primary", () => {
    for (const s of STYLES) {
      for (const scheme of ["light", "dark"] as const) {
        expect(isNearDanger(s[scheme].primary), `${s.id} ${scheme}`).toBe(false);
        expect(isNearDanger(s[scheme].primary, s[scheme].danger), `${s.id} ${scheme} vs own danger`).toBe(false);
      }
    }
    for (const scheme of ["light", "dark"] as const) {
      const primaries = STYLES.map((s) => s[scheme].primary);
      expect(new Set(primaries).size, scheme).toBe(STYLES.length);
    }
  });
});

describe("Dojo themes (plan 0083)", () => {
  it("every built-in theme sets every token in light and dark with a hex colour", () => {
    for (const s of STYLES) {
      for (const scheme of ["light", "dark"] as const) {
        for (const t of THEME_TOKENS) expect(s[scheme][t], `${s.id} ${scheme} ${t}`).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it("text tokens of every theme are 4.5:1 or more on background and surface, and on-primary reads on primary", () => {
    for (const s of STYLES) {
      for (const scheme of ["light", "dark"] as const) {
        const p = s[scheme];
        for (const t of ["muted", "primary", "success", "warning", "danger"] as const) {
          expect(contrast(p[t], p.background), `${s.id} ${scheme} ${t}`).toBeGreaterThanOrEqual(4.5);
          expect(contrast(p[t], p.surface), `${s.id} ${scheme} ${t} on surface`).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(p["on-primary"], p.primary), `${s.id} ${scheme} on-primary`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("the stored id classic still loads, as Dojo, and is the default", () => {
    expect(DEFAULT_STYLE).toBe("classic");
    expect(parseStyle("classic")).toBe("classic");
    expect(STYLES.find((s) => s.id === "classic")!.label).toBe("Dojo");
    expect(STYLES.map((s) => s.id)).toEqual(["classic", "paper", "ocean", "terminal", "sage", "dusk", "ember"]);
    const init = runInit({ [STYLE_KEY]: "classic" }, false);
    expect(init.attrs.has("data-style")).toBe(false);
    expect(init.attrs.get("data-theme")).toBe("light");
  });

  it("Terminal is dark only, whatever the saved mode", () => {
    expect(runInit({ [STYLE_KEY]: "terminal", [THEME_KEY]: "light" }, false).attrs.get("data-theme")).toBe("dark");
    expect(resolveMode("light", false, "terminal")).toBe("dark");
    expect(resolveMode("light", false, "ember")).toBe("light");
    const t = STYLES.find((s) => s.id === "terminal")!;
    expect(t.darkOnly).toBe(true);
    expect(t.light).toEqual(t.dark);
  });

  it("Ember is a warm orange tonal scheme (tinted neutrals, orange primary)", () => {
    const e = STYLES.find((s) => s.id === "ember")!;
    expect(e.light.background).toBe("#fff8f4");
    expect(e.light.primary).toBe("#9d5600");
    expect(e.dark.primary).toBe("#ffb864");
  });

  it("an old custom theme (five colours and an accent) still parses", () => {
    const old = JSON.stringify({
      accent: "#2f7d5b",
      light: { background: "#f7f7f5", surface: "#ffffff", foreground: "#1a1a1a", line: "#e4e4e0", muted: "#6b6b66" },
      dark: { background: "#111211", surface: "#1a1b1a", foreground: "#ececea", line: "#2c2d2b", muted: "#9a9a94" },
    });
    const t = parseCustomTheme(old);
    expect(t.accent).toBe("#2f7d5b");
    expect(t.light?.muted).toBe("#6b6b66");
    expect(t.dark?.background).toBe("#111211");
  });

  it("detects when primary is near danger colour", () => {
    expect(isNearDanger("#b21f1f", "#BA1A1A")).toBe(true);
    expect(isNearDanger("#BA1A1A", "#BA1A1A")).toBe(true);
    expect(isNearDanger("#1E6B4A", "#BA1A1A")).toBe(false);
    expect(isNearDanger("#2B5EA8", "#BA1A1A")).toBe(false);
  });
});