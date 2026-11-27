// Page Markdown serialization and parsing (plan 0116 step 1).
// Converts ContentPage to and from Markdown with structured fences and line-numbered errors.

import type {
  BlockRow,
  CodeLang,
  CodeVariant,
  ContentPage,
  SectionRow,
  SlotDef,
  TemplateDef,
} from "./types";

export type MarkdownToPageResult =
  | { page: ContentPage; errors?: never }
  | { errors: Array<{ line: number; message: string }>; page?: never };

function parseFenceInfo(info: string): { lang: string; attrs: Record<string, string> } {
  const trimmed = info.trim();
  const braceStart = trimmed.indexOf("{");
  if (braceStart === -1) {
    return { lang: trimmed, attrs: {} };
  }
  const lang = trimmed.slice(0, braceStart).trim();
  const braceEnd = trimmed.lastIndexOf("}");
  const inner = braceEnd > braceStart ? trimmed.slice(braceStart + 1, braceEnd).trim() : trimmed.slice(braceStart + 1).trim();
  const attrs: Record<string, string> = {};

  // Matches key="quoted value" or key='quoted value' or key=unquotedValue
  const attrRegex = /([a-zA-Z0-9_-]+)=(?:"([^"]*)"|'([^']*)'|([^\s}]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(inner)) !== null) {
    const key = match[1];
    const val = match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : match[4];
    attrs[key] = val;
  }
  return { lang, attrs };
}

/**
 * Serializes a ContentPage into Markdown according to the template slots.
 */
/** A line of its own that starts a new text block (before a text block that follows another, or for an empty one). */
export const BLOCK_BREAK = "<!-- block -->";

export function pageToMarkdown(template: TemplateDef, page: ContentPage): string {
  const parts: string[] = [];

  for (const slotDef of template.slots) {
    const matchingSections = (page.sections ?? []).filter((s) =>
      slotDef.sections === "indexed" ? s.slot === slotDef.key || s.slot.startsWith(slotDef.key + ":") : s.slot === slotDef.key
    );

    if (matchingSections.length === 0) {
      if (slotDef.required) {
        parts.push(`## ${slotDef.heading}`);
      }
      continue;
    }

    parts.push(`## ${slotDef.heading}`);

    for (const sec of matchingSections) {
      if ((slotDef.sections === "many" || slotDef.sections === "indexed") && sec.title) {
        parts.push(`### ${sec.title}`);
      }

      let prevWasMarkdown = false;
      for (const block of sec.blocks ?? []) {
        if (block.type === "markdown") {
          const body = (block.body ?? "").trim();
          // Two text blocks in a row would merge, and an empty one would vanish: BLOCK_BREAK keeps each one.
          if (prevWasMarkdown || !body) parts.push(BLOCK_BREAK);
          if (body) parts.push(body);
          prevWasMarkdown = true;
          continue;
        }
        prevWasMarkdown = false;
        if (block.type === "diagram") {
          const captionAttr = block.caption ? ` {caption="${block.caption.replace(/"/g, '\\"')}"}` : "";
          parts.push(`\`\`\`mermaid${captionAttr}\n${block.body ?? ""}\n\`\`\``);
        } else if (block.type === "image") {
          const captionStr = block.caption ? ` "${block.caption.replace(/"/g, '\\"')}"` : "";
          parts.push(`![${block.body ?? ""}](asset:${block.assetId ?? ""}${captionStr})`);
        } else if (block.type === "code") {
          const entries = Object.entries(block.code ?? {}).filter(
            ([_, code]) => typeof code === "string"
          );
          if (entries.length === 0) continue;

          if (entries.length === 1) {
            const [lang, code] = entries[0];
            const attrs: string[] = [];
            if (block.variant) attrs.push(`variant=${block.variant}`);
            if (block.label) attrs.push(`label="${block.label.replace(/"/g, '\\"')}"`);
            if (block.timeComplexity) attrs.push(`time="${block.timeComplexity.replace(/"/g, '\\"')}"`);
            if (block.spaceComplexity) attrs.push(`space="${block.spaceComplexity.replace(/"/g, '\\"')}"`);
            const attrStr = attrs.length > 0 ? ` {${attrs.join(" ")}}` : "";
            parts.push(`\`\`\`${lang}${attrStr}\n${code}\n\`\`\``);
          } else {
            const blockTag = block.id || "opt";
            entries.forEach(([lang, code], idx) => {
              if (idx === 0) {
                const attrs: string[] = [`block=${blockTag}`];
                if (block.variant) attrs.push(`variant=${block.variant}`);
                if (block.label) attrs.push(`label="${block.label.replace(/"/g, '\\"')}"`);
                if (block.timeComplexity) attrs.push(`time="${block.timeComplexity.replace(/"/g, '\\"')}"`);
                if (block.spaceComplexity) attrs.push(`space="${block.spaceComplexity.replace(/"/g, '\\"')}"`);
                parts.push(`\`\`\`${lang} {${attrs.join(" ")}}\n${code}\n\`\`\``);
              } else {
                parts.push(`\`\`\`${lang} {block=${blockTag}}\n${code}\n\`\`\``);
              }
            });
          }
        }
      }
    }
  }

  return parts.join("\n\n") + "\n";
}

/**
 * Parses Markdown source into a ContentPage, reporting line-numbered errors if invalid.
 */
export function markdownToPage(template: TemplateDef, md: string): MarkdownToPageResult {
  const lines = md.split(/\r?\n/);
  const errors: Array<{ line: number; message: string }> = [];
  const sections: SectionRow[] = [];

  let currentSlot: SlotDef | null = null;
  let currentSection: SectionRow | null = null;
  let pendingMarkdownLines: { line: number; text: string }[] = [];
  /** Set by a BLOCK_BREAK line: the next flush makes a text block even if it is empty. */
  let breakOpenedAt: number | null = null;
  let insideFence: { startLine: number; lang: string; attrs: Record<string, string>; contentLines: string[] } | null = null;
  const codeBlockMap: Map<string, BlockRow> = new Map();

  let nextBlockNum = 1;
  let nextSecNum = 1;

  function ensureCurrentSection(lineNum: number, blockType: string): SectionRow | null {
    if (!currentSlot) {
      errors.push({ line: lineNum, message: `Content must be inside a slot. Missing "## <slot heading>".` });
      return null;
    }

    if (!currentSection) {
      if (currentSlot.sections === "many") {
        errors.push({ line: lineNum, message: `Content in repeating slot "${currentSlot.heading}" must be inside a "### <title>" section.` });
        return null;
      }
      currentSection = {
        id: `sec-${currentSlot.key}-${nextSecNum++}`,
        slot: currentSlot.key,
        ord: sections.length,
        title: null,
        blocks: [],
      };
      sections.push(currentSection);
    }

    if (!currentSlot.allowedBlocks.includes(blockType as any)) {
      errors.push({ line: lineNum, message: `Block type "${blockType}" is not allowed in slot "${currentSlot.heading}".` });
      return null;
    }

    return currentSection;
  }

  function flushPendingMarkdown() {
    const opened = breakOpenedAt;
    breakOpenedAt = null;
    if (pendingMarkdownLines.length === 0) {
      if (opened !== null) pushMarkdown(opened, "");
      return;
    }

    while (pendingMarkdownLines.length > 0 && pendingMarkdownLines[0].text.trim() === "") {
      pendingMarkdownLines.shift();
    }
    while (pendingMarkdownLines.length > 0 && pendingMarkdownLines[pendingMarkdownLines.length - 1].text.trim() === "") {
      pendingMarkdownLines.pop();
    }

    if (pendingMarkdownLines.length === 0) {
      if (opened !== null) pushMarkdown(opened, "");
      return;
    }

    const firstLine = pendingMarkdownLines[0].line;
    const text = pendingMarkdownLines.map((l) => l.text).join("\n");
    pendingMarkdownLines = [];
    pushMarkdown(firstLine, text);
  }

  function pushMarkdown(firstLine: number, text: string) {
    const sec = ensureCurrentSection(firstLine, "markdown");
    if (!sec) return;

    sec.blocks.push({
      id: `new-${nextBlockNum++}`,
      ord: sec.blocks.length,
      type: "markdown",
      body: text,
      caption: null,
      variant: null,
      label: null,
      timeComplexity: null,
      spaceComplexity: null,
      assetId: null,
      code: {},
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check if inside a code/diagram fence
    if (insideFence !== null) {
      if (trimmed === "```" || trimmed.startsWith("```")) {
        // Closing the fence
        const content = insideFence.contentLines.join("\n");
        const startLine = insideFence.startLine;
        const lang = insideFence.lang;
        const attrs = insideFence.attrs;
        insideFence = null;

        if (lang === "mermaid") {
          const sec = ensureCurrentSection(startLine, "diagram");
          if (sec) {
            sec.blocks.push({
              id: `new-${nextBlockNum++}`,
              ord: sec.blocks.length,
              type: "diagram",
              body: content,
              caption: attrs.caption || null,
              variant: null,
              label: null,
              timeComplexity: null,
              spaceComplexity: null,
              assetId: null,
              code: {},
            });
          }
        } else {
          // Code block
          const sec = ensureCurrentSection(startLine, "code");
          if (sec) {
            if (attrs.block && codeBlockMap.has(attrs.block)) {
              const existing = codeBlockMap.get(attrs.block)!;
              if (existing.code[lang as CodeLang] !== undefined) {
                errors.push({ line: startLine, message: `Duplicate language "${lang}" in code block "${attrs.block}".` });
              } else {
                existing.code[lang as CodeLang] = content;
              }
            } else {
              const codeBlock: BlockRow = {
                id: attrs.block || `new-${nextBlockNum++}`,
                ord: sec.blocks.length,
                type: "code",
                body: "",
                caption: null,
                variant: (attrs.variant as CodeVariant) || null,
                label: attrs.label || null,
                timeComplexity: attrs.time || null,
                spaceComplexity: attrs.space || null,
                assetId: null,
                code: { [lang as CodeLang]: content },
              };
              sec.blocks.push(codeBlock);
              if (attrs.block) {
                codeBlockMap.set(attrs.block, codeBlock);
              }
            }
          }
        }
      } else {
        insideFence.contentLines.push(rawLine);
      }
      continue;
    }

    // A block break line closes the text block before it and opens a new (possibly empty) one.
    if (trimmed === BLOCK_BREAK) {
      flushPendingMarkdown();
      breakOpenedAt = lineNumber;
      continue;
    }

    // Check for ## slot heading
    if (trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
      flushPendingMarkdown();
      const heading = trimmed.slice(3).trim();
      const slotDef = template.slots.find((s) => s.heading.trim() === heading);

      if (!slotDef) {
        errors.push({ line: lineNumber, message: `Unknown slot heading "${heading}" for template "${template.id}".` });
        currentSlot = null;
        currentSection = null;
      } else {
        currentSlot = slotDef;
        if (slotDef.sections === "one") {
          currentSection = {
            id: `sec-${slotDef.key}-${nextSecNum++}`,
            slot: slotDef.key,
            ord: sections.length,
            title: null,
            blocks: [],
          };
          sections.push(currentSection);
        } else {
          currentSection = null;
        }
      }
      continue;
    }

    // Check for ### section title in repeating slots
    if (trimmed.startsWith("### ")) {
      if (currentSlot && (currentSlot.sections === "many" || currentSlot.sections === "indexed")) {
        const slot = currentSlot;
        flushPendingMarkdown();
        const title = trimmed.slice(4).trim();
        if (slot.sections === "many") {
          currentSection = {
            id: `sec-${slot.key}-${nextSecNum++}`,
            slot: slot.key,
            ord: sections.length,
            title,
            blocks: [],
          };
          sections.push(currentSection);
        } else if (slot.sections === "indexed") {
          const idx = sections.filter((s) => s.slot.startsWith(slot.key)).length;
          currentSection = {
            id: `sec-${slot.key}-${idx}`,
            slot: `${slot.key}:${idx}`,
            ord: sections.length,
            title,
            blocks: [],
          };
          sections.push(currentSection);
        }
        continue;
      }
      // If inside a "one" slot, ### is treated as markdown heading within the section
    }

    // Check for opening code/diagram fence ```
    if (trimmed.startsWith("```")) {
      flushPendingMarkdown();
      const info = trimmed.slice(3);
      const parsed = parseFenceInfo(info);
      insideFence = {
        startLine: lineNumber,
        lang: parsed.lang,
        attrs: parsed.attrs,
        contentLines: [],
      };
      continue;
    }

    // Check for image line: ![alt text](asset:<id> "caption") alone on a line
    const imageMatch = /^!\[(.*?)\]\(asset:([^\s")]+)(?:\s+"([^"]*)")?\)$/.exec(trimmed);
    if (imageMatch) {
      flushPendingMarkdown();
      const sec = ensureCurrentSection(lineNumber, "image");
      if (sec) {
        sec.blocks.push({
          id: `new-${nextBlockNum++}`,
          ord: sec.blocks.length,
          type: "image",
          body: imageMatch[1],
          caption: imageMatch[3] || null,
          variant: null,
          label: null,
          timeComplexity: null,
          spaceComplexity: null,
          assetId: imageMatch[2],
          code: {},
        });
      }
      continue;
    }

    // Otherwise plain text line
    pendingMarkdownLines.push({ line: lineNumber, text: rawLine });
  }

  // End of file handling
  if (insideFence !== null) {
    errors.push({ line: insideFence.startLine, message: `Unclosed code fence starting at line ${insideFence.startLine}.` });
  }

  flushPendingMarkdown();

  // Check required slots
  for (const slotDef of template.slots) {
    if (slotDef.required) {
      const hasSlot = sections.some((s) =>
        slotDef.sections === "indexed" ? s.slot === slotDef.key || s.slot.startsWith(slotDef.key + ":") : s.slot === slotDef.key
      );
      if (!hasSlot) {
        errors.push({ line: 1, message: `Missing required slot "${slotDef.heading}".` });
      }
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return { page: { template: template.id, sections } };
}
