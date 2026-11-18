// The Dojo tokens in DESIGN.md exist in globals.css for light and dark, keep their values, and are readable (plan 0083).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "../lib/custom";

const css = fs.readFileSync(path.join(__dirname, "globals.css"), "utf8");
const design = fs.readFileSync(path.join(__dirname, "..", "..", "..", "DESIGN.md"), "utf8");

/** The declaration block that follows `selector {` (first match). */
function rule(selector: string): string {
  const start = css.indexOf(selector + " {");
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}
function value(block: string, name: string): string | undefined {
  return new RegExp("(?:^|[\\s;{])--" + name + ":\\s*([^;]+);").exec(block)?.[1].trim().toLowerCase();
}

/** Rows of the Markdown table under `heading`: [token, col1, col2...] with backticks removed. */
function table(heading: string): string[][] {
  const start = design.indexOf(heading);
  expect(start, heading).toBeGreaterThanOrEqual(0);
  const rows: string[][] = [];
  for (const line of design.slice(start).split("\n").slice(1)) {
    if (line.startsWith("#")) break;
    if (!line.startsWith("|") || line.includes("---")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim().replace(/`/g, ""));
    if (cells[0] === "Token") continue;
    rows.push(cells);
  }
  return rows;
}

const light = rule(":root");
const dark = rule(':root[data-theme="dark"]');
const isHex = (v: string | undefined) => !!v && /^#[0-9a-f]{6}$/.test(v);

describe("DESIGN.md tokens in globals.css", () => {
  const lightRows = table("### Light");
  const darkRows = table("### Dark");
  const subjectRows = table("### Subject and difficulty colours");

  it("reads the tables", () => {
    expect(lightRows.length).toBeGreaterThanOrEqual(16);
    expect(darkRows.length).toBeGreaterThanOrEqual(16);
    expect(subjectRows.length).toBeGreaterThanOrEqual(9);
  });

  it("every colour token has the DESIGN.md value in light and dark", () => {
    for (const [token, v] of lightRows) expect(value(light, token), "light " + token).toBe(v.toLowerCase());
    for (const [token, v] of darkRows) expect(value(dark, token), "dark " + token).toBe(v.toLowerCase());
  });

  it("every subject colour exists in light and dark, and difficulty maps to success/warning/danger", () => {
    for (const [token, l, d] of subjectRows) {
      if (token.startsWith("diff-")) {
        expect(value(light, token), token).toMatch(/^var\(--(success|warning|danger)\)$/);
        continue;
      }
      expect(value(light, token), "light " + token).toBe(l.toLowerCase());
      expect(value(dark, token), "dark " + token).toBe(d.toLowerCase());
    }
  });

  it("maps every token to a Tailwind colour and keeps the old accent names as aliases", () => {
    for (const [token] of [...lightRows, ...subjectRows]) expect(css, token).toContain(`--color-${token}: var(--${token});`);
    expect(value(light, "accent")).toBe("var(--primary)");
    expect(value(light, "on-accent")).toBe("var(--on-primary)");
    expect(css).toContain("--color-accent: var(--accent);");
  });

  it("defines the type, radius, shadow and motion scales", () => {
    const theme = css.slice(css.indexOf("@theme inline {"));
    for (const [name, size, lh] of [
      ["xs", "0.75rem", "1rem"],
      ["sm", "0.875rem", "1.25rem"],
      ["base", "1rem", "1.625rem"],
      ["lg", "1.125rem", "1.75rem"],
      ["xl", "1.375rem", "1.875rem"],
      ["2xl", "1.75rem", "2.25rem"],
      ["3xl", "2.25rem", "2.75rem"],
    ]) {
      expect(theme).toContain(`--text-${name}: ${size};`);
      expect(theme).toContain(`--text-${name}--line-height: ${lh};`);
    }
    expect(value(light, "r-sm")).toBe("6px");
    expect(value(light, "r-md")).toBe("10px");
    expect(value(light, "r-lg")).toBe("14px");
    expect(value(light, "elev-sm")).toBe("0 1px 2px rgba(31, 26, 20, 0.06)");
    expect(value(light, "elev-lg")).toBe("0 8px 24px rgba(31, 26, 20, 0.12)");
    expect(value(dark, "elev-lg")).toBe("0 0 #0000"); // no shadows in dark mode
    for (const d of ["120ms", "180ms", "240ms"]) expect(light).toContain(d);
    expect(theme).toContain("--ease-dojo: cubic-bezier(0.2, 0, 0, 1);");
  });
});

describe("contrast of the Dojo tokens", () => {
  for (const [scheme, block] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    it(scheme + ": text tokens are 4.5:1 or more on background and surface", () => {
      const bg = value(block, "background")!;
      const surface = value(block, "surface")!;
      for (const t of ["foreground", "muted", "primary", "success", "warning", "danger"]) {
        const v = value(block, t);
        expect(isHex(v), t).toBe(true);
        expect(contrast(v!, bg), `${scheme} ${t} on background`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(v!, surface), `${scheme} ${t} on surface`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(value(block, "on-primary")!, value(block, "primary")!), scheme + " on-primary").toBeGreaterThanOrEqual(4.5);
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
    expect(value(shikiDark, "shiki-background")).toBe("#0d0e0d");
  });
});
