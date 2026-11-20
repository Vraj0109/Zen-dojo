"use client";

import { useState } from "react";

/** Copies `text` to the clipboard. Renders nothing useful without JavaScript, which is fine for a convenience. */
export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("done");
        } catch {
          setState("failed");
        }
        setTimeout(() => setState("idle"), 1500);
      }}
      className={`absolute top-2 right-2 inline-flex min-h-8 min-w-10 items-center justify-center rounded-md border bg-surface px-2.5 text-xs transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/code:opacity-100 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 ${
        state === "failed" ? "border-danger text-danger" : "border-line text-muted"
      }`}
      aria-label="Copy code"
    >
      <span role="status" aria-live="polite">
        {state === "done" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
      </span>
    </button>
  );
}
