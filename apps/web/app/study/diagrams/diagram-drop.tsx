"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Image picker for the diagram upload form. Drop, paste (Ctrl/Cmd+V) or choose a file. The chosen file is
 * put into the real <input type="file"> via DataTransfer, so the form posts to /api/diagrams as before and
 * the plain input still works without JS.
 */
export function DiagramDrop({
  name = "file",
  label = "Image",
  types,
  maxBytes,
  required = true,
}: {
  name?: string;
  label?: string;
  /** Allowed MIME types, passed from the server (DIAGRAM_TYPES). */
  types: readonly string[];
  /** Size limit in bytes, passed from the server (DIAGRAM_LIMITS.bytes). */
  maxBytes: number;
  required?: boolean;
}) {
  const inputId = useId();
  const titleId = useId();
  const hintId = useId();
  const errorId = useId();
  const zoneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ name: string; size: number; url: string } | null>(null);
  const mb = Math.round(maxBytes / 1_000_000);
  const accept = types.join(",");

  // Free the preview URL when the file changes or the component unmounts.
  useEffect(() => () => {
    if (picked) URL.revokeObjectURL(picked.url);
  }, [picked]);

  const offer = useCallback(
    (file: File | undefined) => {
      const input = inputRef.current;
      if (!input || !file) return;
      const problem = checkFile(file, types, maxBytes, mb);
      if (problem) {
        input.value = ""; // never leave a rejected file in the form
        setPicked(null);
        setError(problem);
        return;
      }
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      setError(null);
      setPicked({ name: file.name || "Pasted image", size: file.size, url: URL.createObjectURL(file) });
    },
    [types, maxBytes, mb],
  );

  // Paste an image while the zone or the page (nothing typed into) has focus.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const zone = zoneRef.current;
      if (!zone) return;
      const active = document.activeElement;
      if (active && !zone.contains(active) && isTypingTarget(active)) return;
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === "file" && i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) return; // plain text paste: leave it alone
      e.preventDefault();
      offer(file);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [offer]);

  return (
    <div className="min-w-0 space-y-1.5">
      <span id={titleId} className="block text-sm font-medium">
        {label}
      </span>
      <div
        ref={zoneRef}
        onDragOver={(e) => {
          if (!Array.from(e.dataTransfer.types).includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          offer(e.dataTransfer.files[0]);
        }}
        style={{
          transform: dragging ? "scale(1.01)" : "scale(1)",
          transitionTimingFunction: "var(--ease-spring-soft)",
        }}
        className={`rounded-[24px] border-2 border-dashed border-line-strong transition-[transform,background-color,box-shadow] duration-300 ${
          dragging ? "bg-surface-2 ring-2 ring-primary" : "bg-surface"
        }`}
      >
        <label
          htmlFor={inputId}
          className="flex min-h-36 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[22px] px-4 py-5 text-center has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
        >
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            name={name}
            accept={accept}
            required={required}
            aria-labelledby={titleId}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) {
                setPicked(null);
                setError(null);
                return;
              }
              offer(file);
            }}
            className="sr-only"
          />
          {picked ? (
            <span className="flex w-full min-w-0 items-center gap-3 text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={picked.url} alt="" className="size-16 shrink-0 rounded-xl bg-surface-2 object-contain" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{picked.name}</span>
                <span className="block text-[13px] text-muted">{formatSize(picked.size)}</span>
              </span>
            </span>
          ) : (
            <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-[16px] bg-primary-soft text-on-primary-soft">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
              </svg>
            </span>
          )}
          <span id={hintId} className="text-sm text-muted">
            Drop, paste or choose a PNG, JPG, WebP or GIF up to {mb} MB
          </span>
        </label>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function checkFile(file: File, types: readonly string[], maxBytes: number, mb: number): string | null {
  if (!types.includes(file.type)) return "Use a PNG, JPEG, WebP or GIF image.";
  if (file.size === 0) return "That file is empty. Choose another image.";
  if (file.size > maxBytes) return `Images can be up to ${mb} MB.`;
  return null;
}

function isTypingTarget(el: Element): boolean {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) return el.type !== "file" && el.type !== "button" && el.type !== "submit";
  return el instanceof HTMLElement && el.isContentEditable;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} KB`;
}
