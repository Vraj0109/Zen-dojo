"use client";

import { useActionState } from "react";
import { importPackAction, type PackImportState } from "./actions";

/** Add a content pack: paste its JSON, choose a file, or give a web address. Check first, then install. */
export function PackImporter() {
  const [state, action, pending] = useActionState<PackImportState | null, FormData>(importPackAction, null);
  const field = "w-full rounded-lg border border-line bg-background px-3 py-1.5 text-sm";
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">
        <span className="font-medium">Paste a pack</span>
        <textarea name="json" rows={5} spellCheck={false} placeholder='{ "format": "prepwise-pack", "version": 1, ... }' className={`${field} mt-1 font-mono text-xs`} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">or choose a file</span>
          <input type="file" name="file" accept=".json,application/json" className={`${field} mt-1`} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">or a web address</span>
          <input type="url" name="url" placeholder="https://raw.githubusercontent.com/…/pack.json" className={`${field} mt-1`} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="checkOnly" value="1" disabled={pending} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background disabled:opacity-50">
          Check only
        </button>
        <button type="submit" disabled={pending} className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-on-accent disabled:opacity-50">
          {pending ? "Working…" : "Install"}
        </button>
      </div>
      {state && (
        <div role={state.ok ? "status" : "alert"} className={`rounded-lg border p-3 text-sm ${state.ok ? "border-diff-easy" : "border-diff-hard"}`}>
          <p className="font-medium">{state.message}</p>
          {state.errors.length > 0 && (
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {state.warnings.length > 0 && (
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted">
              {state.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
