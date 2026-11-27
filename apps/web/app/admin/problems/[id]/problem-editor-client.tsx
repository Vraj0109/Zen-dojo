"use client";

import { CloseIcon } from "@/app/ui";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  validateProblemDraft,
  type CodeLang,
  type ContentProblem,
  type ProblemDraft,
} from "@habit/shared";
import type { AuditRow } from "@/lib/content-db/audit";
import { PageEditor } from "../../page-editor/page-editor";
import { AiAssist } from "../../ai-assist";
import { TestCasesEditor } from "./test-cases-editor";
import { HintsEditor } from "./hints-editor";
import { HistoryViewer } from "@/app/admin/components/history-viewer";
import { SaveFooter } from "@/app/admin/components/save-footer";
import { runDraftAction, saveProblemDraftAction } from "../../actions";

const SIGNATURE_TYPES = [
  "list",
  "tree",
  "int",
  "long",
  "double",
  "bool",
  "string",
  "int[]",
  "long[]",
  "bool[]",
  "string[]",
  "int[][]",
  "string[][]",
] as const;

export type ProblemTab = "statement" | "cases" | "hints" | "solution" | "history";

export function ProblemEditorClient({
  initialProblem,
  initialAuditRows,
  patterns = [],
  isDesktop = false,
}: {
  initialProblem: ContentProblem;
  initialAuditRows: AuditRow[];
  patterns?: Array<{ id: string; name: string }>;
  isDesktop?: boolean;
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ProblemTab>("statement");
  const [draft, setDraft] = useState<ProblemDraft>(initialProblem);
  const [baseRev, setBaseRev] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Test run state
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    passed?: number;
    total?: number;
    maxMs?: number;
    failures?: string[];
    errors?: string[];
  } | null>(null);
  const [runningTest, setRunningTest] = useState(false);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const updateDraft = (updater: (prev: ProblemDraft) => ProblemDraft) => {
    setDraft((prev) => {
      const next = updater(prev);
      setIsDirty(true);
      return next;
    });
  };

  const updateRow = (updates: Partial<ProblemDraft["row"]>) => {
    updateDraft((prev) => ({
      ...prev,
      row: {
        ...prev.row,
        ...updates,
      },
    }));
  };

  const handleRunCode = async (lang: CodeLang, code: string, isOptimal: boolean) => {
    setRunningTest(true);
    setTestResult(null);
    try {
      const res = await runDraftAction(draft, lang, code, isOptimal);
      if (res.ok) {
        setTestResult({
          ok: true,
          passed: res.passed,
          total: res.total,
          maxMs: res.maxMs,
          failures: res.failures,
        });
      } else {
        setTestResult({ ok: false, errors: res.errors });
      }
    } catch (e) {
      setTestResult({ ok: false, errors: [e instanceof Error ? e.message : "Run failed."] });
    } finally {
      setRunningTest(false);
    }
  };

  const handleSave = async () => {
    setErrors([]);
    setConflict(false);
    setSaveSuccessMsg(null);

    // Validation
    const val = validateProblemDraft(draft);
    if (!val.ok) {
      setErrors(val.errors);
      return;
    }
    if (notify && !note.trim()) {
      setErrors(["Say in one line what changed when 'Tell learners' is checked."]);
      return;
    }

    setSaving(true);
    try {
      const res = await saveProblemDraftAction(draft, baseRev, {
        note: note.trim() || null,
        notify,
      });

      if (res.ok) {
        setBaseRev(res.rev);
        setIsDirty(false);
        setNote("");
        setNotify(false);
        setSaveSuccessMsg("Problem saved successfully!");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
        router.refresh();
      } else if (res.conflict) {
        setConflict(true);
      } else {
        setErrors(res.errors ?? ["Save failed."]);
      }
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Save failed."]);
    } finally {
      setSaving(false);
    }
  };

  const handleOverwrite = async () => {
    setConflict(false);
    setSaving(true);
    try {
      const res = await saveProblemDraftAction(draft, null, {
        note: note.trim() || null,
        notify,
      });
      if (res.ok) {
        setBaseRev(res.rev);
        setIsDirty(false);
        setSaveSuccessMsg("Problem overwritten successfully.");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
        router.refresh();
      } else {
        setErrors(res.errors ?? ["Overwrite failed."]);
      }
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ id: ProblemTab; label: string }> = [
    { id: "statement", label: "Statement" },
    { id: "cases", label: `Test cases (${draft.cases?.length ?? 0})` },
    { id: "hints", label: `Hints (${draft.hints?.length ?? 0})` },
    { id: "solution", label: "Solution page" },
    { id: "history", label: `History (${initialAuditRows.length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex flex-wrap items-center justify-between border-b border-line gap-2 pb-1">
        <nav className="flex space-x-1" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-accent text-accent font-semibold bg-surface/50"
                  : "border-transparent text-muted hover:border-line hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {saveSuccessMsg && (
          <span className="text-xs text-green-400 font-medium animate-pulse">{saveSuccessMsg}</span>
        )}
      </div>

      {/* Test Execution Overlay / Result Banner */}
      {(runningTest || testResult) && (
        <div className="rounded-lg border border-line bg-surface p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">
              {runningTest ? "Running tests with judge..." : "Test Run Results"}
            </span>
            {testResult && (
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-muted hover:text-foreground"
              >
                <CloseIcon className="size-4" label="Close test results" />
              </button>
            )}
          </div>
          {testResult && (
            <div>
              {testResult.ok ? (
                <div className="space-y-1">
                  <p
                    className={
                      testResult.passed === testResult.total ? "text-green-400 font-semibold" : "text-yellow-400 font-semibold"
                    }
                  >
                    Passed {testResult.passed} / {testResult.total} cases ({testResult.maxMs} ms max)
                  </p>
                  {testResult.failures && testResult.failures.length > 0 && (
                    <ul className="list-disc pl-5 text-red-400 space-y-0.5">
                      {testResult.failures.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-red-400">{testResult.errors?.join(", ")}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Statement */}
      {activeTab === "statement" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-lg border border-line bg-surface p-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Slug (ID) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={draft.row.id}
                onChange={(e) => updateRow({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder="two-sum"
                className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 font-mono text-xs focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={draft.row.title}
                onChange={(e) => updateRow({ title: e.target.value })}
                placeholder="Two Sum"
                className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Difficulty <span className="text-red-400">*</span>
              </label>
              <select
                value={draft.row.difficulty ?? "easy"}
                onChange={(e) => updateRow({ difficulty: e.target.value as "easy" | "medium" | "hard" })}
                className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Source</label>
              <input
                type="text"
                value={draft.row.source ?? ""}
                onChange={(e) => updateRow({ source: e.target.value || "custom" })}
                placeholder="LeetCode, CSES..."
                className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Pattern</label>
              <input
                type="text"
                value={draft.row.pattern ?? ""}
                onChange={(e) => updateRow({ pattern: e.target.value || null })}
                placeholder="two-pointers, sliding-window..."
                className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
                list="patterns-list"
              />
              <datalist id="patterns-list">
                {patterns.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">URL (optional)</label>
              <input
                type="url"
                value={draft.row.url ?? ""}
                onChange={(e) => updateRow({ url: e.target.value || null })}
                placeholder="https://leetcode.com/problems/..."
                className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Kind</label>
              <select
                value={draft.row.kind}
                onChange={(e) => updateRow({ kind: e.target.value as "function" | "design" })}
                className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
              >
                <option value="function">Function signature</option>
                <option value="design">Design spec</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={draft.row.unordered}
                  onChange={(e) => updateRow({ unordered: e.target.checked })}
                  className="rounded border-line text-accent focus:ring-accent"
                />
                Unordered output
              </label>
            </div>
          </div>

          {/* Function Signature or Design Spec */}
          {draft.row.kind === "function" ? (
            <div className="rounded-lg border border-line bg-surface p-4 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Function Signature</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Function Name</label>
                  <input
                    type="text"
                    value={draft.row.fn?.name ?? ""}
                    onChange={(e) =>
                      updateRow({
                        fn: {
                          name: e.target.value,
                          params: draft.row.fn?.params ?? [],
                          returns: draft.row.fn?.returns ?? "int",
                        },
                      })
                    }
                    placeholder="twoSum"
                    className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 font-mono text-xs focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Parameters <span className="font-normal text-muted">(name:type, comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={(draft.row.fn?.params ?? []).map((p) => `${p.name}:${p.type}`).join(", ")}
                    onChange={(e) => {
                      const str = e.target.value;
                      const parts = str.split(",").map((s) => s.trim()).filter(Boolean);
                      const params = parts.map((part) => {
                        const [n, t] = part.split(":").map((s) => s.trim());
                        return { name: n || "", type: t || "int" };
                      });
                      updateRow({
                        fn: {
                          name: draft.row.fn?.name ?? "",
                          params,
                          returns: draft.row.fn?.returns ?? "int",
                        },
                      });
                    }}
                    placeholder="nums:int[], target:int"
                    className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 font-mono text-xs focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Return Type</label>
                  <select
                    value={draft.row.fn?.returns ?? "int"}
                    onChange={(e) =>
                      updateRow({
                        fn: {
                          name: draft.row.fn?.name ?? "",
                          params: draft.row.fn?.params ?? [],
                          returns: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 font-mono text-xs focus:border-accent focus:outline-none"
                  >
                    {SIGNATURE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-surface p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Design Spec (JSON)</h4>
              <textarea
                value={JSON.stringify(draft.row.design ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    updateRow({ design: parsed });
                  } catch {
                    // let user type
                  }
                }}
                rows={6}
                className="w-full rounded border border-line bg-surface/50 p-2.5 font-mono text-xs focus:border-accent focus:outline-none"
              />
            </div>
          )}

          {/* Statement Page Editor */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Problem Statement</h4>
            <PageEditor
              template="problem"
              page={draft.statement}
              onChange={(newPage) => updateDraft((prev) => ({ ...prev, statement: newPage }))}
              ai={{ entity: "problem", id: draft.row.id, field: "statement", draft }}
            />
          </div>

          {/* Constraints */}
          <div className="rounded-lg border border-line bg-surface p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Constraints (one per line)</h4>
            <AiAssist
              target="problem-constraints"
              entity="problem"
              id={draft.row.id}
              field="constraints"
              draft={draft}
              current={draft.row.constraints ?? []}
              onChange={(next) => updateRow({ constraints: next as string[] })}
            />
            <textarea
              value={(draft.row.constraints ?? []).join("\n")}
              onChange={(e) =>
                updateRow({
                  constraints: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                })
              }
              rows={4}
              placeholder={`1 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9`}
              className="w-full rounded border border-line bg-surface/50 p-2.5 font-mono text-xs focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Tab: Test cases */}
      {activeTab === "cases" && (
        <div className="space-y-3">
          <AiAssist
            target="test-cases"
            entity="problem"
            id={draft.row.id}
            field="cases"
            draft={draft}
            current={draft.cases ?? []}
            onChange={(next) => updateDraft((prev) => ({ ...prev, cases: next as ProblemDraft["cases"] }))}
          />
          <TestCasesEditor
            testCases={draft.cases ?? []}
            onChange={(newCases) => updateDraft((prev) => ({ ...prev, cases: newCases }))}
            isDesktop={isDesktop}
          />
        </div>
      )}

      {/* Tab: Hints */}
      {activeTab === "hints" && (
        <div className="space-y-3">
          <AiAssist
            target="hints"
            entity="problem"
            id={draft.row.id}
            field="hints"
            draft={draft}
            current={draft.hints ?? []}
            onChange={(next) => updateDraft((prev) => ({ ...prev, hints: next as ProblemDraft["hints"] }))}
          />
          <HintsEditor
            hints={draft.hints ?? []}
            onChange={(newHints) => updateDraft((prev) => ({ ...prev, hints: newHints }))}
          />
        </div>
      )}

      {/* Tab: Solution page */}
      {activeTab === "solution" && (
        <div className="space-y-4">
          <div className="border-b border-line pb-2">
            <h3 className="text-sm font-semibold text-foreground">Solution Walkthrough</h3>
            <p className="text-xs text-muted">
              Add explanation paragraphs, Mermaid architecture/flow diagrams, and reference code blocks.
            </p>
          </div>
          <PageEditor
            template="problem"
            page={draft.solution}
            onChange={(newPage) => updateDraft((prev) => ({ ...prev, solution: newPage }))}
            onRunCode={handleRunCode}
            ai={{ entity: "problem", id: draft.row.id, field: "solution", draft }}
          />
        </div>
      )}

      {/* Tab: History */}
      {activeTab === "history" && (
        <HistoryViewer auditRows={initialAuditRows} onRestored={() => router.refresh()} />
      )}

      {/* Sticky Save Footer */}
      <SaveFooter
        note={note}
        onNoteChange={setNote}
        notify={notify}
        onNotifyChange={setNotify}
        onSave={handleSave}
        saving={saving}
        errors={errors}
        conflict={conflict}
        onReloadLatest={() => window.location.reload()}
        onOverwrite={handleOverwrite}
        isDirty={isDirty}
      />
    </div>
  );
}

export default ProblemEditorClient;
