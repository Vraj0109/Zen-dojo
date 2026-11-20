"use client";

import { useActionState, useRef, useState } from "react";
import { useConfirm } from "../../../../components/confirm-dialog";
import { MarkdownPreview } from "../../../markdown-preview";
import { TEXTAREA_CLASS, buttonClass } from "../../../../ui";
import { revertLessonAction, saveLessonAction, type StudyActionResult } from "../../../study-actions";

const field = TEXTAREA_CLASS;
const btn = buttonClass("quiet", "sm", "!h-8 !px-3 text-xs");

interface Entry {
  key: number;
  text: string;
}

export interface LessonInitial {
  concept: string;
  overview: string;
  points: string[];
  explain: string[];
  questions: string[];
  pitfalls: string[];
  patched: boolean;
}

let nextKey = 1;
const mk = (text: string): Entry => ({ key: nextKey++, text });

function Preview({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3 text-sm">
      {text.trim() ? <MarkdownPreview source={text} /> : <p className="text-muted">Nothing to preview.</p>}
    </div>
  );
}

function ListEditor({ name, label, items, setItems }: { name: string; label: string; items: Entry[]; setItems: (e: Entry[]) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setItems(copy);
  };
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      {items.map((e, i) => (
        <div key={e.key} className="space-y-1 rounded-2xl border border-line p-2">
          <textarea name={name} rows={3} className={field} value={e.text} aria-label={`${label} ${i + 1}`} onChange={(ev) => setItems(items.map((x) => (x.key === e.key ? { ...x, text: ev.target.value } : x)))} />
          <div className="flex flex-wrap gap-1">
            <button type="button" className={btn} disabled={i === 0} onClick={() => move(i, -1)}>Move up</button>
            <button type="button" className={btn} disabled={i === items.length - 1} onClick={() => move(i, 1)}>Move down</button>
            <button type="button" className={btn} onClick={() => setOpen(open === e.key ? null : e.key)}>{open === e.key ? "Hide preview" : "Preview"}</button>
            <button type="button" className={btn} onClick={() => setItems(items.filter((x) => x.key !== e.key))}>Remove</button>
          </div>
          {open === e.key && <Preview text={e.text} />}
        </div>
      ))}
      <button type="button" className={btn} onClick={() => setItems([...items, mk("")])}>Add</button>
    </fieldset>
  );
}

export function LessonEditor({ initial }: { initial: LessonInitial }) {
  const [state, action, pending] = useActionState<StudyActionResult | null, FormData>(saveLessonAction, null);
  const [revertState, revertAction, reverting] = useActionState<StudyActionResult | null, FormData>(revertLessonAction, null);
  const [overview, setOverview] = useState(initial.overview);
  const [explain, setExplain] = useState(() => initial.points.map((_, i) => initial.explain[i] ?? ""));
  const [questions, setQuestions] = useState(() => initial.questions.map(mk));
  const [pitfalls, setPitfalls] = useState(() => initial.pitfalls.map(mk));
  const [showOverview, setShowOverview] = useState(false);
  const [showExplain, setShowExplain] = useState<number | null>(null);
  const { confirm, dialog } = useConfirm();
  const revertForm = useRef<HTMLFormElement>(null);
  const shown = revertState ?? state;

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-5">
        <input type="hidden" name="concept" value={initial.concept} />
        <div className="space-y-1">
          <label htmlFor="overview" className="text-sm font-medium">Overview (Markdown)</label>
          <textarea id="overview" name="overview" rows={5} className={field} value={overview} onChange={(e) => setOverview(e.target.value)} />
          <button type="button" className={btn} onClick={() => setShowOverview(!showOverview)}>{showOverview ? "Hide preview" : "Preview"}</button>
          {showOverview && <Preview text={overview} />}
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Explanations, one per checklist point (same order as the checklist)</legend>
          {initial.points.map((point, i) => (
            <div key={i} className="space-y-1 rounded-2xl border border-line p-2">
              <p className="text-xs text-muted">{point}</p>
              <textarea name="explain" rows={3} className={field} value={explain[i]} aria-label={`Explanation ${i + 1}`} onChange={(e) => setExplain(explain.map((x, j) => (j === i ? e.target.value : x)))} />
              <button type="button" className={btn} onClick={() => setShowExplain(showExplain === i ? null : i)}>{showExplain === i ? "Hide preview" : "Preview"}</button>
              {showExplain === i && <Preview text={explain[i]} />}
            </div>
          ))}
        </fieldset>
        <ListEditor name="questions" label="Interview questions (reorder with Move up and Move down)" items={questions} setItems={setQuestions} />
        <ListEditor name="pitfalls" label="Common mistakes" items={pitfalls} setItems={setPitfalls} />
        <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>{pending ? "Saving..." : "Save lesson"}</button>
      </form>
      {initial.patched && (
        <form ref={revertForm} action={revertAction}>
          <input type="hidden" name="concept" value={initial.concept} />
          <button
            type="button"
            disabled={reverting}
            className={buttonClass("danger", "sm")}
            onClick={async () => {
              const ok = await confirm({
                title: "Revert to the built-in lesson?",
                body: "Your saved text for this lesson is deleted. Learners see the built-in text again.",
                confirmLabel: "Revert lesson",
                danger: true,
              });
              if (ok) revertForm.current?.requestSubmit();
            }}
          >
            Revert to built-in
          </button>
        </form>
      )}
      <div role="status" aria-live="polite" className="text-sm">
        {shown?.ok === true && <p>{shown.message}</p>}
        {shown?.ok === false && (
          <ul className="list-disc pl-5 text-danger">
            {shown.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </div>
      {dialog}
    </div>
  );
}
