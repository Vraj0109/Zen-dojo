import { connection } from "next/server";
import { Suspense } from "react";
import { getReviewQueue } from "@/lib/review";
import { getSimpleMode } from "@/lib/ui-prefs";
import { Tabs } from "./tabs";

// Tab bars that tie the pages of one nav section together (Learn, Review). Profile has its own in profile/profile-ui.tsx.

const LEARN_TABS = [
  { id: "sd", label: "System design" },
  { id: "lld", label: "LLD" },
  { id: "core", label: "Core CS" },
  { id: "reading", label: "Reading list" },
  { id: "diagrams", label: "Diagrams" },
] as const;

const LEARN_HREF: Record<(typeof LEARN_TABS)[number]["id"], string> = {
  sd: "/study/sd",
  lld: "/study/lld",
  core: "/study/core",
  reading: "/study/reading",
  diagrams: "/study/diagrams",
};

export type LearnTab = (typeof LEARN_TABS)[number]["id"];

const LEARN_CLASS = "mb-6 flex gap-6 overflow-x-auto border-b border-line print:hidden";
const SIMPLE_HIDDEN: readonly string[] = ["reading", "diagrams"];

function LearnTabsView({ active, simple }: { active: string; simple: boolean }) {
  const tabs = LEARN_TABS.filter((t) => !simple || !SIMPLE_HIDDEN.includes(t.id) || t.id === active);
  return <Tabs tabs={tabs} active={active} hrefFor={(id) => LEARN_HREF[id as LearnTab]} label="Learn sections" className={LEARN_CLASS} />;
}

async function LearnTabsLoader({ active }: { active: string }) {
  await connection();
  return <LearnTabsView active={active} simple={await getSimpleMode()} />;
}

/** System design, LLD, Core CS, Reading list, Diagrams. Simple mode hides the last two (until you are on one of them). */
export function LearnTabs({ active }: { active: string }) {
  return (
    <Suspense fallback={<LearnTabsView active={active} simple />}>
      <LearnTabsLoader active={active} />
    </Suspense>
  );
}

export type ReviewTab = "review" | "revise";

/** "Due today" and "Quick revise". `due` is the number of items in today's queue, when the page knows it. */
export function ReviewTabs({ active, due }: { active: ReviewTab; due?: number }) {
  const tabs = [
    { id: "review", label: "Due today", count: due },
    { id: "revise", label: "Quick revise" },
  ];
  return (
    <Tabs
      tabs={tabs}
      active={active}
      hrefFor={(id) => (id === "review" ? "/review" : "/revise")}
      label="Review sections"
      className="mb-6 flex gap-6 overflow-x-auto border-b border-line print:hidden"
    />
  );
}

/** ReviewTabs that looks up the queue size itself (for pages that don't load it). Wrap in Suspense with `<ReviewTabs active=… />`. */
export async function ReviewTabsWithCount({ active }: { active: ReviewTab }) {
  await connection();
  const queue = await getReviewQueue();
  return <ReviewTabs active={active} due={queue.length} />;
}
