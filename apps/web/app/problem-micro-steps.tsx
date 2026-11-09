"use client";

import { useState, useSyncExternalStore } from "react";
import { PROBLEM_MICRO_STEPS, type MicroStep } from "@habit/shared";

interface MicroStepsState {
  checked: Record<number, boolean>;
  notes: Record<number, string>;
}

const storageKey = (problemId: string) => `habit-micro-steps:${problemId}`;

function loadState(problemId: string): MicroStepsState {
  try {
    const raw = localStorage.getItem(storageKey(problemId));
    if (!raw) return { checked: {}, notes: {} };
    const parsed = JSON.parse(raw) as Partial<MicroStepsState>;
    return {
      checked: parsed.checked ?? {},
      notes: parsed.notes ?? {},
    };
  } catch {
    return { checked: {}, notes: {} };
  }
}

function saveState(problemId: string, state: MicroStepsState) {
  try {
    localStorage.setItem(storageKey(problemId), JSON.stringify(state));
  } catch {
    // Ignore localStorage errors
  }
}

const noopSubscribe = () => () => {};

export function ProblemMicroSteps({ problemId }: { problemId: string }) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [state, setState] = useState<MicroStepsState>(() => {
    if (typeof window === "undefined") return { checked: {}, notes: {} };
    return loadState(problemId);
  });
  const [openStep, setOpenStep] = useState<number | null>(1);
  const [currentId, setCurrentId] = useState(problemId);

  if (currentId !== problemId) {
    setCurrentId(problemId);
    setState(typeof window === "undefined" ? { checked: {}, notes: {} } : loadState(problemId));
  }

  const toggleCheck = (stepId: number) => {
    setState((prev) => {
      const nextChecked = { ...prev.checked, [stepId]: !prev.checked[stepId] };
      const next = { ...prev, checked: nextChecked };
      saveState(problemId, next);
      // Auto-advance to next step if just checked and it was open
      if (nextChecked[stepId] && openStep === stepId && stepId < PROBLEM_MICRO_STEPS.length) {
        setOpenStep(stepId + 1);
      }
      return next;
    });
  };

  const updateNotes = (stepId: number, val: string) => {
    setState((prev) => {
      const next = { ...prev, notes: { ...prev.notes, [stepId]: val } };
      saveState(problemId, next);
      return next;
    });
  };

  const resetAll = () => {
    if (!window.confirm("Clear all micro-steps notes for this problem?")) return;
    const next = { checked: {}, notes: {} };
    setState(next);
    saveState(problemId, next);
    setOpenStep(1);
  };

  const completedCount = PROBLEM_MICRO_STEPS.filter((s) => state.checked[s.id]).length;
  const allComplete = completedCount === PROBLEM_MICRO_STEPS.length;

  if (!hydrated) {
    return <div className="p-4 text-sm text-muted">Loading micro-steps…</div>;
  }

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Micro-Steps Deconstruction</h3>
            <p className="text-xs text-muted">
              Lower the activation energy: tackle one small step at a time instead of holding the entire problem in mind.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-foreground border border-line">
              {completedCount} / {PROBLEM_MICRO_STEPS.length} done
            </span>
            {completedCount > 0 && (
              <button
                type="button"
                onClick={resetAll}
                className="text-xs text-muted hover:text-foreground underline decoration-dotted"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={PROBLEM_MICRO_STEPS.length}>
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${(completedCount / PROBLEM_MICRO_STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      {allComplete && (
        <div role="status" className="anim-pop rounded-xl border border-diff-easy bg-surface p-3 text-sm text-foreground">
          <p className="font-medium text-accent">You have deconstructed the whole problem!</p>
          <p className="mt-1 text-xs text-muted">
            You know the inputs, the brute force, the bottleneck, and the pattern. Now hop over to the Code editor and turn it into clean code.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {PROBLEM_MICRO_STEPS.map((step: MicroStep) => {
          const isDone = Boolean(state.checked[step.id]);
          const isOpen = openStep === step.id;

          return (
            <div
              key={step.id}
              className={`rounded-xl border transition-colors ${
                isDone ? "border-accent/30 bg-surface/50" : isOpen ? "border-line bg-surface shadow-xs" : "border-line bg-background"
              }`}
            >
              <div className="flex items-center justify-between gap-2 p-3">
                <label className="flex min-w-0 cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggleCheck(step.id)}
                    className="size-4 shrink-0 rounded accent-[var(--color-accent)]"
                  />
                  <span className={`text-sm font-medium ${isDone ? "line-through text-muted" : "text-foreground"}`}>
                    {step.title}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setOpenStep(isOpen ? null : step.id)}
                  aria-expanded={isOpen}
                  className="rounded px-2 py-0.5 text-xs text-muted hover:bg-background hover:text-foreground"
                >
                  {isOpen ? "Collapse" : "Open"}
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-line px-3 pb-3 pt-2 space-y-2">
                  <p className="text-xs text-muted leading-relaxed">{step.prompt}</p>
                  <textarea
                    rows={3}
                    value={state.notes[step.id] ?? ""}
                    onChange={(e) => updateNotes(step.id, e.target.value)}
                    placeholder={step.placeholder}
                    className="w-full resize-y rounded-lg border border-line bg-background p-2.5 font-mono text-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
