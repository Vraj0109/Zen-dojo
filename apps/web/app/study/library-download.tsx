"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { installLibraryCourseAction, type LibraryInstallState } from "../actions";

function Button({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="cursor-pointer rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent transition-opacity disabled:opacity-50">
      {pending ? "Downloading..." : label}
    </button>
  );
}

/** Download or Update button for one library course. Works without JS (the form posts to the server action). */
export function LibraryDownload({ id, title, label }: { id: string; title: string; label: "Download" | "Update" }) {
  const [state, action] = useActionState<LibraryInstallState | null, FormData>(installLibraryCourseAction, null);
  return (
    <form action={action} className="flex flex-col items-end gap-1" aria-label={`${label} ${title}`}>
      <input type="hidden" name="id" value={id} />
      <Button label={label} />
      {state && (
        <p role="status" className={`max-w-xs text-right text-xs ${state.ok ? "text-muted" : "text-diff-hard"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
