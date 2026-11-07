import Link from "next/link";
import { RESOLVE_XP, solveXp } from "@habit/shared";
import type { PatternView, ProblemView } from "@/lib/dsa";
import { markSolvedAction, savePatternNoteAction, undoSolveAction } from "../actions";
import { SubmitButton } from "../submit-button";

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
  noted?: boolean;
  lcNotes?: boolean;
  submissions?: number;
  auto?: boolean;
  premium?: boolean;
  struggling?: boolean;
}) {
  const notesTitle = [props.noted && "your notes / saved code", props.lcNotes && "LeetCode notes"].filter(Boolean).join(" + ");
  return (
    <span>
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
      {notesTitle && (
        <span className="ml-1.5 text-xs" title={`Has ${notesTitle}`} aria-label={`Has ${notesTitle}`}>
          📝
        </span>
      )}
      {!!props.submissions && (
        <span
          className="ml-1.5 text-xs text-muted"
          title={`${props.submissions} accepted solution${props.submissions === 1 ? "" : "s"} saved from LeetCode`}
        >
          💻{props.submissions > 1 ? ` ${props.submissions}` : ""}
        </span>
      )}
      {props.struggling && (
        <span className="ml-1.5 text-xs" title="On your stuck list" aria-label="On your stuck list">
          🧗
        </span>
      )}
      {props.auto && (
        <span className="ml-1.5 text-xs" title="Synced from LeetCode">
          ⚡
        </span>
      )}
      {props.premium && (
        <span className="ml-1.5 text-xs text-muted" title="LeetCode Premium">
          🔒
        </span>
      )}
    </span>
  );
}

/** LeetCode topic tags, after the difficulty/solve line. */
export function Topics({ topics }: { topics: string[] }) {
  if (topics.length === 0) return null;
  return <span title="LeetCode topics"> · {topics.join(", ")}</span>;
}

export const DIFFICULTY_STYLE = { easy: "text-cat-dsa", medium: "text-cat-beh", hard: "text-cat-mock" } as const;

export function ProblemRow({ p, patterns }: { p: ProblemView; patterns?: string[] }) {
  const s = p.status;
  const solved = s.state !== "unsolved";
  const due = s.state === "solved" && s.resolveDue;
  const label = p.number ? `${p.number}. ${p.title}` : p.title;

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      {s.state !== "resolved" ? (
        <form action={markSolvedAction}>
          <input type="hidden" name="problemId" value={p.id} />
          <SubmitButton
            aria-label={solved ? `Mark "${label}" re-solved` : `Mark "${label}" solved`}
            title={solved ? `Re-solved (+${RESOLVE_XP} XP)` : `Solved (+${solveXp(p)} XP)`}
            className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 text-sm ${
              solved ? "border-accent bg-accent text-on-accent" : "border-line"
            } ${due ? "animate-pulse" : ""}`}
          >
            {solved ? "✓" : ""}
          </SubmitButton>
        </form>
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent text-xs text-on-accent" aria-label="Re-solved">
          ✓✓
        </span>
      )}

      <div className="min-w-0 flex-1">
        <ProblemTitle
          id={p.id}
          label={label}
          url={p.url}
          noted={p.noted}
          lcNotes={p.lcNotes}
          submissions={p.submissions}
          auto={p.auto}
          premium={p.premium}
          struggling={p.struggling}
        />
        <p className="text-xs text-muted">
          {p.difficulty && <span className={`font-medium capitalize ${DIFFICULTY_STYLE[p.difficulty]}`}>{p.difficulty}</span>}
          {s.state === "solved" && (
            <span className={due ? "font-medium text-foreground" : ""}>
              {p.difficulty && " · "}Solved {fmt(s.solvedOn)} · {due ? "re-solve due now — tick again" : `re-solve ${fmt(s.resolveOn)}`}
            </span>
          )}
          {s.state === "resolved" && (
            <span>
              {p.difficulty && " · "}Solved {fmt(s.solvedOn)} · re-solved {fmt(s.resolvedOn)}
            </span>
          )}
          <Topics topics={p.topics} />
          {patterns && <span> · {patterns.join(", ")}</span>}
        </p>
      </div>

      {solved && (
        <form action={undoSolveAction}>
          <input type="hidden" name="problemId" value={p.id} />
          <SubmitButton aria-label={`Undo last solve of "${label}"`} title="Undo" className="px-1 text-muted hover:text-foreground">
            ↺
          </SubmitButton>
        </form>
      )}
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
        📄 Cheat sheet{n?.template ? ` · ${n.language || "template"} saved` : " · add your template"}
      </summary>
      <div className="space-y-3 border-t border-line p-3">
        {n?.template && (
          <pre className="max-h-80 overflow-auto rounded-lg border border-line bg-background p-3 font-mono text-xs">
            <code>{n.template}</code>
          </pre>
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
          <div className="flex gap-2">
            <input name="language" defaultValue={n?.language || "Java"} maxLength={30} aria-label="Language" className="w-32 rounded-lg border border-line bg-background px-3 py-1.5" />
            <SubmitButton className="rounded-lg bg-accent px-3 py-1.5 font-medium text-on-accent">Save cheat sheet</SubmitButton>
          </div>
        </form>
      </div>
    </details>
  );
}
