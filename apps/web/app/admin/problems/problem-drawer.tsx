"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useConfirm } from "../../components/confirm-dialog";
import { MarkdownPreview } from "../markdown-preview";
import { Badge, INPUT_CLASS, TEXTAREA_CLASS, buttonClass } from "../../ui";
import { deleteProblemAction, saveProblemAction, updateProblemAction, verifyProblemAction, type ProblemActionResult, type VerifyResult } from "../actions";

export interface DrawerInitial {
  originalId: string;
  title: string;
  slug: string;
  difficulty: string;
  source: string;
  category: string;
  description: string;
  constraints: string;
  hints: string;
  fnName: string;
  params: string;
  returns: string;
  tests: string;
  code: string;
  /** True when the problem is stored (edit saves in place); false for new or built-in (saving creates a stored item) */
  stored: boolean;
}

const RETURNS = ["int", "long", "double", "bool", "string", "int[]", "long[]", "bool[]", "string[]", "int[][]", "string[][]", "list", "tree"];
const input = `${INPUT_CLASS} mt-1 !h-10`;
const area = `${TEXTAREA_CLASS} mt-1 font-mono`;
const section = "space-y-3 rounded-2xl border border-line p-4";

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
  const [verified, verifyAction, verifying] = useActionState<VerifyResult | null, FormData>(verifyProblemAction, null);
  const [removed, removeAction, removing] = useActionState<ProblemActionResult | null, FormData>(deleteProblemAction, null);
  const { confirm, dialog } = useConfirm();
  const [tests, setTests] = useState(initial.tests);
  const [description, setDescription] = useState(initial.description);
  const [showPreview, setShowPreview] = useState(false);
  const removeForm = useRef<HTMLFormElement>(null);
  const jsonError = checkJson(tests);
  const shown = removed ?? state;

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-foreground/40" role="dialog" aria-modal="true" aria-label={mode === "new" ? "Add new problem" : `Edit ${initial.title}`}>
      <Link href={closeHref} className="flex-1" aria-label="Close editor" />
      <aside className="h-full w-full max-w-3xl overflow-y-auto border-l border-line bg-surface p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{mode === "new" ? "Add new problem" : `Edit: ${initial.title}`}</h2>
          <Link href={closeHref} className={buttonClass("outline", "sm")}>Close</Link>
        </div>
        {mode === "edit" && !editing && (
          <p className="mb-4 rounded-2xl bg-surface-2 p-3 text-sm text-muted">
            This is a built-in problem. Saving creates a separate stored problem; the built-in one is not changed.
          </p>
        )}
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="originalId" value={editing ? initial.originalId : ""} />

          <fieldset className={section}>
            <legend className="px-1 text-sm font-semibold">Metadata</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">Title<input name="title" required maxLength={120} className={input} defaultValue={initial.title} /></label>
              <label className="block text-sm">Slug
                <input name="slug" required maxLength={40} readOnly={editing} className={`${input} font-mono`} defaultValue={initial.slug} placeholder="count-vowels" />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">Difficulty
                <select name="difficulty" defaultValue={initial.difficulty || "easy"} className={input}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <label className="block text-sm">Source<input name="source" maxLength={80} className={input} defaultValue={initial.source} placeholder="LeetCode 1" /></label>
              <label className="block text-sm">Category<input name="category" maxLength={60} className={input} defaultValue={initial.category} placeholder="Warm-ups" /></label>
            </div>
          </fieldset>

          <fieldset className={section}>
            <legend className="px-1 text-sm font-semibold">Statement and constraints</legend>
            <div className={showPreview ? "grid gap-3 lg:grid-cols-2" : ""}>
              <label className="block text-sm">Description (Markdown; a blank line starts a new paragraph)
                <textarea name="description" required maxLength={20000} className={`${area} h-40`} value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              {showPreview && (
                <div className="rounded-2xl bg-surface-2 p-3 text-sm" aria-label="Description preview">
                  {description.trim() ? <MarkdownPreview source={description} /> : <p className="text-muted">Nothing to preview.</p>}
                </div>
              )}
            </div>
            <button type="button" className={buttonClass("tonal", "sm")} aria-pressed={showPreview} onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
            <label className="block text-sm">Constraints (one per line)
              <textarea name="constraints" maxLength={4000} className={`${area} h-20`} defaultValue={initial.constraints} />
            </label>
          </fieldset>

          <fieldset className={section}>
            <legend className="px-1 text-sm font-semibold">Function and test cases</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">Function name<input name="fnName" required maxLength={60} className={`${input} font-mono`} defaultValue={initial.fnName} placeholder="twoSum" /></label>
              <label className="block text-sm">Parameters<input name="params" className={`${input} font-mono`} defaultValue={initial.params} placeholder="nums:int[], target:int" /></label>
              <label className="block text-sm">Returns
                <select name="returns" defaultValue={initial.returns || "int"} className={input}>
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
                className={`${area} h-36`}
                placeholder={'[\n  { "input": [[2, 7, 11], 9], "output": [0, 1] }\n]'}
              />
              <span id="tests-msg" className={`mt-1 block text-xs ${jsonError ? "text-danger" : "text-muted"}`} aria-live="polite">
                {tests.trim() ? jsonError || "JSON looks valid. Types are checked against the function when you save." : "Required."}
              </span>
            </label>
          </fieldset>

          <fieldset className={section}>
            <legend className="px-1 text-sm font-semibold">Hints and reference solution</legend>
            <label className="block text-sm">Hints (one per line, from the gentlest to the strongest)
              <textarea name="hints" maxLength={10000} className={`${area} h-24`} defaultValue={initial.hints} />
            </label>
            <label className="block text-sm">Reference solution (C++, optional; stored with the problem)
              <textarea name="code" maxLength={60000} className={`${area} h-40`} defaultValue={initial.code} />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" formAction={verifyAction} disabled={verifying || Boolean(jsonError)} className={buttonClass("tonal", "sm")}>
                {verifying ? "Running..." : "Verify with Judge"}
              </button>
              <span className="text-xs text-muted">Runs the C++ code on every case above. Nothing is saved.</span>
            </div>
            <div role="status" aria-live="polite" className="text-sm">
              {verified?.ok === true && (
                <div className={`rounded-2xl p-3 ${verified.passed === verified.total ? "bg-primary-soft text-on-primary-soft" : "bg-danger-soft text-on-danger-soft"}`}>
                  <p className="font-medium">
                    {verified.passed} of {verified.total} cases passed (slowest {verified.maxMs} ms).
                  </p>
                  {verified.failures.length > 0 && (
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {verified.failures.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {verified?.ok === false && (
                <ul className="list-disc space-y-1 pl-5 text-danger">
                  {verified.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          </fieldset>

          <div role="status" aria-live="polite">
            {shown && !shown.ok && (
              <div role="alert" className="rounded-2xl bg-danger-soft p-3 text-sm text-on-danger-soft">
                <ul className="list-disc space-y-1 pl-5">
                  {shown.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {shown?.ok && <p className="rounded-2xl bg-primary-soft p-3 text-sm text-on-primary-soft">{shown.message}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending || Boolean(jsonError)} className={buttonClass("primary", "md")}>
              {pending ? "Saving..." : editing ? "Save changes" : "Save problem"}
            </button>
            {editing && <Badge tone="primary">Stored problem</Badge>}
          </div>
        </form>

        {editing && (
          <form ref={removeForm} action={removeAction} className="mt-6 border-t border-line pt-4">
            <input type="hidden" name="id" value={initial.originalId} />
            <button
              type="button"
              disabled={removing}
              className={buttonClass("danger", "sm")}
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${initial.title}?`,
                  body: "The stored problem is removed from the Added items list. Built-in problems are not affected.",
                  confirmLabel: "Delete problem",
                  danger: true,
                });
                if (ok) removeForm.current?.requestSubmit();
              }}
            >
              Delete stored problem
            </button>
          </form>
        )}
        {dialog}
      </aside>
    </div>
  );
}
