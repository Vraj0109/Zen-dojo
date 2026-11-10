"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveProblemAction, updateProblemAction, type ProblemActionResult } from "../actions";

export interface DrawerInitial {
  originalId: string;
  title: string;
  slug: string;
  difficulty: string;
  source: string;
  category: string;
  description: string;
  constraints: string;
  fnName: string;
  params: string;
  returns: string;
  tests: string;
  code: string;
  /** True when the problem is stored (edit saves in place); false for new or built-in (saving creates a stored item) */
  stored: boolean;
}

const RETURNS = ["int", "long", "double", "bool", "string", "int[]", "long[]", "bool[]", "string[]", "int[][]", "string[][]", "list", "tree"];
const field = "w-full rounded-md border border-line bg-background px-3 py-2 text-sm";

function checkJson(raw: string): string {
  if (!raw.trim()) return "";
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v) || v.length === 0) return "Must be a JSON array with at least one case.";
    const bad = v.findIndex((c) => typeof c !== "object" || c === null || Array.isArray(c) || !Array.isArray((c as { input?: unknown }).input) || !("output" in c));
    return bad >= 0 ? `Case ${bad + 1} needs { "input": [...], "output": ... }.` : "";
  } catch (e) {
    return e instanceof Error ? e.message : "Not valid JSON.";
  }
}

export function ProblemDrawer({ initial, mode, closeHref }: { initial: DrawerInitial; mode: "new" | "edit"; closeHref: string }) {
  const editing = initial.stored;
  const [state, formAction, pending] = useActionState<ProblemActionResult | null, FormData>(editing ? updateProblemAction : saveProblemAction, null);
  const [tests, setTests] = useState(initial.tests);
  const jsonError = checkJson(tests);

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label={mode === "new" ? "Add new problem" : `Edit ${initial.title}`}>
      <Link href={closeHref} className="flex-1" aria-label="Close editor" />
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-line bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{mode === "new" ? "Add new problem" : `Edit: ${initial.title}`}</h2>
          <Link href={closeHref} className="rounded-md border border-line px-3 py-1 text-sm hover:bg-background">Close</Link>
        </div>
        {mode === "edit" && !editing && (
          <p className="mb-4 rounded-md border border-line bg-background p-3 text-sm text-muted">
            This is a built-in problem. Saving creates a separate stored problem; the built-in one is not changed.
          </p>
        )}
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="originalId" value={editing ? initial.originalId : ""} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">Title<input name="title" required maxLength={120} className={`${field} mt-1`} defaultValue={initial.title} /></label>
            <label className="block text-sm">Slug
              <input name="slug" required maxLength={40} readOnly={editing} className={`${field} mt-1 font-mono`} defaultValue={initial.slug} placeholder="count-vowels" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">Difficulty
              <select name="difficulty" defaultValue={initial.difficulty || "easy"} className={`${field} mt-1`}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="block text-sm">Source<input name="source" maxLength={80} className={`${field} mt-1`} defaultValue={initial.source} placeholder="LeetCode 1" /></label>
            <label className="block text-sm">Category<input name="category" maxLength={60} className={`${field} mt-1`} defaultValue={initial.category} placeholder="Warm-ups" /></label>
          </div>
          <label className="block text-sm">Description (Markdown; a blank line starts a new paragraph)
            <textarea name="description" required maxLength={20000} className={`${field} mt-1 h-40 font-mono`} defaultValue={initial.description} />
          </label>
          <label className="block text-sm">Constraints (one per line)
            <textarea name="constraints" maxLength={4000} className={`${field} mt-1 h-20 font-mono`} defaultValue={initial.constraints} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">Function name<input name="fnName" required maxLength={60} className={`${field} mt-1 font-mono`} defaultValue={initial.fnName} placeholder="twoSum" /></label>
            <label className="block text-sm">Parameters<input name="params" className={`${field} mt-1 font-mono`} defaultValue={initial.params} placeholder="nums:int[], target:int" /></label>
            <label className="block text-sm">Returns
              <select name="returns" defaultValue={initial.returns || "int"} className={`${field} mt-1`}>
                {RETURNS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">Test cases (JSON array of objects with input and output; input has one value per parameter; the first case is shown as the example)
            <textarea
              name="tests"
              required
              value={tests}
              onChange={(e) => setTests(e.target.value)}
              aria-invalid={jsonError ? true : undefined}
              aria-describedby="tests-msg"
              className={`${field} mt-1 h-36 font-mono`}
              placeholder={'[\n  { "input": [[2, 7, 11], 9], "output": [0, 1] }\n]'}
            />
            <span id="tests-msg" className={`mt-1 block text-xs ${jsonError ? "text-diff-hard" : "text-muted"}`} aria-live="polite">
              {tests.trim() ? jsonError || "JSON looks valid. Types are checked against the function when you save." : "Required."}
            </span>
          </label>
          <label className="block text-sm">Initial code (C++, optional; stored as the reference solution)
            <textarea name="code" maxLength={60000} className={`${field} mt-1 h-40 font-mono`} defaultValue={initial.code} />
          </label>

          {state && !state.ok && (
            <div role="alert" className="rounded-md border border-line bg-background p-3 text-sm text-diff-hard">
              <ul className="list-disc space-y-1 pl-5">
                {state.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {state?.ok && <p role="status" className="rounded-md border border-line bg-background p-3 text-sm">{state.message}</p>}

          <button type="submit" disabled={pending || Boolean(jsonError)} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-50">
            {pending ? "Saving..." : editing ? "Save changes" : "Save problem"}
          </button>
        </form>
      </aside>
    </div>
  );
}
