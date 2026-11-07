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
      className="absolute top-2 right-2 rounded-md border border-line bg-surface px-2 py-0.5 text-xs text-muted opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover/code:opacity-100"
      aria-label="Copy code"
    >
      {state === "done" ? "Copied" : state === "failed" ? "Failed" : "Copy"}
    </button>
  );
}
