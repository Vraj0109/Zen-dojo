"use client";

import { useActionState, useState } from "react";
import { revertLessonAction, saveLessonAction, type StudyActionResult } from "../../../study-actions";

const field = "w-full rounded-md border border-line bg-background px-3 py-2 text-sm";
const btn = "rounded-md border border-line px-2 py-1 text-xs hover:bg-background disabled:opacity-40";

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
    <div className="rounded-md border border-line bg-background p-3 text-sm">
      {text.trim() ? <p className="whitespace-pre-wrap leading-relaxed">{text}</p> : <p className="text-muted">Nothing to preview.</p>}
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
        <div key={e.key} className="space-y-1 rounded-md border border-line p-2">
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
            <div key={i} className="space-y-1 rounded-md border border-line p-2">
              <p className="text-xs text-muted">{point}</p>
              <textarea name="explain" rows={3} className={field} value={explain[i]} aria-label={`Explanation ${i + 1}`} onChange={(e) => setExplain(explain.map((x, j) => (j === i ? e.target.value : x)))} />
              <button type="button" className={btn} onClick={() => setShowExplain(showExplain === i ? null : i)}>{showExplain === i ? "Hide preview" : "Preview"}</button>
              {showExplain === i && <Preview text={explain[i]} />}
            </div>
          ))}
        </fieldset>
        <ListEditor name="questions" label="Interview questions (reorder with Move up and Move down)" items={questions} setItems={setQuestions} />
        <ListEditor name="pitfalls" label="Common mistakes" items={pitfalls} setItems={setPitfalls} />
        <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? "Saving..." : "Save lesson"}</button>
      </form>
      {initial.patched && (
        <form action={revertAction}>
          <input type="hidden" name="concept" value={initial.concept} />
          <button type="submit" disabled={reverting} className={btn}>Revert to built-in</button>
        </form>
      )}
      <div role="status" aria-live="polite" className="text-sm">
        {shown?.ok === true && <p>{shown.message}</p>}
        {shown?.ok === false && (
          <ul className="list-disc pl-5 text-red-600">
            {shown.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
