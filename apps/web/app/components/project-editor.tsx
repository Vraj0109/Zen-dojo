"use client";

import { FailureText, HostedProjectNotice } from "./hosted-run-notice";
import { PhoneCodeNote } from "./phone-study";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorField } from "../code-editor";

export type ProjectFile = { name: string; content: string };

type Diagnostic = { file: string; line: number; column?: number; message: string; severity: string };

/** Shape of the /api/judge/run-project response (defined here so the editor does not depend on the server code). */
type RunResult = {
  ok?: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  elapsedMs: number;
  diagnostics?: Diagnostic[];
};

const STORAGE_PREFIX = "zen-dojo:project:";
const MAX_FILES = 30;
const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(\.java)?$/;

function loadStored(key: string): { files: ProjectFile[]; active: string } | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return null;
    const { files, active } = data as { files?: unknown; active?: unknown };
    if (!Array.isArray(files)) return null;
    const clean = files.filter(
      (f): f is ProjectFile => typeof f === "object" && f !== null && typeof (f as ProjectFile).name === "string" && typeof (f as ProjectFile).content === "string",
    );
    if (clean.length === 0) return null;
    return { files: clean, active: typeof active === "string" && clean.some((f) => f.name === active) ? active : clean[0].name };
  } catch {
    return null;
  }
}

function saveStored(key: string, files: ProjectFile[], active: string) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ files, active }));
  } catch {
    // Storage can be blocked or full; the editor keeps working in memory.
  }
}

function clearStored(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Moves the caret of the CodeMirror editor inside `root` to a 1-based line. Returns false if it is not ready yet. */
async function jumpToLine(root: HTMLElement | null, line: number, column?: number): Promise<boolean> {
  const dom = root?.querySelector<HTMLElement>(".cm-editor");
  if (!dom) return false;
  const { EditorView } = await import("@codemirror/view");
  const view = EditorView.findFromDOM(dom);
  if (!view) return false;
  const target = view.state.doc.line(Math.min(Math.max(line, 1), view.state.doc.lines));
  const pos = target.from + Math.min(Math.max((column ?? 1) - 1, 0), target.length);
  view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
  view.focus();
  return true;
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICON_PLAY = "M6 4l14 8-14 8z";
const ICON_PLUS = "M12 5v14M5 12h14";
const ICON_TRASH = "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3";
const ICON_RESET = "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5";

const BUTTON =
  "inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-line/40 disabled:cursor-not-allowed disabled:opacity-50";

export type ProjectEditorProps = {
  projectId: string;
  initialFiles?: ProjectFile[];
  value?: ProjectFile[];
  onChange?: (files: ProjectFile[]) => void;
  storageKey?: string;
  showReset?: boolean;
  /** Reader mode: files are shown read-only; no Run, add, delete or reset. */
  readOnly?: boolean;
  /** Hosted site: Java projects cannot run here. No Run Project or console; a notice with the desktop download link instead. */
  noRun?: boolean;
};

export function ProjectEditor({
  projectId,
  initialFiles,
  value,
  onChange,
  storageKey,
  showReset = true,
  readOnly = false,
  noRun = false,
}: ProjectEditorProps) {
  const defaultFiles = value ?? initialFiles ?? [];
  const [files, setFiles] = useState<ProjectFile[]>(defaultFiles);
  const [active, setActive] = useState<string>(defaultFiles[0]?.name ?? "");
  const [revision, setRevision] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [failure, setFailure] = useState("");

  const editorRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef(files);
  const activeRef = useRef(active);
  const onChangeRef = useRef(onChange);
  const initialFilesRef = useRef(initialFiles && initialFiles.length > 0 ? initialFiles : (value ?? []));
  const pendingJump = useRef<{ file: string; line: number; column?: number } | null>(null);
  const selectId = `project-lang-${projectId.replace(/[^A-Za-z0-9_-]/g, "-")}`;
  const resolvedKey = storageKey ?? (STORAGE_PREFIX + projectId);

  useEffect(() => {
    filesRef.current = files;
    activeRef.current = active;
    onChangeRef.current = onChange;
  }, [files, active, onChange]);

  useEffect(() => {
    if (value !== undefined && value !== filesRef.current) {
      filesRef.current = value;
      initialFilesRef.current = value;
      setFiles(value);
      if (!value.some((f) => f.name === activeRef.current)) {
        setActive(value[0]?.name ?? "");
      }
    }
  }, [value]);

  // Load saved work after mount, so the server and first client render agree.
  useEffect(() => {
    const stored = loadStored(resolvedKey);
    /* eslint-disable react-hooks/set-state-in-effect -- browser storage can only be read after mount */
    if (stored) {
      setFiles(stored.files);
      setActive(stored.active);
      onChangeRef.current?.(stored.files);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [resolvedKey]);

  useEffect(() => {
    if (hydrated) saveStored(resolvedKey, files, active);
  }, [resolvedKey, files, active, hydrated]);

  /** Copies the editor's current text into state and returns the up-to-date file list. */
  const flush = useCallback((): ProjectFile[] => {
    const textarea = editorRef.current?.querySelector("textarea");
    const current = filesRef.current;
    if (!textarea) return current;
    const name = activeRef.current;
    if (!current.some((f) => f.name === name && f.content !== textarea.value)) return current;
    const next = current.map((f) => (f.name === name ? { ...f, content: textarea.value } : f));
    filesRef.current = next;
    setFiles(next);
    onChangeRef.current?.(next);
    return next;
  }, []);

  // Flush on blur so clicks outside the editor immediately capture changes.
  useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    const onBlur = () => {
      flush();
    };
    root.addEventListener("focusout", onBlur);
    return () => {
      root.removeEventListener("focusout", onBlur);
    };
  }, [flush]);

  // The editor keeps its text inside the textarea without firing events, so check it a few times a second.
  useEffect(() => {
    const id = window.setInterval(flush, 500);
    return () => {
      window.clearInterval(id);
      flush();
    };
  }, [flush]);

  // After a tab switch, wait for the editor to appear, then jump to the requested line.
  useEffect(() => {
    const jump = pendingJump.current;
    if (!jump || jump.file !== active) return;
    let tries = 0;
    let timer: number | undefined;
    const attempt = async () => {
      tries += 1;
      let done = false;
      try {
        done = await jumpToLine(editorRef.current, jump.line, jump.column);
      } catch {
        done = false;
      }
      if (done || tries > 25) {
        pendingJump.current = null;
        return;
      }
      timer = window.setTimeout(attempt, 100);
    };
    timer = window.setTimeout(attempt, 50);
    return () => window.clearTimeout(timer);
  }, [active, revision]);

  const selectFile = (name: string) => {
    flush();
    setActive(name);
  };

  const addFile = () => {
    const trimmed = newName.trim();
    const name = trimmed.endsWith(".java") ? trimmed : `${trimmed}.java`;
    if (!NAME_PATTERN.test(trimmed)) {
      setNameError("Use letters, digits and underscores, starting with a letter.");
      return;
    }
    const current = flush();
    if (current.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setNameError("A file with that name already exists.");
      return;
    }
    if (current.length >= MAX_FILES) {
      setNameError(`A project can have at most ${MAX_FILES} files.`);
      return;
    }
    const cls = name.replace(/\.java$/, "");
    const next = [...current, { name, content: `public class ${cls} {\n    \n}\n` }];
    filesRef.current = next;
    setFiles(next);
    setActive(name);
    setAdding(false);
    setNewName("");
    setNameError("");
    onChangeRef.current?.(next);
  };

  const deleteFile = () => {
    const current = flush();
    if (current.length <= 1) return;
    if (!window.confirm(`Delete ${active}? This cannot be undone.`)) return;
    const index = current.findIndex((f) => f.name === active);
    const next = current.filter((f) => f.name !== active);
    filesRef.current = next;
    setFiles(next);
    setActive(next[Math.min(index, next.length - 1)].name);
    onChangeRef.current?.(next);
  };

  const resetCode = () => {
    if (!window.confirm("Reset every file to the starting code? Your changes will be lost.")) return;
    clearStored(resolvedKey);
    const target = initialFiles && initialFiles.length > 0 ? initialFiles : initialFilesRef.current;
    filesRef.current = target;
    setFiles(target);
    setActive(target[0]?.name ?? "");
    setResult(null);
    setFailure("");
    setRevision((r) => r + 1);
    onChangeRef.current?.(target);
  };

  const run = async () => {
    const current = flush();
    setRunning(true);
    setFailure("");
    try {
      const res = await fetch("/api/judge/run-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: current.map((f) => ({ name: f.name, content: f.content })) }),
      });
      const text = await res.text();
      let data: Partial<RunResult> | null = null;
      try {
        data = JSON.parse(text) as Partial<RunResult>;
      } catch {
        data = null;
      }
      if (!data || typeof data !== "object") {
        setResult(null);
        setFailure(`The server returned something unexpected (HTTP ${res.status}).`);
      } else if (!res.ok && typeof data.stdout !== "string" && typeof data.stderr !== "string") {
        const message = (data as { error?: unknown }).error;
        setResult(null);
        setFailure(typeof message === "string" ? message : `The run failed (HTTP ${res.status}).`);
      } else {
        setResult({
          ok: data.ok,
          stdout: typeof data.stdout === "string" ? data.stdout : "",
          stderr: typeof data.stderr === "string" ? data.stderr : "",
          exitCode: typeof data.exitCode === "number" ? data.exitCode : null,
          elapsedMs: typeof data.elapsedMs === "number" ? data.elapsedMs : 0,
          diagnostics: Array.isArray(data.diagnostics) ? data.diagnostics : [],
        });
      }
    } catch {
      setResult(null);
      setFailure("Could not reach the runner. Check that the app is running and try again.");
    } finally {
      setRunning(false);
    }
  };

  const goToDiagnostic = (d: Diagnostic) => {
    const known = filesRef.current.some((f) => f.name === d.file);
    if (!known) return;
    flush();
    pendingJump.current = { file: d.file, line: d.line, column: d.column };
    if (d.file === activeRef.current) {
      void jumpToLine(editorRef.current, d.line, d.column);
      pendingJump.current = null;
    } else {
      setActive(d.file);
    }
  };

  const activeFile = files.find((f) => f.name === active) ?? files[0];
  const diagnostics = result?.diagnostics ?? [];
  const succeeded = result !== null && result.exitCode === 0;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      {noRun && (
        <div className="border-b border-line p-3">
          <HostedProjectNotice />
        </div>
      )}
      {!readOnly && <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 max-md:hidden">
        {!noRun && (
          <button type="button" onClick={run} disabled={running} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60">
            <Icon d={ICON_PLAY} />
            {running ? "Running..." : "Run Project"}
          </button>
        )}
        <button type="button" onClick={() => setAdding((v) => !v)} className={BUTTON}>
          <Icon d={ICON_PLUS} />
          New Class / File
        </button>
        <button type="button" onClick={deleteFile} disabled={files.length <= 1} className={BUTTON}>
          <Icon d={ICON_TRASH} />
          Delete File
        </button>
        {showReset !== false && (
          <button type="button" onClick={resetCode} className={BUTTON}>
            <Icon d={ICON_RESET} />
            Reset Code
          </button>
        )}
      </div>}

      {!readOnly && adding && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 max-md:hidden">
          <label htmlFor={`${selectId}-new`} className="text-xs text-muted">
            File name
          </label>
          <input
            id={`${selectId}-new`}
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setNameError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFile();
              }
            }}
            placeholder="User.java"
            autoFocus
            spellCheck={false}
            className="rounded-md border border-line bg-background px-2 py-1 font-mono text-xs"
          />
          <button type="button" onClick={addFile} className={BUTTON}>
            Add
          </button>
          {nameError && <span className="text-xs text-red-600 dark:text-red-400">{nameError}</span>}
        </div>
      )}

      <div role="tablist" aria-label="Project files" className="flex max-md:hidden gap-px overflow-x-auto border-b border-line bg-line/30">
        {files.map((f) => {
          const selected = f.name === activeFile?.name;
          const errors = diagnostics.filter((d) => d.file === f.name && d.severity === "error").length;
          return (
            <button
              key={f.name}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectFile(f.name)}
              className={`whitespace-nowrap px-3 py-1.5 font-mono text-xs ${selected ? "bg-surface text-foreground" : "bg-background text-muted hover:text-foreground"}`}
            >
              {f.name}
              {errors > 0 && <span className="ml-1.5 text-red-600 dark:text-red-400">{errors}</span>}
            </button>
          );
        })}
      </div>

      {/* Phones: no editor at all, only each file as plain read-only text (CSS only, so no hydration mismatch). */}
      <div className="space-y-2 p-3 md:hidden">
        <PhoneCodeNote />
        {files.map((f) => (
          <details key={f.name} className="rounded-lg border border-line bg-background">
            <summary className="min-h-10 cursor-pointer select-none px-3 py-2 font-mono text-xs">{f.name}</summary>
            <pre className="max-h-96 overflow-auto border-t border-line p-3 text-xs whitespace-pre">{f.content}</pre>
          </details>
        ))}
      </div>

      <div ref={editorRef} className="h-[28rem] max-md:hidden">
        {activeFile && (
          <>
            <select id={selectId} hidden defaultValue="Java" aria-hidden="true" tabIndex={-1}>
              <option value="Java">Java</option>
            </select>
            <EditorField key={`${projectId}:${activeFile.name}:${revision}:${hydrated ? 1 : 0}`} languageSelectId={selectId} fill>
              <textarea
                defaultValue={activeFile.content}
                aria-label={`Code of ${activeFile.name}`}
                readOnly={readOnly}
                spellCheck={false}
                className="h-full w-full resize-none bg-background p-3 font-mono text-sm"
              />
            </EditorField>
          </>
        )}
      </div>

      {!readOnly && !noRun && <div className="border-t border-line bg-background max-md:hidden" aria-live="polite">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-3 py-1.5 text-xs text-muted">
          <span className="font-medium text-foreground">Console</span>
          {result && (
            <>
              <span>
                Exit code{" "}
                <span className={succeeded ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{result.exitCode ?? "none"}</span>
              </span>
              <span>{result.elapsedMs} ms</span>
            </>
          )}
        </div>
        <div className="max-h-72 overflow-auto px-3 py-2 font-mono text-xs leading-relaxed">
          {running && <p className="text-muted">Compiling and running...</p>}
          {!running && !result && !failure && <p className="text-muted">Press Run Project to compile all files and run the program.</p>}
          {failure && <p className="text-red-600 dark:text-red-400"><FailureText text={failure} /></p>}
          {!running && result && (
            <>
              {diagnostics.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {diagnostics.map((d, i) => (
                    <li key={`${d.file}:${d.line}:${i}`}>
                      <button type="button" onClick={() => goToDiagnostic(d)} className="text-left hover:underline">
                        <span className={d.severity === "error" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}>{d.severity}</span>{" "}
                        <span className="text-accent">
                          {d.file}:{d.line}
                          {d.column ? `:${d.column}` : ""}
                        </span>{" "}
                        <span className="text-foreground">{d.message}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {result.stdout && <pre className="whitespace-pre-wrap text-foreground">{result.stdout}</pre>}
              {result.stderr && <pre className="whitespace-pre-wrap text-red-600 dark:text-red-400">{result.stderr}</pre>}
              {!result.stdout && !result.stderr && diagnostics.length === 0 && <p className="text-muted">The program printed nothing.</p>}
            </>
          )}
        </div>
      </div>}
    </div>
  );
}
