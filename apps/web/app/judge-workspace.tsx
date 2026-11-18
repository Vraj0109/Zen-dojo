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
import { CaseIcon, CasesView, ConsoleView, ToolSetupHint, caseLabel } from "./judge-panel";
import { isSetupProblem } from "@/lib/judge/setup-hint";
import { LayoutSwitcher, PaneLayout } from "./pane-layout";
import { buttonClass } from "./ui";
import Link from "next/link";
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
        className="grid size-7 place-items-center rounded-sm border border-line text-xs font-semibold text-muted hover:bg-surface-2 hover:text-foreground"
      >
        ?
      </button>
      <span
        id={id}
        role="tooltip"
        className={`absolute right-0 top-full z-20 mt-1 w-64 rounded-md border border-line bg-surface p-2 text-xs leading-snug text-foreground shadow-lg group-focus-within:block group-hover:block ${shown ? "block" : "hidden"}`}
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
            <div key={v.lang} className="rounded-md border border-line bg-surface-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Saved solution ({LABEL[v.lang]}), {v.verified ? "verified" : "not verified"}, {v.savedOn}
                </p>
                {!readOnly && (
                  <button type="button" onClick={() => onLoad(v)} className={buttonClass("secondary", "sm")}>
                    Load into editor
                  </button>
                )}
              </div>
              <pre className="mt-2 max-h-72 overflow-auto font-mono text-xs whitespace-pre">{v.code}</pre>
            </div>
          ))}
        </section>
      )}
      {runs.length > 0 && (
        <section aria-label="Last run" className="space-y-3">
          {runs.map((r) => (
            <div key={r.lang} className="rounded-md border border-line bg-surface-2 p-3">
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
              <pre className="mt-2 max-h-72 overflow-auto font-mono text-xs whitespace-pre">{r.code}</pre>
            </div>
          ))}
        </section>
      )}
      {children}
    </div>
  );
}

const noopSubscribe = () => () => {};

const PHONE_QUERY = "(max-width: 767px)";
const subscribePhone = (cb: () => void) => {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

type ResultsTab = "cases" | "console" | "custom" | "runs";
const RESULTS_TABS: { id: ResultsTab; label: string }[] = [
  { id: "cases", label: "Cases" },
  { id: "console", label: "Console" },
  { id: "custom", label: "Custom input" },
  { id: "runs", label: "Last runs" },
];

/** Underline tabs for a pane title bar (buttons, client state). */
function PaneTabs<T extends string>({ label, tabs, active, onPick }: { label: string; tabs: { id: T; label: string; count?: number }[]; active: T; onPick: (id: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="flex h-full touch-pan-x items-stretch gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === active}
          onClick={() => onPick(t.id)}
          className={`-mb-px shrink-0 border-b-2 px-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-120 ${
            t.id === active ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          {t.label}
          {t.count !== undefined && t.count > 0 && <span className="ml-1 rounded-full bg-surface-2 px-1.5 text-xs text-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

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
export function JudgeWorkspace({
  id,
  templates,
  tabs,
  initialTab,
  readOnly = false,
  header,
  nextHref,
  xpGain,
}: {
  id: string;
  templates: Record<Lang, string>;
  tabs: ProblemTab[];
  initialTab?: string;
  readOnly?: boolean;
  /** The slim workspace bar's content (back link, title, difficulty, timer); the layout switcher is added on the right. */
  header?: ReactNode;
  /** Where the "Next problem" link in the all-passed banner goes */
  nextHref?: string;
  /** XP for solving it, shown in the all-passed banner when game features are on */
  xpGain?: number;
}) {
  const router = useRouter();
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);
  const [resultsTab, setResultsTab] = useState<ResultsTab>("cases");
  const [runCount, setRunCount] = useState(0);
  const [phoneTab, setPhoneTab] = useState<"problem" | "code" | "run" | "notes">("problem");
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
    setResultsTab("cases");
    setRunCount((n) => n + 1);
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

  function loadRun(r: SavedRun) {
    store.set(codeKey(id, r.lang), r.code);
    store.set(LANG_KEY, r.lang);
    store.set(problemLangKey(id), r.lang);
    setPickedLang(r.lang);
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

  const problemTabs = (
    <PaneTabs label="Problem sections" tabs={effectiveTabs.map((t) => ({ id: t.id, label: t.label, count: t.count }))} active={active.id} onPick={setTab} />
  );
  const problemPane = (
    <div className="p-4">
      {effectiveTabs.map((t) => (
        <div key={t.id} role="tabpanel" aria-label={t.label} hidden={t.id !== active.id} className="anim-fade-up">
          {t.id === "notes" ? <LastRuns runs={runs} saved={savedSolutions} onLoad={loadSaved} readOnly={readOnly}>{t.node}</LastRuns> : t.node}
        </div>
      ))}
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
        className="h-8 rounded-sm border border-line-strong bg-surface px-2 text-xs text-foreground"
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
        className={buttonClass("quiet", "sm", zen ? "bg-primary-soft text-primary" : "")}
      >
        Zen
      </button>
      {readOnly ? (
        <span className="text-xs text-muted">Read-only</span>
      ) : (
        <>
          <button type="button" onClick={reset} title="Replace your code with the starter code" className={buttonClass("quiet", "sm")}>
            Reset
          </button>
          {lastRun && (
            <button type="button" onClick={restoreLastRun} title={`Last run: ${verdict(lastRun)}, ${lastRun.ranOn}`} className={buttonClass("quiet", "sm")}>
              Restore last run
            </button>
          )}
          <button type="button" onClick={() => void save()} title="Save your solution (Ctrl+S)" className={buttonClass("quiet", "sm")}>
            Save
          </button>
          <span role="status" aria-live="polite" className="text-xs text-muted">
            {saveNote}
          </span>
          <HelpTip text={editorHelp(lang)} id={`editor-help-${id}`} />
          <button type="button" onClick={run} disabled={running || !hydrated} title="Run (Ctrl+Enter)" className={buttonClass("primary", "sm")}>
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
              <path d="M4.5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.4 2.7a.6.6 0 0 0-.9.5Z" />
            </svg>
            {running ? "Running…" : "Run"}
            <kbd className="ml-1 hidden font-sans text-[11px] opacity-80 xl:inline">Ctrl+Enter</kbd>
          </button>
        </>
      )}
    </div>
  );

  // Phones cannot run code: plain read-only text of the saved code instead of the editor.
  const phoneSaved = savedForLang ?? savedSolutions[0];
  const phoneRun = lastRun ?? runs[0];
  const phoneCode = phoneSaved ?? phoneRun;
  const phoneCodePane = (
    <div className="space-y-2">
      <PhoneCodeNote />
      {phoneCode ? (
        <>
          <p className="text-xs text-muted">
            {phoneSaved ? `Saved solution (${LABEL[phoneSaved.lang]})` : `Last run (${LABEL[phoneCode.lang]}): ${verdict(phoneRun!)}`}
          </p>
          <pre data-testid="phone-code" className="max-h-[60dvh] overflow-auto rounded-md border border-line bg-surface-2 p-3 font-mono text-xs whitespace-pre">{phoneCode.code}</pre>
        </>
      ) : (
        <p className="text-sm text-muted">No saved code yet.</p>
      )}
    </div>
  );

  const codePane = (
    <div className="flex h-full min-h-0 flex-col">
      {blockedBanner && (
        <div role="alert" className="flex shrink-0 items-start justify-between gap-2 border-b border-line bg-warning/10 p-2.5 text-xs text-foreground">
          <p>{blockedBanner}</p>
          <button
            type="button"
            onClick={() => setBlockedBanner(null)}
            aria-label="Dismiss banner"
            className="rounded-sm px-1.5 py-0.5 text-muted hover:bg-surface-2 hover:text-foreground"
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
            className="h-full w-full resize-none bg-surface p-3 font-mono text-sm"
          />
        </EditorField>
        <span id={`editor-help-text-${id}`} className="sr-only">
          {editorHelp(lang)}
        </span>
      </div>
    </div>
  );

  const customPanel = readOnly ? (
    <p className="text-sm text-muted">Reader mode: code cannot be run here.</p>
  ) : (
    <div className="space-y-2 text-sm">
      <label htmlFor={`custom-${id}`} className="block text-xs text-muted">
        One JSON value per parameter, one per line (in the order of the function).
      </label>
      <textarea
        id={`custom-${id}`}
        value={customText}
        onChange={(e) => setCustomText(e.target.value)}
        rows={4}
        spellCheck={false}
        placeholder={"[2,7,11,15]\n9"}
        className="w-full resize-y rounded-sm border border-line-strong bg-surface p-2 font-mono text-xs text-foreground focus:border-primary"
      />
      <button type="button" onClick={runCustom} disabled={customBusy || !hydrated} className={buttonClass("secondary", "sm")}>
        {customBusy ? "Running…" : "Run on this input"}
      </button>
      {custom && (
        <div role="status" className="space-y-2 text-foreground">
          {custom.compile && <pre className="overflow-x-auto rounded-sm border border-danger bg-surface-2 p-2 font-mono text-xs whitespace-pre-wrap">{custom.compile}</pre>}
          {custom.error && <p className="text-danger">{custom.error}</p>}
          {(isSetupProblem(custom.compile) || isSetupProblem(custom.error)) && <ToolSetupHint />}
          {custom.output !== undefined && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted">Output</p>
              <pre className="overflow-x-auto rounded-sm border border-line bg-surface-2 p-2 font-mono text-xs whitespace-pre-wrap">{custom.output}</pre>
            </div>
          )}
          {custom.printed && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted">Printed</p>
              <pre className="overflow-x-auto rounded-sm border border-line bg-surface-2 p-2 font-mono text-xs whitespace-pre-wrap">{custom.printed}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const runsPanel = (
    <div className="space-y-2">
      {runs.length === 0 ? (
        <p className="text-sm text-muted">No runs saved yet. Your latest run of each language is kept here.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-md border border-line">
          {runs.map((r) => (
            <li key={r.lang} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <CaseIcon pass={r.status === "done" && r.total > 0 && r.passed === r.total} />
                <span className="font-medium">{LABEL[r.lang]}</span>
                <span className="text-muted">
                  {verdict(r)}, {r.ranOn}
                </span>
              </span>
              {!readOnly && (
                <button type="button" onClick={() => loadRun(r)} className={buttonClass("secondary", "sm")}>
                  Load code
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const allPassed = result?.status === "done" && result.total > 0 && result.passed === result.total;
  const casesPanel = (
    <div className="space-y-3">
      {running && <p className="anim-pulse text-sm text-muted">Compiling and running your code…</p>}
      {failure && (
        <p role="alert" className="rounded-md border border-danger bg-surface p-3 text-sm">
          <FailureText text={failure} />
        </p>
      )}
      {readOnly && <p className="text-sm text-muted">Reader mode: code is shown read-only and cannot be run here. Turn it off in Settings to run code.</p>}
      {!readOnly && !running && !failure && !result && (
        <p className="text-sm text-muted">
          Press Run (or Ctrl+Enter) to test your code on the examples and the extra cases.{" "}
          {id.startsWith("pack:") ? "When every case passes, the problem is marked done in its course." : "When every case passes, your solution is saved with the problem."}
        </p>
      )}
      {allPassed && (
        <div role="status" className="anim-pop flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-success bg-success/10 px-4 py-3 text-sm">
          <CaseIcon pass />
          <p className="font-semibold text-success">
            All {result.total} cases passed
          </p>
          {result.saved && <span className="text-foreground">Saved to Notes</span>}
          {xpGain !== undefined && result.saved && <span className="gamify-only font-medium text-reward">+{xpGain} XP</span>}
          {nextHref && (
            <Link href={nextHref} className={buttonClass("primary", "sm", "ml-auto")}>
              Next problem
            </Link>
          )}
        </div>
      )}
      {result && <CasesView key={runCount} result={result} />}
    </div>
  );

  const resultsPane = (
    <div className="p-3" aria-live="polite">
      <div role="tabpanel" aria-label="Cases" hidden={resultsTab !== "cases"}>
        {casesPanel}
      </div>
      <div role="tabpanel" aria-label="Console" hidden={resultsTab !== "console"}>
        <ConsoleView result={result} />
      </div>
      <div role="tabpanel" aria-label="Custom input" hidden={resultsTab !== "custom"}>
        {customPanel}
      </div>
      <div role="tabpanel" aria-label="Last runs" hidden={resultsTab !== "runs"}>
        {runsPanel}
      </div>
    </div>
  );
  const resultsTabs = (
    <PaneTabs
      label="Results sections"
      tabs={RESULTS_TABS.map((t) => (t.id === "cases" && result?.status === "done" ? { ...t, label: `Cases · ${result.passed}/${result.total}` } : t))}
      active={resultsTab}
      onPick={setResultsTab}
    />
  );

  const bar = (
    <div className="mb-2 flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0 flex-1">{header}</div>
      <LayoutSwitcher />
    </div>
  );

  if (phone) {
    const notesTab = effectiveTabs.find((t) => t.id === "notes");
    const readTabs = effectiveTabs.filter((t) => t.id !== "notes");
    const readActive = readTabs.find((t) => t.id === tab) ?? readTabs[0];
    const lastSaved = runs.find((r) => r.lang === lang) ?? runs[0];
    const phoneTabs = [
      { id: "problem" as const, label: "Problem" },
      { id: "code" as const, label: "Code" },
      { id: "run" as const, label: "Last run" },
      ...(notesTab ? [{ id: "notes" as const, label: "Notes" }] : []),
    ];
    return (
      <div className="space-y-3">
        {header}
        <div className="sticky top-0 z-10 -mx-4 h-12 border-b border-line bg-background px-4">
          <PaneTabs label="Problem view" tabs={phoneTabs} active={phoneTab} onPick={setPhoneTab} />
        </div>
        {phoneTab === "problem" && (
          <div className="space-y-3">
            {readTabs.length > 1 && (
              <div className="h-10 border-b border-line">
                <PaneTabs label="Problem sections" tabs={readTabs.map((t) => ({ id: t.id, label: t.label, count: t.count }))} active={readActive.id} onPick={setTab} />
              </div>
            )}
            {readTabs.map((t) => (
              <div key={t.id} role="tabpanel" aria-label={t.label} hidden={t.id !== readActive.id}>
                {t.node}
              </div>
            ))}
          </div>
        )}
        {phoneTab === "code" && phoneCodePane}
        {phoneTab === "run" &&
          (lastSaved ? (
            <section aria-label="Last run" className="space-y-3">
              <p className="flex items-center gap-2 text-sm">
                <CaseIcon pass={lastSaved.status === "done" && lastSaved.total > 0 && lastSaved.passed === lastSaved.total} />
                <span className="font-medium">{LABEL[lastSaved.lang]}</span>
                <span className="text-muted">
                  {verdict(lastSaved)}, {lastSaved.ranOn}
                </span>
              </p>
              {lastSaved.failed && lastSaved.failed.length > 0 ? (
                <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
                  {lastSaved.failed.slice(0, 20).map((f) => (
                    <li key={`${f.kind}-${f.id}`} className="space-y-1 px-3 py-2 text-sm">
                      <p className="flex items-center gap-2">
                        <CaseIcon pass={false} />
                        {f.kind === "stress" ? `Large input #${f.id}` : caseLabel({ kind: f.kind, index: f.id })}
                      </p>
                      {f.input && <pre className="overflow-x-auto rounded-sm bg-surface-2 p-2 font-mono text-xs whitespace-pre-wrap">Input: {JSON.stringify(f.input)}</pre>}
                      {f.input && <pre className="overflow-x-auto rounded-sm bg-surface-2 p-2 font-mono text-xs whitespace-pre-wrap">Expected: {JSON.stringify(f.expected)}</pre>}
                    </li>
                  ))}
                </ul>
              ) : (
                lastSaved.status === "done" && <p className="text-sm text-muted">Every case passed in that run.</p>
              )}
            </section>
          ) : (
            <p className="text-sm text-muted">No runs yet. Run your code on a computer to see the cases here.</p>
          ))}
        {phoneTab === "notes" && notesTab && <div>{notesTab.node}</div>}
      </div>
    );
  }

  return (
    <>
      {bar}
      <PaneLayout
        panes={{
          problem: { title: "Problem", tabs: problemTabs, children: problemPane },
          code: { title: "Code", actions: codeActions, children: codePane },
          results: { title: "Results", tabs: resultsTabs, phoneHidden: true, children: resultsPane },
        }}
      />
    </>
  );
}
