import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { RESOLVE_XP, solveXp } from "@habit/shared";
import { getProblemDetail } from "@/lib/dsa";
import { LANGUAGES, NOTE_LIMITS } from "@/lib/notes";
import { markSolvedAction, saveNoteAction, undoSolveAction } from "../../actions";
import { SubmitButton } from "../../submit-button";
import { PageMain } from "../../ui";

export const metadata: Metadata = { title: "Problem" };

export default function ProblemPage({ params }: PageProps<"/dsa/[id]">) {
  return (
    <PageMain title="Problem">
      <Link href="/dsa" className="mb-4 inline-block text-sm text-muted hover:text-foreground">
        ← All patterns
      </Link>
      <Suspense fallback={<p className="text-muted">Loading problem…</p>}>
        <Problem params={params} />
      </Suspense>
    </PageMain>
  );
}

const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const NOTES_TEMPLATE = `Approach:
Key insight:
Complexity: O(?) time, O(?) space
Edge cases / mistakes:`;

async function Problem({ params }: { params: PageProps<"/dsa/[id]">["params"] }) {
  const { id } = await params;
  await connection(); // reads today's date and the database
  const p = await getProblemDetail(decodeURIComponent(id));
  if (!p) notFound();

  const s = p.status;
  const label = p.number ? `${p.number}. ${p.title}` : p.title;
  const field = "w-full rounded-lg border border-line bg-background px-3 py-2";

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          {label}
          {p.auto && (
            <span className="ml-2 text-base" title="Synced from LeetCode">
              ⚡
            </span>
          )}
        </h2>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {p.difficulty && <span className="capitalize">{p.difficulty}</span>}
          {p.premium && <span>🔒 Premium</span>}
          {p.url && (
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:underline">
              Open on {p.url.includes("leetcode.com") ? "LeetCode" : "the web"} ↗
            </a>
          )}
        </p>
      </header>

      {p.patterns.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold">Pattern{p.patterns.length > 1 ? "s" : ""}</h3>
          <ul className="space-y-1 text-sm">
            {p.patterns.map((pat) => (
              <li key={pat.id}>
                <span className="font-medium">{pat.name}</span>
                <span className="text-muted"> · recognize by: {pat.recognize}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
        <p className="text-sm">
          {s.state === "unsolved" && "Not solved yet."}
          {p.kind === "extra" && s.state !== "unsolved" && `Solved ${fmt(s.solvedOn)} (synced from LeetCode).`}
          {p.kind === "roadmap" && s.state === "solved" &&
            `Solved ${fmt(s.solvedOn)} · ${s.resolveDue ? "re-solve due now" : `re-solve on ${fmt(s.resolveOn)}`}`}
          {p.kind === "roadmap" && s.state === "resolved" && `Solved ${fmt(s.solvedOn)} · re-solved ${fmt(s.resolvedOn)} ✓✓`}
        </p>
        {p.kind === "roadmap" && (
          <div className="flex gap-2">
            {s.state !== "resolved" && (
              <form action={markSolvedAction}>
                <input type="hidden" name="problemId" value={p.id} />
                <SubmitButton className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent">
                  {s.state === "unsolved" ? `Mark solved (+${solveXp(p)} XP)` : `Mark re-solved (+${RESOLVE_XP} XP)`}
                </SubmitButton>
              </form>
            )}
            {s.state !== "unsolved" && (
              <form action={undoSolveAction}>
                <input type="hidden" name="problemId" value={p.id} />
                <SubmitButton className="rounded-lg border border-line px-3 py-1.5 text-sm">Undo</SubmitButton>
              </form>
            )}
          </div>
        )}
      </section>

      <form action={saveNoteAction} className="space-y-4">
        <input type="hidden" name="problemId" value={p.id} />
        <div>
          <label htmlFor="notes" className="mb-1 block font-semibold">
            Your notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={8}
            maxLength={NOTE_LIMITS.notes}
            defaultValue={p.note?.notes ?? ""}
            placeholder={NOTES_TEMPLATE}
            className={field}
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label htmlFor="code" className="font-semibold">
              Your solution
            </label>
            <select
              name="language"
              aria-label="Language"
              defaultValue={p.note?.language || "Java"}
              className="rounded-lg border border-line bg-background px-2 py-1 text-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <textarea
            id="code"
            name="code"
            rows={16}
            maxLength={NOTE_LIMITS.code}
            spellCheck={false}
            defaultValue={p.note?.code ?? ""}
            placeholder="Paste the code you submitted. When you re-solve, write it fresh first, then compare."
            className={`${field} font-mono text-sm`}
          />
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">Save</SubmitButton>
          {p.note && (
            <span className="text-sm text-muted">Last saved {new Date(p.note.updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
          )}
        </div>
        <p className="text-xs text-muted">Stored only in your local database. Saving both fields empty removes the note.</p>
      </form>
    </article>
  );
}
