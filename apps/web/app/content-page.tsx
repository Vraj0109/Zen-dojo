import type { ReactNode } from "react";
import {
  pageTemplate,
  slotKey,
  type BlockRow,
  type ContentPage as ContentPageData,
  type TemplateDef,
  type TemplateId,
} from "@habit/shared";
import { Markdown } from "./markdown";
import { SolutionTabs, type SolutionTab } from "./solution-tabs";
import { Diagram } from "./diagram";
import { Code } from "./code";

const LANG_DISPLAY_NAMES: Record<string, string> = {
  cpp: "C++",
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  go: "Go",
  rust: "Rust",
  csharp: "C#",
  kotlin: "Kotlin",
  swift: "Swift",
  sql: "SQL",
  bash: "Bash",
};

function formatLangLabel(lang: string): string {
  return LANG_DISPLAY_NAMES[lang.toLowerCase()] ?? (lang.charAt(0).toUpperCase() + lang.slice(1));
}

function formatBlockLabel(block: BlockRow): string | null {
  if (block.label) return block.label;
  if (block.variant === "optimal") return "Optimal";
  if (block.variant === "brute") return "Brute force";
  if (block.variant === "semi") return "Alternative";
  return block.variant ?? null;
}

function renderBlock(block: BlockRow, getAssetUrl: (id: string) => string): ReactNode {
  switch (block.type) {
    case "markdown":
      return (
        <div key={block.id} className="space-y-2">
          <Markdown source={block.body ?? ""} />
        </div>
      );

    case "code": {
      const entries = Object.entries(block.code ?? {}).filter(
        ([, code]) => typeof code === "string" && code.trim().length > 0,
      );
      if (entries.length === 0) return null;

      const tabs: SolutionTab[] = entries.map(([lang, code]) => ({
        id: lang,
        label: formatLangLabel(lang),
        node: <Code code={code!} lang={lang} maxHeight="24rem" />,
      }));

      const label = formatBlockLabel(block);

      return (
        <div key={block.id} className="my-4 space-y-2">
          {label && <h4 className="text-sm font-semibold text-foreground">{label}</h4>}
          <SolutionTabs tabs={tabs} />
          {(block.timeComplexity || block.spaceComplexity) && (
            <p className="text-xs text-muted">
              {block.timeComplexity && <span>Time: {block.timeComplexity}</span>}
              {block.timeComplexity && block.spaceComplexity && <span> · </span>}
              {block.spaceComplexity && <span>Space: {block.spaceComplexity}</span>}
            </p>
          )}
        </div>
      );
    }

    case "diagram":
      return (
        <div key={block.id} className="my-4">
          <Diagram source={block.body ?? ""} caption={block.caption ?? undefined} />
        </div>
      );

    case "image":
      return (
        <figure key={block.id} className="my-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getAssetUrl(block.assetId ?? "")}
            alt={block.body ?? ""}
            className="rounded border border-line max-w-full h-auto"
          />
          {block.caption && (
            <figcaption className="mt-2 text-center text-xs text-muted">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    default:
      return null;
  }
}

export interface ContentPageProps {
  template?: TemplateDef | TemplateId;
  page: ContentPageData;
  assetUrl?: (id: string) => string;
}

/**
 * Server component that renders a ContentPage adhering to template slots and section order.
 * Props-only data: no DB queries, cookies, or side effects.
 */
export function ContentPage({ template, page, assetUrl }: ContentPageProps) {
  const tmpl = typeof template === "string"
    ? pageTemplate(template)
    : (template ?? pageTemplate(page.template));

  const getAssetUrl = assetUrl ?? ((id: string) => `/api/content/assets/${id}`);

  return (
    <article className="space-y-8">
      {tmpl.slots.map((slot) => {
        const matchingSections = (page.sections ?? [])
          .filter((sec) => slotKey(sec.slot) === slot.key)
          .sort((a, b) => a.ord - b.ord);

        if (matchingSections.length === 0) return null;

        return (
          <div key={slot.key} className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {slot.heading}
            </h2>
            {matchingSections.map((sec) => (
              <section key={sec.id} id={`s-${sec.id}`} className="space-y-3">
                {sec.title && (
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {sec.title}
                  </h3>
                )}
                {sec.blocks
                  .slice()
                  .sort((a, b) => a.ord - b.ord)
                  .map((block) => renderBlock(block, getAssetUrl))}
              </section>
            ))}
          </div>
        );
      })}
    </article>
  );
}

export default ContentPage;
