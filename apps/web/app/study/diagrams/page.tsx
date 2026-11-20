import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ALL_EXERCISES, STUDY_AREAS, studyHref } from "@habit/shared";
import { DIAGRAM_LIMITS, DIAGRAM_TYPES, getDiagrams } from "@/lib/diagrams";
import { LearnBack } from "../../section-tabs";
import { buttonClass, INPUT_CLASS, PageMain } from "../../ui";
import { fmtDate } from "../study-ui";
import { StudyAreaSkeleton } from "@/app/components/study-skeleton";
import { DiagramDrop } from "./diagram-drop";

export const metadata: Metadata = { title: "Your diagrams" };

export default function DiagramsPage() {
  return (
    <PageMain title="Your diagrams" hideTitle>
      <LearnBack current="Diagrams" />
      <Suspense fallback={<StudyAreaSkeleton />}>
        <Gallery />
      </Suspense>
    </PageMain>
  );
}

/** Thumbnail background and subject pill in the subject tone. */
function getTone(area?: string) {
  switch (area) {
    case "sd":
      return { cover: "bg-cat-sd text-on-cat-sd", label: "System design" };
    case "lld":
      return { cover: "bg-cat-lld text-on-cat-lld", label: "Low-level design" };
    case "dsa":
      return { cover: "bg-cat-dsa text-on-cat-dsa", label: "DSA" };
    case "core":
      return { cover: "bg-reward-soft text-on-reward-soft", label: "Core CS" };
    default:
      return { cover: "bg-primary-soft text-on-primary-soft", label: "Diagram" };
  }
}

async function Gallery() {
  await connection();
  const all = await getDiagrams();
  // Diagrams belong to a design or an LLD project, so the upload asks which one.
  const groups = STUDY_AREAS.filter((a) => a.exercises?.items.length).map((a) => ({ title: a.title, items: a.exercises!.items }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight sm:text-4xl">Your diagrams</h1>
          <p className="mt-1 text-sm text-muted">
            {all.length} sketch{all.length === 1 ? "" : "es"} · photos and drawings you saved while studying
          </p>
        </div>
        <a href="#add-diagram" className={buttonClass("primary", "md")}>
          Add a diagram
        </a>
      </header>

      <section
        id="add-diagram"
        aria-labelledby="add-diagram-title"
        className="scroll-mt-6 space-y-4 rounded-[28px] border-2 border-dashed border-primary/40 bg-surface p-4 sm:px-6 sm:py-5"
      >
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-primary-soft text-on-primary-soft">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 id="add-diagram-title" className="text-base font-medium text-foreground">
              Upload a photo or screenshot
            </h2>
            <p className="mt-0.5 text-sm text-muted">Pick the design or project it belongs to, and it shows up on that page too.</p>
          </div>
        </div>
        <form
          action="/api/diagrams"
          method="post"
          encType="multipart/form-data"
          className="grid gap-3 @min-[640px]:grid-cols-2 @min-[1040px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] @min-[1040px]:items-end"
        >
          <DiagramDrop name="file" label="Image" types={DIAGRAM_TYPES} maxBytes={DIAGRAM_LIMITS.bytes} />
          <label className="min-w-0 space-y-1 text-sm">
            <span className="font-medium">Title</span>
            <input name="title" maxLength={DIAGRAM_LIMITS.title} placeholder="Optional" className={`${INPUT_CLASS} w-full`} />
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            <span className="font-medium">Belongs to</span>
            <select name="itemId" required defaultValue="" className={`${INPUT_CLASS} w-full`}>
              <option value="" disabled>
                Pick a design or project
              </option>
              {groups.map((g) => (
                <optgroup key={g.title} label={g.title}>
                  {g.items.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <button type="submit" className={buttonClass("primary", "md", "justify-self-start")}>
            Upload
          </button>
        </form>
      </section>

      {all.length === 0 ? (
        <p className="rounded-[28px] border border-line bg-surface p-6 text-sm text-muted dark:border-0">
          No diagrams yet. After practicing a design, upload a photo of your whiteboard above, or save it on that design&apos;s page.{" "}
          <Link href="/study/sd?tab=projects" className="font-medium text-foreground underline hover:text-primary">
            Go to the system designs
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-3">
          {all.map((d) => {
            const ex = ALL_EXERCISES[d.itemId];
            const tone = getTone(ex?.area);
            const href = ex ? `${studyHref(ex.area, ex.id)}?tab=turn#diagrams` : null;
            const open = d.hasImage ? `/api/diagrams/${d.id}` : d.url;

            return (
              <li key={d.id} className="flex flex-col gap-2.5 rounded-[28px] border border-line bg-surface p-3 pb-4 dark:border-0">
                <div className={`flex h-36 items-center justify-center overflow-hidden rounded-[20px] p-2 ${tone.cover}`}>
                  {d.hasImage ? (
                    <a href={open!} target="_blank" rel="noopener noreferrer" className="size-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/diagrams/${d.id}`} alt={d.title || "Diagram"} loading="lazy" className="size-full rounded-xl object-contain" />
                    </a>
                  ) : (
                    <svg aria-hidden="true" width="100%" height="100%" viewBox="0 0 200 110" preserveAspectRatio="xMidYMid meet">
                      <rect x="14" y="40" width="44" height="30" rx="10" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
                      <rect x="78" y="18" width="44" height="30" rx="10" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
                      <rect x="78" y="62" width="44" height="30" rx="10" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
                      <rect x="142" y="40" width="44" height="30" rx="15" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
                      <path d="M58 55 78 33M58 55 78 77M122 33 142 55M122 77 142 55" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  )}
                </div>
                <h2 className="truncate px-1 text-base font-medium">
                  {open ? (
                    <a href={open} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {d.title || ex?.title || "Untitled"}
                    </a>
                  ) : (
                    d.title || ex?.title || "Untitled"
                  )}
                </h2>
                {ex && href && (
                  <p className="truncate px-1 text-[13px] text-muted">
                    For{" "}
                    <Link href={href} className="hover:text-foreground hover:underline">
                      {ex.title}
                    </Link>
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 px-1">
                  <span className={`truncate rounded-full px-2.5 py-1 text-xs font-semibold ${tone.cover}`}>{tone.label}</span>
                  <span className="shrink-0 text-[13px] text-muted">{fmtDate(d.createdOn)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
