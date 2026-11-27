"use client";

import { CloseIcon } from "@/app/ui";

import { useState } from "react";
import type { TestCaseRow } from "@habit/shared";

export function TestCasesEditor({
  testCases,
  onChange,
  onFillExpectedOutputs,
  isDesktop = false,
}: {
  testCases: TestCaseRow[];
  onChange: (cases: TestCaseRow[]) => void;
  onFillExpectedOutputs?: () => void;
  isDesktop?: boolean;
}) {
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteJson, setPasteJson] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  const handleUpdate = (index: number, updates: Partial<TestCaseRow>) => {
    const next = [...testCases];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const handleUpdateInputJson = (index: number, jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        handleUpdate(index, { input: parsed });
      }
    } catch {
      // let user type
    }
  };

  const handleUpdateOutputJson = (index: number, jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      handleUpdate(index, { output: parsed });
    } catch {
      // let user type
    }
  };

  const handleAdd = () => {
    const newCase: TestCaseRow = {
      ord: testCases.length,
      role: testCases.length === 0 ? "example" : "test",
      input: [],
      output: null,
      explanationMd: null,
    };
    onChange([...testCases, newCase]);
  };

  const handleRemove = (index: number) => {
    const next = testCases.filter((_, i) => i !== index).map((c, i) => ({ ...c, ord: i }));
    onChange(next);
  };

  const handleMove = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= testCases.length) return;
    const next = [...testCases];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next.map((c, i) => ({ ...c, ord: i })));
  };

  const handleApplyPaste = () => {
    try {
      setPasteError(null);
      const parsed = JSON.parse(pasteJson);
      if (!Array.isArray(parsed)) {
        setPasteError("Pasted JSON must be an array of test cases: [{ input: [...], output: ... }]");
        return;
      }
      const newCases: TestCaseRow[] = parsed.map((item, i) => ({
        ord: testCases.length + i,
        role: testCases.length === 0 && i === 0 ? "example" : "test",
        input: Array.isArray(item.input ?? item.in) ? (item.input ?? item.in) : [item.input ?? item.in],
        output: item.output ?? item.expected ?? item.out ?? null,
        explanationMd: typeof item.explanation === "string" ? item.explanation : null,
      }));
      onChange([...testCases, ...newCases]);
      setPasteModalOpen(false);
      setPasteJson("");
    } catch (e) {
      setPasteError(e instanceof Error ? e.message : "Invalid JSON.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Test Cases</h3>
          <p className="text-xs text-muted">
            Define examples (shown in statement) and test cases used for verification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onFillExpectedOutputs && (
            <button
              type="button"
              onClick={onFillExpectedOutputs}
              disabled={!isDesktop}
              title={isDesktop ? "Fill outputs from optimal solution" : "Run tests in the desktop app"}
              className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-2 disabled:opacity-40"
            >
              Fill expected outputs {isDesktop ? "" : "(desktop only)"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setPasteModalOpen(true)}
            className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-2"
          >
            Paste JSON array
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent/90"
          >
            + Add test case
          </button>
        </div>
      </div>

      {pasteModalOpen && (
        <div className="rounded-lg border border-line bg-surface p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Paste Cases as JSON Array</h4>
            <button
              type="button"
              onClick={() => setPasteModalOpen(false)}
              className="text-muted hover:text-foreground text-sm"
            >
              <CloseIcon className="size-4" label="Close" />
            </button>
          </div>
          <p className="text-xs text-muted">
            Format: <code className="font-mono bg-surface-2 px-1 py-0.5 rounded">{`[{"input": [2, 7, 11, 15], "output": [0, 1]}]`}</code>
          </p>
          {pasteError && <p className="text-xs text-red-400">{pasteError}</p>}
          <textarea
            value={pasteJson}
            onChange={(e) => setPasteJson(e.target.value)}
            rows={5}
            placeholder={`[\n  { "input": [1, 2], "output": 3 }\n]`}
            className="w-full rounded border border-line bg-surface/50 p-2 font-mono text-xs focus:border-accent focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPasteModalOpen(false)}
              className="rounded px-2.5 py-1 text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyPaste}
              className="rounded bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent/90"
            >
              Import Cases
            </button>
          </div>
        </div>
      )}

      {testCases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-8 text-center text-muted text-xs">
          No test cases defined yet. Click &ldquo;+ Add test case&rdquo; or &ldquo;Paste JSON array&rdquo;.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-surface/60 font-medium text-muted">
                <th className="p-2.5 w-12 text-center">#</th>
                <th className="p-2.5 w-24">Role</th>
                <th className="p-2.5">Input (JSON array)</th>
                <th className="p-2.5">Expected Output (JSON)</th>
                <th className="p-2.5">Explanation (Examples only)</th>
                <th className="p-2.5 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {testCases.map((tc, idx) => (
                <tr key={idx} className="hover:bg-surface/40 transition-colors">
                  <td className="p-2.5 text-center font-mono text-muted">{idx + 1}</td>
                  <td className="p-2.5">
                    <select
                      value={tc.role}
                      onChange={(e) => handleUpdate(idx, { role: e.target.value as "example" | "test" })}
                      className="rounded border border-line bg-surface px-2 py-1 text-xs focus:border-accent focus:outline-none"
                    >
                      <option value="example">Example</option>
                      <option value="test">Test</option>
                    </select>
                  </td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      defaultValue={JSON.stringify(tc.input ?? [])}
                      onBlur={(e) => handleUpdateInputJson(idx, e.target.value)}
                      placeholder="e.g. [1, 2]"
                      className="w-full rounded border border-line bg-surface/50 px-2 py-1 font-mono text-xs focus:border-accent focus:outline-none"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      defaultValue={JSON.stringify(tc.output ?? null)}
                      onBlur={(e) => handleUpdateOutputJson(idx, e.target.value)}
                      placeholder="e.g. 3"
                      className="w-full rounded border border-line bg-surface/50 px-2 py-1 font-mono text-xs focus:border-accent focus:outline-none"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={tc.explanationMd ?? ""}
                      disabled={tc.role !== "example"}
                      onChange={(e) => handleUpdate(idx, { explanationMd: e.target.value || null })}
                      placeholder={tc.role === "example" ? "Why this output..." : "(Examples only)"}
                      className="w-full rounded border border-line bg-surface/50 px-2 py-1 text-xs disabled:opacity-40 focus:border-accent focus:outline-none"
                    />
                  </td>
                  <td className="p-2.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, -1)}
                      disabled={idx === 0}
                      className="rounded p-1 text-muted hover:text-foreground disabled:opacity-20"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 1)}
                      disabled={idx === testCases.length - 1}
                      className="rounded p-1 text-muted hover:text-foreground disabled:opacity-20"
                      title="Move down"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="rounded p-1 text-muted hover:text-red-400 ml-1"
                      title="Remove test case"
                    >
                      <CloseIcon className="size-4" label="Close" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
