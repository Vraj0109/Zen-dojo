"use client";

import { FailureText } from "./components/hosted-run-notice";
import { PhoneCodeNote } from "./components/phone-study";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { RunResult } from "@/lib/judge/run";
import { blockedBannerMessage, isBlockedRunMessage, pickFallbackLanguage } from "@/lib/judge/blocked";
import { getZenMode, subscribeZen, toggleZenMode } from "@/lib/zen-mode";
import { saveSolutionAction, getSavedSolutionsAction } from "./actions";
import { emitBuddy } from "./buddy/buddy-events";
import { EditorField } from "./code-editor";
import { editorHelp } from "./editor-help";
import { Results, ToolSetupHint } from "./judge-panel";
import { isSetupProblem } from "@/lib/judge/setup-hint";
import { PaneLayout } from "./pane-layout";
import { ProblemMicroSteps } from "./problem-micro-steps";

type Lang = "cpp" | "java" | "javascript" | "python";
const LABEL: Record<Lang, string> = { cpp: "C++", java: "Java", javascript: "JavaScript", python: "Python" };
const LANG_KEY = "habit-judge-lang";
const problemLangKey = (problemId: string) => `habit-judge-lang:${problemId}`;
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

/** The latest run of one language, as the server keeps it. */
export interface SavedRun {
  lang: Lang;
  code: string;
  ranOn: string;
  status: string;
  passed: number;
  total: number;
  /** The tests that failed, looked up from their saved ids */
  failed?: { id: number; kind: "example" | "test" | "stress"; input?: unknown[]; expected?: unknown }[];
}

const verdict = (r: SavedRun) => (r.status === "compile_error" ? "compile error" : `${r.passed} of ${r.total} passed`);

/** A solution you saved with the Save button (see lib/notes.ts). */
export interface SavedSolutionView {
  lang: Lang;
  code: string;
  savedOn: string;
  verified: boolean;
}

/** The ? button: the small print about the editor (Tab, and what is added for you), on hover, focus or click. */
function HelpTip({ text, id }: { text: string; id: string }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="group relative">
      <button
        type="button"
        aria-label="About the editor"
        aria-expanded={shown}
        aria-controls={id}
        onClick={() => setShown((v) => !v)}
        onBlur={() => setShown(false)}
        className="grid size-6 place-items-center rounded-md border border-line text-xs font-semibold text-muted hover:bg-background hover:text-foreground"
      >
        ?
      </button>
      <span
        id={id}
        role="tooltip"
        className={`absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-line bg-surface p-2 text-xs leading-snug text-foreground shadow-lg group-focus-within:block group-hover:block ${shown ? "block" : "hidden"}`}
      >
        {text}
      </span>
    </span>
  );
}
/** The Notes tab starts with your latest run of each language (read-only), above the saved accepted solution. */
function LastRuns({ runs, saved, onLoad, readOnly, children }: { runs: SavedRun[]; saved: SavedSolutionView[]; onLoad: (s: SavedSolutionView) => void; readOnly: boolean; children: ReactNode }) {
  return (
    <div className="space-y-4">
      {saved.length > 0 && (
        <section aria-label="Saved solutions" className="space-y-3">
          {saved.map((v) => (
            <div key={v.lang} className="rounded-xl border border-line bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Saved solution ({LABEL[v.lang]}), {v.verified ? "verified" : "not verified"}, {v.savedOn}
                </p>
                {!readOnly && (
                  <button type="button" onClick={() => onLoad(v)} className="rounded-md border border-line px-2 py-1 text-xs hover:bg-surface">
                    Load into editor
                  </button>
                )}
              </div>
              <pre className="mt-2 max-h-72 overflow-auto text-xs whitespace-pre">{v.code}</pre>
            </div>
          ))}
        </section>
      )}
      {runs.length > 0 && (
        <section aria-label="Last run" className="space-y-3">
          {runs.map((r) => (
            <div key={r.lang} className="rounded-xl border border-line bg-background p-3">
              <p className="text-sm font-medium">
                Last run, {LABEL[r.lang]}: {verdict(r)}, {r.ranOn}
              </p>
              {r.failed && r.failed.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  {r.failed.slice(0, 10).map((f) => (
                    <li key={f.id}>
                      Failed {f.kind === "stress" ? `large input #${f.id}` : `${f.kind} #${f.id + 1}`}
                      {f.input ? `: input ${JSON.stringify(f.input)}, expected ${JSON.stringify(f.expected)}` : ""}
                    </li>
                  ))}
                  {r.failed.length > 10 && <li>and {r.failed.length - 10} more</li>}
                </ul>
              )}
              <pre className="mt-2 max-h-72 overflow-auto text-xs whitespace-pre">{r.code}</pre>
            </div>
          ))}
        </section>
      )}
      {children}
    </div>
  );
}

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
export function JudgeWorkspace({ id, templates, tabs, initialTab, readOnly = false }: { id: string; templates: Record<Lang, string>; tabs: ProblemTab[]; initialTab?: string; readOnly?: boolean }) {
  const router = useRouter();
  // False while rendering on the server and during hydration, so saved code is read only in the browser.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const zen = useSyncExternalStore(subscribeZen, getZenMode, () => false);

  const effectiveTabs: ProblemTab[] = useMemo(() => {
    if (tabs.some((t) => t.id === "micro-steps")) return tabs;
    return [
      ...tabs,
      {
        id: "micro-steps",
        label: "Micro-steps",
        node: <ProblemMicroSteps problemId={id} />,
      },
    ];
  }, [id, tabs]);

  const [pickedLang, setPickedLang] = useState<Lang | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [savedSolutions, setSavedSolutions] = useState<SavedSolutionView[]>([]);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [customBusy, setCustomBusy] = useState(false);
  const [custom, setCustom] = useState<{ error?: string; output?: string; printed?: string; compile?: string } | null>(null);
  const [blockedBanner, setBlockedBanner] = useState<string | null>(null);
  const [tab, setTab] = useState(effectiveTabs.some((t) => t.id === initialTab) ? initialTab! : effectiveTabs[0].id);
  const areaRef = useRef<HTMLDivElement>(null);

  const savedLang = hydrated ? (store.get(problemLangKey(id)) ?? store.get(LANG_KEY)) : null;
  const lang: Lang = pickedLang ?? (savedLang === "java" || savedLang === "javascript" || savedLang === "python" || savedLang === "cpp" ? savedLang : "cpp");

  const loadRuns = useCallback(async () => {
    try {
      const res = await fetch(`/api/judge/run?id=${encodeURIComponent(id)}`);
      if (res.ok) setRuns(((await res.json()) as { runs: SavedRun[] }).runs);
    } catch {
      // the saved runs are a convenience; the editor still works without them
    }
  }, [id]);
  useEffect(() => {
    fetch(`/api/judge/run?id=${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ runs: SavedRun[] }>) : null))
      .then((data) => data && setRuns(data.runs))
      .catch(() => {});
    getSavedSolutionsAction(id)
      .then((list) => setSavedSolutions(list as SavedSolutionView[]))
      .catch(() => {});
  }, [id]);

  const lastRun = runs.find((r) => r.lang === lang);
  const draft = hydrated ? store.get(codeKey(id, lang)) : null;

  const currentCode = useCallback(() => areaRef.current?.querySelector("textarea")?.value ?? templates[lang], [lang, templates]);
  const saveDraft = useCallback(() => store.set(codeKey(id, lang), currentCode()), [currentCode, id, lang]);

  const switchLang = useCallback((next: Lang) => {
    saveDraft();
    store.set(LANG_KEY, next);
    store.set(problemLangKey(id), next);
    setPickedLang(next);
    setResult(null);
    setFailure(null);
  }, [id, saveDraft]);

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
        if (data.status === "unavailable" && isBlockedRunMessage(data.message)) {
          const javaMissing = runs.some((r) => r.lang === "java" && r.status === "unavailable");
          const nextLang = pickFallbackLanguage(lang, !javaMissing);
          setBlockedBanner(blockedBannerMessage(nextLang));
          switchLang(nextLang);
        }
        if (data.status === "done" && data.total > 0 && data.passed === data.total) emitBuddy("solved"); // once per fully passing run
        if (data.status === "done" && data.saved) router.refresh(); // the Notes tab now shows the saved solution
        void loadRuns();
        void getSavedSolutionsAction(id).then((list) => setSavedSolutions(list as SavedSolutionView[])).catch(() => {});
      }
    } catch {
      setFailure("Could not reach the app. Is it still running?");
    } finally {
      setRunning(false);
    }
  }, [id, lang, loadRuns, router, running, runs, switchLang, templates]);

  async function runCustom() {
    if (customBusy) return;
    const lines = customText.split("\n").map((l) => l.trim()).filter(Boolean);
    const values: unknown[] = [];
    for (const [k, line] of lines.entries()) {
      try {
        values.push(JSON.parse(line));
      } catch {
        setCustom({ error: `Line ${k + 1} is not valid JSON. Write one value per line, for example [2,7,11,15] or "abc".` });
        return;
      }
    }
    setCustomBusy(true);
    setCustom(null);
    try {
      const res = await fetch("/api/judge/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, lang, code: areaRef.current?.querySelector("textarea")?.value ?? templates[lang], input: values }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; status?: string; message?: string; output?: string; printed?: string } | null;
      if (!res.ok || !data) setCustom({ error: data?.error ?? `The app answered HTTP ${res.status}.` });
      else if (data.status === "compile_error") setCustom({ compile: data.message });
      else if (data.status === "unavailable") {
        setCustom({ error: data.message });
        if (isBlockedRunMessage(data.message)) {
          const javaMissing = runs.some((r) => r.lang === "java" && r.status === "unavailable");
          const nextLang = pickFallbackLanguage(lang, !javaMissing);
          setBlockedBanner(blockedBannerMessage(nextLang));
          switchLang(nextLang);
        }
      }
      else setCustom({ error: data.error, output: data.output, printed: data.printed });
    } catch {
      setCustom({ error: "Could not reach the app. Is it still running?" });
    } finally {
      setCustomBusy(false);
    }
  }

  async function save() {
    const code = areaRef.current?.querySelector("textarea")?.value ?? templates[lang];
    store.set(codeKey(id, lang), code);
    try {
      const res = await saveSolutionAction(id, lang, code);
      setSaveNote(res.ok ? (res.solution.verified ? "Saved (verified)" : "Saved") : res.error);
      if (res.ok) setSavedSolutions((list) => [...list.filter((x) => x.lang !== lang), res.solution as SavedSolutionView]);
    } catch {
      setSaveNote("Could not save. Is the app still running?");
    }
    window.setTimeout(() => setSaveNote(null), 2000);
  }

  function loadSaved(v: SavedSolutionView) {
    store.set(codeKey(id, v.lang), v.code);
    store.set(LANG_KEY, v.lang);
    store.set(problemLangKey(id), v.lang);
    setPickedLang(v.lang);
    setResetCount((n) => n + 1);
    setResult(null);
  }

  function restoreLastRun() {
    if (!lastRun) return;
    store.set(codeKey(id, lang), lastRun.code);
    setResetCount((n) => n + 1);
    setResult(null);
  }

  function reset() {
    if (!window.confirm("Replace your code with the starter code?")) return;
    store.remove(codeKey(id, lang));
    setResetCount((n) => n + 1);
    setResult(null);
  }

  // Your draft first, else the code you last ran, else the starter. Reader mode shows the saved solution first.
  const savedForLang = savedSolutions.find((v) => v.lang === lang);
  const initial = readOnly
    ? (savedForLang?.code ?? lastRun?.code ?? (hydrated ? draft : null) ?? templates[lang])
    : hydrated ? (draft ?? lastRun?.code ?? templates[lang]) : templates[lang];
  const selectId = `judge-lang-${id}`;
  const active = effectiveTabs.find((t) => t.id === tab) ?? effectiveTabs[0];

  const problemPane = (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label="Problem sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {effectiveTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active.id}
            onClick={() => setTab(t.id)}
            className={`relative shrink-0 rounded-t-md px-3 py-1 text-sm font-medium ${t.id === active.id ? "text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="ml-1 rounded-full bg-background px-1.5 text-xs text-muted">{t.count}</span>}
            {t.id === active.id && <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-accent" />}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {effectiveTabs.map((t) => (
          <div key={t.id} role="tabpanel" hidden={t.id !== active.id} className="anim-fade-up">
            {t.id === "notes" ? <LastRuns runs={runs} saved={savedSolutions} onLoad={loadSaved} readOnly={readOnly}>{t.node}</LastRuns> : t.node}
          </div>
        ))}
      </div>
    </div>
  );

  const codeActions = (
    <div className="flex items-center gap-1.5 max-md:hidden">
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
      <button
        type="button"
        onClick={toggleZenMode}
        aria-pressed={zen}
        title="Zen mode: anti-overwhelm focus (Ctrl+Shift+Z)"
        className={`rounded-md border px-2 py-1 text-xs transition-colors ${
          zen ? "border-accent bg-accent text-on-accent font-medium" : "border-line hover:bg-background"
        }`}
      >
        Zen
      </button>
      {!readOnly && lastRun && (
        <button
          type="button"
          onClick={restoreLastRun}
          title={`Last run: ${verdict(lastRun)}, ${lastRun.ranOn}`}
          className="rounded-md border border-line px-2 py-1 text-xs hover:bg-background"
        >
          Last run
        </button>
      )}
      {readOnly ? (
        <span className="text-xs text-muted">Read-only</span>
      ) : (
        <>
          <button type="button" onClick={reset} className="rounded-md border border-line px-2 py-1 text-xs hover:bg-background">
            Reset
          </button>
          <button type="button" onClick={() => void save()} title="Save your solution (Ctrl+S)" className="rounded-md border border-line px-2 py-1 text-xs hover:bg-background">
            Save
          </button>
          <span role="status" aria-live="polite" className="text-xs text-muted">
            {saveNote}
          </span>
          <button
            type="button"
            onClick={run}
            disabled={running || !hydrated}
            title="Run (Ctrl+Enter)"
            className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-on-accent disabled:opacity-60"
          >
            {running ? "Running…" : "Run"}
          </button>
          <HelpTip text={editorHelp(lang)} id={`editor-help-${id}`} />
        </>
      )}
    </div>
  );

  // Below `md` (phones) the editor is not shown at all: plain read-only text of the saved code instead (CSS only).
  const phoneSaved = savedForLang ?? savedSolutions[0];
  const phoneRun = lastRun ?? runs[0];
  const phoneCode = phoneSaved ?? phoneRun;
  const phoneCodePane = (
    <div className="space-y-2 md:hidden">
      <PhoneCodeNote />
      {phoneCode ? (
        <>
          <p className="text-xs text-muted">
            {phoneSaved ? `Saved solution (${LABEL[phoneSaved.lang]})` : `Last run (${LABEL[phoneCode.lang]}): ${verdict(phoneRun!)}`}
          </p>
          <pre data-testid="phone-code" className="max-h-96 overflow-auto rounded-lg border border-line bg-background p-3 text-xs whitespace-pre">{phoneCode.code}</pre>
        </>
      ) : (
        <p className="text-sm text-muted">No saved code yet.</p>
      )}
    </div>
  );

  const codePane = (
    <>
    {phoneCodePane}
    <div className="flex h-full min-h-0 flex-col max-md:hidden">
      {blockedBanner && (
        <div role="alert" className="flex shrink-0 items-start justify-between gap-2 border-b border-line bg-surface p-2.5 text-xs text-foreground">
          <p>{blockedBanner}</p>
          <button
            type="button"
            onClick={() => setBlockedBanner(null)}
            aria-label="Dismiss banner"
            className="rounded px-1.5 py-0.5 text-muted hover:bg-background hover:text-foreground"
          >
            ×
          </button>
        </div>
      )}
      <div
      ref={areaRef}
      className="min-h-0 flex-1"
      onBlurCapture={readOnly ? undefined : saveDraft}
      onKeyDown={(e) => {
        if (readOnly) return;
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          void run();
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "s") {
          e.preventDefault();
          void save();
        }
      }}
    >
      {/* Remounted when the language changes or the code is reset, so the editor starts from the right text. */}
      <EditorField key={`${lang}-${resetCount}-${hydrated}-${draft === null && lastRun ? "r" : "s"}-${readOnly ? (savedForLang ? "v" : "n") : ""}`} languageSelectId={selectId} rows={16} fill>
        <textarea
          aria-label="Your code"
          aria-describedby={`editor-help-text-${id}`}
          defaultValue={initial}
          readOnly={readOnly}
          spellCheck={false}
          rows={16}
          maxLength={100000}
          className="h-full w-full resize-none bg-background p-3 font-mono text-sm"
        />
      </EditorField>
      <span id={`editor-help-text-${id}`} className="sr-only">
        {editorHelp(lang)}
      </span>
      </div>
      <div className="shrink-0 space-y-1 border-t border-line px-3 py-1.5 text-xs text-muted">
        {lastRun && (
          <p>
            Last run: {verdict(lastRun)}, {lastRun.ranOn}
          </p>
        )}
        {!readOnly && <details>
          <summary className="cursor-pointer select-none">Custom input</summary>
          <div className="mt-1.5 space-y-1.5">
            <label htmlFor={`custom-${id}`} className="block">
              One JSON value per parameter, one per line (in the order of the function).
            </label>
            <textarea
              id={`custom-${id}`}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={3}
              spellCheck={false}
              placeholder={"[2,7,11,15]\n9"}
              className="w-full resize-y rounded-md border border-line bg-background p-2 font-mono text-xs text-foreground"
            />
            <button type="button" onClick={runCustom} disabled={customBusy || !hydrated} className="rounded-md border border-line px-2 py-1 text-xs text-foreground hover:bg-background disabled:opacity-60">
              {customBusy ? "Running…" : "Run on this input"}
            </button>
            {custom && (
              <div role="status" className="space-y-1 text-foreground">
                {custom.compile && <pre className="overflow-x-auto whitespace-pre-wrap">{custom.compile}</pre>}
                {custom.error && <p className="text-diff-hard">{custom.error}</p>}
                {(isSetupProblem(custom.compile) || isSetupProblem(custom.error)) && <ToolSetupHint />}
                {custom.output !== undefined && (
                  <p>
                    Output: <code className="font-mono">{custom.output}</code>
                  </p>
                )}
                {custom.printed && <pre className="overflow-x-auto whitespace-pre-wrap">{custom.printed}</pre>}
              </div>
            )}
          </div>
        </details>}
      </div>
    </div>
    </>
  );

  const resultsPane = (
    <div className="space-y-3 p-3" aria-live="polite">
      {running && <p className="anim-pulse text-sm text-muted">Compiling and running your code…</p>}
      {failure && (
        <p role="alert" className="rounded-xl border border-cat-mock bg-surface p-3 text-sm">
          <FailureText text={failure} />
        </p>
      )}
      {readOnly && <p className="text-sm text-muted">Reader mode: code is shown read-only and cannot be run here. Turn it off in Settings to run code.</p>}
      {!readOnly && !running && !failure && !result && <p className="text-sm text-muted">Press Run (or Ctrl+Enter) to test your code on the examples and the extra cases. {id.startsWith("pack:") ? "When every case passes, the problem is marked done in its course." : "When every case passes, your solution is saved with the problem."}</p>}
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
        results: { title: result?.status === "done" ? `Results · ${result.passed}/${result.total}` : "Results", phoneHidden: true, children: resultsPane },
      }}
    />
  );
}
