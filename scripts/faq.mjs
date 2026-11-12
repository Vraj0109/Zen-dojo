// Writes docs/faq.md from apps/web/lib/faq.ts. Run: pnpm faq:build
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderFaqMarkdown } from "../apps/web/lib/faq-markdown.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(path.join(root, "docs", "faq.md"), renderFaqMarkdown());
console.log("wrote docs/faq.md");
