"use client";

import { FailureText, HostedProjectNotice } from "./hosted-run-notice";
import { PhoneCodeNote } from "./phone-study";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorField } from "../code-editor";
import { Diagram } from "../diagram";
import { CopyButton } from "../copy-button";
import { useConfirm } from "./confirm-dialog";
import {
  addMainMethod,
  classNameOf,
  mainClasses,
  pickEntry,
  starterMain,
  type EntryChoice,
  type EntryClass,
  type EntryMode,
} from "@/lib/judge/project-entry";
import { SlidingPill } from "../sliding-pill";

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

/** Why a run did not start: the open file has no main, the project has none, or the user must pick one. */
type RunNotice = Exclude<EntryChoice, { ok: true }>;

function readEntry(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeEntry(key: string, qualified: string) {
  try {
    window.localStorage.setItem(key, qualified);
  } catch {
    // Storage can be blocked; the editor asks again next time.
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

const TREE_BUTTON =
  "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted transition-colors duration-120 hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45";

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
  const [runningMode, setRunningMode] = useState<EntryMode | null>(null);
  const [notice, setNotice] = useState<RunNotice | null>(null);
  const [lastEntry, setLastEntry] = useState<EntryClass | null>(null);
  const runningRef = useRef(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

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
  const [showMobileFiles, setShowMobileFiles] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef(files);
  const activeRef = useRef(active);
  const onChangeRef = useRef(onChange);
  const initialFilesRef = useRef(initialFiles && initialFiles.length > 0 ? initialFiles : (value ?? []));
  const pendingJump = useRef<{ file: string; line: number; column?: number } | null>(null);
  const selectId = `project-lang-${projectId.replace(/[^A-Za-z0-9_-]/g, "-")}`;
  const resolvedKey = storageKey ?? (STORAGE_PREFIX + projectId);
  // The class picked when several classes have a main method, remembered per project.
  const entryKey = `${resolvedKey}:entry`;
  // A link to #classes-<projectId> (the "Write your classes" button on the LLD page) scrolls here without JS
  // and opens the full-screen editor with it.
  const anchorId = `classes-${projectId.replace(/[^A-Za-z0-9_-]/g, "-")}`;

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash !== `#${anchorId}`) return;
      setFullscreen(true);
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    };
    // Links to "#classes-<id>" open the editor even when the hash is already set (a second click, or a reload).
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || a.getAttribute("href") !== `#${anchorId}`) return;
      e.preventDefault();
      setFullscreen(true);
    };
    const first = window.setTimeout(onHash, 0); // a reload that kept the hash
    window.addEventListener("hashchange", onHash);
    document.addEventListener("click", onClick);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("click", onClick);
    };
  }, [anchorId]);

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

  /** Compiles every file and runs `entry`. */
  const runEntry = useCallback(async (entry: EntryClass, mode: EntryMode) => {
    if (runningRef.current) return;
    runningRef.current = true;
    const current = flush();
    setRunning(true);
    setRunningMode(mode);
    setFailure("");
    setNotice(null);
    setLastEntry(entry);
    try {
      const res = await fetch("/api/judge/run-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: current.map((f) => ({ name: f.name, content: f.content })), entry: entry.qualified }),
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
      runningRef.current = false;
      setRunning(false);
      setRunningMode(null);
    }
  }, [flush]);

  /** Run file: the class open in the editor. Run project: the entry point (Main, the only main, or the picked one). */
  const run = useCallback(
    (mode: EntryMode) => {
      if (runningRef.current) return;
      const current = flush();
      const choice = pickEntry({ files: current, active: activeRef.current, mode, remembered: readEntry(entryKey) });
      if (!choice.ok) {
        setResult(null);
        setFailure("");
        setNotice(choice);
        return;
      }
      void runEntry(choice, mode);
    },
    [flush, entryKey, runEntry],
  );

  const chooseEntry = (entry: EntryClass) => {
    writeEntry(entryKey, entry.qualified);
    void runEntry(entry, "project");
  };

  // Escape key handler: drawer first, then fullscreen, returning focus to editor
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        // Esc inside the confirm dialog only cancels the dialog.
        if (e.target instanceof Element && e.target.closest("dialog[open]")) return;
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
        run(e.shiftKey ? "file" : "project");
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

  const deleteFile = async () => {
    if (flush().length <= 1) return;
    const ok = await confirm({
      title: `Delete ${active}?`,
      body: "This file is removed from the project and cannot be restored.",
      confirmLabel: "Delete file",
      danger: true,
    });
    if (!ok) return;
    const current = flush();
    if (current.length <= 1) return;
    const index = current.findIndex((f) => f.name === active);
    const next = current.filter((f) => f.name !== active);
    filesRef.current = next;
    setFiles(next);
    setActive(next[Math.min(index, next.length - 1)].name);
    onChangeRef.current?.(next);
    focusEditor();
  };

  const resetCode = async () => {
    const ok = await confirm({
      title: "Reset every file to the starting code?",
      body: "Your changes to all files in this project will be lost.",
      confirmLabel: "Reset code",
      danger: true,
    });
    if (!ok) return;
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

  /** Inserts a minimal main method into one of the user's files and puts the caret inside it. */
  const addMain = (fileName: string) => {
    if (readOnly) return;
    const current = flush();
    const file = current.find((f) => f.name === fileName);
    if (!file) return;
    const added = addMainMethod(file.content, classNameOf(file.name));
    if (!added) {
      setNotice(null);
      setFailure(`Could not find class ${classNameOf(file.name)} in ${file.name}. Add public static void main(String[] args) to it by hand.`);
      return;
    }
    const next = current.map((f) => (f.name === fileName ? { ...f, content: added.code } : f));
    filesRef.current = next;
    setFiles(next);
    setActive(fileName);
    setNotice(null);
    setFailure("");
    pendingJump.current = { file: fileName, line: added.line, column: 9 };
    setRevision((r) => r + 1);
    onChangeRef.current?.(next);
  };

  /** Adds Main.java with a starter main (or a main method to an existing Main.java). */
  const createMain = () => {
    if (readOnly) return;
    const current = flush();
    if (current.some((f) => f.name === "Main.java")) {
      addMain("Main.java");
      return;
    }
    if (current.length >= MAX_FILES) {
      setNotice(null);
      setFailure(`A project can have at most ${MAX_FILES} files. Delete one, or add a main method to an existing class.`);
      return;
    }
    const next = [...current, { name: "Main.java", content: starterMain() }];
    filesRef.current = next;
    setFiles(next);
    setActive("Main.java");
    setNotice(null);
    setFailure("");
    pendingJump.current = { file: "Main.java", line: 3, column: 9 };
    setRevision((r) => r + 1);
    onChangeRef.current?.(next);
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

  const entryCandidates = useMemo(() => mainClasses(files), [files]);
  const diagnostics = result?.diagnostics ?? [];
  const succeeded = result !== null && result.exitCode === 0;

  return (
    <div
      id={anchorId}
      className={
        fullscreen
          ? "@container fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground"
          : "@container relative overflow-hidden rounded-[24px] border border-line bg-surface dark:border-0"
      }
    >
      {confirmDialog}
      {noRun && (
        <div className="border-b border-line p-3">
          <HostedProjectNotice />
        </div>
      )}

      {/* Top action bar matching XClasses.dc.html */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 bg-background text-foreground border-b border-surface-2">
        <div className="flex flex-wrap items-center gap-2.5">
          {fullscreen && (
            <button
              type="button"
              onClick={() => {
                setFullscreen(false);
                focusEditor();
              }}
              className="grid size-11 place-items-center rounded-full bg-surface text-foreground transition-colors hover:bg-surface-2"
              title="Exit full screen (Esc)"
            >
              <Icon d={ICON_BACK} className="size-5" />
            </button>
          )}

          <div className="min-w-0 leading-tight">
            <p className="text-xs text-muted truncate">{title || "Java project"}</p>
            <p className="text-[17px] font-medium text-foreground">Your classes</p>
          </div>

          {/* Under about 820px of editor width the file tree hides behind this button. */}
          <button
            type="button"
            onClick={() => setShowMobileFiles((v) => !v)}
            aria-expanded={showMobileFiles}
            className={`h-10 rounded-full px-4 text-sm font-medium transition-colors max-md:hidden @min-[820px]:hidden ${
              showMobileFiles ? "bg-primary-soft text-on-primary-soft" : "bg-surface text-muted hover:text-foreground"
            }`}
            title="Show or hide your files"
          >
            Files
          </button>

          {/* Reference drawer buttons */}
          {reference && (
            <div className="flex flex-wrap items-center gap-1.5">
              {reference.requirements && (
                <button
                  type="button"
                  onClick={() => toggleDrawer("requirements")}
                  className={`h-10 rounded-full px-4 text-sm font-medium transition-colors ${
                    activeDrawer === "requirements" ? "bg-primary-soft text-on-primary-soft" : "bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  Requirements
                </button>
              )}
              {reference.walkthrough && reference.walkthrough.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleDrawer("walkthrough")}
                  className={`h-10 rounded-full px-4 text-sm font-medium transition-colors ${
                    activeDrawer === "walkthrough" ? "bg-primary-soft text-on-primary-soft" : "bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  Walkthrough
                </button>
              )}
              {reference.diagrams && reference.diagrams.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleDrawer("diagrams")}
                  className={`h-10 rounded-full px-4 text-sm font-medium transition-colors ${
                    activeDrawer === "diagrams" ? "bg-primary-soft text-on-primary-soft" : "bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  Diagrams
                </button>
              )}
              {reference.referenceFiles && reference.referenceFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleDrawer("reference")}
                  className={`h-10 rounded-full px-4 text-sm font-medium transition-colors ${
                    activeDrawer === "reference" ? "bg-primary-soft text-on-primary-soft" : "bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  Reference code
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 max-md:hidden">
          {!readOnly && !noRun && (
            <div role="group" aria-label="Run" className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => run("file")}
                disabled={running}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary-soft px-4 text-[15px] font-medium text-on-primary-soft transition-colors hover:bg-primary-soft/80 disabled:opacity-50"
                title={`Run ${activeFile?.name ?? "the open file"} (Ctrl+Shift+Enter)`}
              >
                {runningMode === "file" ? "Running..." : "Run file"}
              </button>
              <button
                type="button"
                onClick={() => run("project")}
                disabled={running}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-medium text-on-primary transition-transform active:scale-95 disabled:opacity-50"
                title="Compile every file and run the entry point (Ctrl+Enter)"
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>{runningMode === "project" ? "Running..." : "Run project"}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setFullscreen((f) => !f);
              focusEditor();
            }}
            className="grid size-11 place-items-center rounded-full bg-surface text-foreground transition-colors hover:bg-surface-2"
            title={fullscreen ? "Exit full screen (Esc)" : "Full screen"}
          >
            <Icon d={fullscreen ? ICON_COLLAPSE : ICON_EXPAND} className="size-5" />
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

      {/* Main editor split area matching XClasses.dc.html */}
      <div className={`relative flex flex-1 min-h-0 gap-2 p-2 bg-background text-foreground ${fullscreen ? "" : "h-[40rem]"}`}>
        {/* Left: package file tree on the user's files. Under about 820px of width it floats over the editor,
            opened from the "Files" button. */}
        <nav
          aria-label="File tree"
          className={`zd-tree w-60 shrink-0 flex-col rounded-[24px] bg-surface p-3 overflow-y-auto max-md:hidden ${
            showMobileFiles
              ? "flex @max-[820px]:absolute @max-[820px]:inset-y-2 @max-[820px]:left-2 @max-[820px]:z-30 @max-[820px]:max-w-[calc(100%-1rem)] @max-[820px]:shadow-2xl"
              : "flex @max-[820px]:hidden"
          }`}
        >
          {!readOnly && (
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                onClick={() => startAddFile()}
                className="flex-1 h-10 rounded-full bg-surface-2 text-foreground font-medium text-sm hover:bg-primary-soft transition-colors"
                title="New Java class"
              >
                + File
              </button>
              <button
                type="button"
                onClick={startAddPackage}
                className="flex-1 h-10 rounded-full bg-surface-2 text-foreground font-medium text-sm hover:bg-primary-soft transition-colors"
                title="New package / folder"
              >
                + Folder
              </button>
            </div>
          )}

          {[...packageMap.entries()].map(([pkg, list]) => {
            const isCollapsed = Boolean(collapsedPkgs[pkg]);
            return (
              <div key={pkg} className="mb-2 last:mb-0">
                <div className="group flex items-center justify-between rounded-full px-2.5 py-1 text-xs text-muted hover:bg-surface-2">
                  <button
                    type="button"
                    onClick={() => setCollapsedPkgs((c) => ({ ...c, [pkg]: !c[pkg] }))}
                    className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-mono font-medium text-left text-xs"
                  >
                    <Icon d={isCollapsed ? ICON_CHEVRON_RIGHT : ICON_CHEVRON_DOWN} className="size-3 text-muted" />
                    <Icon d={ICON_FOLDER} className="size-3.5 text-primary" />
                    <span className="truncate">{pkg}</span>
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => startAddFile(pkg)}
                      title={`Add file to ${pkg}`}
                      aria-label={`Add file to ${pkg}`}
                      className="grid size-7 shrink-0 place-items-center rounded-full opacity-60 hover:bg-surface hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Icon d={ICON_PLUS} className="size-3" />
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {list.map((f) => {
                      const selected = f.name === activeFile?.name;
                      const errors = diagnostics.filter((d) => d.file === f.name && d.severity === "error").length;
                      return (
                        <li key={f.name}>
                          <button
                            type="button"
                            onClick={() => selectFile(f.name)}
                            aria-current={selected ? "true" : undefined}
                            className={`flex w-full items-center gap-2 truncate rounded-full px-2.5 py-1.5 text-left font-mono text-xs transition-colors duration-120 ${
                              selected ? "bg-primary-soft text-on-primary-soft font-medium" : "text-foreground hover:bg-surface-2"
                            }`}
                          >
                            <Icon d={ICON_FILE} className="size-3.5 shrink-0 opacity-70" />
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

          {!readOnly && activeFile && (
            <div className="mt-auto flex flex-wrap gap-1.5 border-t border-line pt-3">
              <button type="button" onClick={startRename} className={TREE_BUTTON} title="Rename selected file">
                <Icon d={ICON_EDIT} />
                Rename
              </button>
              <button type="button" onClick={deleteFile} disabled={files.length <= 1} className={TREE_BUTTON} title="Delete selected file">
                <Icon d={ICON_TRASH} />
                Delete
              </button>
              {showReset !== false && (
                <button type="button" onClick={resetCode} className={TREE_BUTTON} title="Reset code">
                  <Icon d={ICON_RESET} />
                  Reset
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Center: Tabs + CodeMirror Editor + Console */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden rounded-[24px] bg-surface">
          {/* File tabs */}
          <SlidingPill role="tablist" aria-label="Project files" className="flex max-md:hidden gap-1.5 p-2 overflow-x-auto shrink-0">
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
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1 font-mono text-xs transition-colors ${
                    selected ? "bg-primary-soft text-on-primary-soft font-medium" : "text-muted hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  {f.name}
                  {errors > 0 && <span className="ml-1 text-danger font-semibold">{errors}</span>}
                </button>
              );
            })}
          </SlidingPill>

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
          <div ref={editorRef} className="flex-1 min-h-[14rem] max-md:hidden overflow-hidden p-2">
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
                    className="h-full w-full resize-none bg-transparent p-3 font-mono text-sm text-foreground focus:outline-none"
                  />
                </EditorField>
              </>
            )}
          </div>

          {/* Bottom Console */}
          {!readOnly && !noRun && (
            <div className="m-2 rounded-[18px] bg-surface-2 text-foreground max-md:hidden shrink-0 max-h-56 overflow-auto" aria-live="polite">
              <div className="sticky top-0 flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-muted">
                <span className="font-semibold text-foreground">Console</span>
                {lastEntry && (result || running) && (
                  <span>
                    Ran <span className="font-mono text-foreground">{lastEntry.qualified}</span>
                    {entryCandidates.length > 1 && !running && (
                      <button
                        type="button"
                        onClick={() => setNotice({ ok: false, reason: "choose", candidates: entryCandidates })}
                        className="ml-2 rounded-full px-2 py-0.5 text-primary hover:bg-surface"
                        title="Pick which class Run project starts"
                      >
                        Change
                      </button>
                    )}
                  </span>
                )}
                {result && (
                  <>
                    <span>
                      Exit code <span className={succeeded ? "text-success font-medium" : "text-danger font-medium"}>{result.exitCode ?? "none"}</span>
                    </span>
                    <span>{result.elapsedMs} ms</span>
                  </>
                )}
              </div>
              <div className="p-3 px-4 font-mono text-xs leading-relaxed">
                {running && <p className="text-muted">Compiling and running...</p>}
                {!running && !result && !failure && !notice && (
                  <p className="text-muted">Run project (Ctrl+Enter) starts the entry point. Run file (Ctrl+Shift+Enter) runs the open class.</p>
                )}
                {!running && notice && (
                  <RunNoticeView
                    notice={notice}
                    hasMainFile={files.some((f) => f.name === "Main.java")}
                    onAddMain={addMain}
                    onCreateMain={createMain}
                    onRunProject={() => run("project")}
                    onChoose={chooseEntry}
                  />
                )}
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
            className="zd-drawer z-20 flex w-[340px] shrink-0 flex-col rounded-[28px] bg-surface-2 p-4 text-foreground shadow-[-4px_0_16px_rgba(0,0,0,0.3)] max-md:hidden @min-[1280px]:w-[26rem] @max-[1100px]:absolute @max-[1100px]:inset-y-2 @max-[1100px]:right-2 @max-[1100px]:max-w-[calc(100%-1rem)]"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-primary-soft/40">
              <h3 className="font-medium text-base text-foreground">
                {activeDrawer === "requirements"
                  ? "Requirements"
                  : activeDrawer === "walkthrough"
                  ? "Design walkthrough"
                  : activeDrawer === "diagrams"
                  ? "Diagrams"
                  : "Reference code"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActiveDrawer(null);
                  focusEditor();
                }}
                className="grid size-10 place-items-center rounded-full bg-surface text-muted hover:text-foreground"
                title="Close drawer (Esc)"
                aria-label="Close reference drawer"
              >
                <Icon d={ICON_CLOSE} className="size-4" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-1 space-y-4 text-sm leading-relaxed">
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

const CONSOLE_BUTTON =
  "inline-flex h-9 items-center rounded-full px-4 font-sans text-xs font-medium transition-colors duration-120 disabled:opacity-45";

/** Console message when a run cannot start, with the one-click fix. */
function RunNoticeView({
  notice,
  hasMainFile,
  onAddMain,
  onCreateMain,
  onRunProject,
  onChoose,
}: {
  notice: RunNotice;
  hasMainFile: boolean;
  onAddMain: (file: string) => void;
  onCreateMain: () => void;
  onRunProject: () => void;
  onChoose: (entry: EntryClass) => void;
}) {
  if (notice.reason === "no-main-in-file") {
    return (
      <div className="space-y-2 font-sans text-sm">
        <p className="text-foreground">
          {notice.file} has no main method. Add <code className="font-mono text-xs">public static void main(String[] args)</code> or use Run
          project.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onAddMain(notice.file)} className={`${CONSOLE_BUTTON} bg-primary-soft text-on-primary-soft hover:bg-primary-soft/80`}>
            Add a main method
          </button>
          <button type="button" onClick={onRunProject} className={`${CONSOLE_BUTTON} text-muted hover:bg-surface hover:text-foreground`}>
            Run project
          </button>
        </div>
      </div>
    );
  }
  if (notice.reason === "no-main") {
    return (
      <div className="space-y-2 font-sans text-sm">
        <p className="text-foreground">
          No class in this project has a main method, so there is nothing to start. Add a Main class that creates your objects and prints
          what they do.
        </p>
        <button type="button" onClick={onCreateMain} className={`${CONSOLE_BUTTON} bg-primary-soft text-on-primary-soft hover:bg-primary-soft/80`}>
          {hasMainFile ? "Add a main method to Main.java" : "Create Main.java"}
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-2 font-sans text-sm">
      <p className="text-foreground">More than one class has a main method. Pick the one Run project starts; it is remembered for this project.</p>
      <ul className="flex flex-wrap gap-2" aria-label="Classes with a main method">
        {notice.candidates.map((c) => (
          <li key={c.qualified}>
            <button
              type="button"
              onClick={() => onChoose(c)}
              className={`${CONSOLE_BUTTON} bg-surface font-mono text-foreground hover:bg-primary-soft hover:text-on-primary-soft`}
            >
              {c.qualified}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
