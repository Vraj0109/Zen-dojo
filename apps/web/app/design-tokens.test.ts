// Expressive design tokens in globals.css for light and dark, their values, and readability (plan 0085).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "../lib/custom";
import { ACCENTS, STYLES } from "../lib/theme";

const css = fs.readFileSync(path.join(__dirname, "globals.css"), "utf8");

/** The declaration block that follows `selector {` (first match). */
function rule(selector: string): string {
  const start = css.indexOf(selector + " {");
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}
function value(block: string, name: string): string | undefined {
  return new RegExp("(?:^|[\\s;{])--" + name + ":\\s*([^;]+);").exec(block)?.[1].trim().toLowerCase();
}

const light = rule(":root");
const dark = rule(':root[data-theme="dark"]');
const isHex = (v: string | undefined) => !!v && /^#[0-9a-f]{6}$/.test(v);

const EXPRESSIVE_TOKENS_LIGHT: Record<string, string> = {
  background: "#f6fbf5",
  surface: "#ffffff",
  "surface-2": "#ebf0ea",
  line: "#dee5dd",
  "line-strong": "#c0c9c1",
  outline: "#707971",
  foreground: "#171d19",
  muted: "#404943",
  primary: "#1e6b4a",
  "on-primary": "#ffffff",
  "primary-hover": "#185a3e",
  "primary-container": "#b6f1cf",
  "on-primary-container": "#00210f",
  "primary-soft": "#d2e8d9",
  "on-primary-soft": "#0d1f15",
  reward: "#8b5000",
  "reward-soft": "#ffddb2",
  "on-reward-soft": "#2c1600",
  success: "#1e6b4a",
  warning: "#9a5b00",
  danger: "#ba1a1a",
  "danger-soft": "#ffdad6",
  "on-danger-soft": "#410002",
};

const EXPRESSIVE_TOKENS_DARK: Record<string, string> = {
  background: "#0f1512",
  surface: "#1b211e",
  "surface-2": "#252b28",
  line: "#2f3631",
  "line-strong": "#404943",
  outline: "#8a938b",
  foreground: "#dee4de",
  muted: "#bfc9c1",
  primary: "#8fd8b0",
  "on-primary": "#003822",
  "primary-hover": "#a6e3c2",
  "primary-container": "#0f5236",
  "on-primary-container": "#abf4cb",
  "primary-soft": "#334b3d",
  "on-primary-soft": "#d2e8d9",
  reward: "#ffb95c",
  "reward-soft": "#6a3c00",
  "on-reward-soft": "#ffddb2",
  success: "#8fd8b0",
  warning: "#ffb95c",
  danger: "#ffb4ab",
  "danger-soft": "#93000a",
  "on-danger-soft": "#ffdad6",
};

const SUBJECT_TOKENS_LIGHT: Record<string, string> = {
  "cat-dsa": "#d6e3ff",
  "on-cat-dsa": "#001b3e",
  "cat-sd": "#f0dbff",
  "on-cat-sd": "#2a0e45",
  "cat-lld": "#bcebee",
  "on-cat-lld": "#002022",
  "cat-core": "#d2e8d9",
  "on-cat-core": "#0d1f15",
  "cat-beh": "#ffddb2",
  "on-cat-beh": "#2c1600",
};

const SUBJECT_TOKENS_DARK: Record<string, string> = {
  "cat-dsa": "#284777",
  "on-cat-dsa": "#d6e3ff",
  "cat-sd": "#56397a",
  "on-cat-sd": "#f0dbff",
  "cat-lld": "#1d4e51",
  "on-cat-lld": "#bcebee",
  "cat-core": "#334b3d",
  "on-cat-core": "#d2e8d9",
  "cat-beh": "#6a3c00",
  "on-cat-beh": "#ffddb2",
};

describe("Expressive tokens in globals.css (plan 0085)", () => {
  it("every colour token has the plan 0085 value in light and dark", () => {
    for (const [token, v] of Object.entries(EXPRESSIVE_TOKENS_LIGHT)) {
      expect(value(light, token), "light " + token).toBe(v.toLowerCase());
    }
    for (const [token, v] of Object.entries(EXPRESSIVE_TOKENS_DARK)) {
      expect(value(dark, token), "dark " + token).toBe(v.toLowerCase());
    }
  });

  it("every subject colour exists in light and dark, and difficulty maps to success/warning/danger", () => {
    for (const [token, v] of Object.entries(SUBJECT_TOKENS_LIGHT)) {
      expect(value(light, token), "light " + token).toBe(v.toLowerCase());
    }
    for (const [token, v] of Object.entries(SUBJECT_TOKENS_DARK)) {
      expect(value(dark, token), "dark " + token).toBe(v.toLowerCase());
    }
    expect(value(light, "diff-easy")).toMatch(/^var\(--success\)$/);
    expect(value(light, "diff-medium")).toMatch(/^var\(--warning\)$/);
    expect(value(light, "diff-hard")).toMatch(/^var\(--danger\)$/);
  });

  it("maps every token to a Tailwind colour and keeps the old accent names as aliases", () => {
    for (const token of Object.keys(EXPRESSIVE_TOKENS_LIGHT)) {
      expect(css, token).toContain(`--color-${token}: var(--${token});`);
    }
    expect(value(light, "accent")).toBe("var(--primary)");
    expect(value(light, "on-accent")).toBe("var(--on-primary)");
    expect(css).toContain("--color-accent: var(--accent);");
  });

  it("defines the radii and shadow scales", () => {
    expect(value(light, "r-sm")).toBe("10px");
    expect(value(light, "r-md")).toBe("16px");
    expect(value(light, "r-lg")).toBe("24px");
    expect(value(light, "r-xl")).toBe("32px");
    expect(value(light, "elev-menu")).toBe("0 8px 28px rgba(0, 0, 0, 0.07)");
    expect(value(dark, "elev-menu")).toBe("0 8px 28px rgba(0, 0, 0, 0.4)");
  });

  it("primary never resolves to the danger value in any theme or accent", () => {
    // In globals.css root
    expect(value(light, "primary")).not.toBe(value(light, "danger"));
    expect(value(dark, "primary")).not.toBe(value(dark, "danger"));

    // Across all built-in styles
    for (const style of STYLES) {
      expect(style.light.primary.toLowerCase(), `${style.id} light primary vs danger`).not.toBe(style.light.danger.toLowerCase());
      expect(style.dark.primary.toLowerCase(), `${style.id} dark primary vs danger`).not.toBe(style.dark.danger.toLowerCase());
    }

    // Across all accents vs styles' dangers
    for (const accent of ACCENTS) {
      for (const style of STYLES) {
        expect(accent.color.toLowerCase(), `accent ${accent.id} vs ${style.id} light danger`).not.toBe(style.light.danger.toLowerCase());
        expect(accent.dark.toLowerCase(), `accent ${accent.id} vs ${style.id} dark danger`).not.toBe(style.dark.danger.toLowerCase());
      }
    }
  });
});

describe("contrast of the Expressive tokens (WCAG 4.5:1)", () => {
  for (const [scheme, block] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    it(scheme + ": text tokens meet 4.5:1 on background and surface", () => {
      const bg = value(block, "background")!;
      const surface = value(block, "surface")!;
      for (const t of ["foreground", "muted", "primary", "success", "warning", "danger"]) {
        const v = value(block, t);
        expect(isHex(v), t).toBe(true);
        expect(contrast(v!, bg), `${scheme} ${t} on background`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(v!, surface), `${scheme} ${t} on surface`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(value(block, "on-primary")!, value(block, "primary")!), scheme + " on-primary").toBeGreaterThanOrEqual(4.5);
      expect(contrast(value(block, "on-primary-container")!, value(block, "primary-container")!), scheme + " on-primary-container").toBeGreaterThanOrEqual(4.5);
      expect(contrast(value(block, "on-primary-soft")!, value(block, "primary-soft")!), scheme + " on-primary-soft").toBeGreaterThanOrEqual(4.5);
      expect(contrast(value(block, "on-reward-soft")!, value(block, "reward-soft")!), scheme + " on-reward-soft").toBeGreaterThanOrEqual(4.5);
      expect(contrast(value(block, "on-danger-soft")!, value(block, "danger-soft")!), scheme + " on-danger-soft").toBeGreaterThanOrEqual(4.5);
    });

    it(scheme + ": subject on-* text meets 4.5:1 on subject background", () => {
      for (const cat of ["cat-dsa", "cat-sd", "cat-lld", "cat-core", "cat-beh"]) {
        const catBg = value(block, cat)!;
        const catText = value(block, "on-" + cat)!;
        expect(contrast(catText, catBg), `${scheme} ${cat}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it("code comments are 4.5:1 or more on the code background in both modes", () => {
    const shikiLight = css.slice(css.indexOf("--shiki-foreground"));
    const lightBg = value(shikiLight, "shiki-background")!;
    const lightComment = value(shikiLight, "shiki-token-comment")!;
    const darkStart = css.indexOf(':root[data-theme="dark"] {', css.indexOf("--shiki-foreground"));
    const shikiDark = css.slice(darkStart, css.indexOf("}", darkStart));
    expect(contrast(lightComment, lightBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(value(shikiDark, "shiki-token-comment")!, value(shikiDark, "shiki-background")!)).toBeGreaterThanOrEqual(4.5);
  });
});
