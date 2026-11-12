import { connection } from "next/server";
import Link from "next/link";
import { getReviewQueue } from "@/lib/review";
import { Tabs } from "./tabs";

// Tab bars that tie the pages of one nav section together (Learn, Review). Profile has its own in profile/profile-ui.tsx.

const LEARN_LINKS = [
  { href: "/study/sd", label: "System design" },
  { href: "/study/lld", label: "Low-level design" },
  { href: "/study/core", label: "Core CS" },
  { href: "/dsa", label: "DSA patterns" },
  { href: "/study/reading", label: "Reading list" },
  { href: "/study/diagrams", label: "Diagrams" },
] as const;

/** Breadcrumb for the pages inside a course: back to the Learn page, the course name, and a way to jump to another course. */
export function LearnBack({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm print:hidden">
      <Link href="/study" className="text-muted hover:text-foreground">
        ← Learn
      </Link>
      <span aria-hidden className="text-muted">
        /
      </span>
      <span className="font-medium">{current}</span>
      <details className="relative ml-auto">
        <summary className="cursor-pointer rounded-lg border border-line px-2.5 py-1 text-xs text-muted hover:bg-background hover:text-foreground">Other courses</summary>
        <ul className="anim-pop absolute right-0 z-20 mt-1 min-w-44 rounded-xl border border-line bg-surface p-1 shadow-lg">
          {LEARN_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="block rounded-lg px-3 py-1.5 hover:bg-background">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </nav>
  );
}

export type ReviewTab = "review" | "revise" | "weekly";

/** "Due today", "Quick revise" and "Weekly review". `due` is the number of items in today's queue, when the page knows it. */
export function ReviewTabs({ active, due }: { active: ReviewTab; due?: number }) {
  const tabs = [
    { id: "review", label: "Due today", count: due },
    { id: "revise", label: "Quick revise" },
    { id: "weekly", label: "Weekly review" },
  ];
  const href: Record<ReviewTab, string> = { review: "/review", revise: "/revise", weekly: "/review/week" };
  return (
    <Tabs
      tabs={tabs}
      active={active}
      hrefFor={(id) => href[id as ReviewTab]}
      label="Review sections"
      className="mb-6 flex touch-pan-x gap-6 overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-line print:hidden"
    />
  );
}

/** ReviewTabs that looks up the queue size itself (for pages that don't load it). Wrap in Suspense with `<ReviewTabs active=… />`. */
export async function ReviewTabsWithCount({ active }: { active: ReviewTab }) {
  await connection();
  const queue = await getReviewQueue();
  return <ReviewTabs active={active} due={queue.length} />;
}
