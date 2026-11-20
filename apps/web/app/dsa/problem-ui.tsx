import Link from "next/link";
import { RESOLVE_XP, solveXp } from "@habit/shared";
import type { PatternView, ProblemView } from "@/lib/dsa";
import { markSolvedAction, savePatternNoteAction, undoSolveAction } from "../actions";
import { Code } from "../code";
import { EditorField } from "../code-editor";
import { LANGUAGES } from "@/lib/notes";
import { SubmitButton } from "../submit-button";
import { buttonClass } from "../ui";

// Problem rows and the pattern cheat sheet, shared by /dsa and /dsa/pattern/[id].

export const fmt = (d: string) => {
  if (!d) return "";
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
      <Link href={`/dsa/${encodeURIComponent(props.id)}`} prefetch={false} title={props.why} className="hover:underline">
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

// Compact look, 44px hit area: the ::before pseudo-element extends the tap target (32px + 6px above and below).
const ACTION_CLASS =
  "relative inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-xs font-medium transition-colors hover:bg-surface-2 " +
  "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary " +
  "before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']";

/** Solve / re-solve / undo controls for one problem (shared by the list rows and the table). */
export function RowActions({ p, label }: { p: ProblemView; label: string }) {
  const s = p.status;
  const solved = s.state !== "unsolved";
  const due = s.state === "solved" && s.resolveDue;
  if (!solved && p.judgeable) {
    return (
      <Link href={`/dsa/${p.id}`} title="Pass every test in the editor to solve it" className={`${ACTION_CLASS} text-muted hover:text-foreground`}>
        Solve to mark
      </Link>
    );
  }
  if (!solved) {
    return (
      <form action={markSolvedAction} className="inline">
        <input type="hidden" name="problemId" value={p.id} />
        <SubmitButton aria-label={`Mark "${label}" solved`} title={`Solved (+${solveXp(p)} XP)`} className={`${ACTION_CLASS} text-muted hover:text-foreground`}>
          Mark solved
        </SubmitButton>
      </form>
    );
  }
  return (
    <div className="flex items-center gap-1">
      {due && (
        <form action={markSolvedAction} className="inline">
          <input type="hidden" name="problemId" value={p.id} />
          <SubmitButton aria-label={`Mark "${label}" re-solved`} title={`Re-solved (+${RESOLVE_XP} XP)`} className={`${ACTION_CLASS} text-warning hover:text-foreground`}>
            Re-solve
          </SubmitButton>
        </form>
      )}
      <form action={undoSolveAction} className="inline">
        <input type="hidden" name="problemId" value={p.id} />
        <SubmitButton aria-label={`Undo solve of "${label}"`} title="Undo" className={`${ACTION_CLASS} text-muted hover:text-foreground`}>
          Undo
        </SubmitButton>
      </form>
    </div>
  );
}

export const statusOf = (p: ProblemView): "solved" | "resolve" | "none" => {
  const s = p.status;
  return s.state === "resolved" ? "solved" : s.state === "solved" ? (s.resolveDue ? "resolve" : "solved") : "none";
};

/** A problem as a card (pattern page): status, title, what it teaches, difficulty; `next` marks the one to do next. */
export function ProblemCard({ p, next = false }: { p: ProblemView; next?: boolean }) {
  const isDone = p.status.state === "solved" || p.status.state === "resolved";
  const last = p.status.state === "resolved" ? p.status.resolvedOn : p.status.state === "solved" ? p.status.solvedOn : "";
  const label = p.number ? `${p.number}. ${p.title}` : p.title;

  let meta = p.why || "";
  if (isDone && last) {
    meta = `Solved ${fmt(last)}${p.status.state === "solved" && p.status.resolveDue ? " · re-solve in 11 days" : ""}`;
  } else if (next) {
    meta = `Next up · about 25 min`;
  }

  return (
    <Link
      href={`/dsa/${encodeURIComponent(p.id)}`}
      className={`flex items-center gap-3.5 rounded-[24px] p-4 transition-colors sm:px-4.5 ${
        next
          ? "bg-primary-container text-on-primary-container"
          : "bg-surface border border-line dark:border-0 text-foreground hover:bg-surface-2/60"
      }`}
    >
      <span
        className={`size-7 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
          isDone
            ? "bg-primary text-on-primary"
            : next
            ? "border-2 border-on-primary-container"
            : "border-2 border-line-strong"
        }`}
      >
        {isDone ? (
          <svg className="size-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : ""}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-base truncate ${next ? "font-semibold" : "font-medium"}`}>{label}</p>
        {meta && <p className={`text-sm truncate ${next ? "opacity-85" : "text-muted"}`}>{meta}</p>}
      </div>
      <span
        className={`text-sm font-medium shrink-0 ${
          next
            ? "text-on-primary-container"
            : p.difficulty === "easy"
            ? "text-success"
            : p.difficulty === "medium"
            ? "text-warning"
            : "text-danger"
        }`}
      >
        {p.difficulty ? p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1) : ""}
      </span>
    </Link>
  );
}

/**
 * The "All problems" continuous list:
 * - One L1 frame that fills the remaining height with its own overflow-y-auto (phone: the page scrolls)
 * - Sticky header row: Problem, Pattern, Level, Last solved
 * - Roadmap order: one <details> per DSA group (name, "x of y solved", chevron); works without JS.
 *   `openGroups` "next" opens only the group with the next problem (or the first group), "all" opens every group.
 * - Other sorts and the re-solve tab: one flat list
 * - 52px rows with hairline dividers; the next problem has a 3px primary inset on the left
 * - content-visibility: auto; contain-intrinsic-size: 52px
 */
const TONES = ["bg-cat-dsa text-on-cat-dsa", "bg-cat-sd text-on-cat-sd", "bg-cat-lld text-on-cat-lld", "bg-cat-beh text-on-cat-beh"];

export function ProblemTable({
  rows,
  nextProblemId,
  showGroupDividers = false,
  problemGroupMap,
  openGroups = "next",
}: {
  rows: { problem: ProblemView; patterns: string[] }[];
  sourceOf?: (p: ProblemView) => string;
  nextProblemId?: string;
  showGroupDividers?: boolean;
  problemGroupMap?: Map<string, string>;
  openGroups?: "next" | "all";
}) {
  // Rows bucketed by group, in roadmap order (first appearance).
  const grouped: { name: string; rows: typeof rows }[] = [];
  if (showGroupDividers && problemGroupMap) {
    const byName = new Map<string, typeof rows>();
    for (const r of rows) {
      const name = problemGroupMap.get(r.problem.id) ?? "Other";
      let bucket = byName.get(name);
      if (!bucket) {
        bucket = [];
        byName.set(name, bucket);
        grouped.push({ name, rows: bucket });
      }
      bucket.push(r);
    }
  }
  const nextGroup = nextProblemId ? problemGroupMap?.get(nextProblemId) : undefined;
  const hasNextGroup = grouped.some((g) => g.name === nextGroup);
  const defaultOpen = (name: string, i: number) => openGroups === "all" || (hasNextGroup ? name === nextGroup : i === 0);

  return (
    <div data-practice-list="" className="w-full space-y-4">
      {/* Header labels */}
      <div className="flex items-center justify-between gap-3 px-2 text-sm text-muted">
        <span className="font-medium text-foreground">
          {rows.length} problems {grouped.length > 0 ? `across ${grouped.length} topics` : ""}
        </span>
        <div className="hidden md:grid grid-cols-[32px_minmax(0,1fr)_170px_80px_90px] gap-3 items-center text-[13px] font-medium text-muted px-4 flex-1 max-w-[850px] ml-auto">
          <span />
          <span>Problem</span>
          <span>Pattern</span>
          <span>Level</span>
          <span className="text-right">Last solved</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[24px] border border-line bg-surface p-10 text-center text-sm text-muted dark:border-0">
          No problems match these filters.{" "}
          <Link href="/dsa?tab=all" className="font-medium text-foreground hover:underline">
            Clear filters
          </Link>
        </div>
      ) : grouped.length > 0 ? (
        <div className="space-y-4">
          {grouped.map((g, i) => {
            const solved = g.rows.filter((r) => r.problem.status.state !== "unsolved").length;
            return (
              <details
                key={g.name}
                data-group={g.name}
                open={defaultOpen(g.name, i)}
                className="group/grp rounded-[24px] border border-line bg-surface p-2.5 sm:p-3.5 dark:border-0 shadow-2xs"
              >
                <summary className="flex min-h-[58px] cursor-pointer list-none items-center gap-3.5 rounded-[18px] bg-surface-2/80 px-4 py-3 transition-colors select-none hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold shadow-2xs ${TONES[i % TONES.length]}`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-[16px] font-semibold text-foreground tracking-tight">{g.name}</span>
                    <span className="text-xs text-muted font-normal">Topic {i + 1} of {grouped.length} · {g.rows.length} problems</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-foreground tabular-nums border border-line dark:border-0 shadow-2xs">
                    {solved} of {g.rows.length} solved
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className="size-5 shrink-0 text-muted transition-transform duration-200 ease-out group-open/grp:rotate-180 motion-reduce:transition-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <ul className="flex flex-col gap-1.5 pt-2">
                  {g.rows.map(({ problem, patterns }) => (
                    <TableRow key={problem.id} p={problem} patterns={patterns} isNext={problem.id === nextProblemId} />
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[24px] border border-line bg-surface p-2.5 sm:p-3.5 dark:border-0 shadow-2xs">
          <ul className="flex flex-col gap-1.5">
            {rows.map(({ problem, patterns }) => (
              <TableRow key={problem.id} p={problem} patterns={patterns} isNext={problem.id === nextProblemId} />
            ))}
          </ul>
        </div>
      )}
      <p className="py-2 text-center text-xs text-muted select-none">
        All {rows.length} rows are on this one page.
      </p>
    </div>
  );
}

function TableRow({ p, patterns, isNext }: { p: ProblemView; patterns: string[]; isNext: boolean }) {
  const st = statusOf(p);
  const last = p.status.state === "resolved" ? p.status.resolvedOn : p.status.state === "solved" ? p.status.solvedOn : "";
  const label = p.number ? `${p.number}. ${p.title}` : p.title;
  return (
    <li
      className={`group grid grid-cols-[28px_minmax(0,1fr)_64px] md:grid-cols-[32px_minmax(0,1fr)_170px_80px_90px] gap-3 items-center min-h-[50px] px-3.5 sm:px-4.5 py-2.5 rounded-[16px] text-foreground transition-colors [content-visibility:auto] [contain-intrinsic-size:50px] ${
        isNext
          ? "bg-primary-container text-on-primary-container border-2 border-primary/40 shadow-xs"
          : "bg-surface-2/40 hover:bg-surface-2 border border-transparent hover:border-line dark:hover:border-0"
      }`}
    >
      <span
        className={`size-[24px] rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
          st === "solved"
            ? "bg-primary text-on-primary"
            : st === "resolve"
            ? "bg-reward-soft text-on-reward-soft"
            : isNext
            ? "border-2 border-on-primary-container"
            : "border-2 border-line-strong"
        }`}
      >
        {st === "solved" ? (
          <svg className="size-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : st === "resolve" ? "!" : ""}
      </span>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <ProblemTitle id={p.id} label={label} url={p.url} premium={p.premium} struggling={p.struggling} why={p.why} />
        <span className="shrink-0 opacity-100 transition-opacity [@media(hover:hover)]:md:opacity-0 [@media(hover:hover)]:md:group-hover:opacity-100 [@media(hover:hover)]:md:group-focus-within:opacity-100">
          <RowActions p={p} label={label} />
        </span>
      </div>
      <span className="text-sm text-muted truncate max-md:hidden" title={patterns.join(", ")}>
        {patterns.join(", ") || "—"}
      </span>
      <span className={`text-sm font-medium ${p.difficulty && p.difficulty in DIFFICULTY_STYLE ? DIFFICULTY_STYLE[p.difficulty] : ""}`}>
        {p.difficulty ? p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1) : "—"}
      </span>
      <span className="text-[13px] text-muted text-right tabular-nums max-md:hidden">{last ? fmt(last) : "—"}</span>
    </li>
  );
}

/** Your template code and recognition notes for a pattern; collapsed, with an edit form. */
export function CheatSheet({ p }: { p: PatternView }) {
  const n = p.note;
  const field = "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary";
  return (
    <details className="rounded-[24px] border border-line dark:border-0 bg-surface text-sm">
      <summary className="cursor-pointer px-4.5 py-3 text-sm font-medium text-muted hover:text-foreground">
        Cheat sheet{n?.template ? ` · ${n.language || "template"} saved` : " · add your template"}
      </summary>
      <div className="space-y-3 border-t border-line p-4.5">
        {n?.template && <Code code={n.template} lang={n.language} maxHeight="20rem" />}
        {n?.recognize && <p className="whitespace-pre-wrap text-muted">{n.recognize}</p>}
        <form action={savePatternNoteAction} className="space-y-3">
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
              className="h-10 rounded-xl border border-line-strong bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
            >
              {[...LANGUAGES, ...(n?.language && !(LANGUAGES as readonly string[]).includes(n.language) ? [n.language] : [])].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <SubmitButton className={buttonClass("primary", "sm")}>Save cheat sheet</SubmitButton>
          </div>
        </form>
      </div>
    </details>
  );
}
