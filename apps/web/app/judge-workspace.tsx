"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { RunResult } from "@/lib/judge/run";
import { EditorField } from "./code-editor";
import { Results } from "./judge-panel";
import { PaneLayout } from "./pane-layout";

type Lang = "cpp" | "java" | "javascript";
const LABEL: Record<Lang, string> = { cpp: "C++", java: "Java", javascript: "JavaScript" };
const LANG_KEY = "habit-judge-lang";
const codeKey = (id: string, lang: Lang) => `habit-judge:${id}:${lang}`;

const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage can be blocked; the code is then only kept while the page is open.
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

const noopSubscribe = () => () => {};

export interface ProblemTab {
  id: string;
  label: string;
  count?: number;
  /** Server-rendered content of the tab */
  node: ReactNode;
}

/**
 * The whole problem screen: the problem (description, hints, solution, your notes ...) in tabs, the code editor with a Run
 * button, and the results. The three are panes you can resize, swap and maximise (see pane-layout.tsx). When every test
 * passes, the server keeps the solution with the problem. `templates` has the starter code for each language.
 */
export function JudgeWorkspace({ id, templates, tabs, initialTab }: { id: string; templates: Record<Lang, string>; tabs: ProblemTab[]; initialTab?: string }) {
  const router = useRouter();
  // False while rendering on the server and during hydration, so saved code is read only in the browser.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [pickedLang, setPickedLang] = useState<Lang | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [tab, setTab] = useState(tabs.some((t) => t.id === initialTab) ? initialTab! : tabs[0].id);
  const areaRef = useRef<HTMLDivElement>(null);

  const savedLang = hydrated ? store.get(LANG_KEY) : null;
  const lang: Lang = pickedLang ?? (savedLang === "java" || savedLang === "javascript" || savedLang === "cpp" ? savedLang : "cpp");

  const currentCode = () => areaRef.current?.querySelector("textarea")?.value ?? templates[lang];
  const saveDraft = () => store.set(codeKey(id, lang), currentCode());

  function switchLang(next: Lang) {
    saveDraft();
    store.set(LANG_KEY, next);
    setPickedLang(next);
    setResult(null);
    setFailure(null);
  }

  const run = useCallback(async () => {
    if (running) return;
    store.set(codeKey(id, lang), areaRef.current?.querySelector("textarea")?.value ?? templates[lang]);
    setRunning(true);
    setResult(null);
    setFailure(null);
    try {
      const res = await fetch("/api/judge/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, lang, code: areaRef.current?.querySelector("textarea")?.value ?? templates[lang], save: true }),
      });
      if (!res.ok) setFailure(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `The app answered HTTP ${res.status}.`);
      else {
        const data = (await res.json()) as RunResult;
        setResult(data);
        if (data.status === "done" && data.saved) router.refresh(); // the Notes tab now shows the saved solution
      }
    } catch {
      setFailure("Could not reach the app. Is it still running?");
    } finally {
      setRunning(false);
    }
  }, [id, lang, router, running, templates]);

  function reset() {
    if (!window.confirm("Replace your code with the starter code?")) return;
    store.remove(codeKey(id, lang));
    setResetCount((n) => n + 1);
    setResult(null);
  }

  const initial = hydrated ? (store.get(codeKey(id, lang)) ?? templates[lang]) : templates[lang];
  const selectId = `judge-lang-${id}`;
  const active = tabs.find((t) => t.id === tab) ?? tabs[0];

  const problemPane = (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label="Problem sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active.id}
            onClick={() => setTab(t.id)}
            className={`relative shrink-0 rounded-t-md px-3 py-1.5 text-sm font-medium ${t.id === active.id ? "text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="ml-1 rounded-full bg-background px-1.5 text-xs text-muted">{t.count}</span>}
            {t.id === active.id && <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-accent" />}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {tabs.map((t) => (
          <div key={t.id} role="tabpanel" hidden={t.id !== active.id} className="anim-fade-up">
            {t.node}
          </div>
        ))}
      </div>
    </div>
  );

  const codeActions = (
    <div className="flex items-center gap-1.5">
      <label htmlFor={selectId} className="sr-only">
        Language
      </label>
      <select
        id={selectId}
        value={LABEL[lang]}
        onChange={(e) => switchLang((Object.keys(LABEL) as Lang[]).find((l) => LABEL[l] === e.target.value) ?? "cpp")}
        className="rounded-md border border-line bg-background px-2 py-1 text-xs"
      >
        {(Object.keys(LABEL) as Lang[]).map((l) => (
          <option key={l} value={LABEL[l]}>
            {LABEL[l]}
          </option>
        ))}
      </select>
      <button type="button" onClick={reset} className="rounded-md border border-line px-2 py-1 text-xs hover:bg-background">
        Reset
      </button>
      <button
        type="button"
        onClick={run}
        disabled={running || !hydrated}
        title="Run (Ctrl+Enter)"
        className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-on-accent disabled:opacity-60"
      >
        {running ? "Running…" : "Run"}
      </button>
    </div>
  );

  const codePane = (
    <div
      ref={areaRef}
      className="h-full"
      onBlurCapture={saveDraft}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          void run();
        }
      }}
    >
      {/* Remounted when the language changes or the code is reset, so the editor starts from the right text. */}
      <EditorField key={`${lang}-${resetCount}-${hydrated}`} languageSelectId={selectId} rows={16} fill>
        <textarea
          aria-label="Your code"
          defaultValue={initial}
          spellCheck={false}
          rows={16}
          maxLength={100000}
          className="h-full w-full resize-none bg-background p-3 font-mono text-sm"
        />
      </EditorField>
    </div>
  );

  const resultsPane = (
    <div className="space-y-3 p-3" aria-live="polite">
      {running && <p className="anim-pulse text-sm text-muted">Compiling and running your code…</p>}
      {failure && (
        <p role="alert" className="rounded-xl border border-cat-mock bg-surface p-3 text-sm">
          {failure}
        </p>
      )}
      {!running && !failure && !result && <p className="text-sm text-muted">Press Run (or Ctrl+Enter) to test your code on the examples and the extra cases. When every case passes, your solution is saved with the problem.</p>}
      {result && <Results result={result} />}
      {result?.status === "done" && result.saved && (
        <p role="status" className="anim-pop rounded-xl border border-diff-easy bg-surface p-3 text-sm">
          Every case passed, so this solution was saved. You can find it, with your notes, in the Notes tab.
        </p>
      )}
    </div>
  );

  return (
    <PaneLayout
      panes={{
        problem: { title: "Problem", children: problemPane },
        code: { title: "Code", actions: codeActions, children: codePane },
        results: { title: result?.status === "done" ? `Results · ${result.passed}/${result.total}` : "Results", children: resultsPane },
      }}
    />
  );
}
