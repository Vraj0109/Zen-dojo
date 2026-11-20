"use client";

import { FailureText } from "./components/hosted-run-notice";
import { PhoneCodeNote } from "./components/phone-study";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { CaseResult, RunResult } from "@/lib/judge/run";
import type { SavedCase } from "@/lib/judge/saved-run";
import { blockedBannerMessage, isBlockedRunMessage, pickFallbackLanguage } from "@/lib/judge/blocked";
import { getZenMode, subscribeZen, toggleZenMode } from "@/lib/zen-mode";
import { saveSolutionAction, getSavedSolutionsAction } from "./actions";
import { emitBuddy } from "./buddy/buddy-events";
import { haptic } from "@/lib/haptics";
import { EditorField } from "./code-editor";
import { editorHelp } from "./editor-help";
import { CaseIcon, ToolSetupHint, caseLabel } from "./judge-panel";
import { isSetupProblem } from "@/lib/judge/setup-hint";
import { LayoutSwitcher, PaneLayout, type PaneId } from "./pane-layout";
import { buttonClass } from "./ui";
import { SlidingPill } from "./sliding-pill";
import { markTabSwitch } from "./tab-panel";
import Link from "next/link";
import { ProblemMicroSteps } from "./problem-micro-steps";
import { openShortcutsSheet } from "./components/shortcuts-sheet";
import { useConfirm } from "./components/confirm-dialog";
import {
  consoleText,
  formatInputs,
  parseMyCases,
  serializeMyCases,
  shortcutFor,
  verdictText,
  MAX_MY_CASES,
  type WorkspaceAction,
} from "./workspace-helpers";
import { matchesTy } from "@habit/shared";

import type { WorkspaceSpec } from "./workspace-helpers";
export type { WorkspaceSpec };

export {
  formatInputs,
  verdictText,
  parseMyCases,
  serializeMyCases,
  shortcutFor,
  MAX_MY_CASES,
  type WorkspaceAction,
};

type Lang = "cpp" | "java" | "javascript" | "python";
const LABEL: Record<Lang, string> = { cpp: "C++", java: "Java", javascript: "JavaScript", python: "Python" };
const LANG_KEY = "habit-judge-lang";
const problemLangKey = (problemId: string) => `habit-judge-lang:${problemId}`;
const codeKey = (id: string, lang: Lang) => `habit-judge:${id}:${lang}`;
const myCasesKey = (id: string) => `habit-my-cases:${id}`;

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
  failed?: { id: number; kind: "example" | "test" | "stress"; input?: unknown[]; expected?: unknown }[];
  /** Every case of the last Submit from a computer (absent for runs saved before per-case details) */
  cases?: SavedCase[];
  /** Cases left out of `cases` to keep the saved run small */
  omitted?: number;
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
        className="grid size-7 place-items-center rounded-full border border-line text-xs font-semibold text-muted hover:bg-surface-2 hover:text-foreground [@media(pointer:coarse)]:size-11"
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
function LastRuns({
  runs,
  saved,
  onLoad,
  readOnly,
  children,
}: {
  runs: SavedRun[];
  saved: SavedSolutionView[];
  onLoad: (s: SavedSolutionView) => void;
  readOnly: boolean;
  children: ReactNode;
}) {
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

type ResultsTab = "cases" | "runs";
const RESULTS_TABS: { id: ResultsTab; label: string }[] = [
  { id: "cases", label: "Test cases" },
  { id: "runs", label: "Last runs" },
];

/** Pill tabs for a pane title bar. */
function PaneTabs<T extends string>({
  label,
  tabs,
  active,
  onPick,
}: {
  label: string;
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onPick: (id: T) => void;
}) {
  return (
    <SlidingPill
      role="tablist"
      aria-label={label}
      pillClassName="rounded-full bg-primary-soft"
      className="flex h-full touch-pan-x items-center gap-1.5 overflow-x-auto overflow-y-hidden py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === active}
          onClick={() => {
            if (t.id !== active) markTabSwitch();
            onPick(t.id);
          }}
          className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors duration-120 ${
            t.id === active
              ? "bg-primary-soft text-on-primary-soft font-semibold"
              : "text-muted hover:bg-surface-2 hover:text-foreground"
          }`}
        >
          {t.label}
          {t.count !== undefined && t.count > 0 && (
            <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-xs text-muted">{t.count}</span>
          )}
        </button>
      ))}
    </SlidingPill>
  );
}

export interface ProblemTab {
  id: string;
  label: string;
  count?: number;
  /** Server-rendered content of the tab */
  node: ReactNode;
}

interface DisplayCase {
  kind: CaseResult["kind"];
  index: number;
  label: string;
  input: unknown;
  expected?: string;
  actual?: string;
  pass?: boolean;
  error?: string;
  problem?: CaseResult["problem"];
  note?: string;
  output?: string;
  elapsedMs?: number;
  micros?: number;
  timeLimitMs?: number;
}

const caseKey = (c: { kind: string; index: number }) => `${c.kind}-${c.index}`;

/** Mono value box used for inputs, outputs and expected values. */
const VALUE_BOX = "rounded-[14px] bg-surface-2 px-3 py-2 font-mono text-[13px] leading-5 whitespace-pre-wrap break-all";

/** A case of a saved Submit, shaped for CaseDetailView (read-only on the phone). */
function savedCaseDisplay(c: SavedCase): DisplayCase {
  const label = c.kind === "stress" ? (c.label ?? String(c.index + 1)) : caseLabel(c);
  return {
    kind: c.kind,
    index: c.index,
    label,
    // a passed case keeps no input (the problem has it); a large input is shown by its label
    input: c.kind === "stress" ? undefined : (c.input ?? "(not kept)"),
    expected: c.expected,
    actual: c.actual,
    pass: c.pass,
    error: c.error,
    problem: c.problem as CaseResult["problem"],
    note: c.note,
    output: c.output,
    elapsedMs: c.elapsedMs,
    micros: c.micros,
  };
}

/**
 * One case, in the order the plan gives: verdict, named inputs, your output next to the expected one, and what the code
 * printed for this case only. Used by the Results pane and, read-only, by the phone's Last run tab.
 */
function CaseDetailView({
  c,
  params,
  copied,
  onCopy,
  actions,
}: {
  c: DisplayCase;
  params: { name: string; type: string }[] | undefined;
  copied: boolean;
  onCopy: (text: string) => void;
  actions?: ReactNode;
}) {
  const hasRun = c.pass !== undefined;
  const isMine = c.kind === "mine";
  const unchecked = isMine && !c.expected;
  const tle = !c.pass && (c.problem === "tle" || c.problem === "timeout");
  const con = consoleText(c.output);
  const time =
    c.micros !== undefined ? (c.micros < 1000 ? `${c.micros} µs` : `${Math.round(c.micros / 1000)} ms`) : typeof c.elapsedMs === "number" ? `${c.elapsedMs} ms` : "";
  const verdict =
    unchecked && c.pass
      ? `Ran without errors${time ? ` · ${time}` : ""}`
      : verdictText({ pass: c.pass, problem: c.problem, error: c.error, note: c.note, elapsedMs: c.elapsedMs, micros: c.micros, timeLimitMs: c.timeLimitMs });
  // A large input is shown by its label ("10,000 random words"), never the data.
  const inputLines =
    c.kind === "stress" ? [`Large input: ${c.label}`] : formatInputs(params, c.input);
  const wrong = hasRun && !c.pass;

  return (
    <section aria-label={`${c.label} details`} className="min-w-0 space-y-3">
      {(hasRun || actions) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {hasRun ? (
            <p className={`min-w-0 text-[15px] font-medium [overflow-wrap:anywhere] ${c.pass ? "text-success" : tle ? "text-warning" : "text-danger"}`}>{verdict}</p>
          ) : (
            <span />
          )}
          {actions}
        </div>
      )}
      {tle && <p className="text-sm text-muted">Look for a faster algorithm: the time grows with the input size, so a better complexity matters more than small speed-ups.</p>}

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted">Input</p>
        {inputLines.map((line, i) => {
          const eq = line.indexOf(" = ");
          return (
            <div key={i} className={VALUE_BOX}>
              {eq > 0 && c.kind !== "stress" ? (
                <>
                  <span className="text-muted">{line.slice(0, eq)} =</span>
                  {line.slice(eq + 2)}
                </>
              ) : (
                line
              )}
            </div>
          );
        })}
      </div>

      {hasRun && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-2.5">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted">Your output</p>
            <div className={`${VALUE_BOX} ${wrong ? "shadow-[inset_3px_0_0_var(--color-danger)]" : ""}`}>
              {c.actual ?? c.error ?? (c.pass ? "Accepted" : "No output")}
            </div>
            {c.note && <p className="text-xs text-muted">{c.note}</p>}
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted">Expected</p>
            <div className={`${VALUE_BOX} ${unchecked ? "font-sans text-muted" : ""}`}>
              {c.expected || (unchecked ? "Not checked: no reference here" : "(none)")}
            </div>
          </div>
        </div>
      )}

      {hasRun && (
        <div className="space-y-1">
          <div className="flex min-h-8 items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted">
              Console for this case · {con.lines} {con.lines === 1 ? "line" : "lines"}
            </p>
            {con.text && (
              <button
                type="button"
                onClick={() => onCopy(con.text)}
                className="inline-flex h-8 items-center rounded-full px-3 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          <pre
            tabIndex={con.text ? 0 : undefined}
            aria-label={`Console for ${c.label}`}
            className="max-h-[120px] overflow-auto rounded-[14px] bg-foreground px-3.5 py-2.5 font-mono text-[13px] leading-5 whitespace-pre-wrap text-background [scrollbar-width:thin] dark:bg-background dark:text-foreground"
          >
            {con.text || <span className="font-sans opacity-70">Nothing printed</span>}
          </pre>
          {con.cut && <p className="text-xs text-muted">Output cut off at 20,000 characters for this case.</p>}
        </div>
      )}
    </section>
  );
}

/**
 * The whole problem screen: the problem (description, hints, solution, your notes ...) in tabs, the code editor with Run & Submit
 * buttons, and the per-case results.
 */
export function JudgeWorkspace({
  id,
  spec,
  templates,
  tabs,
  initialTab,
  readOnly = false,
  header,
  nextHref,
  xpGain,
}: {
  id: string;
  spec?: WorkspaceSpec;
  templates: Record<Lang, string>;
  tabs: ProblemTab[];
  initialTab?: string;
  readOnly?: boolean;
  header?: ReactNode;
  nextHref?: string;
  xpGain?: number;
}) {
  const router = useRouter();
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const zen = useSyncExternalStore(subscribeZen, getZenMode, () => false);


  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    const nav = window.navigator as { userAgentData?: { platform?: string }; platform?: string };
    const p = nav.userAgentData?.platform ?? nav.platform ?? "";
    const mac = /mac/i.test(p);
    queueMicrotask(() => setIsMac(mac));
  }, []);

  const [resultsTab, setResultsTab] = useState<ResultsTab>("cases");
  const [phoneTab, setPhoneTab] = useState<"problem" | "code" | "run" | "notes">("problem");
  const [phoneCaseDetailIndex, setPhoneCaseDetailIndex] = useState<number | null>(null);

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
  const [running, setRunning] = useState<"run" | "submit" | null>(null);
  const [runMode, setRunMode] = useState<"run" | "submit" | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [savedSolutions, setSavedSolutions] = useState<SavedSolutionView[]>([]);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [blockedBanner, setBlockedBanner] = useState<string | null>(null);
  const [tab, setTab] = useState(effectiveTabs.some((t) => t.id === initialTab) ? initialTab! : effectiveTabs[0].id);
  const [maximised, setMaximised] = useState<PaneId | null>(null);

  // Custom cases
  const [myCases, setMyCases] = useState<unknown[][]>([]);
  /** The selected case tab, as `${kind}-${index}` (stable when cases are added, run or deleted). */
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editingCase, setEditingCase] = useState<{
    index: number; // -1 for adding new, >= 0 for editing existing
    values: string[];
    errors: (string | null)[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);

  const savedLang = hydrated ? (store.get(problemLangKey(id)) ?? store.get(LANG_KEY)) : null;
  const lang: Lang = pickedLang ?? (savedLang === "java" || savedLang === "javascript" || savedLang === "python" || savedLang === "cpp" ? savedLang : "cpp");

  // Load custom cases from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(myCasesKey(id));
      const parsed = parseMyCases(raw);
      queueMicrotask(() => setMyCases(parsed));
    } catch {
      // ignore
    }
  }, [id]);

  const saveMyCasesToStorage = useCallback((cases: unknown[][]) => {
    const capped = cases.slice(0, MAX_MY_CASES);
    setMyCases(capped);
    try {
      localStorage.setItem(myCasesKey(id), serializeMyCases(capped));
    } catch {
      // ignore
    }
  }, [id]);

  const loadRuns = useCallback(async () => {
    try {
      const res = await fetch(`/api/judge/run?id=${encodeURIComponent(id)}`);
      if (res.ok) setRuns(((await res.json()) as { runs: SavedRun[] }).runs);
    } catch {
      // the saved runs are a convenience
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

  const runCodeAction = useCallback(async (mode: "run" | "submit") => {
    if (running !== null || readOnly) return;
    const code = areaRef.current?.querySelector("textarea")?.value ?? templates[lang];
    store.set(codeKey(id, lang), code);
    setRunning(mode);
    setRunMode(mode);
    setResult(null);
    setFailure(null);
    setResultsTab("cases");
    setEditingCase(null);
    try {
      const payload =
        mode === "run"
          ? { id, lang, code, mode: "run", cases: myCases }
          : { id, lang, code, mode: "submit", save: true };
      const res = await fetch("/api/judge/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = ((await res.json().catch(() => null)) as { error?: string } | null)?.error;
        setFailure(err ?? `The app answered HTTP ${res.status}.`);
      } else {
        const data = (await res.json()) as RunResult;
        setResult(data);
        if (data.status === "unavailable" && isBlockedRunMessage(data.message)) {
          const javaMissing = runs.some((r) => r.lang === "java" && r.status === "unavailable");
          const nextLang = pickFallbackLanguage(lang, !javaMissing);
          setBlockedBanner(blockedBannerMessage(nextLang));
          switchLang(nextLang);
        }
        if (data.status === "done") {
          haptic(data.total > 0 && data.passed === data.total ? "success" : "error");
          if (mode === "submit" && data.total > 0 && data.passed === data.total) {
            emitBuddy("solved");
            if (data.saved) router.refresh();
          }
          // Select the first failing case, or the first case when all passed.
          const first = data.results.find((r) => !r.pass) ?? data.results[0];
          setSelectedKey(first ? caseKey(first) : null);
        }
        if (mode === "submit") {
          void loadRuns();
          void getSavedSolutionsAction(id).then((list) => setSavedSolutions(list as SavedSolutionView[])).catch(() => {});
        }
      }
    } catch {
      setFailure("Could not reach the app. Is it still running?");
    } finally {
      setRunning(null);
    }
  }, [id, lang, loadRuns, myCases, readOnly, router, running, runs, switchLang, templates]);

  const save = useCallback(async () => {
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
  }, [id, lang, templates]);

  // Build the list of cases to display in the Test cases pane
  const displayCases: DisplayCase[] = useMemo(() => {
    if (result && result.status === "done") {
      const ran: DisplayCase[] = result.results.map((r) => ({
        kind: r.kind,
        index: r.index,
        label:
          r.kind === "example"
            ? `Example ${r.index + 1}`
            : r.kind === "mine"
              ? r.label ?? `My case ${r.index + 1}`
              : r.kind === "stress"
                ? r.label ?? `Large input ${r.index + 1}`
                : r.label ?? `Test ${r.index + 1}`,
        input: r.input,
        expected: r.expected,
        actual: r.actual,
        pass: r.pass,
        error: r.error,
        problem: r.problem,
        note: r.note,
        output: r.output,
        elapsedMs: r.elapsedMs,
        micros: r.micros,
        timeLimitMs: r.timeLimitMs,
      }));
      // Your cases that this result does not cover (a Submit skips them; one added since the last Run): not run yet.
      const covered = new Set(result.results.filter((r) => r.kind === "mine").map((r) => r.index));
      myCases.forEach((c, i) => {
        if (!covered.has(i)) ran.push({ kind: "mine", index: i, label: `My case ${i + 1}`, input: c, expected: "", pass: undefined });
      });
      return ran;
    }

    // Before any run: show example cases + my cases
    const list: DisplayCase[] = [];
    const examples = spec?.examples ?? [];
    examples.forEach((ex, i) => {
      list.push({
        kind: "example",
        index: i,
        label: `Example ${i + 1}`,
        input: ex.input,
        expected: JSON.stringify(ex.output),
        pass: undefined,
      });
    });
    myCases.forEach((c, i) => {
      list.push({
        kind: "mine",
        index: i,
        label: `My case ${i + 1}`,
        input: c,
        expected: "",
        pass: undefined,
      });
    });
    return list;
  }, [myCases, result, spec]);

  const foundIndex = displayCases.findIndex((c) => caseKey(c) === selectedKey);
  const activeCaseIndex = foundIndex >= 0 ? foundIndex : 0;
  const currentCase = displayCases[activeCaseIndex];
  const selectCaseAt = useCallback(
    (i: number) => {
      const c = displayCases[i];
      if (c) setSelectedKey(caseKey(c));
    },
    [displayCases],
  );

  // Parameters list for editing / creating cases
  const paramsList = useMemo(() => {
    if (spec?.design) {
      return [
        { name: "ops", type: "string[]" },
        { name: "args", type: "any[]" },
      ];
    }
    if (spec?.fn?.params && spec.fn.params.length > 0) {
      return spec.fn.params;
    }
    return [{ name: "input", type: "any" }];
  }, [spec]);

  // Workspace shortcuts (see SHORTCUTS in shortcuts.ts). One listener on the window in the capture phase, so it runs
  // before CodeMirror and before the shell's own keys (Ctrl+B there opens the menu). A handled key is stopped and its
  // default prevented; CodeMirror ignores events whose default was prevented, so Ctrl+Enter submits and does not also
  // insert a line. The editor's own Prec.highest bindings (editorKeys below) are a second line of defence.
  // Off in reader mode and on phones.
  const doAction = useCallback(
    (action: WorkspaceAction): boolean => {
      if (readOnly || phone) return false;
      if (action === "shortcuts") {
        openShortcutsSheet();
      } else if (action === "run") {
        void runCodeAction("run");
      } else if (action === "submit") {
        void runCodeAction("submit");
      } else if (action === "save") {
        void save();
      } else if (action === "next-case" || action === "prev-case") {
        if (displayCases.length === 0) return true;
        const step = action === "next-case" ? 1 : -1;
        setEditingCase(null);
        setResultsTab("cases");
        selectCaseAt((activeCaseIndex + step + displayCases.length) % displayCases.length);
      } else if (action.startsWith("jump-case-")) {
        const num = Number(action.slice("jump-case-".length));
        if (num >= 1 && num <= displayCases.length) {
          setEditingCase(null);
          setResultsTab("cases");
          selectCaseAt(num - 1);
        }
      } else if (action === "toggle-problem") {
        // Hiding a pane = maximising the code pane; showing it again = restoring the layout.
        setMaximised((m) => (m === null || m === "problem" ? "code" : null));
      } else if (action === "toggle-results") {
        setMaximised((m) => (m === null || m === "results" ? "code" : null));
      }
      return true;
    },
    [activeCaseIndex, displayCases.length, phone, readOnly, runCodeAction, save, selectCaseAt],
  );

  useEffect(() => {
    if (readOnly || phone) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      // A confirm dialog is open: the page behind it is inert, so its shortcuts stay quiet too.
      if (e.target instanceof Element && e.target.closest("dialog[open]")) return;
      const action = shortcutFor(e, isMac);
      if (!action) return;
      if (action === "shortcuts") {
        const t = e.target as HTMLElement | null;
        const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
        if (typing) return;
      }
      if (!doAction(action)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [doAction, isMac, phone, readOnly]);

  const editorKeys = useMemo(() => {
    const map: Record<string, () => boolean> = {
      "Mod-'": () => doAction("run"),
      "Mod-Enter": () => doAction("submit"),
      "Mod-s": () => doAction("save"),
      "Mod-b": () => doAction("toggle-problem"),
      "Mod-j": () => doAction("toggle-results"),
      "Alt-ArrowRight": () => doAction("next-case"),
      "Alt-ArrowLeft": () => doAction("prev-case"),
    };
    for (let n = 1; n <= 9; n++) map[`Alt-${n}`] = () => doAction(`jump-case-${n}` as WorkspaceAction);
    return map;
  }, [doAction]);

  // Validation function for Add / Edit Case
  const validateParamValue = useCallback(
    (valStr: string, param: { name: string; type: string }): string | null => {
      try {
        const parsed = JSON.parse(valStr);
        if (spec?.design) {
          if (param.name === "ops") {
            if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === "string")) {
              return 'ops must be an array of strings, e.g. ["LRUCache","put","get"].';
            }
          } else if (param.name === "args") {
            if (!Array.isArray(parsed) || !parsed.every(Array.isArray)) {
              return "args must be an array of argument lists, e.g. [[2],[1,1],[1]].";
            }
          }
          return null;
        }
        if (!matchesTy(parsed, param.type as Parameters<typeof matchesTy>[1])) {
          return `${param.name} must be ${/^[aeiou]/.test(param.type) ? "an" : "a"} ${param.type}.`;
        }
        return null;
      } catch {
        return 'Must be valid JSON (e.g. [1,2,3] or "hello").';
      }
    },
    [spec],
  );

  const startAddCase = () => {
    const example1 = spec?.examples?.[0]?.input ?? [];
    const values = paramsList.map((_, i) => JSON.stringify(example1[i] ?? ""));
    setEditingCase({
      index: -1,
      values,
      errors: values.map(() => null),
    });
  };

  const startEditCase = (myCaseIdx: number) => {
    const c = myCases[myCaseIdx] ?? [];
    const values = paramsList.map((_, i) => JSON.stringify(c[i] ?? ""));
    setEditingCase({
      index: myCaseIdx,
      values,
      errors: values.map(() => null),
    });
  };

  const saveEditingCase = () => {
    if (!editingCase) return;
    const errors = editingCase.values.map((v, i) => validateParamValue(v, paramsList[i]));
    if (errors.some(Boolean)) {
      setEditingCase({ ...editingCase, errors });
      return;
    }
    const parsedValues = editingCase.values.map((v) => JSON.parse(v));
    if (editingCase.index === -1) {
      const next = [...myCases, parsedValues].slice(0, MAX_MY_CASES);
      saveMyCasesToStorage(next);
      setSelectedKey(`mine-${next.length - 1}`);
    } else {
      const next = [...myCases];
      next[editingCase.index] = parsedValues;
      saveMyCasesToStorage(next);
      // Its old result no longer matches its input.
      dropMineResults(editingCase.index, editingCase.index + 1);
      setSelectedKey(`mine-${editingCase.index}`);
    }
    setEditingCase(null);
  };

  const deleteEditingCase = async (myCaseIdx: number) => {
    const ok = await confirm({
      title: `Delete My case ${myCaseIdx + 1}?`,
      body: "The saved case and its result are removed. Your other cases keep their inputs.",
      confirmLabel: "Delete case",
      danger: true,
    });
    if (!ok) return;
    const next = myCases.filter((_, i) => i !== myCaseIdx);
    saveMyCasesToStorage(next);
    // The cases after it move up one place, so their old results would land on the wrong tab.
    dropMineResults(myCaseIdx, Infinity);
    setEditingCase(null);
    setSelectedKey(null);
  };

  /** Forget the results of your cases with index in [from, to) after an edit or delete; other cases keep theirs. */
  function dropMineResults(from: number, to: number) {
    setResult((r) =>
      r && r.status === "done" ? { ...r, results: r.results.filter((x) => x.kind !== "mine" || x.index < from || x.index >= to) } : r,
    );
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

  async function reset() {
    const ok = await confirm({
      title: "Replace your code with the starter code?",
      body: "Your current code in this language is discarded. Saved solutions and last runs are kept.",
      confirmLabel: "Reset code",
      danger: true,
    });
    if (!ok) return;
    store.remove(codeKey(id, lang));
    setResetCount((n) => n + 1);
    setResult(null);
  }

  const savedForLang = savedSolutions.find((v) => v.lang === lang);
  const initial = readOnly
    ? (savedForLang?.code ?? lastRun?.code ?? (hydrated ? draft : null) ?? templates[lang])
    : hydrated
      ? (draft ?? lastRun?.code ?? templates[lang])
      : templates[lang];
  const selectId = `judge-lang-${id}`;
  const active = effectiveTabs.find((t) => t.id === tab) ?? effectiveTabs[0];

  const problemTabs = (
    <PaneTabs
      label="Problem sections"
      tabs={effectiveTabs.map((t) => ({ id: t.id, label: t.label, count: t.count }))}
      active={active.id}
      onPick={setTab}
    />
  );
  const problemPane = (
    <div className="p-4">
      {effectiveTabs.map((t) => (
        <div key={t.id} role="tabpanel" aria-label={t.label} hidden={t.id !== active.id} className="zd-pane-panel">
          {t.id === "notes" ? (
            <LastRuns runs={runs} saved={savedSolutions} onLoad={loadSaved} readOnly={readOnly}>
              {t.node}
            </LastRuns>
          ) : (
            t.node
          )}
        </div>
      ))}
    </div>
  );

  const codeActions = (
    <div className="flex flex-wrap items-center gap-1.5 max-md:hidden">
      <label htmlFor={selectId} className="sr-only">
        Language
      </label>
      <select
        id={selectId}
        value={LABEL[lang]}
        onChange={(e) => switchLang((Object.keys(LABEL) as Lang[]).find((l) => LABEL[l] === e.target.value) ?? "cpp")}
        className="h-8 [@media(pointer:coarse)]:h-11 rounded-full border border-line-strong bg-surface px-3 text-xs font-medium text-foreground"
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
        className={`inline-flex h-8 [@media(pointer:coarse)]:h-11 items-center @max-[520px]:hidden rounded-full px-3 text-xs font-medium transition-colors duration-120 ${
          zen ? "bg-primary-soft text-primary font-semibold" : "text-muted hover:bg-surface-2 hover:text-foreground"
        }`}
      >
        Zen
      </button>
      {readOnly ? (
        <span className="text-xs text-muted">Read-only</span>
      ) : (
        <>
          <button
            type="button"
            onClick={reset}
            title="Replace your code with the starter code"
            className="inline-flex h-8 [@media(pointer:coarse)]:h-11 items-center rounded-full px-3 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            Reset
          </button>
          {lastRun && (
            <button
              type="button"
              onClick={restoreLastRun}
              title={`Last run: ${verdict(lastRun)}, ${lastRun.ranOn}`}
              className="inline-flex h-8 [@media(pointer:coarse)]:h-11 items-center rounded-full px-3 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
            >
              Restore last run
            </button>
          )}
          <button
            type="button"
            onClick={() => void save()}
            title="Save your solution (Ctrl+S)"
            className="inline-flex h-8 [@media(pointer:coarse)]:h-11 items-center rounded-full px-3 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            Save
          </button>
          <span role="status" aria-live="polite" className="ml-auto text-xs whitespace-nowrap text-muted @max-[600px]:sr-only">
            {saveNote ?? (isMac ? "Draft saved · ⌘ S" : "Draft saved · Ctrl S")}
          </span>
          <HelpTip text={editorHelp(lang)} id={`editor-help-${id}`} />
        </>
      )}
    </div>
  );

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
          <pre
            data-testid="phone-code"
            className="max-h-[60dvh] overflow-auto rounded-md border border-line bg-surface-2 p-3 font-mono text-xs whitespace-pre"
          >
            {phoneCode.code}
          </pre>
        </>
      ) : (
        <p className="text-sm text-muted">No saved code yet.</p>
      )}
    </div>
  );

  const codePane = (
    <div className="flex h-full min-h-0 flex-col">
      {blockedBanner && (
        <div role="alert" className="flex shrink-0 items-start justify-between gap-2 border-b border-line bg-warning/10 py-1 pr-1 pl-2.5 text-xs text-foreground">
          <p className="py-2.5">{blockedBanner}</p>
          <button
            type="button"
            onClick={() => setBlockedBanner(null)}
            aria-label="Dismiss banner"
            className="grid size-10 shrink-0 place-items-center rounded-full text-base text-muted hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            ×
          </button>
        </div>
      )}
      <div
        ref={areaRef}
        className="min-h-0 flex-1"
        onBlurCapture={readOnly ? undefined : saveDraft}
      >
        <EditorField
          key={`${lang}-${resetCount}-${hydrated}-${draft === null && lastRun ? "r" : "s"}-${readOnly ? (savedForLang ? "v" : "n") : ""}`}
          languageSelectId={selectId}
          rows={16}
          fill
          keys={readOnly ? undefined : editorKeys}
        >
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

  const exampleCount = spec?.examples?.length ?? 2;
  const testCount = spec?.testCount ?? 0;
  const stressCount = spec?.stressCount ?? 0;

  const allPassed = result?.status === "done" && runMode === "submit" && result.total > 0 && result.passed === result.total;

  const copyCurrentConsole = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  // Render the Case Details view or Edit form
  const renderCaseDetail = () => {
    if (editingCase) {
      const isNew = editingCase.index === -1;
      return (
        <section aria-label={isNew ? "Add case" : "Edit case"} className="space-y-3 rounded-[20px] border border-line bg-surface-2 p-3.5 dark:border-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">{isNew ? "Add case" : `Edit My case ${editingCase.index + 1}`}</h4>
            <div className="flex items-center gap-2">
              {!isNew && (
                <button
                  type="button"
                  onClick={() => void deleteEditingCase(editingCase.index)}
                  className={buttonClass("danger", "sm")}
                >
                  Delete case
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingCase(null)}
                className={buttonClass("quiet", "sm")}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditingCase}
                className={buttonClass("primary", "sm")}
              >
                Save
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {paramsList.map((param, i) => (
              <div key={param.name} className="space-y-1">
                <label htmlFor={`case-${id}-${param.name}`} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-mono font-medium text-foreground">{param.name}</span>
                  <span className="text-muted">{param.type}</span>
                </label>
                <input
                  id={`case-${id}-${param.name}`}
                  type="text"
                  spellCheck={false}
                  aria-invalid={editingCase.errors[i] ? true : undefined}
                  aria-describedby={editingCase.errors[i] ? `case-${id}-${param.name}-error` : undefined}
                  value={editingCase.values[i] ?? ""}
                  onChange={(e) => {
                    const vals = [...editingCase.values];
                    vals[i] = e.target.value;
                    setEditingCase({ ...editingCase, values: vals });
                  }}
                  onBlur={() => {
                    const err = validateParamValue(editingCase.values[i] ?? "", param);
                    const errs = [...editingCase.errors];
                    errs[i] = err;
                    setEditingCase({ ...editingCase, errors: errs });
                  }}
                  className="h-10 w-full rounded-[12px] border border-line-strong bg-surface px-3 font-mono text-[13px] text-foreground focus:border-primary focus:outline-none aria-[invalid=true]:border-danger"
                />
                {editingCase.errors[i] && (
                  <p id={`case-${id}-${param.name}-error`} className="text-xs text-danger">
                    {editingCase.errors[i]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (!currentCase) {
      return (
        <p className="text-sm text-muted">
          Run checks the {exampleCount} example{exampleCount === 1 ? "" : "s"} and your own cases. Submit also runs{" "}
          {testCount} extra test{testCount === 1 ? "" : "s"}
          {stressCount > 0 ? ` and ${stressCount} large input${stressCount === 1 ? "" : "s"}` : ""}, and saves your code
          when everything passes.
        </p>
      );
    }

    const isMine = currentCase.kind === "mine";
    const myCaseIdx = isMine ? currentCase.index : -1;
    return (
      <div className="space-y-3">
        <CaseDetailView
          c={currentCase}
          params={spec?.fn?.params}
          copied={copied}
          onCopy={copyCurrentConsole}
          actions={
            isMine && !readOnly ? (
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => startEditCase(myCaseIdx)} className={buttonClass("quiet", "sm")}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void deleteEditingCase(myCaseIdx)}
                  className={buttonClass("danger", "sm")}
                >
                  Delete
                </button>
              </span>
            ) : undefined
          }
        />
        {currentCase.pass === undefined && (
          <p className="text-sm text-muted">
            Run checks the {exampleCount} example{exampleCount === 1 ? "" : "s"} and your own cases. Submit also runs{" "}
            {testCount} extra test{testCount === 1 ? "" : "s"}
            {stressCount > 0 ? ` and ${stressCount} large input${stressCount === 1 ? "" : "s"}` : ""}, and saves your code when
            everything passes.
          </p>
        )}
      </div>
    );
  };

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

  const casesPanel = (
    <div className="space-y-3">
      {running && (
        <p role="status" className="anim-pulse text-sm text-muted">
          {running === "submit" ? "Running every case and submitting…" : "Compiling and running your code…"}
        </p>
      )}

      {failure && (
        <p role="alert" className="rounded-[16px] border border-danger bg-surface p-3 text-sm">
          <FailureText text={failure} />
        </p>
      )}

      {result?.status === "compile_error" && (
        <div className="rounded-[16px] bg-danger-soft p-3 text-sm text-on-danger-soft">
          <p className="font-semibold">Compile error</p>
          <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs whitespace-pre-wrap">{result.message}</pre>
          {isSetupProblem(result.message) && <ToolSetupHint />}
        </div>
      )}

      {result?.status === "unavailable" && (
        <div className="rounded-[16px] border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="font-semibold text-warning">{result.message}</p>
          <ToolSetupHint />
        </div>
      )}

      {result && result.status === "done" && result.beforeTests && (
        <div className="rounded-[16px] bg-surface-2 p-3">
          <p className="mb-1 text-xs font-semibold text-muted">Printed before the first case</p>
          <pre className="max-h-[120px] overflow-auto font-mono text-[13px] whitespace-pre-wrap">{result.beforeTests}</pre>
        </div>
      )}

      {allPassed && (
        <div
          role="status"
          className="anim-pop flex flex-wrap items-center gap-2.5 rounded-[18px] bg-primary px-4 py-2.5 text-sm font-medium text-on-primary"
        >
          <span className="font-semibold">All {result.total} passed. Saved to Notes.</span>
          {xpGain !== undefined && (
            <span className="gamify-only rounded-full bg-on-primary/15 px-2.5 py-0.5 text-xs font-semibold">+{xpGain} XP</span>
          )}
          {nextHref && (
            <Link href={nextHref} className="ml-auto inline-flex min-h-8 items-center font-semibold text-on-primary hover:underline">
              Next problem
            </Link>
          )}
        </div>
      )}

      {/* Case tabs */}
      <div
        role="tablist"
        aria-label="Cases"
        className="flex flex-wrap items-center gap-1.5"
        onKeyDown={(e) => {
          // Roving tabindex: arrows, Home and End move between the case tabs (the Add case button is not a tab).
          if (e.altKey || e.ctrlKey || e.metaKey) return;
          const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (!delta && e.key !== "Home" && e.key !== "End") return;
          const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
          const at = tabs.indexOf(document.activeElement as HTMLElement);
          if (at < 0 || tabs.length === 0) return;
          e.preventDefault();
          const to = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (at + delta + tabs.length) % tabs.length;
          const target = displayCases[to];
          if (!target) return;
          setEditingCase(null);
          setSelectedKey(caseKey(target));
          tabs[to].focus();
        }}
      >
        {/* Alt+arrows and Alt+1-9 move between these tabs (see the ? sheet). */}
        {displayCases.map((c, i) => {
          const isSelected = i === activeCaseIndex && !editingCase;
          return (
            <button
              key={`${c.kind}-${c.index}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected || (!!editingCase && i === 0) ? 0 : -1}
              onClick={() => {
                setEditingCase(null);
                setSelectedKey(caseKey(c));
              }}
              title={c.label}
              className={`inline-flex h-10 max-w-full items-center gap-2 rounded-[12px] px-3 text-[13px] font-medium transition-colors duration-120 [@media(pointer:coarse)]:h-11 ${
                isSelected
                  ? "bg-primary-soft text-on-primary-soft"
                  : "bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              <span
                aria-hidden="true"
                className={`size-2 shrink-0 rounded-full ${
                  c.pass === undefined ? "bg-line-strong" : c.pass ? "bg-success" : "bg-danger"
                }`}
              />
              <span className="max-w-[16rem] truncate">{c.label}</span>
              <span className="sr-only">{c.pass === undefined ? ", not run" : c.pass ? ", passed" : ", failed"}</span>
            </button>
          );
        })}
        {!readOnly && myCases.length < MAX_MY_CASES && (
          <button
            type="button"
            onClick={startAddCase}
            className={`inline-flex h-10 items-center rounded-[12px] border border-dashed [@media(pointer:coarse)]:h-11 border-line-strong px-3 text-[13px] font-medium text-muted transition-colors hover:text-foreground ${
              editingCase && editingCase.index === -1 ? "border-primary text-primary" : ""
            }`}
          >
            + Add case
          </button>
        )}
      </div>

      {/* Case Details */}
      {renderCaseDetail()}
    </div>
  );

  const resultsPane = (
    <div className="px-4 pt-1 pb-4">
      <div role="tabpanel" aria-label="Cases" hidden={resultsTab !== "cases"} className="zd-pane-panel">
        {casesPanel}
      </div>
      <div role="tabpanel" aria-label="Last runs" hidden={resultsTab !== "runs"} className="zd-pane-panel">
        {runsPanel}
      </div>
    </div>
  );

  const ranCases = result?.status === "done" ? result.results : [];
  const ranPassed = ranCases.filter((r) => r.pass).length;
  const summaryText = result?.status === "done" && runMode ? `${runMode === "run" ? "Run" : "Submit"}: ${ranPassed} of ${ranCases.length} passed` : "";

  const resultsTabs = (
    <div className="flex items-center justify-between gap-2 w-full">
      <PaneTabs label="Results sections" tabs={RESULTS_TABS} active={resultsTab} onPick={setResultsTab} />
      {summaryText && (
        <span
          role="status"
          className={`shrink-0 text-[13px] font-semibold ${ranPassed === ranCases.length ? "text-success" : "text-warning"}`}
        >
          {summaryText}
        </span>
      )}
    </div>
  );

  // Top bar with Run, Submit, LayoutSwitcher, and Shortcuts button matching XWorkspace.dc.html
  const bar = (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2 bg-background text-foreground">
      <div className="min-w-0 flex-1">{header}</div>
      <div className="flex flex-wrap items-center gap-2">
        <LayoutSwitcher />
        <button
          type="button"
          onClick={openShortcutsSheet}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          aria-keyshortcuts="?"
          className="grid size-11 place-items-center rounded-full bg-surface text-foreground transition-colors duration-120 hover:bg-surface-2"
        >
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          >
            <rect x="2" y="6" width="20" height="12" rx="3" />
            <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
          </svg>
        </button>
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={() => void runCodeAction("run")}
              disabled={running !== null || !hydrated}
              title={hydrated ? "Run the examples and your own cases" : "Starting the editor. Run is ready in a moment."}
              aria-keyshortcuts={isMac ? "Meta+'" : "Control+'"}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary-soft px-4.5 text-[15px] font-medium text-on-primary-soft transition-transform hover:bg-primary-soft/80 active:scale-95 disabled:opacity-50"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>
                {running === "run" ? (
                  "Running…"
                ) : (
                  <>
                    Run<span className="@max-[1100px]:hidden"> examples</span>
                  </>
                )}
              </span>
              <kbd className="zd-kbd ml-1 hidden rounded-md bg-on-primary-soft/10 px-1.5 py-0.5 font-mono text-xs @min-[1100px]:inline">
                {isMac ? "⌘ '" : "Ctrl '"}
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => void runCodeAction("submit")}
              disabled={running !== null || !hydrated}
              title={hydrated ? "Run every case, including the extra tests and large inputs, and save when all pass" : "Starting the editor. Submit is ready in a moment."}
              aria-keyshortcuts={isMac ? "Meta+Enter" : "Control+Enter"}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-medium text-on-primary transition-transform hover:bg-primary-hover active:scale-95 disabled:opacity-50"
            >
              <span>{running === "submit" ? "Submitting…" : "Submit"}</span>
              <kbd className="zd-kbd ml-1 hidden rounded-md bg-on-primary/15 px-1.5 py-0.5 font-mono text-xs @min-[1100px]:inline">
                {isMac ? "⌘ ↵" : "Ctrl ↵"}
              </kbd>
            </button>
          </>
        )}
      </div>
    </header>
  );

  // Phone view: read-only tabs (Problem, Code, Last run, Notes). Phones cannot run code.
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
    const timeOf = (r: { micros?: number; elapsedMs?: number }) =>
      r.micros !== undefined ? (r.micros < 1000 ? `${r.micros} µs` : `${Math.round(r.micros / 1000)} ms`) : r.elapsedMs !== undefined ? `${r.elapsedMs} ms` : "";
    const caseRow = (key: number, label: string, pass: boolean | undefined, meta: string, detail: ReactNode) => {
      const open = phoneCaseDetailIndex === key;
      return (
        <li key={key} className="overflow-hidden rounded-[20px] border border-line bg-surface dark:border-0">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setPhoneCaseDetailIndex((cur) => (cur === key ? null : key))}
            className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm"
          >
            <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${pass === undefined ? "bg-line-strong" : pass ? "bg-success" : "bg-danger"}`} />
            <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
            <span className="sr-only">{pass === undefined ? "not run" : pass ? "passed" : "failed"}</span>
            {meta && <span className="shrink-0 text-[13px] text-muted tabular-nums">{meta}</span>}
          </button>
          {open && <div className="border-t border-line px-4 py-3">{detail}</div>}
        </li>
      );
    };

    return (
      <div className="space-y-3 px-4 pt-2 pb-6">
        {header}
        <div className="sticky top-0 z-10 -mx-4 border-b border-line bg-background px-4">
          <div className="h-12">
            <PaneTabs label="Problem view" tabs={phoneTabs} active={phoneTab} onPick={setPhoneTab} />
          </div>
        </div>
        {phoneTab === "problem" && (
          <div className="space-y-3">
            {readTabs.length > 1 && (
              <div className="h-11 border-b border-line">
                <PaneTabs
                  label="Problem sections"
                  tabs={readTabs.map((t) => ({ id: t.id, label: t.label, count: t.count }))}
                  active={readActive.id}
                  onPick={setTab}
                />
              </div>
            )}
            {readTabs.map((t) => (
              <div key={t.id} role="tabpanel" aria-label={t.label} hidden={t.id !== readActive.id} className="zd-pane-panel min-w-0">
                {t.node}
              </div>
            ))}
          </div>
        )}
        {phoneTab === "code" && phoneCodePane}
        {phoneTab === "run" &&
          (result && result.status === "done" ? (
            <section aria-label="Last run" className="space-y-3">
              <p className="rounded-[16px] bg-surface-2 px-4 py-3 text-sm">
                {runMode === "run" ? "Run" : "Submit"}: {ranPassed} of {ranCases.length} passed. Tap a case to see it.
              </p>
              <ul className="space-y-1.5">
                {result.results.map((r, i) =>
                  caseRow(
                    i,
                    r.kind === "example" ? `Example ${r.index + 1}` : (r.label ?? `Case ${i + 1}`),
                    r.pass,
                    timeOf(r),
                    <CaseDetailView
                      c={{ ...r, label: r.label ?? `Case ${i + 1}` }}
                      params={spec?.fn?.params}
                      copied={copied}
                      onCopy={copyCurrentConsole}
                    />,
                  ),
                )}
              </ul>
            </section>
          ) : lastSaved && lastSaved.cases && lastSaved.cases.length > 0 ? (
            <section aria-label="Last run" className="space-y-3">
              <p className="rounded-[16px] bg-surface-2 px-4 py-3 text-sm">
                Last submit on a computer ({LABEL[lastSaved.lang]}, {lastSaved.ranOn}): {verdict(lastSaved)}. Tap a case to see it.
              </p>
              <ul className="space-y-1.5">
                {lastSaved.cases.map((c, i) =>
                  caseRow(i, caseLabel(c), c.pass, timeOf(c), <CaseDetailView c={savedCaseDisplay(c)} params={spec?.fn?.params} copied={copied} onCopy={copyCurrentConsole} />),
                )}
              </ul>
              {lastSaved.omitted ? (
                <p className="text-xs text-muted">
                  {lastSaved.omitted} more {lastSaved.omitted === 1 ? "case was" : "cases were"} not kept: the saved run is capped at 64 KB.
                </p>
              ) : null}
            </section>
          ) : lastSaved ? (
            <section aria-label="Last run" className="space-y-3">
              <p className="rounded-[16px] bg-surface-2 px-4 py-3 text-sm">
                Last submit on a computer ({LABEL[lastSaved.lang]}, {lastSaved.ranOn}): {verdict(lastSaved)}.
                {lastSaved.failed && lastSaved.failed.length > 0 ? " Tap a case to see it." : ""}
              </p>
              {lastSaved.failed && lastSaved.failed.length > 0 ? (
                <ul className="space-y-1.5">
                  {lastSaved.failed.slice(0, 20).map((f, i) =>
                    caseRow(
                      i,
                      f.kind === "stress" ? `Large input ${f.id}` : caseLabel({ kind: f.kind, index: f.id }),
                      false,
                      "",
                      <div className="space-y-3">
                        <p className="text-[15px] font-medium text-danger">Failed in that run</p>
                        {f.input ? (
                          <>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted">Input</p>
                              {formatInputs(spec?.fn?.params, f.input).map((line, j) => (
                                <div key={j} className={VALUE_BOX}>
                                  {line}
                                </div>
                              ))}
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted">Expected</p>
                              <div className={VALUE_BOX}>{JSON.stringify(f.expected)}</div>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted">The input of this case is not kept. Open the problem on a computer to run it again.</p>
                        )}
                      </div>,
                    ),
                  )}
                </ul>
              ) : (
                lastSaved.status === "done" && <p className="text-sm text-muted">Every case passed in that run.</p>
              )}
            </section>
          ) : (
            <p className="text-sm text-muted">No runs yet. Run your code on a computer to see the cases here.</p>
          ))}
        {phoneTab === "notes" && notesTab && <div className="min-w-0">{notesTab.node}</div>}
      </div>
    );
  }

  // The workspace is its own size container: key hints and the layout switcher follow its width, not the window's.
  return (
    <div className="@container flex flex-1 flex-col gap-2">
      {confirmDialog}
      {bar}
      <PaneLayout
        maximised={maximised}
        onMaximise={setMaximised}
        panes={{
          problem: { title: "Problem", tabs: problemTabs, children: problemPane },
          code: { title: "Code", actions: codeActions, children: codePane },
          results: { title: "Results", tabs: resultsTabs, phoneHidden: true, children: resultsPane },
        }}
      />
    </div>
  );
}
