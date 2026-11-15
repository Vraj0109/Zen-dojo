import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getContinue, getCourses, type CourseView } from "@/lib/courses";
import { getCourseLibrary, type LibraryCourse } from "@/lib/packs";
import { toggleFavouriteCourseAction } from "../actions";
import { LibraryDownload } from "./library-download";
import { SubmitButton } from "../submit-button";
import { PageMain, ProgressBar } from "../ui";
import { StudyHubSkeleton } from "@/app/components/study-skeleton";

export const metadata: Metadata = { title: "Learn" };

export default function LearnHubPage() {
  return (
    <PageMain title="Learn">
      <Suspense fallback={<StudyHubSkeleton />}>
        <Hub />
      </Suspense>
    </PageMain>
  );
}

async function Hub() {
  await connection();
  const [courses, again] = await Promise.all([getCourses(), getContinue()]);
  const favourites = courses.filter((c) => c.favourite);
  const dueTotal = courses.reduce((a, c) => a + c.due, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Learn</h2>
          <p className="mt-1 text-sm text-muted">Pick a course. Each card shows how much is left and what to do next.</p>
        </div>
        {dueTotal > 0 && (
          <Link href="/review" className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background">
            {dueTotal} review{dueTotal === 1 ? "" : "s"} due →
          </Link>
        )}
      </header>

      {again && (
        <section aria-label="Continue" className="anim-fade-up rounded-xl border border-accent bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Continue where you left off</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{again.title}</p>
              <p className="text-sm text-muted">{again.course}</p>
            </div>
            <Link href={again.href} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent">
              Continue
            </Link>
          </div>
        </section>
      )}

      {favourites.length > 0 && (
        <section aria-labelledby="favs" className="space-y-3">
          <h3 id="favs" className="text-lg font-semibold">
            Favourites
          </h3>
          <div className="anim-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {favourites.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="all" className="space-y-3">
        <h3 id="all" className="text-lg font-semibold">
          All courses
        </h3>
        <div className="anim-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      </section>

      <Suspense fallback={<LibrarySkeleton />}>
        <CourseLibrarySection />
      </Suspense>

      <p className="text-sm text-muted">
        Also:{" "}
        <Link href="/study/diagrams" className="font-medium text-foreground underline">
          your diagrams
        </Link>{" "}
        and{" "}
        <Link href="/revise" className="font-medium text-foreground underline">
          quick revise
        </Link>
        .
      </p>
    </div>
  );
}

function LibraryHeading() {
  return (
    <div>
      <h3 id="library" className="text-lg font-semibold">
        Course library
      </h3>
      <p className="mt-1 text-sm text-muted">More courses you can add. Each one downloads once and then works offline.</p>
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <section aria-labelledby="library" aria-busy className="space-y-3">
      <LibraryHeading />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl border border-line bg-surface" />
        ))}
      </div>
    </section>
  );
}

function formatSize(bytes?: number): string | null {
  if (bytes === undefined) return null;
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

async function CourseLibrarySection() {
  await connection();
  const lib = await getCourseLibrary();
  const groups = new Map<string, LibraryCourse[]>();
  for (const c of lib.courses) groups.set(c.category, [...(groups.get(c.category) ?? []), c]);
  const sorted = [...groups.entries()].sort(([a], [b]) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));

  return (
    <section aria-labelledby="library" className="space-y-3">
      <LibraryHeading />
      {!lib.ok ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">Couldn&apos;t reach the course library right now.</p>
      ) : (
        <>
          {lib.offline && <p className="text-sm text-diff-medium">Showing the last list we saw. Connect to the internet to download.</p>}
          {lib.courses.length === 0 && <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">No courses in the library yet.</p>}
          {sorted.map(([category, list]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted">{category}</h4>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((c) => (
                  <LibraryCard key={c.id} course={c} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function LibraryCard({ course: c }: { course: LibraryCourse }) {
  const facts = [c.items !== undefined ? `${c.items} item${c.items === 1 ? "" : "s"}` : null, formatSize(c.bytes)].filter(Boolean).join(" · ");
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <h5 className="text-lg font-semibold leading-snug break-words">{c.title}</h5>
      {c.description && <p className="text-sm text-muted break-words">{c.description}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
        <p className="text-xs text-muted">
          {facts}
          {c.state === "update" && !c.tooNew && <span className="block font-medium text-diff-medium">New version available</span>}
        </p>
        {c.tooNew ? (
          <button type="button" disabled className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted opacity-60">
            Needs a newer Zen Dojo
          </button>
        ) : c.state === "installed" ? (
          <span className="flex items-center gap-3">
            <span className="text-xs text-muted">Downloaded</span>
            <Link href={`/study/packs/${c.id}`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background">
              Open
            </Link>
          </span>
        ) : (
          <LibraryDownload id={c.id} title={c.title} label={c.state === "update" ? "Update" : "Download"} />
        )}
      </div>
    </article>
  );
}

function CourseCard({ course: c }: { course: CourseView }) {
  const finished = c.total > 0 && c.left === 0;
  return (
    <article className="hit hit-card anim-lift flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <header className="flex items-start justify-between gap-3">
        <h4 className="text-lg font-semibold leading-snug">
          <Link href={c.href} className="hit-link">
            {c.title}
          </Link>
        </h4>
        <form action={toggleFavouriteCourseAction}>
          <input type="hidden" name="course" value={c.id} />
          <SubmitButton
            aria-label={c.favourite ? `Remove ${c.title} from favourites` : `Add ${c.title} to favourites`}
            aria-pressed={c.favourite}
            title={c.favourite ? "Remove from favourites" : "Add to favourites"}
            className={`grid size-7 place-items-center rounded-md ${c.favourite ? "text-cat-beh" : "text-muted hover:text-foreground"}`}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill={c.favourite ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden>
              <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
            </svg>
          </SubmitButton>
        </form>
      </header>
      <p className="text-sm text-muted">{c.blurb}</p>

      <div className="space-y-1">
        <ProgressBar value={c.done} max={c.total} label={`${c.title} progress`} />
        <p className="flex justify-between text-xs text-muted">
          <span>
            {c.done} of {c.total} {c.unit}
          </span>
          <span>{finished ? "Complete" : `${c.left} left · ${c.percent}%`}</span>
        </p>
      </div>

      {c.due > 0 && <p className="text-xs font-medium text-diff-medium">{c.due} due for review</p>}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
        {c.next ? (
          <p className="min-w-0">
            <span className="text-xs text-muted">Next · {c.next.reason}</span>
            <Link href={c.next.href} className="block truncate font-medium hover:underline">
              {c.next.title}
            </Link>
          </p>
        ) : (
          <p className="text-muted">Nothing left to do here.</p>
        )}
        <Link href={c.href} className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background">
          {c.done === 0 ? "Start" : "Open"}
        </Link>
      </div>
    </article>
  );
}
