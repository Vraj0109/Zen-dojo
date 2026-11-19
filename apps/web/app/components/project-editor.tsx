"use client";

import { FailureText, HostedProjectNotice } from "./hosted-run-notice";
import { PhoneCodeNote } from "./phone-study";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorField } from "../code-editor";
import { Diagram } from "../diagram";
import { CopyButton } from "../copy-button";

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

export type ProjectReference = {
  requirements?: { title: string; prompt?: string };
  walkthrough?: { title: string; paragraphs?: string[]; body?: string; code?: string }[];
  diagrams?: { title: string; source: string; caption?: string }[];
  referenceFiles?: { name: string; code: string }[];
};

const STORAGE_PREFIX = "zen-dojo:project:";
const MAX_FILES = 30;
const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(\.java)?$/;
const PACKAGE_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;

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

function Icon({ d, className = "size-3.5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICON_PLAY = "M6 4l14 8-14 8z";
const ICON_PLUS = "M12 5v14M5 12h14";
const ICON_FOLDER = "M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z";
const ICON_TRASH = "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3";
const ICON_EDIT = "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z";
const ICON_RESET = "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5";
const ICON_EXPAND = "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7";
const ICON_COLLAPSE = "M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7";
const ICON_CLOSE = "M18 6L6 18M6 6l12 12";
const ICON_BACK = "M19 12H5M12 19l-7-7 7-7";
const ICON_FILE = "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6";
const ICON_CHEVRON_DOWN = "M6 9l6 6 6-6";
const ICON_CHEVRON_RIGHT = "M9 18l6-6-6-6";

const BUTTON =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 sm:px-3 text-xs font-semibold text-foreground transition-colors duration-120 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-45";

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
  reference?: ProjectReference;
  title?: string;
};

const packageOf = (code: string) => /^\s*package\s+([\w.]+)\s*;/m.exec(code)?.[1] ?? "(default package)";

export function ProjectEditor({
  projectId,
  initialFiles,
  value,
  onChange,
  storageKey,
  showReset = true,
  readOnly = false,
  noRun = false,
  reference,
  title,
}: ProjectEditorProps) {
  const defaultFiles = value ?? initialFiles ?? [];
  const [files, setFiles] = useState<ProjectFile[]>(defaultFiles);
  const [active, setActive] = useState<string>(defaultFiles[0]?.name ?? "");
  const [revision, setRevision] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [failure, setFailure] = useState("");

  // Full-screen and side-drawer state
  const [fullscreen, setFullscreen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<"requirements" | "walkthrough" | "diagrams" | "reference" | null>(null);
  const [refFileActive, setRefFileActive] = useState<string>("");

  // Input actions modal/bar: "file" | "package" | "rename" | null
  const [actionType, setActionType] = useState<"file" | "package" | "rename" | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [inputError, setInputError] = useState("");
  const [targetPkg, setTargetPkg] = useState<string>("");

  // Collapsed packages map
  const [collapsedPkgs, setCollapsedPkgs] = useState<Record<string, boolean>>({});

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

  // Load saved work after mount
  useEffect(() => {
    const stored = loadStored(resolvedKey);
    /* eslint-disable react-hooks/set-state-in-effect -- browser storage read on mount */
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

  // Flush on blur
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

  // Periodic flush
  useEffect(() => {
    const id = window.setInterval(flush, 500);
    return () => {
      window.clearInterval(id);
      flush();
    };
  }, [flush]);

  // Line jump after tab switch
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

  // Focus restoration helper
  const focusEditor = useCallback(() => {
    const dom = editorRef.current?.querySelector<HTMLElement>(".cm-editor");
    if (dom) {
      import("@codemirror/view").then(({ EditorView }) => {
        EditorView.findFromDOM(dom)?.focus();
      }).catch(() => {});
    }
  }, []);

  const run = useCallback(async () => {
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
  }, [flush]);

  // Escape key handler: drawer first, then fullscreen, returning focus to editor
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (actionType) {
          e.preventDefault();
          setActionType(null);
          setInputError("");
          focusEditor();
        } else if (activeDrawer) {
          e.preventDefault();
          setActiveDrawer(null);
          focusEditor();
        } else if (fullscreen) {
          e.preventDefault();
          setFullscreen(false);
          focusEditor();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !readOnly && !noRun) {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actionType, activeDrawer, fullscreen, readOnly, noRun, focusEditor, run]);

  const selectFile = (name: string) => {
    flush();
    setActive(name);
  };

  // Group files by package
  const packageMap = useMemo(() => {
    const map = new Map<string, ProjectFile[]>();
    for (const f of files) {
      const pkg = packageOf(f.content);
      const list = map.get(pkg) ?? [];
      list.push(f);
      map.set(pkg, list);
    }
    return map;
  }, [files]);

  const activeFile = files.find((f) => f.name === active) ?? files[0];
  const activePackage = activeFile ? packageOf(activeFile.content) : "(default package)";

  const startAddFile = (pkg?: string) => {
    setActionType("file");
    setTargetPkg(pkg ?? (activePackage === "(default package)" ? "" : activePackage));
    setInputVal("");
    setInputError("");
  };

  const startAddPackage = () => {
    setActionType("package");
    setInputVal("");
    setInputError("");
  };

  const startRename = () => {
    if (!activeFile) return;
    setActionType("rename");
    setInputVal(activeFile.name.replace(/\.java$/, ""));
    setInputError("");
  };

  const handleActionSubmit = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setInputError("Name cannot be empty.");
      return;
    }

    if (actionType === "file") {
      const fileName = trimmed.endsWith(".java") ? trimmed : `${trimmed}.java`;
      if (!NAME_PATTERN.test(trimmed)) {
        setInputError("Use letters, digits and underscores, starting with a letter.");
        return;
      }
      const current = flush();
      if (current.some((f) => f.name.toLowerCase() === fileName.toLowerCase())) {
        setInputError("A file with that name already exists.");
        return;
      }
      if (current.length >= MAX_FILES) {
        setInputError(`A project can have at most ${MAX_FILES} files.`);
        return;
      }
      const cls = fileName.replace(/\.java$/, "");
      const pkgHeader = targetPkg && targetPkg !== "(default package)" ? `package ${targetPkg};\n\n` : "";
      const content = `${pkgHeader}public class ${cls} {\n    \n}\n`;
      const next = [...current, { name: fileName, content }];
      filesRef.current = next;
      setFiles(next);
      setActive(fileName);
      setActionType(null);
      setInputVal("");
      setInputError("");
      onChangeRef.current?.(next);
      focusEditor();
    } else if (actionType === "package") {
      if (!PACKAGE_PATTERN.test(trimmed)) {
        setInputError("Package name must be lowercase words separated by dots (e.g. model or service.impl).");
        return;
      }
      const current = flush();
      if (current.length >= MAX_FILES) {
        setInputError(`A project can have at most ${MAX_FILES} files.`);
        return;
      }
      const defaultCls = trimmed.split(".").pop() || "Module";
      const clsName = defaultCls.charAt(0).toUpperCase() + defaultCls.slice(1);
      let fileName = `${clsName}.java`;
      let counter = 1;
      while (current.some((f) => f.name.toLowerCase() === fileName.toLowerCase())) {
        fileName = `${clsName}${counter++}.java`;
      }
      const realCls = fileName.replace(/\.java$/, "");
      const content = `package ${trimmed};\n\npublic class ${realCls} {\n    \n}\n`;
      const next = [...current, { name: fileName, content }];
      filesRef.current = next;
      setFiles(next);
      setActive(fileName);
      setActionType(null);
      setInputVal("");
      setInputError("");
      onChangeRef.current?.(next);
      focusEditor();
    } else if (actionType === "rename") {
      const nextName = trimmed.endsWith(".java") ? trimmed : `${trimmed}.java`;
      if (!NAME_PATTERN.test(trimmed)) {
        setInputError("Use letters, digits and underscores, starting with a letter.");
        return;
      }
      const current = flush();
      if (current.some((f) => f.name.toLowerCase() === nextName.toLowerCase() && f.name !== active)) {
        setInputError("A file with that name already exists.");
        return;
      }
      const oldCls = active.replace(/\.java$/, "");
      const newCls = nextName.replace(/\.java$/, "");
      const next = current.map((f) => {
        if (f.name !== active) return f;
        const renamedContent = f.content.replace(new RegExp(`\\bclass\\s+${oldCls}\\b`), `class ${newCls}`);
        return { name: nextName, content: renamedContent };
      });
      filesRef.current = next;
      setFiles(next);
      setActive(nextName);
      setActionType(null);
      setInputVal("");
      setInputError("");
      onChangeRef.current?.(next);
      focusEditor();
    }
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
    focusEditor();
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
    focusEditor();
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

  const toggleDrawer = (type: "requirements" | "walkthrough" | "diagrams" | "reference") => {
    if (activeDrawer === type) {
      setActiveDrawer(null);
      focusEditor();
    } else {
      setActiveDrawer(type);
      if (type === "reference" && reference?.referenceFiles && reference.referenceFiles.length > 0 && !refFileActive) {
        setRefFileActive(reference.referenceFiles[0].name);
      }
    }
  };

  const diagnostics = result?.diagnostics ?? [];
  const succeeded = result !== null && result.exitCode === 0;

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-background text-foreground overflow-hidden"
          : "overflow-hidden rounded-md border border-line bg-surface"
      }
    >
      {noRun && (
        <div className="border-b border-line p-3">
          <HostedProjectNotice />
        </div>
      )}

      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {fullscreen && (
            <button
              type="button"
              onClick={() => {
                setFullscreen(false);
                focusEditor();
              }}
              className={BUTTON}
              title="Exit full screen (Esc)"
            >
              <Icon d={ICON_BACK} />
              <span className="hidden sm:inline">Exit full screen</span>
            </button>
          )}

          {title && <span className="font-semibold text-xs sm:text-sm truncate max-w-[12rem]">{title}</span>}

          {/* Reference buttons */}
          {reference && (
            <div className="flex items-center gap-1 border-l border-line pl-2 ml-1">
              {reference.requirements && (
                <button
                  type="button"
                  onClick={() => toggleDrawer("requirements")}
                  className={`h-7 rounded-sm px-2.5 text-xs font-medium transition-colors ${
                    activeDrawer === "requirements" ? "bg-primary text-on-primary" : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  Requirements
                </button>
              )}
              {reference.walkthrough && reference.walkthrough.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleDrawer("walkthrough")}
                  className={`h-7 rounded-sm px-2.5 text-xs font-medium transition-colors ${
                    activeDrawer === "walkthrough" ? "bg-primary text-on-primary" : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  Walkthrough
                </button>
              )}
              {reference.diagrams && reference.diagrams.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleDrawer("diagrams")}
                  className={`h-7 rounded-sm px-2.5 text-xs font-medium transition-colors ${
                    activeDrawer === "diagrams" ? "bg-primary text-on-primary" : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  Diagrams
                </button>
              )}
              {reference.referenceFiles && reference.referenceFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleDrawer("reference")}
                  className={`h-7 rounded-sm px-2.5 text-xs font-medium transition-colors ${
                    activeDrawer === "reference" ? "bg-primary text-on-primary" : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  Reference code
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 max-md:hidden">
          {!readOnly && (
            <>
              {!noRun && (
                <button
                  type="button"
                  onClick={run}
                  disabled={running}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-on-primary transition-colors duration-120 hover:bg-primary-hover disabled:opacity-45"
                >
                  <Icon d={ICON_PLAY} />
                  {running ? "Running..." : "Run Project"}
                </button>
              )}
              <button type="button" onClick={() => startAddFile()} className={BUTTON} title="New Java class">
                <Icon d={ICON_PLUS} />
                New file
              </button>
              <button type="button" onClick={startAddPackage} className={BUTTON} title="New package / folder">
                <Icon d={ICON_FOLDER} />
                New folder
              </button>
              <button type="button" onClick={startRename} className={BUTTON} title="Rename selected file">
                <Icon d={ICON_EDIT} />
                Rename
              </button>
              <button type="button" onClick={deleteFile} disabled={files.length <= 1} className={BUTTON} title="Delete selected file">
                <Icon d={ICON_TRASH} />
                Delete
              </button>
              {showReset !== false && (
                <button type="button" onClick={resetCode} className={BUTTON} title="Reset code">
                  <Icon d={ICON_RESET} />
                  Reset
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setFullscreen((f) => !f);
              focusEditor();
            }}
            className={BUTTON}
            title={fullscreen ? "Exit full screen (Esc)" : "Full screen"}
          >
            <Icon d={fullscreen ? ICON_COLLAPSE : ICON_EXPAND} />
            <span className="hidden sm:inline">{fullscreen ? "Exit" : "Full screen"}</span>
          </button>
        </div>
      </div>

      {/* Action input bar: New File, New Folder, Rename */}
      {!readOnly && actionType && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2 max-md:hidden">
          <label htmlFor={`${selectId}-action-input`} className="text-xs text-muted">
            {actionType === "file" ? "Class name:" : actionType === "package" ? "Package / folder name:" : "Rename file to:"}
          </label>
          <input
            id={`${selectId}-action-input`}
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              setInputError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleActionSubmit();
              }
            }}
            placeholder={actionType === "file" ? "User.java" : actionType === "package" ? "model" : activeFile?.name}
            autoFocus
            spellCheck={false}
            className="h-8 rounded-sm border border-line-strong bg-surface px-2 font-mono text-xs focus:border-primary focus:outline-2 focus:outline-primary/30"
          />
          <button type="button" onClick={handleActionSubmit} className={BUTTON}>
            {actionType === "rename" ? "Rename" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => {
              setActionType(null);
              setInputError("");
              focusEditor();
            }}
            className={BUTTON}
          >
            Cancel
          </button>
          {inputError && <span className="text-xs text-danger">{inputError}</span>}
        </div>
      )}

      {/* Main editor split area */}
      <div className={`flex flex-1 min-h-0 ${fullscreen ? "h-[calc(100vh-3.5rem)]" : "h-[36rem]"}`}>
        {/* Left: Package file tree on user's files */}
        <nav
          aria-label="File tree"
          className="w-48 lg:w-56 shrink-0 border-r border-line bg-surface-2 p-2 overflow-y-auto max-md:hidden"
        >
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-muted">
              {files.length} file{files.length === 1 ? "" : "s"}
            </span>
          </div>

          {[...packageMap.entries()].map(([pkg, list]) => {
            const isCollapsed = Boolean(collapsedPkgs[pkg]);
            return (
              <div key={pkg} className="mb-2.5 last:mb-0">
                <div className="group flex items-center justify-between rounded px-1.5 py-1 text-xs text-muted hover:bg-surface">
                  <button
                    type="button"
                    onClick={() => setCollapsedPkgs((c) => ({ ...c, [pkg]: !c[pkg] }))}
                    className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-mono font-medium text-left text-xs"
                  >
                    <Icon d={isCollapsed ? ICON_CHEVRON_RIGHT : ICON_CHEVRON_DOWN} className="size-3" />
                    <Icon d={ICON_FOLDER} className="size-3.5 text-primary" />
                    <span className="truncate">{pkg}</span>
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => startAddFile(pkg)}
                      title={`Add file to ${pkg}`}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-foreground"
                    >
                      <Icon d={ICON_PLUS} className="size-3" />
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <ul className="mt-0.5 space-y-0.5 border-l border-line pl-2 ml-2">
                    {list.map((f) => {
                      const selected = f.name === activeFile?.name;
                      const errors = diagnostics.filter((d) => d.file === f.name && d.severity === "error").length;
                      return (
                        <li key={f.name}>
                          <button
                            type="button"
                            onClick={() => selectFile(f.name)}
                            aria-current={selected ? "true" : undefined}
                            className={`flex w-full items-center gap-1.5 truncate rounded-sm px-2 py-1 text-left font-mono text-xs transition-colors duration-120 ${
                              selected ? "bg-primary-soft text-foreground font-medium" : "text-muted hover:bg-surface hover:text-foreground"
                            }`}
                          >
                            <Icon d={ICON_FILE} className="size-3 shrink-0" />
                            <span className="min-w-0 truncate">{f.name}</span>
                            {errors > 0 && <span className="ml-auto text-danger font-semibold">{errors}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Center: Tabs + CodeMirror Editor + Console */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-background">
          {/* File tabs */}
          <div role="tablist" aria-label="Project files" className="flex max-md:hidden gap-px overflow-x-auto border-b border-line bg-surface-2 shrink-0">
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
                  className={`whitespace-nowrap border-t-2 px-3 py-1.5 font-mono text-xs transition-colors ${
                    selected ? "border-t-primary bg-background text-foreground font-medium" : "border-t-transparent bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {f.name}
                  {errors > 0 && <span className="ml-1.5 text-danger">{errors}</span>}
                </button>
              );
            })}
          </div>

          {/* Phones: read-only fallback list */}
          <div className="space-y-2 p-3 md:hidden overflow-y-auto">
            <PhoneCodeNote />
            {files.map((f) => (
              <details key={f.name} className="rounded-md border border-line bg-surface-2">
                <summary className="min-h-10 cursor-pointer select-none px-3 py-2 font-mono text-xs">{f.name}</summary>
                <pre className="max-h-96 overflow-auto border-t border-line p-3 text-xs whitespace-pre">{f.content}</pre>
              </details>
            ))}
          </div>

          {/* Editor */}
          <div ref={editorRef} className="flex-1 min-h-[14rem] max-md:hidden overflow-hidden">
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
                    className="h-full w-full resize-none bg-background p-3 font-mono text-sm focus:outline-none"
                  />
                </EditorField>
              </>
            )}
          </div>

          {/* Bottom Console */}
          {!readOnly && !noRun && (
            <div className="border-t border-line bg-surface-2 max-md:hidden shrink-0 max-h-56 overflow-auto" aria-live="polite">
              <div className="sticky top-0 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-surface-2 px-3 py-1.5 text-xs text-muted">
                <span className="font-semibold text-foreground">Console</span>
                {result && (
                  <>
                    <span>
                      Exit code <span className={succeeded ? "text-success font-medium" : "text-danger font-medium"}>{result.exitCode ?? "none"}</span>
                    </span>
                    <span>{result.elapsedMs} ms</span>
                  </>
                )}
              </div>
              <div className="p-3 font-mono text-xs leading-relaxed">
                {running && <p className="text-muted">Compiling and running...</p>}
                {!running && !result && !failure && <p className="text-muted">Press Run Project (Ctrl+Enter) to compile and run.</p>}
                {failure && (
                  <p className="text-danger">
                    <FailureText text={failure} />
                  </p>
                )}
                {!running && result && (
                  <>
                    {diagnostics.length > 0 && (
                      <ul className="mb-2 space-y-1">
                        {diagnostics.map((d, i) => (
                          <li key={`${d.file}:${d.line}:${i}`}>
                            <button type="button" onClick={() => goToDiagnostic(d)} className="text-left hover:underline">
                              <span className={d.severity === "error" ? "text-danger font-medium" : "text-warning font-medium"}>{d.severity}</span>{" "}
                              <span className="text-primary">
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
                    {result.stderr && <pre className="whitespace-pre-wrap text-danger">{result.stderr}</pre>}
                    {!result.stdout && !result.stderr && diagnostics.length === 0 && <p className="text-muted">The program printed nothing.</p>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick-reference Drawer */}
        {reference && activeDrawer && (
          <aside
            aria-label="Reference material"
            className="w-96 lg:w-[30rem] shrink-0 border-l border-line bg-surface flex flex-col h-full shadow-lg z-20 max-md:hidden animate-in slide-in-from-right duration-180"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-surface-2">
              <h3 className="font-semibold text-sm">
                {activeDrawer === "requirements"
                  ? "Requirements"
                  : activeDrawer === "walkthrough"
                  ? "Design Walkthrough"
                  : activeDrawer === "diagrams"
                  ? "Diagrams"
                  : "Reference Code"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActiveDrawer(null);
                  focusEditor();
                }}
                className="grid size-6 place-items-center rounded-sm text-muted hover:bg-surface hover:text-foreground"
                title="Close drawer (Esc)"
                aria-label="Close reference drawer"
              >
                <Icon d={ICON_CLOSE} className="size-4" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm leading-relaxed">
              {activeDrawer === "requirements" && reference.requirements && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-base">{reference.requirements.title}</h4>
                  {reference.requirements.prompt && (
                    <div className="whitespace-pre-wrap text-sm text-foreground space-y-2">
                      {reference.requirements.prompt}
                    </div>
                  )}
                </div>
              )}

              {activeDrawer === "walkthrough" && reference.walkthrough && (
                <div className="space-y-4">
                  {reference.walkthrough.map((sec, idx) => (
                    <div key={idx} className="space-y-1.5 border-b border-line/60 pb-3 last:border-b-0">
                      <h4 className="font-semibold text-foreground">{sec.title}</h4>
                      {sec.body && <p className="text-muted text-xs leading-normal whitespace-pre-wrap">{sec.body}</p>}
                      {sec.paragraphs && sec.paragraphs.map((p, pIdx) => (
                        <p key={pIdx} className="text-muted text-xs leading-normal">{p}</p>
                      ))}
                      {sec.code && (
                        <pre className="overflow-x-auto rounded-md bg-background p-2.5 font-mono text-xs text-foreground border border-line">
                          {sec.code}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeDrawer === "diagrams" && reference.diagrams && (
                <div className="space-y-6">
                  {reference.diagrams.map((diag, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <h4 className="font-semibold text-xs text-muted uppercase tracking-wider">{diag.title}</h4>
                      <Diagram source={diag.source} caption={diag.caption} />
                    </div>
                  ))}
                </div>
              )}

              {activeDrawer === "reference" && reference.referenceFiles && (
                <div className="space-y-3">
                  {/* Reference file selector */}
                  <div className="flex flex-wrap gap-1 border-b border-line pb-2">
                    {reference.referenceFiles.map((rf) => (
                      <button
                        key={rf.name}
                        type="button"
                        onClick={() => setRefFileActive(rf.name)}
                        className={`rounded-sm px-2 py-1 font-mono text-xs transition-colors ${
                          (refFileActive || reference.referenceFiles![0].name) === rf.name
                            ? "bg-primary text-on-primary font-medium"
                            : "bg-surface-2 text-muted hover:text-foreground"
                        }`}
                      >
                        {rf.name}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const currentRef =
                      reference.referenceFiles.find((rf) => rf.name === (refFileActive || reference.referenceFiles![0].name)) ??
                      reference.referenceFiles[0];
                    if (!currentRef) return null;
                    return (
                      <div className="relative group/code">
                        <div className="flex items-center justify-between pb-1">
                          <span className="font-mono text-xs font-semibold">{currentRef.name}</span>
                        </div>
                        <pre className="overflow-auto max-h-[30rem] rounded-md border border-line bg-background p-3 font-mono text-xs whitespace-pre">
                          <code>{currentRef.code}</code>
                        </pre>
                        <CopyButton text={currentRef.code} />
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
