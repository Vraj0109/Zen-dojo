import { FAQ_CATEGORIES, FAQ_ENTRIES, type FaqBlock } from "./faq";

// Renders the FAQ data as docs/faq.md. Pure; used by scripts/faq.mjs (`pnpm faq:build`) and faq.test.ts.

function block(b: FaqBlock): string {
  if (b.type === "p") return b.text;
  if (b.type === "steps") return b.items.map((t, i) => `${i + 1}. ${t}`).join("\n");
  if (b.type === "list") return b.items.map((t) => `- ${t}`).join("\n");
  return "```\n" + b.text + "\n```";
}

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-");
}

export function renderFaqMarkdown(): string {
  const out: string[] = [
    "# Zen Dojo: help and FAQ",
    "",
    "<!-- Generated from apps/web/lib/faq.ts by `pnpm faq:build`. Edit that file, not this one. -->",
    "",
    "The same text is in the app at `/help`. Where something could not be confirmed, the answer says Not verified.",
    "",
    "## Contents",
    "",
    ...FAQ_CATEGORIES.map((c) => `- [${c.title}](#${slug(c.title)})`),
    "",
  ];
  for (const c of FAQ_CATEGORIES) {
    out.push(`## ${c.title}`, "", `_${c.blurb}_`, "");
    for (const e of FAQ_ENTRIES.filter((x) => x.category === c.id)) {
      out.push(`### ${e.question}`, "");
      for (const b of e.answer) out.push(block(b), "");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
