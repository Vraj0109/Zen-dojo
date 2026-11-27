"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  addBlock,
  duplicateBlock,
  markdownToPage,
  moveBlock,
  pageTemplate,
  pageToMarkdown,
  removeBlock,
  slotKey,
  type BlockRow,
  type BlockType,
  type CodeLang,
  type ContentPage,
  type SectionRow,
  type TemplateDef,
  type TemplateId,
} from "@habit/shared";
import { previewAction } from "../actions";
import { AiAssist } from "../ai-assist";
import type { AiEntity } from "../ai-actions";
import { BlockHeader, InsertBar } from "./block-toolbar";
import { TextBlockEditor } from "./text-block-editor";
import { CodeBlockEditor } from "./code-block-editor";
import { DiagramBlockEditor } from "./diagram-block-editor";
import { ImageBlockEditor } from "./image-block-editor";

/**
 * Where this page lives in the draft, so "Write with AI" can send the unsaved draft. Without it, the page editor
 * shows no AI buttons.
 */
export interface PageEditorAi {
  entity: Extract<AiEntity, "problem" | "lesson">;
  id: string;
  /** Problem: "statement" or "solution". Lesson: "page". */
  field: "statement" | "solution" | "page";
  /** The whole unsaved draft (ProblemDraft or ContentLesson). */
  draft: unknown;
}

export interface PageEditorProps {
  template: TemplateDef | TemplateId;
  page: ContentPage;
  onChange: (page: ContentPage) => void;
  onRunCode?: (lang: CodeLang, code: string, isOptimal: boolean) => void;
  allowedLangs?: readonly string[];
  ai?: PageEditorAi;
}

export function PageEditor({
  template: templateInput,
  page,
  onChange,
  onRunCode,
  allowedLangs,
  ai,
}: PageEditorProps) {
  const template = typeof templateInput === "string" ? pageTemplate(templateInput) : templateInput;

  const [view, setView] = useState<"blocks" | "markdown">("blocks");
  const [markdownText, setMarkdownText] = useState("");
  const [markdownErrors, setMarkdownErrors] = useState<Array<{ line: number; message: string }>>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewNode, setPreviewNode] = useState<ReactNode>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // The preview is rendered on the server (same component as the public page) 400 ms after the last change.
  useEffect(() => {
    if (!showPreview) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      previewAction({ template, page })
        .then((r) => {
          if (cancelled) return;
          if (r.ok) {
            setPreviewNode(r.node);
            setPreviewError(null);
          } else setPreviewError(r.errors.join(" "));
        })
        .catch(() => {
          if (!cancelled) setPreviewError("Could not render the preview.");
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showPreview, template, page]);

  // Sync markdown text when entering markdown view
  const handleSwitchToMarkdown = () => {
    try {
      const md = pageToMarkdown(template, page);
      setMarkdownText(md);
      setMarkdownErrors([]);
      setView("markdown");
    } catch (e) {
      alert(`Could not serialize page to Markdown: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleSwitchToBlocks = () => {
    const res = markdownToPage(template, markdownText);
    if ("errors" in res && res.errors && res.errors.length > 0) {
      setMarkdownErrors(res.errors);
      return;
    }
    if ("page" in res && res.page) {
      setMarkdownErrors([]);
      onChange(res.page);
      setView("blocks");
    }
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<BlockRow>) => {
    const updatedSections = (page.sections ?? []).map((sec) => ({
      ...sec,
      blocks: sec.blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b)),
    }));
    onChange({ ...page, sections: updatedSections });
  };

  const handleAddBlock = (sectionId: string, type: BlockType, atIndex?: number) => {
    const updated = addBlock(page, sectionId, type, atIndex);
    onChange(updated);
  };

  const handleRemoveBlock = (blockId: string) => {
    const updated = removeBlock(page, blockId);
    onChange(updated);
  };

  const handleMoveBlock = (blockId: string, delta: number) => {
    const updated = moveBlock(page, blockId, delta);
    onChange(updated);
  };

  const handleDuplicateBlock = (blockId: string) => {
    const updated = duplicateBlock(page, blockId);
    onChange(updated);
  };

  const handleUpdateSectionTitle = (sectionId: string, title: string) => {
    const updatedSections = (page.sections ?? []).map((sec) =>
      sec.id === sectionId ? { ...sec, title: title || null } : sec,
    );
    onChange({ ...page, sections: updatedSections });
  };

  // "Write with AI" on a section: keeps the section's id and slot; takes the AI's blocks and title.
  const handleReplaceSection = (sectionId: string, next: SectionRow) => {
    const updatedSections = (page.sections ?? []).map((sec) =>
      sec.id === sectionId ? { ...sec, title: next.title ?? null, blocks: next.blocks } : sec,
    );
    onChange({ ...page, sections: updatedSections });
  };

  const aiField = (suffix?: string) => (ai ? [ai.field, suffix].filter(Boolean).join("/") : "");

  const moveBlockRef = useRef(handleMoveBlock);
  useEffect(() => {
    moveBlockRef.current = handleMoveBlock;
  });

  // Keyboard shortcut listener for Alt+Up / Alt+Down on focused block
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        const active = document.activeElement;
        const blockEl = active?.closest("[data-block-id]");
        if (blockEl) {
          const id = blockEl.getAttribute("data-block-id");
          if (id) {
            e.preventDefault();
            moveBlockRef.current(id, e.key === "ArrowUp" ? -1 : 1);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="space-y-4">
      {/* Editor top toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-lg border border-line bg-surface px-4 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (view === "markdown") handleSwitchToBlocks();
            }}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              view === "blocks"
                ? "bg-accent/20 text-accent font-semibold"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            Blocks View
          </button>
          <button
            type="button"
            onClick={() => {
              if (view === "blocks") handleSwitchToMarkdown();
            }}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              view === "markdown"
                ? "bg-accent/20 text-accent font-semibold"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            Markdown View
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className={`rounded-md border border-line px-3 py-1.5 font-medium transition-colors ${
              showPreview ? "bg-accent text-white border-accent" : "bg-surface hover:bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {showPreview ? "Hide Preview" : "Live Preview"}
          </button>
        </div>
      </div>

      {/* Whole-page AI (blocks view only: the Markdown view has its own unsaved text) */}
      {ai && view === "blocks" && (
        <AiAssist
          target={ai.entity === "lesson" ? "lesson-page" : "solution-page"}
          entity={ai.entity}
          id={ai.id}
          field={aiField()}
          draft={ai.draft}
          current={page}
          template={typeof templateInput === "string" ? pageTemplate(templateInput) : templateInput}
          onChange={(next) => onChange(next as ContentPage)}
        />
      )}

      {/* Hidden input for non-JS form submission */}
      <input type="hidden" name="page_json" value={JSON.stringify(page)} />

      <div className={`grid gap-6 ${showPreview ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Main Editor Body */}
        <div className="space-y-6">
          {view === "markdown" ? (
            <div className="space-y-3">
              {markdownErrors.length > 0 && (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">
                  <p className="font-semibold mb-1">Markdown formatting errors (fix before returning to Blocks):</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {markdownErrors.map((err, i) => (
                      <li key={i}>
                        Line {err.line}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <textarea
                value={markdownText}
                onChange={(e) => setMarkdownText(e.target.value)}
                placeholder="## Section Heading&#10;&#10;Write Markdown content here..."
                rows={24}
                className="w-full rounded-md border border-line bg-surface/50 p-4 font-mono text-xs leading-relaxed focus:border-accent focus:outline-none"
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {template.slots.map((slot) => {
                const matchingSections = (page.sections ?? [])
                  .filter((s) => slotKey(s.slot) === slot.key)
                  .sort((a, b) => a.ord - b.ord);

                return (
                  <div key={slot.key} className="rounded-lg border border-line bg-surface/30 p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-line pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                        {slot.heading}
                      </h4>
                      <span className="text-[11px] text-muted font-mono">{slot.key}</span>
                    </div>

                    {matchingSections.length === 0 ? (
                      <div className="rounded border border-dashed border-line p-4 text-center">
                        <p className="text-xs text-muted mb-2">No sections in this slot yet.</p>
                      </div>
                    ) : (
                      matchingSections.map((sec) => (
                        <div key={sec.id} className="space-y-3">
                          {ai && (
                            <AiAssist
                              target="section"
                              entity={ai.entity}
                              id={ai.id}
                              field={aiField(`section:${sec.id}`)}
                              draft={ai.draft}
                              current={sec}
                              template={typeof templateInput === "string" ? pageTemplate(templateInput) : templateInput}
                              onChange={(next) => handleReplaceSection(sec.id, next as SectionRow)}
                            />
                          )}
                          {/* Title input for indexed/repeating sections */}
                          {(slot.sections === "indexed" || matchingSections.length > 1) && (
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-medium text-muted">Section:</label>
                              <input
                                type="text"
                                value={sec.title ?? ""}
                                onChange={(e) => handleUpdateSectionTitle(sec.id, e.target.value)}
                                placeholder="Section title..."
                                className="flex-1 rounded border border-line bg-surface px-2.5 py-1 text-xs focus:border-accent focus:outline-none"
                              />
                            </div>
                          )}

                          {sec.blocks
                            .slice()
                            .sort((a, b) => a.ord - b.ord)
                            .map((block, idx, arr) => (
                              <div key={block.id} data-block-id={block.id}>
                                <InsertBar
                                  onAdd={(type) => handleAddBlock(sec.id, type, idx)}
                                  sectionId={sec.id}
                                  index={idx}
                                />

                                <div className="rounded-md border border-line bg-surface overflow-hidden shadow-sm transition-all focus-within:border-accent/80">
                                  <BlockHeader
                                    blockId={block.id}
                                    type={block.type}
                                    variant={block.variant}
                                    label={block.label}
                                    canMoveUp={idx > 0}
                                    canMoveDown={idx < arr.length - 1}
                                    onMoveUp={() => handleMoveBlock(block.id, -1)}
                                    onMoveDown={() => handleMoveBlock(block.id, 1)}
                                    onDuplicate={() => handleDuplicateBlock(block.id)}
                                    onRemove={() => handleRemoveBlock(block.id)}
                                  />

                                  <div className="p-3 space-y-3">
                                    {ai && block.type !== "image" && (
                                      <AiAssist
                                        target={block.type === "code" ? "code-block" : block.type === "diagram" ? "diagram-block" : "text-block"}
                                        entity={ai.entity}
                                        id={ai.id}
                                        field={aiField(`block:${block.id}`)}
                                        draft={ai.draft}
                                        current={block.type === "code" ? block.code : block.body}
                                        onChange={(next) =>
                                          handleUpdateBlock(
                                            block.id,
                                            block.type === "code" ? { code: next as BlockRow["code"] } : { body: next as string },
                                          )
                                        }
                                      />
                                    )}
                                    {block.type === "markdown" && (
                                      <TextBlockEditor
                                        block={block}
                                        onChange={(updates) => handleUpdateBlock(block.id, updates)}
                                      />
                                    )}
                                    {block.type === "code" && (
                                      <CodeBlockEditor
                                        block={block}
                                        onChange={(updates) => handleUpdateBlock(block.id, updates)}
                                        onRunCode={onRunCode}
                                        allowedLangs={allowedLangs}
                                      />
                                    )}
                                    {block.type === "diagram" && (
                                      <DiagramBlockEditor
                                        block={block}
                                        onChange={(updates) => handleUpdateBlock(block.id, updates)}
                                      />
                                    )}
                                    {block.type === "image" && (
                                      <ImageBlockEditor
                                        block={block}
                                        onChange={(updates) => handleUpdateBlock(block.id, updates)}
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}

                          <InsertBar
                            onAdd={(type) => handleAddBlock(sec.id, type, sec.blocks.length)}
                            sectionId={sec.id}
                            index={sec.blocks.length}
                          />
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Preview Column */}
        {showPreview && (
          <div className="rounded-lg border border-line bg-surface/20 p-5 min-h-[20rem] overflow-y-auto">
            <div className="border-b border-line pb-2 mb-4">
              <span className="text-xs uppercase tracking-wide font-semibold text-muted">Page Preview</span>
            </div>
            {previewError ? <p className="text-sm text-muted">{previewError}</p> : previewNode ?? <p className="text-sm text-muted">Rendering the preview...</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageEditor;
