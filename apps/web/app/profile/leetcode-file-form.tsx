"use client";

import { useActionState } from "react";
import { importLeetCodeFileAction, type LeetCodeFileState } from "../actions";

/** Upload the JSON file saved by the browser extension's "Export to file". Works without JavaScript too. */
export function LeetCodeFileForm() {
  const [state, action, pending] = useActionState<LeetCodeFileState | null, FormData>(importLeetCodeFileAction, null);
  return (
    <form action={action} className="mt-3 space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          name="file"
          accept=".json,application/json"
          required
          aria-label="LeetCode history file"
          className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity disabled:opacity-50"
        >
          {pending ? "Importing…" : "Import file"}
        </button>
      </div>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-muted" : "text-cat-mock"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
