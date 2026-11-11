"use client";

import { useState } from "react";

/** A command in a box with a Copy button. Without JavaScript the text can still be selected by hand. */
export function CopyCommand({ command }: { command: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-background px-3 py-2">
      <code className="min-w-0 flex-1 break-all text-sm select-all">{command}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(command);
            setState("done");
          } catch {
            setState("failed");
          }
          setTimeout(() => setState("idle"), 1500);
        }}
        className="shrink-0 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground"
        aria-label={`Copy the command: ${command}`}
      >
        {state === "done" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
      </button>
    </div>
  );
}
