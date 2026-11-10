"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProblemNote } from "@/lib/notes";
import { LANGUAGES, NOTE_LIMITS } from "@/lib/note-limits";
import { parseProjectCode, serializeProject, type ProjectFile } from "@/lib/project-files";
import { saveNoteAction } from "./actions";
import { EditorField } from "./code-editor";
import { ProjectEditor } from "./components/project-editor";
import { SubmitButton } from "./submit-button";

/** Notes + saved code for a DSA problem, design or LLD problem (stored in problem_notes). */
export function NotesForm({
  id,
  note,
  notesLabel = "Your notes",
  notesPlaceholder,
  codeLabel = "Your solution",
  codePlaceholder,
  codeHelp,
  defaultLanguage = "Java",
  javaProject = false,
}: {
  id: string;
  note: ProblemNote | null;
  notesLabel?: string;
  notesPlaceholder: string;
  codeLabel?: string;
  codePlaceholder: string;
  codeHelp?: string;
  defaultLanguage?: string;
  javaProject?: boolean;
}) {
  const [files, setFiles] = useState<ProjectFile[]>(() => parseProjectCode(note?.code ?? "", note?.language ?? ""));
  const initialSerialized = useMemo(() => serializeProject(parseProjectCode(note?.code ?? "", note?.language ?? "")), [note]);
  const currentSerialized = serializeProject(files);
  const isDirty = currentSerialized !== initialSerialized;

  const prevRef = useRef({ id, note });
  useEffect(() => {
    if (prevRef.current.id !== id || prevRef.current.note !== note) {
      prevRef.current = { id, note };
      setFiles(parseProjectCode(note?.code ?? "", note?.language ?? ""));
    }
  }, [id, note]);

  const field = "w-full rounded-lg border border-line bg-background px-3 py-2";
  const subtitle = codeHelp ?? (javaProject ? codePlaceholder : undefined);

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

      {javaProject ? (
        <div className="space-y-2">
          <input type="hidden" name="code" value={currentSerialized} />
          <input type="hidden" name="language" value="java-project" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold">{codeLabel}</span>
              {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
            </div>
            {isDirty && <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>}
          </div>
          <ProjectEditor projectId={id} value={files} onChange={setFiles} storageKey={`zen-dojo:lld:${id}`} />
        </div>
      ) : (
        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label htmlFor="code" className="font-semibold">
              {codeLabel}
            </label>
            <select
              id="code-language"
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
          <EditorField languageSelectId="code-language" rows={16}>
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
          </EditorField>
        </div>
      )}

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
