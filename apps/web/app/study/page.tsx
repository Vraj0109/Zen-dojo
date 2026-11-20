import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getContinue, getCourses, type CourseView } from "@/lib/courses";
import { getCourseLibrary, type LibraryCourse } from "@/lib/packs";
import { toggleFavouriteCourseAction } from "../actions";
import { LibraryDownload } from "./library-download";
import { SubmitButton } from "../submit-button";
import { buttonClass, PageMain, Skeleton } from "../ui";
import { StudyHubSkeleton } from "@/app/components/study-skeleton";

export const metadata: Metadata = { title: "Learn" };

export default function LearnHubPage() {
  return (
    <PageMain title="Learn" hideTitle>
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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">Learn</h1>
          <p className="mt-1 text-sm text-muted">Pick a course. Each card shows how much is left and what to do next.</p>
        </div>
        {dueTotal > 0 && (
          <Link href="/review" className={buttonClass("tonal", "sm", "text-warning")}>
            {dueTotal} review{dueTotal === 1 ? "" : "s"} due →
          </Link>
        )}
      </header>

      {/* Continue card on primary with big play tile */}
      {again && (
        <Link
          href={again.href}
          className="group flex items-center gap-4 p-5 sm:p-6 sm:px-7 rounded-[32px] bg-primary text-on-primary hover:bg-primary-hover transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg hover:brightness-105 active:scale-[0.99] active:translate-y-0 shadow-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium opacity-80">Pick up where you left off</p>
            <p className="mt-1 text-xl sm:text-2xl font-medium truncate">{again.title}</p>
            <p className="mt-0.5 text-sm opacity-80">{again.course}</p>
          </div>
          <span className="size-16 shrink-0 rounded-[22px] bg-primary-container text-on-primary-container flex items-center justify-center group-hover:scale-110 group-active:scale-95 transition-transform duration-200 ease-out">
            <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </Link>
      )}

      {favourites.length > 0 && (
        <section aria-labelledby="favs" className="space-y-3">
          <h2 id="favs" className="text-xl font-medium text-foreground">
            Favourites
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
            {favourites.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="all" className="space-y-3">
        <h2 id="all" className="text-xl font-medium text-foreground">
          Courses
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
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
        <Link href="/study/diagrams" className="font-medium text-foreground underline hover:text-primary">
          your diagrams
        </Link>{" "}
        and{" "}
        <Link href="/revise" className="font-medium text-foreground underline hover:text-primary">
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
      <h2 id="lib" className="text-xl sm:text-2xl font-medium text-foreground">
        Course library
      </h2>
      <p className="mt-0.5 text-sm text-muted">More courses you can add. Each one downloads once and then works offline.</p>
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <section aria-labelledby="lib" aria-busy className="space-y-3">
      <LibraryHeading />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-36 w-[280px] shrink-0 rounded-[28px]" />
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

  return (
    <section aria-labelledby="lib" className="space-y-3">
      <LibraryHeading />
      {!lib.ok ? (
        <p className="rounded-[24px] border border-line bg-surface p-4 text-sm text-muted">Couldn&apos;t reach the course library right now.</p>
      ) : (
        <>
          {lib.offline && <p className="text-sm text-warning">Showing the last list we saw. Connect to the internet to download.</p>}
          {lib.courses.length === 0 && <p className="rounded-[24px] border border-line bg-surface p-4 text-sm text-muted">No courses in the library yet.</p>}
          <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {lib.courses.map((c) => (
              <LibraryCard key={c.id} course={c} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function LibraryCard({ course: c }: { course: LibraryCourse }) {
  const facts = [c.items !== undefined ? `${c.items} item${c.items === 1 ? "" : "s"}` : null, formatSize(c.bytes)].filter(Boolean).join(" · ");
  return (
    <article className="group flex-none w-[260px] sm:w-[300px] snap-start flex flex-col gap-2 p-[18px] rounded-[28px] bg-surface border border-line dark:border-0 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md hover:border-line-strong active:scale-[0.99] active:translate-y-0">
      <h3 className="text-[17px] font-medium leading-snug break-words text-foreground">{c.title}</h3>
      <p className="text-sm text-muted break-words line-clamp-2">{c.description || facts}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
        <p className="text-xs text-muted">
          {facts}
          {c.state === "update" && !c.tooNew && <span className="block font-medium text-warning">New version available</span>}
        </p>
        {c.tooNew ? (
          <button type="button" disabled className={buttonClass("tonal", "sm")}>
            Needs update
          </button>
        ) : c.state === "installed" ? (
          <span className="flex items-center gap-2">
            <span className="text-xs text-muted">Downloaded</span>
            <Link href={`/study/packs/${c.id}`} className={buttonClass("outline", "sm")}>
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

function courseTone(id: string): { bg: string; shape: string; icon: React.ReactNode } {
  switch (id) {
    case "sd":
      return {
        bg: "bg-cat-sd text-on-cat-sd",
        shape: "rounded-full bg-black/10 dark:bg-white/10",
        icon: (
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16v12H4zM4 10h16" />
          </svg>
        ),
      };
    case "lld":
      return {
        bg: "bg-cat-lld text-on-cat-lld",
        shape: "rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm bg-black/10 dark:bg-white/10",
        icon: (
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 3 8l9 5 9-5zM3 13l9 5 9-5" />
          </svg>
        ),
      };
    case "dsa":
      return {
        bg: "bg-cat-dsa text-on-cat-dsa",
        shape: "rounded-2xl bg-black/10 dark:bg-white/10",
        icon: (
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
          </svg>
        ),
      };
    case "core":
      return {
        bg: "bg-reward-soft text-on-reward-soft",
        shape: "rounded-[10px_28px] bg-black/10 dark:bg-white/10",
        icon: (
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16v6H4zM4 14h16v6H4z" />
          </svg>
        ),
      };
    case "reading":
      return {
        bg: "bg-primary-soft text-on-primary-soft",
        shape: "rounded-[50%_50%_12px_12px] bg-black/10 dark:bg-white/10",
        icon: (
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5h7v14H4zM13 5h7v14h-7z" />
          </svg>
        ),
      };
    default:
      return {
        bg: "bg-surface-2 text-foreground",
        shape: "rounded-xl bg-surface",
        icon: (
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 3 8l9 5 9-5zM3 13l9 5 9-5" />
          </svg>
        ),
      };
  }
}

function CourseCard({ course: c }: { course: CourseView }) {
  const tone = courseTone(c.id);
  const pct = c.total > 0 ? Math.min(100, Math.round((c.done / c.total) * 100)) : 0;

  return (
    <article className={`group relative flex flex-col gap-2.5 p-5 sm:p-[22px] rounded-[32px] ${tone.bg} cursor-pointer select-none transition-all duration-200 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:brightness-105 active:scale-[0.985] active:translate-y-0`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`size-14 flex items-center justify-center shrink-0 ${tone.shape} group-hover:scale-110 group-active:scale-95 transition-transform duration-200 ease-out`}>{tone.icon}</span>
        {/* Above the whole-card link so the star stays clickable. */}
        <form action={toggleFavouriteCourseAction} className="relative z-10">
          <input type="hidden" name="course" value={c.id} />
          <SubmitButton
            aria-label={c.favourite ? `Remove ${c.title} from favourites` : `Add ${c.title} to favourites`}
            aria-pressed={c.favourite}
            title={c.favourite ? "Remove from favourites" : "Add to favourites"}
            className="-m-1 grid size-11 place-items-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill={c.favourite ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden>
              <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
            </svg>
          </SubmitButton>
        </form>
      </div>

      <h3 className="text-xl font-medium leading-snug">
        <Link href={c.href} className="hover:underline focus-visible:outline-none">
          {c.title}
        </Link>
      </h3>

      <p className="text-sm opacity-85 leading-relaxed line-clamp-2">{c.blurb}</p>

      {/* Track and fill */}
      <div className="mt-2 space-y-2">
        <div className="h-2.5 rounded-full bg-white/60 dark:bg-black/30 overflow-hidden">
          <div className="h-full rounded-full bg-current transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[13px] font-medium leading-tight">
          {c.done} of {c.total} · next: {c.next ? c.next.title : "complete"}
        </p>
      </div>

      <Link href={c.href} className="absolute inset-0 rounded-[32px]" aria-label={c.title} tabIndex={-1} />
    </article>
  );
}
