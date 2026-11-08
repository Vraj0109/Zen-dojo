"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { CaseResult, RunResult } from "@/lib/judge/run";
import { EditorField } from "./code-editor";

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

/**
 * Starter code, a Run button and the results, like LeetCode. Only the function body is yours; the test code is added
 * around it on the server when you run. Your code is kept in this browser per problem and language.
 * `templates` has the starter code for each language.
 */
export function JudgePanel({ id, templates }: { id: string; templates: Record<Lang, string> }) {
  // False while rendering on the server and during hydration, so the saved code is read only in the browser.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [pickedLang, setPickedLang] = useState<Lang | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const savedLang = hydrated ? store.get(LANG_KEY) : null;
  const lang: Lang = pickedLang ?? (savedLang === "java" || savedLang === "javascript" || savedLang === "cpp" ? savedLang : "cpp");

  const currentCode = () => areaRef.current?.querySelector("textarea")?.value ?? templates[lang];
  const save = () => store.set(codeKey(id, lang), currentCode());

  function switchLang(next: Lang) {
    save();
    store.set(LANG_KEY, next);
    setPickedLang(next);
    setResult(null);
    setFailure(null);
  }

  async function run() {
    save();
    setRunning(true);
    setResult(null);
    setFailure(null);
    try {
      const res = await fetch("/api/judge/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, lang, code: currentCode() }),
      });
      if (!res.ok) setFailure(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `The app answered HTTP ${res.status}.`);
      else setResult((await res.json()) as RunResult);
    } catch {
      setFailure("Could not reach the app. Is it still running?");
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    if (!window.confirm("Replace your code with the starter code?")) return;
    store.remove(codeKey(id, lang));
    setResetCount((n) => n + 1);
    setResult(null);
  }

  const initial = hydrated ? (store.get(codeKey(id, lang)) ?? templates[lang]) : templates[lang];
  const selectId = `judge-lang-${id}`;

  return (
    <section aria-label="Code" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="sr-only">
          Language
        </label>
        <select
          id={selectId}
          value={LABEL[lang]}
          onChange={(e) => switchLang((Object.keys(LABEL) as Lang[]).find((l) => LABEL[l] === e.target.value) ?? "cpp")}
          className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
        >
          {(Object.keys(LABEL) as Lang[]).map((l) => (
            <option key={l} value={LABEL[l]}>
              {LABEL[l]}
            </option>
          ))}
        </select>
        <button type="button" onClick={run} disabled={running || !hydrated} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-60">
          {running ? "Running…" : "Run"}
        </button>
        <button type="button" onClick={reset} className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-background">
          Reset code
        </button>
        <span className="text-xs text-muted">Runs on this computer. Your code is saved in this browser.</span>
      </div>

      <div ref={areaRef} onBlurCapture={save}>
        {/* Remounted when the language changes or the code is reset, so the editor starts from the right text. */}
        <EditorField key={`${lang}-${resetCount}-${hydrated}`} languageSelectId={selectId} rows={16}>
          <textarea
            aria-label="Your code"
            defaultValue={initial}
            spellCheck={false}
            rows={16}
            maxLength={100000}
            className="w-full rounded-lg border border-line bg-background p-3 font-mono text-sm"
          />
        </EditorField>
      </div>

      <div aria-live="polite">
        {failure && (
          <p role="alert" className="rounded-xl border border-cat-mock bg-surface p-3 text-sm">
            {failure}
          </p>
        )}
        {result && <Results result={result} />}
      </div>
    </section>
  );
}

const label = (r: CaseResult) => (r.kind === "example" ? `Example ${r.index + 1}` : `Test ${r.index + 1}`);

function Results({ result }: { result: RunResult }) {
  if (result.status === "unavailable") {
    return <p className="rounded-xl border border-cat-beh bg-surface p-3 text-sm">{result.message}</p>;
  }
  if (result.status === "compile_error") {
    return (
      <div className="rounded-xl border border-cat-mock bg-surface p-3">
        <p className="font-semibold text-diff-hard">Compile error</p>
        <pre className="mt-2 overflow-x-auto text-xs whitespace-pre-wrap">{result.message}</pre>
      </div>
    );
  }
  const results = result.results;
  const first = results.find((r) => !r.pass);
  const accepted = !first;
  const printed = results.filter((r) => r.output);
  const headline = accepted
    ? "Accepted"
    : first.problem === "timeout"
      ? "Time limit exceeded"
      : first.problem === "crash" || first.problem === "exception"
        ? "Runtime error"
        : first.problem === "not-run"
          ? "Stopped early"
          : "Wrong answer";

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border bg-surface p-3 ${accepted ? "border-diff-easy" : "border-cat-mock"}`}>
        <p className={`font-semibold ${accepted ? "text-diff-easy" : "text-diff-hard"}`}>
          {headline}
          <span className="ml-2 font-normal text-muted">
            {result.passed} of {result.total} cases passed
          </span>
        </p>
        {first && (
          <p className="mt-1 text-xs text-muted">
            First failure: {label(first)}. Open any case below to see its input, the expected answer and what your code returned.
          </p>
        )}
      </div>

      <ul className="space-y-1 text-sm">
        {results.map((r) => (
          <li key={r.index}>
            <details className="rounded-lg border border-line bg-surface" open={r === first}>
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5">
                <span>
                  {label(r)}
                  <span className="ml-2 font-mono text-xs text-muted">{r.input.length > 44 ? r.input.slice(0, 44) + "…" : r.input}</span>
                </span>
                <span className={r.pass ? "text-diff-easy" : "text-diff-hard"}>
                  {r.pass ? "Passed" : r.problem === "timeout" ? "Too slow" : r.problem === "crash" || r.problem === "exception" ? "Error" : r.problem === "not-run" ? "Not run" : "Failed"}
                  {r.micros !== undefined && <span className="ml-2 text-xs text-muted">{r.micros < 1000 ? `${r.micros} µs` : `${Math.round(r.micros / 1000)} ms`}</span>}
                </span>
              </summary>
              <dl className="space-y-1 border-t border-line px-3 py-2">
                <Row label="Input" value={r.input} />
                <Row label="Expected" value={r.expected} />
                <Row label={r.error ? "What happened" : "Your output"} value={r.error ?? r.actual ?? "(nothing)"} />
                {r.output && <Row label="Printed by your code" value={r.output} block />}
              </dl>
            </details>
          </li>
        ))}
      </ul>

      {(printed.length > 0 || result.beforeTests) && (
        <section aria-label="Console output" className="rounded-xl border border-line bg-surface p-3">
          <h4 className="text-sm font-semibold">Console output</h4>
          <p className="mb-2 text-xs text-muted">Everything your code printed, case by case (cout, printf, cerr, System.out, console.log ...).</p>
          <div className="space-y-2">
            {result.beforeTests && (
              <div>
                <p className="text-xs font-medium text-muted">Before the first case</p>
                <pre className="overflow-x-auto rounded bg-background p-2 text-xs whitespace-pre-wrap">{result.beforeTests}</pre>
              </div>
            )}
            {printed.map((r) => (
              <div key={r.index}>
                <p className="text-xs font-medium text-muted">
                  {label(r)} <span className="font-mono">{r.input.length > 40 ? r.input.slice(0, 40) + "…" : r.input}</span>
                </p>
                <pre className="overflow-x-auto rounded bg-background p-2 text-xs whitespace-pre-wrap">{r.output}</pre>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value, block = false }: { label: string; value: string; block?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={block ? "font-mono text-xs break-all whitespace-pre-wrap" : "font-mono text-xs break-all"}>{value}</dd>
    </div>
  );
}
