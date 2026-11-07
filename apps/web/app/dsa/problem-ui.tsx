import Link from "next/link";
import { RESOLVE_XP, solveXp } from "@habit/shared";
import type { PatternView, ProblemView } from "@/lib/dsa";
import { markSolvedAction, savePatternNoteAction, undoSolveAction } from "../actions";
import { Code } from "../code";
import { EditorField } from "../code-editor";
import { LANGUAGES } from "@/lib/notes";
import { SubmitButton } from "../submit-button";
import { Difficulty, StatusMark } from "../ui";

// Problem rows and the pattern cheat sheet, shared by /dsa and /dsa/pattern/[id].

export const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** Title links to the problem page (notes + code); ↗ opens the problem itself. */
export function ProblemTitle(props: {
  id: string;
  label: string;
  url?: string;
  premium?: boolean;
  struggling?: boolean;
  noted?: boolean;
  lcNotes?: boolean;
  submissions?: number;
  auto?: boolean;
}) {
  const tag = props.struggling ? "stuck" : props.premium ? "premium" : null;

  return (
    <span className="min-w-0 truncate">
      <Link href={`/dsa/${encodeURIComponent(props.id)}`} prefetch={false} className="hover:underline">
        {props.label}
      </Link>
      {props.url && (
        <a
          href={props.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${props.label} on ${props.url.includes("leetcode.com") ? "LeetCode" : "the web"}`}
          className="ml-1.5 text-xs text-muted hover:text-foreground"
        >
          ↗
        </a>
      )}
      {tag && <span className="ml-2 text-xs text-muted">{tag}</span>}
    </span>
  );
}

/** LeetCode topic tags, after the difficulty/solve line. */
export function Topics({ topics }: { topics: string[] }) {
  if (topics.length === 0) return null;
  return <span title="LeetCode topics"> · {topics.join(", ")}</span>;
}

export const DIFFICULTY_STYLE = { easy: "text-diff-easy", medium: "text-diff-medium", hard: "text-diff-hard" } as const;

export function ProblemRow({ p, patterns }: { p: ProblemView; patterns?: string[] }) {
  const s = p.status;
  const solved = s.state !== "unsolved";
  const due = s.state === "solved" && s.resolveDue;
  const label = p.number ? `${p.number}. ${p.title}` : p.title;
  const statusState = s.state === "resolved" ? "solved" : s.state === "solved" ? (due ? "resolve" : "solved") : "none";

  return (
    <li className="group flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-surface/80">
      <div className="flex min-w-0 items-center gap-3">
        <StatusMark state={statusState} />
        <ProblemTitle
          id={p.id}
          label={label}
          url={p.url}
          premium={p.premium}
          struggling={p.struggling}
        />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
          {!solved ? (
            <form action={markSolvedAction} className="inline">
              <input type="hidden" name="problemId" value={p.id} />
              <SubmitButton
                aria-label={`Mark "${label}" solved`}
                title={`Solved (+${solveXp(p)} XP)`}
                className="text-xs text-muted hover:text-foreground"
              >
                Mark solved
              </SubmitButton>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              {due && (
                <form action={markSolvedAction} className="inline">
                  <input type="hidden" name="problemId" value={p.id} />
                  <SubmitButton
                    aria-label={`Mark "${label}" re-solved`}
                    title={`Re-solved (+${RESOLVE_XP} XP)`}
                    className="text-xs font-medium text-diff-medium hover:text-foreground"
                  >
                    Re-solve
                  </SubmitButton>
                </form>
              )}
              <form action={undoSolveAction} className="inline">
                <input type="hidden" name="problemId" value={p.id} />
                <SubmitButton
                  aria-label={`Undo solve of "${label}"`}
                  title="Undo"
                  className="text-xs text-muted hover:text-foreground"
                >
                  Undo
                </SubmitButton>
              </form>
            </div>
          )}
        </div>

        {patterns && patterns.length > 0 && (
          <span className="hidden sm:inline text-xs text-muted max-w-[12rem] truncate" title={patterns.join(", ")}>
            {patterns.join(", ")}
          </span>
        )}

        <div className="w-14 text-right">
          <Difficulty level={p.difficulty} />
        </div>
      </div>
    </li>
  );
}

/** Your template code and recognition notes for a pattern; collapsed, with an edit form. */
export function CheatSheet({ p }: { p: PatternView }) {
  const n = p.note;
  const field = "w-full rounded-lg border border-line bg-background px-3 py-2";
  return (
    <details className="mb-2 rounded-lg border border-line bg-background/40 text-sm">
      <summary className="cursor-pointer px-3 py-1.5 text-xs font-medium text-muted">
        Cheat sheet{n?.template ? ` · ${n.language || "template"} saved` : " · add your template"}
      </summary>
      <div className="space-y-3 border-t border-line p-3">
        {n?.template && (
          <Code code={n.template} lang={n.language} maxHeight="20rem" />
        )}
        {n?.recognize && <p className="whitespace-pre-wrap">{n.recognize}</p>}
        <form action={savePatternNoteAction} className="space-y-2">
          <input type="hidden" name="patternId" value={p.id} />
          <textarea
            name="recognize"
            rows={3}
            maxLength={5000}
            defaultValue={n?.recognize ?? ""}
            placeholder={`How I spot "${p.name}": signals in the problem statement, constraints, the brute force it replaces…`}
            aria-label={`${p.name}: how to recognize it`}
            className={field}
          />
          <EditorField languageSelectId={`cheat-lang-${p.id}`} rows={8}>
            <textarea
              name="template"
              rows={8}
              maxLength={20000}
              defaultValue={n?.template ?? ""}
              placeholder="Your template code: the skeleton you'd write from memory."
              aria-label={`${p.name}: template code`}
              className={`${field} font-mono text-xs`}
              spellCheck={false}
            />
          </EditorField>
          <div className="flex gap-2">
            <select
              id={`cheat-lang-${p.id}`}
              name="language"
              defaultValue={n?.language || "Java"}
              aria-label="Language"
              className="rounded-lg border border-line bg-background px-2 py-1.5"
            >
              {[...LANGUAGES, ...(n?.language && !(LANGUAGES as readonly string[]).includes(n.language) ? [n.language] : [])].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <SubmitButton className="rounded-lg bg-accent px-3 py-1.5 font-medium text-on-accent">Save cheat sheet</SubmitButton>
          </div>
        </form>
      </div>
    </details>
  );
}
