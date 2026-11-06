import type { ProblemNote } from "@/lib/notes";
import { LANGUAGES, NOTE_LIMITS } from "@/lib/notes";
import { saveNoteAction } from "./actions";
import { SubmitButton } from "./submit-button";

/** Notes + saved code for a DSA problem, design or LLD problem (stored in problem_notes). */
export function NotesForm({
  id,
  note,
  notesLabel = "Your notes",
  notesPlaceholder,
  codeLabel = "Your solution",
  codePlaceholder,
  defaultLanguage = "Java",
}: {
  id: string;
  note: ProblemNote | null;
  notesLabel?: string;
  notesPlaceholder: string;
  codeLabel?: string;
  codePlaceholder: string;
  defaultLanguage?: string;
}) {
  const field = "w-full rounded-lg border border-line bg-background px-3 py-2";
  return (
    <form action={saveNoteAction} className="space-y-4">
      <input type="hidden" name="problemId" value={id} />
      <div>
        <label htmlFor="notes" className="mb-1 block font-semibold">
          {notesLabel}
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={8}
          maxLength={NOTE_LIMITS.notes}
          defaultValue={note?.notes ?? ""}
          placeholder={notesPlaceholder}
          className={field}
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <label htmlFor="code" className="font-semibold">
            {codeLabel}
          </label>
          <select
            name="language"
            aria-label="Language"
            defaultValue={note?.language || defaultLanguage}
            className="rounded-lg border border-line bg-background px-2 py-1 text-sm"
          >
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <textarea
          id="code"
          name="code"
          rows={16}
          maxLength={NOTE_LIMITS.code}
          spellCheck={false}
          defaultValue={note?.code ?? ""}
          placeholder={codePlaceholder}
          className={`${field} font-mono text-sm`}
        />
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">Save</SubmitButton>
        {note && (
          <span className="text-sm text-muted">
            Last saved {new Date(note.updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
      </div>
      <p className="text-xs text-muted">Stored only in your local database. Saving both fields empty removes the note.</p>
    </form>
  );
}
