"use client";

import { useState } from "react";
import { buttonClass } from "../../../ui";

/** A command in a box with a Copy button. Without JavaScript the text can still be selected by hand. */
export function CopyCommand({ command }: { command: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 dark:border-0">
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
        className={buttonClass("outline", "sm", "shrink-0 max-md:h-11")}
        aria-label={`Copy the command: ${command}`}
      >
        {state === "done" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
      </button>
    </div>
  );
}
