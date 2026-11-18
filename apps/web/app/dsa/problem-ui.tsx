import Link from "next/link";
import { RESOLVE_XP, solveXp } from "@habit/shared";
import type { PatternView, ProblemView } from "@/lib/dsa";
import { markSolvedAction, savePatternNoteAction, undoSolveAction } from "../actions";
import { Code } from "../code";
import { EditorField } from "../code-editor";
import { LANGUAGES } from "@/lib/notes";
import { SubmitButton } from "../submit-button";
import { Badge, buttonClass, Difficulty, StatusMark } from "../ui";

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
  /** What the problem teaches: shown as a tooltip */
  why?: string;
}) {
  const tag = props.struggling ? "stuck" : props.premium ? "premium" : null;

  return (
    <span className="min-w-0 truncate">
      <Link href={`/dsa/${encodeURIComponent(props.id)}`} prefetch={false} title={props.why} className="hit-link hover:underline">
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

export const DIFFICULTY_STYLE = { easy: "text-success", medium: "text-warning", hard: "text-danger" } as const;

/** Solve / re-solve / undo controls for one problem (shared by the list rows and the table). */
function RowActions({ p, label }: { p: ProblemView; label: string }) {
  const s = p.status;
  const solved = s.state !== "unsolved";
  const due = s.state === "solved" && s.resolveDue;
  if (!solved && p.judgeable) {
    return (
      <Link href={`/dsa/${p.id}`} title="Pass every test in the editor to solve it" className="text-xs text-muted hover:text-foreground">
        Solve to mark
      </Link>
    );
  }
  if (!solved) {
    return (
      <form action={markSolvedAction} className="inline">
        <input type="hidden" name="problemId" value={p.id} />
        <SubmitButton aria-label={`Mark "${label}" solved`} title={`Solved (+${solveXp(p)} XP)`} className="text-xs text-muted hover:text-foreground">
          Mark solved
        </SubmitButton>
      </form>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {due && (
        <form action={markSolvedAction} className="inline">
          <input type="hidden" name="problemId" value={p.id} />
          <SubmitButton aria-label={`Mark "${label}" re-solved`} title={`Re-solved (+${RESOLVE_XP} XP)`} className="text-xs font-medium text-warning hover:text-foreground">
            Re-solve
          </SubmitButton>
        </form>
      )}
      <form action={undoSolveAction} className="inline">
        <input type="hidden" name="problemId" value={p.id} />
        <SubmitButton aria-label={`Undo solve of "${label}"`} title="Undo" className="text-xs text-muted hover:text-foreground">
          Undo
        </SubmitButton>
      </form>
    </div>
  );
}

const statusOf = (p: ProblemView): "solved" | "resolve" | "none" => {
  const s = p.status;
  return s.state === "resolved" ? "solved" : s.state === "solved" ? (s.resolveDue ? "resolve" : "solved") : "none";
};

export function ProblemRow({ p, patterns }: { p: ProblemView; patterns?: string[] }) {
  const label = p.number ? `${p.number}. ${p.title}` : p.title;
  return (
    <li className="hit group flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors duration-120 hover:bg-surface-2">
      <div className="flex min-w-0 items-center gap-3">
        <StatusMark state={statusOf(p)} here={p.here} onLeetCode={p.onLeetCode} />
        <ProblemTitle id={p.id} label={label} url={p.url} premium={p.premium} struggling={p.struggling} why={p.why} />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <RowActions p={p} label={label} />
        </div>
        {patterns && patterns.length > 0 && (
          <span className="hidden max-w-[12rem] truncate text-xs text-muted sm:inline" title={patterns.join(", ")}>
            {patterns.join(", ")}
          </span>
        )}
        <div className="w-16 text-right">
          <Difficulty level={p.difficulty} />
        </div>
      </div>
    </li>
  );
}

/** A problem as a card (pattern page): status, title, what it teaches, difficulty; `next` marks the one to do next. */
export function ProblemCard({ p, next = false }: { p: ProblemView; next?: boolean }) {
  const label = p.number ? `${p.number}. ${p.title}` : p.title;
  return (
    <li
      className={`hit group flex flex-col gap-2 rounded-md border bg-surface p-4 text-sm transition-[border-color,box-shadow] duration-120 ease-dojo hover:border-line-strong hover:shadow-sm ${
        next ? "border-primary" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusMark state={statusOf(p)} here={p.here} onLeetCode={p.onLeetCode} />
          <ProblemTitle id={p.id} label={label} url={p.url} premium={p.premium} struggling={p.struggling} why={p.why} />
        </div>
        <Difficulty level={p.difficulty} />
      </div>
      {p.why && <p className="line-clamp-2 text-xs text-muted">{p.why}</p>}
      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        {next ? <Badge tone="primary">Next up</Badge> : <span />}
        <RowActions p={p} label={label} />
      </div>
    </li>
  );
}

/**
 * The "All problems" table: status, #, problem, pattern, difficulty, source, last solved. Below `md` each row collapses
 * to status, title and difficulty with pattern and source on a second line.
 */
export function ProblemTable({ rows, sourceOf }: { rows: { problem: ProblemView; patterns: string[] }[]; sourceOf: (p: ProblemView) => string }) {
  const th = "px-3 py-2 text-left text-xs font-semibold text-muted";
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <table className="w-full table-fixed text-sm">
        <thead className="bg-surface-2 max-md:sr-only">
          <tr>
            <th scope="col" className={`${th} w-10`}>
              <span className="sr-only">Status</span>
            </th>
            <th scope="col" className={`${th} w-14 max-lg:hidden`}>
              #
            </th>
            <th scope="col" className={th}>
              Problem
            </th>
            <th scope="col" className={`${th} w-44 max-xl:hidden`}>
              Pattern
            </th>
            <th scope="col" className={`${th} w-24`}>
              Difficulty
            </th>
            <th scope="col" className={`${th} w-24 max-xl:hidden`}>
              Source
            </th>
            <th scope="col" className={`${th} w-24 max-lg:hidden`}>
              Last solved
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(({ problem: p, patterns }) => {
            const label = p.number ? `${p.number}. ${p.title}` : p.title;
            const last = p.status.state === "resolved" ? p.status.resolvedOn : p.status.state === "solved" ? p.status.solvedOn : "";
            return (
              <tr key={p.id} className="hit group transition-colors duration-120 hover:bg-surface-2">
                <td className="px-3 py-2.5 align-middle">
                  <StatusMark state={statusOf(p)} here={p.here} onLeetCode={p.onLeetCode} />
                </td>
                <td className="px-3 py-2.5 text-muted tabular-nums max-lg:hidden">{p.number ?? ""}</td>
                <td className="px-3 py-2.5">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <ProblemTitle id={p.id} label={p.title} url={p.url} premium={p.premium} struggling={p.struggling} why={p.why} />
                    <span className="shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <RowActions p={p} label={label} />
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted xl:hidden">
                    {[patterns.join(", "), sourceOf(p), last ? `solved ${fmt(last)}` : ""].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td className="truncate px-3 py-2.5 text-xs text-muted max-xl:hidden" title={patterns.join(", ")}>
                  {patterns.join(", ")}
                </td>
                <td className="px-3 py-2.5">
                  <Difficulty level={p.difficulty} />
                </td>
                <td className="px-3 py-2.5 text-xs text-muted max-xl:hidden">{sourceOf(p)}</td>
                <td className="px-3 py-2.5 text-xs text-muted tabular-nums max-lg:hidden">{last ? fmt(last) : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Your template code and recognition notes for a pattern; collapsed, with an edit form. */
export function CheatSheet({ p }: { p: PatternView }) {
  const n = p.note;
  const field = "w-full rounded-sm border border-line-strong bg-surface px-3 py-2 focus:border-primary";
  return (
    <details className="rounded-md border border-line bg-surface text-sm">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground">
        Cheat sheet{n?.template ? ` · ${n.language || "template"} saved` : " · add your template"}
      </summary>
      <div className="space-y-3 border-t border-line p-4">
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
              className="h-9 rounded-sm border border-line-strong bg-surface px-2"
            >
              {[...LANGUAGES, ...(n?.language && !(LANGUAGES as readonly string[]).includes(n.language) ? [n.language] : [])].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <SubmitButton className={buttonClass("primary", "md")}>Save cheat sheet</SubmitButton>
          </div>
        </form>
      </div>
    </details>
  );
}
