import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FAQ_CATEGORIES, FAQ_ENTRIES, type FaqBlock } from "./faq";
import { renderFaqMarkdown } from "./faq-markdown";

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}]/u;
const texts = (b: FaqBlock): string[] => (b.type === "p" || b.type === "code" ? [b.text] : b.items);

describe("FAQ data", () => {
  it("has unique, url-safe ids", () => {
    const ids = FAQ_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("has non-empty questions and answers", () => {
    for (const e of FAQ_ENTRIES) {
      expect(e.question.trim().length, e.id).toBeGreaterThan(5);
      expect(e.answer.length, e.id).toBeGreaterThan(0);
      for (const b of e.answer) for (const t of texts(b)) expect(t.trim().length, e.id).toBeGreaterThan(0);
    }
  });

  it("uses every category and only known categories", () => {
    const known = new Set(FAQ_CATEGORIES.map((c) => c.id));
    expect(known.size).toBe(FAQ_CATEGORIES.length);
    for (const e of FAQ_ENTRIES) expect(known.has(e.category), e.id).toBe(true);
    for (const c of FAQ_CATEGORIES) expect(FAQ_ENTRIES.some((e) => e.category === c.id), c.id).toBe(true);
  });

  it("contains no emoji", () => {
    const all = [...FAQ_CATEGORIES.flatMap((c) => [c.title, c.blurb]), ...FAQ_ENTRIES.flatMap((e) => [e.question, ...e.answer.flatMap(texts)])];
    for (const t of all) expect(EMOJI_RE.test(t), t.slice(0, 40)).toBe(false);
  });

  it("docs/faq.md is up to date (run pnpm faq:build)", () => {
    const file = path.resolve(__dirname, "../../../docs/faq.md");
    expect(fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")).toBe(renderFaqMarkdown());
  });
});
